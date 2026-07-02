// supabase/functions/elimina-utente/index.ts
// "Elimina biologo". Il client (admin.html) manda { access_token, user_id }.
// (1) verifichiamo il token del CHIAMANTE, (2) controlliamo con la SERVICE ROLE
// KEY che sia davvero 'admin' (non ci fidiamo del front-end), (3) ANONIMIZZIAMO
// il profilo mantenendolo nel DB (scuole/statistiche restano), (4) neutralizziamo
// l'account Auth (email liberata + ban) SENZA cancellarlo (niente cascade).
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

serve(async (req) => {
  const CORS = cors(req);
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  try {
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key) {
      console.error("❌ SUPABASE_SERVICE_ROLE_KEY mancante");
      return json(500, { ok: false, error: "Config server mancante" });
    }

    const body   = await req.json().catch(() => ({}));
    const token  = body.access_token;
    const userId = body.user_id;
    if (!token)  return json(401, { ok: false, error: "Sessione non valida" });
    if (!userId) return json(400, { ok: false, error: "user_id mancante" });

    // 1) Chi chiama?
    const caller = await getUser(token);
    if (!caller || !caller.id) return json(401, { ok: false, error: "Sessione non valida" });

    // 2) Il chiamante deve essere admin (verifica lato server)
    const rq = await svc(`profiles?id=eq.${caller.id}&select=role`);
    const rows = await rq.json();
    const callerRole = Array.isArray(rows) && rows[0] ? rows[0].role : null;
    if (callerRole !== "admin") {
      return json(403, { ok: false, error: "Solo un amministratore può eliminare un utente" });
    }

    // 3) No auto-eliminazione
    if (userId === caller.id) {
      return json(400, { ok: false, error: "Non puoi eliminare il tuo stesso account" });
    }

    const tombstone = `deleted+${userId}@sane-italia.invalid`;

    // 4) ANONIMIZZA il profilo, lasciandolo nel DB (scuole/statistiche intatte)
    await svc(`profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        stato: "eliminato",
        nome: "Biologo rimosso",
        email: tombstone,
        ordine: null,
        genere: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      }),
    });

    // 5) Neutralizza l'account Auth senza cancellarlo (email liberata + ban)
    const upd = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: tombstone, email_confirm: true, ban_duration: "876000h", user_metadata: { deleted: true } }),
    });
    if (!upd.ok && upd.status !== 404) {
      console.error("⚠️ neutralizzazione account non OK:", upd.status, await upd.text());
      return json(502, { ok: false, error: "Errore eliminazione account" });
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error("🔥 elimina-utente:", err);
    return json(500, { ok: false, error: "Errore interno" });
  }
});
