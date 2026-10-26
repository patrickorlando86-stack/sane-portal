// supabase/functions/crea-portale/index.ts
// Apre il Customer Portal di Stripe per l'abbonato: cambio carta, ricevute,
// disdetta. Il client (biologo.html) manda { access_token }; il cliente Stripe
// si legge dal profilo con la service role, così nessuno può aprire il
// portale di un altro. Ritorna { url }.
// Una volta sola, in Stripe → Settings → Billing → Customer portal, va
// salvata la configurazione (senza, Stripe risponde "No configuration provided").
// Deploy con --no-verify-jwt (l'auth è sul token nel body).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { avvisaAdmin, cors, getProfilo, getUser, jsonFor, SITE_URL, stripe } from "../_shared/utils.ts";

serve(async (req) => {
  const json = jsonFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(405, { error: "Method Not Allowed" });

  try {
    if (!Deno.env.get("STRIPE_SECRET_KEY") || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      await avvisaAdmin("crea-portale", "STRIPE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY mancanti");
      return json(500, { error: "Config mancante" });
    }
    const { access_token } = await req.json().catch(() => ({}));
    if (!access_token) return json(400, { error: "access_token mancante" });

    const user = await getUser(access_token);
    if (!user || !user.id) return json(401, { error: "Sessione non valida" });

    const profilo = await getProfilo(user.id, "stripe_customer_id");
    if (!profilo?.stripe_customer_id) {
      return json(404, { error: "Nessun abbonamento Stripe collegato a questo account" });
    }

    const params = new URLSearchParams();
    params.append("customer", profilo.stripe_customer_id);
    params.append("return_url", `${SITE_URL}/biologo.html`);
    const r = await stripe("billing_portal/sessions", params);
    const s = await r.json();
    if (!r.ok) {
      await avvisaAdmin("crea-portale", `Stripe ha rifiutato l'apertura del portale (${r.status})`, s?.error ?? s);
      return json(502, { error: "Errore Stripe" });
    }
    return json(200, { url: s.url });
  } catch (err) {
    await avvisaAdmin("crea-portale", "Errore interno", String(err));
    return json(500, { error: "Errore interno" });
  }
});
