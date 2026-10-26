// supabase/functions/verify-payment/index.ts
// Sblocco immediato al ritorno da Stripe (senza aspettare il webhook).
// Il client manda { access_token, session_id }. Verifichiamo l'utente,
// controlliamo su Stripe che la sessione sia pagata e appartenga a lui,
// poi attiviamo il profilo con la scadenza reale della subscription.
// Idempotente: se il webhook è già passato, non fa danni.
// Deploy con --no-verify-jwt (l'auth è sul token nel body).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { avvisaAdmin, cors, getUser, jsonFor, periodEnd, stripe, svc, unixToDate } from "../_shared/utils.ts";

serve(async (req) => {
  const json = jsonFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(405, { error: "Method Not Allowed" });

  try {
    if (!Deno.env.get("STRIPE_SECRET_KEY") || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      await avvisaAdmin("verify-payment", "STRIPE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY mancanti");
      return json(500, { paid: false, error: "Config mancante" });
    }
    const { access_token, session_id } = await req.json().catch(() => ({}));
    if (!access_token || !session_id) return json(400, { paid: false, error: "Parametri mancanti" });

    const user = await getUser(access_token);
    if (!user || !user.id) return json(401, { paid: false, error: "Sessione non valida" });

    // Recupera la sessione da Stripe
    const r = await stripe(`checkout/sessions/${encodeURIComponent(session_id)}`);
    if (!r.ok) return json(502, { paid: false, error: "Errore Stripe" });
    const session = await r.json();

    // "no_payment_required" = rinnovo anticipato con prova fino alla scadenza
    // attuale (vedi crea-checkout): carta registrata, primo addebito più avanti
    const ok = session.payment_status === "paid" ||
      (session.payment_status === "no_payment_required" && session.status === "complete");
    // La sessione deve appartenere all'utente loggato
    if (!ok || session.client_reference_id !== user.id) {
      return json(200, { paid: false });
    }

    // Leggi la scadenza reale dalla subscription
    let scadenza: string | null = null;
    if (session.subscription) {
      const sr = await stripe(`subscriptions/${encodeURIComponent(session.subscription)}`);
      if (sr.ok) scadenza = unixToDate(periodEnd(await sr.json()));
    }

    const patch: Record<string, unknown> = { stato: "active", stripe_customer_id: session.customer, stripe_subscription_id: session.subscription };
    if (scadenza) patch.scadenza = scadenza;
    const up = await svc(`profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    if (!up.ok) {
      // Pagato ma non attivato: il webhook dovrebbe rimediare, ma meglio saperlo
      await avvisaAdmin("verify-payment", `Pagamento confermato ma profilo non aggiornato (${up.status})`, { user: user.id, email: user.email, errore: await up.text() });
    }

    return json(200, { paid: true, scadenza });
  } catch (err) {
    await avvisaAdmin("verify-payment", "Errore interno", String(err));
    return json(500, { paid: false, error: "Errore interno" });
  }
});
