// supabase/functions/verify-payment/index.ts
// Sblocco immediato al ritorno da Stripe (senza aspettare il webhook).
// Il client manda { access_token, session_id }. Verifichiamo l'utente,
// controlliamo su Stripe che la sessione sia pagata e appartenga a lui,
// poi attiviamo il profilo con la scadenza reale della subscription.
// Idempotente: se il webhook è già passato, non fa danni.
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

function unixToDate(sec: number | null | undefined) {
  return sec ? new Date(sec * 1000).toISOString().split("T")[0] : null;
}

serve(async (req) => {
  const CORS = cors(req);
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  try {
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return json(500, { paid: false, error: "Config mancante" });
    }
    const { access_token, session_id } = await req.json().catch(() => ({}));
    if (!access_token || !session_id) return json(400, { paid: false, error: "Parametri mancanti" });

    const user = await getUser(access_token);
    if (!user || !user.id) return json(401, { paid: false, error: "Sessione non valida" });

    // Recupera la sessione da Stripe
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!r.ok) return json(502, { paid: false, error: "Errore Stripe" });
    const session = await r.json();

    const paid = session.payment_status === "paid";
    // La sessione deve appartenere all'utente loggato
    if (!paid || session.client_reference_id !== user.id) {
      return json(200, { paid: false });
    }

    // Leggi la scadenza reale dalla subscription
    let scadenza: string | null = null;
    if (session.subscription) {
      const sr = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(session.subscription)}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (sr.ok) { const sub = await sr.json(); scadenza = unixToDate(sub.current_period_end); }
    }

    const patch: Record<string, unknown> = { stato: "active", stripe_customer_id: session.customer, stripe_subscription_id: session.subscription };
    if (scadenza) patch.scadenza = scadenza;
    await svc(`profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });

    return json(200, { paid: true, scadenza });
  } catch (err) {
    console.error("🔥 verify-payment:", err);
    return json(500, { paid: false, error: "Errore interno" });
  }
});
