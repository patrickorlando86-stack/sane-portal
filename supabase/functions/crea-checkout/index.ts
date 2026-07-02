// supabase/functions/crea-checkout/index.ts
// Crea una sessione Stripe Checkout in modalità ABBONAMENTO (€50/anno).
// Il client (biologo.html) manda il proprio access_token Supabase; qui lo
// verifichiamo lato server per legare il pagamento all'utente giusto
// (client_reference_id = id utente Supabase). Ritorna { url } di Stripe.
// Deploy con --no-verify-jwt (l'auth è sul token nel body).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL          = Deno.env.get("SITE_URL") || "https://sane-italia.it";

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
  return await r.json(); // { id, email, ... }
}

serve(async (req) => {
  const CORS = cors(req);
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  try {
    const secret  = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_PRICE_ID");
    if (!secret || !priceId) {
      console.error("❌ STRIPE_SECRET_KEY o STRIPE_PRICE_ID mancanti nei secrets Supabase");
      return json(500, { error: "Config Stripe mancante lato server" });
    }

    const { access_token } = await req.json().catch(() => ({}));
    if (!access_token) return json(400, { error: "access_token mancante" });

    const user = await getUser(access_token);
    if (!user || !user.id) return json(401, { error: "Sessione non valida" });

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("client_reference_id", user.id);
    if (user.email) params.append("customer_email", user.email);
    params.append("allow_promotion_codes", "true");
    params.append("subscription_data[metadata][supabase_user_id]", user.id);
    params.append("success_url", `${SITE_URL}/biologo.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url",  `${SITE_URL}/biologo.html?checkout=cancel`);

    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const session = await resp.json();
    if (!resp.ok) {
      console.error("❌ Stripe checkout non OK:", resp.status, session);
      return json(502, { error: "Errore Stripe" });
    }

    return json(200, { url: session.url });
  } catch (err) {
    console.error("🔥 crea-checkout:", err);
    return json(500, { error: "Errore interno" });
  }
});
