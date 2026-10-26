// supabase/functions/crea-checkout/index.ts
// Crea una sessione Stripe Checkout in modalità ABBONAMENTO (€50/anno).
// Il client (biologo.html) manda il proprio access_token Supabase; qui lo
// verifichiamo lato server per legare il pagamento all'utente giusto
// (client_reference_id = id utente Supabase). Ritorna { url } di Stripe.
//
// Rinnovo anticipato: se il biologo ha già un accesso valido (es. da codice)
// che scade tra più di 2 giorni, l'abbonamento parte con un periodo di prova
// fino a quella data. Si inserisce la carta oggi, il primo addebito arriva il
// giorno della scadenza: non perde i giorni che gli restano.
// Deploy con --no-verify-jwt (l'auth è sul token nel body).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { avvisaAdmin, cors, getProfilo, getUser, jsonFor, SITE_URL, stripe } from "../_shared/utils.ts";

const GIORNO = 86400;

serve(async (req) => {
  const json = jsonFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(405, { error: "Method Not Allowed" });

  try {
    const priceId = Deno.env.get("STRIPE_PRICE_ID");
    if (!Deno.env.get("STRIPE_SECRET_KEY") || !priceId) {
      await avvisaAdmin("crea-checkout", "STRIPE_SECRET_KEY o STRIPE_PRICE_ID mancanti nei secrets Supabase");
      return json(500, { error: "Config Stripe mancante lato server" });
    }

    const { access_token } = await req.json().catch(() => ({}));
    if (!access_token) return json(400, { error: "access_token mancante" });

    const user = await getUser(access_token);
    if (!user || !user.id) return json(401, { error: "Sessione non valida" });

    const profilo = await getProfilo(user.id, "stato,scadenza,stripe_customer_id,stripe_subscription_id");

    // Già abbonato: un secondo checkout creerebbe un doppio addebito
    if (profilo?.stripe_subscription_id) {
      return json(409, { error: "Hai già un abbonamento attivo", portale: true });
    }

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("client_reference_id", user.id);
    // Cliente Stripe già noto (ex abbonato): riusalo, così ritrova carte e fatture
    if (profilo?.stripe_customer_id) params.append("customer", profilo.stripe_customer_id);
    else if (user.email) params.append("customer_email", user.email);
    params.append("allow_promotion_codes", "true");
    params.append("subscription_data[metadata][supabase_user_id]", user.id);

    if (profilo?.stato === "active" && profilo.scadenza) {
      // mezzogiorno UTC del giorno di scadenza
      const fine = Math.floor(new Date(`${profilo.scadenza}T12:00:00Z`).getTime() / 1000);
      const ora = Math.floor(Date.now() / 1000);
      if (fine - ora > 730 * GIORNO) {
        return json(400, { error: `Il tuo accesso è già valido fino al ${profilo.scadenza}: potrai abbonarti più avanti.` });
      }
      // Stripe vuole il fine prova ad almeno 48 ore da adesso
      if (fine - ora > 2 * GIORNO) params.append("subscription_data[trial_end]", String(fine));
    }

    params.append("success_url", `${SITE_URL}/biologo.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${SITE_URL}/biologo.html?checkout=cancel`);

    const resp = await stripe("checkout/sessions", params);
    const session = await resp.json();
    if (!resp.ok) {
      await avvisaAdmin("crea-checkout", `Stripe ha rifiutato la creazione del checkout (${resp.status})`, session?.error ?? session);
      return json(502, { error: "Errore Stripe" });
    }

    return json(200, { url: session.url });
  } catch (err) {
    await avvisaAdmin("crea-checkout", "Errore interno", String(err));
    return json(500, { error: "Errore interno" });
  }
});
