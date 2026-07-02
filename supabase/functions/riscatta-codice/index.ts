// supabase/functions/riscatta-codice/index.ts
// Riscatto di un codice di sblocco manuale.
// Il client manda { access_token, codice }. Verifichiamo l'utente, controlliamo
// il codice con la SERVICE ROLE KEY (bypassa la RLS, così il biologo NON può
// attivarsi da solo) e, se valido, mettiamo il profilo a stato='active' con la
// scadenza del codice. Uso singolo + rate limit anti brute-force.
// Deploy con --no-verify-jwt (l'auth è sul token nel body).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_ORIGINS = [
  "https://sane-italia.it",
  "https://www.sane-italia.it",
  "https://saneportal.netlify.app",
];
function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Vary": "Origin",
  };
}

async function getUser(token: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  return await r.json();
}

function svc(path: string, opts: RequestInit = {}) {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

// ── Rate limit (difesa in profondità) ──────────────────────────────────
const RL_WINDOW_MIN = 15;
const RL_MAX_FAILS  = 5;

function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for") || "";
  return (xff.split(",")[0] || "").trim() || req.headers.get("x-real-ip") || null;
}

async function contaFail(colonna: string, valore: string | null): Promise<number> {
  if (!valore) return 0;
  const since = new Date(Date.now() - RL_WINDOW_MIN * 60000).toISOString();
  try {
    const r = await svc(
      `codice_tentativi?${colonna}=eq.${encodeURIComponent(valore)}` +
      `&esito=eq.fail&created_at=gte.${encodeURIComponent(since)}&select=id`,
      { headers: { Prefer: "count=exact", Range: "0-0" } },
    );
    const cr = r.headers.get("content-range") || "";
    const tot = parseInt(cr.split("/")[1], 10);
    return Number.isFinite(tot) ? tot : 0;
  } catch (e) {
    console.error("rate-limit contaFail:", e);
    return 0;
  }
}

async function logTentativo(userId: string, ip: string | null, esito: string) {
  try {
    await svc("codice_tentativi", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: userId, ip, esito }),
    });
  } catch (e) {
    console.error("rate-limit logTentativo:", e);
  }
}

serve(async (req) => {
  const CORS = cors(req);
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  try {
    if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      console.error("❌ SUPABASE_SERVICE_ROLE_KEY mancante");
      return json(500, { ok: false, error: "Config server mancante" });
    }

    const body   = await req.json().catch(() => ({}));
    const token  = body.access_token;
    const codice = (body.codice || "").trim();
    if (!token)  return json(401, { ok: false, error: "Sessione non valida" });
    if (!codice) return json(400, { ok: false, error: "Codice mancante" });

    const user = await getUser(token);
    if (!user || !user.id) return json(401, { ok: false, error: "Sessione non valida" });

    const ip = clientIp(req);

    const [failUser, failIp] = await Promise.all([
      contaFail("user_id", user.id),
      contaFail("ip", ip),
    ]);
    if (failUser >= RL_MAX_FAILS || failIp >= RL_MAX_FAILS) {
      return new Response(
        JSON.stringify({ ok: false, error: `Troppi tentativi. Riprova tra ${RL_WINDOW_MIN} minuti.` }),
        { status: 429, headers: { ...CORS, "Content-Type": "application/json", "Retry-After": String(RL_WINDOW_MIN * 60) } },
      );
    }

    const denyCode = async (error: string) => {
      await logTentativo(user.id, ip, "fail");
      return json(200, { ok: false, error });
    };

    // 1) Cerca il codice
    const q = await svc(`codici_accesso?codice=eq.${encodeURIComponent(codice)}&select=*`);
    const rows = await q.json();
    const c = Array.isArray(rows) ? rows[0] : null;
    if (!c)         return await denyCode("Codice non valido");
    if (!c.attivo)  return await denyCode("Codice disattivato");
    if (c.usato_da) return await denyCode("Codice già utilizzato");

    const oggi = new Date().toISOString().split("T")[0];
    if (c.scadenza < oggi) return await denyCode("Codice scaduto");

    // 2) Marca il codice come usato (usato_da IS NULL per evitare doppio riscatto)
    const upd = await svc(`codici_accesso?id=eq.${c.id}&usato_da=is.null`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ usato_da: user.id, usato_il: new Date().toISOString() }),
    });
    const updRows = await upd.json();
    if (!Array.isArray(updRows) || updRows.length === 0) {
      return await denyCode("Codice già utilizzato");
    }

    // 3) Attiva il profilo con la scadenza del codice
    const pUp = await svc(`profiles?id=eq.${user.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ stato: "active", scadenza: c.scadenza }),
    });
    if (!pUp.ok) {
      console.error("⚠️ Aggiornamento profilo non OK:", pUp.status, await pUp.text());
      return json(500, { ok: false, error: "Errore attivazione profilo" });
    }

    await logTentativo(user.id, ip, "ok");
    return json(200, { ok: true, scadenza: c.scadenza });
  } catch (err) {
    console.error("🔥 riscatta-codice:", err);
    return json(500, { ok: false, error: "Errore interno" });
  }
});
