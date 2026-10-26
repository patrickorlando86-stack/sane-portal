// supabase/functions/stripe-webhook/index.ts
// Riceve gli eventi Stripe e tiene allineato profiles.stato/scadenza.
//   checkout.session.completed     -> lega customer+subscription al profilo e attiva
//   invoice.paid / payment_succeeded -> rinnovo: aggiorna la scadenza
//   customer.subscription.deleted  -> disdetta: stop rinnovo (accesso fino a scadenza)
// Ogni anomalia (pagamento senza profilo, config mancante, errore) manda una
// email all'admin con avvisaAdmin.
// La firma è verificata a mano con HMAC-SHA256 via Web Crypto (nessuna dipendenza).
// IMPORTANTE: deploy con --no-verify-jwt (Stripe non manda un JWT Supabase; la
// sicurezza è data dalla verifica della firma qui sotto).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  ADMIN_EMAIL, avvisaAdmin, escHtml, inviaEmail, invoiceSubscriptionId, layoutEmail,
  periodEnd, stripe, svc, unixToDate,
} from "../_shared/utils.ts";

async function getSubscription(id: string) {
  const r = await stripe(`subscriptions/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  return await r.json();
}

// Email di avviso all'admin quando arriva un nuovo abbonato.
// Blindata: non lancia mai (il webhook deve rispondere 200 a Stripe anche se
// l'email fallisce).
async function notificaAdminNuovoAbbonato(subscriberEmail: string | null) {
  try {
    await inviaEmail(ADMIN_EMAIL, "💳 Nuovo abbonato al Portale Biologi", layoutEmail("Notifica abbonamenti", `
      <h2 style="color:#0A2647;font-size:18px;margin:0 0 12px;">💳 Nuovo abbonato</h2>
      <p style="color:#475569;font-size:14px;line-height:1.7;">Un nuovo biologo ha sottoscritto l'abbonamento al Portale (€50/anno).<br><br>
      <strong>Email:</strong> ${escHtml(subscriberEmail ?? "(non disponibile)")}</p>`, "S.A.N.E. Italia · notifica automatica"));
  } catch (err) {
    console.error("⚠️ invio email notifica abbonato fallito (ignorato):", err);
  }
}

// Verifica firma Stripe: header "t=...,v1=..." ; firmato = `${t}.${rawBody}`
async function verifySignature(rawBody: string, sigHeader: string | null, secret: string): Promise<boolean> {
  if (!sigHeader || !secret) return false;
  const parts: Record<string, string> = {};
  sigHeader.split(",").forEach((kv) => { const i = kv.indexOf("="); if (i > 0) parts[kv.slice(0, i)] = kv.slice(i + 1); });
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  // tolleranza 5 minuti contro replay
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(t, 10)) > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${rawBody}`));
  const expected = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // confronto a tempo costante
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

async function attivaDaSubscription(subId: string, opts: { userId?: string } = {}) {
  const sub = await getSubscription(subId);
  if (!sub) { await avvisaAdmin("stripe-webhook", `Subscription ${subId} non trovata su Stripe`); return; }
  const scadenza = unixToDate(periodEnd(sub));
  const patch: Record<string, unknown> = { stato: "active", stripe_subscription_id: sub.id, stripe_customer_id: sub.customer };
  // Mai scrivere scadenza=null: un profilo attivo senza scadenza non scade più
  if (scadenza) patch.scadenza = scadenza;
  else await avvisaAdmin("stripe-webhook", `current_period_end assente nella subscription ${sub.id}: scadenza non aggiornata`);
  const userId = opts.userId || sub.metadata?.supabase_user_id;
  // Un profilo eliminato non va mai riattivato, anche se Stripe continua a mandare eventi
  const filtro = (userId ? `id=eq.${encodeURIComponent(userId)}` : `stripe_subscription_id=eq.${encodeURIComponent(sub.id)}`) + "&stato=neq.eliminato";
  let r = await svc(`profiles?${filtro}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
  let rows = await r.json();
  if ((!Array.isArray(rows) || rows.length === 0) && !userId) {
    r = await svc(`profiles?stripe_customer_id=eq.${encodeURIComponent(sub.customer)}&stato=neq.eliminato`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch),
    });
    rows = await r.json();
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    // Qualcuno paga ma nessun profilo risulta attivo: va controllato a mano
    await avvisaAdmin("stripe-webhook", "Pagamento ricevuto ma nessun profilo aggiornato", { subscription: sub.id, customer: sub.customer, user: userId ?? null, risposta: rows });
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    await avvisaAdmin("stripe-webhook", "STRIPE_WEBHOOK_SECRET o SUPABASE_SERVICE_ROLE_KEY mancanti: i pagamenti non attivano i profili");
    return new Response("Config mancante", { status: 500 });
  }

  const rawBody = await req.text(); // firma calcolata sul body grezzo
  const sig = req.headers.get("stripe-signature");
  if (!(await verifySignature(rawBody, sig, secret))) {
    return new Response("Firma non valida", { status: 400 });
  }

  let evt;
  try { evt = JSON.parse(rawBody); } catch { return new Response("Body non valido", { status: 400 }); }

  try {
    switch (evt.type) {
      case "checkout.session.completed": {
        const s = evt.data.object;
        if (s.mode === "subscription" && s.subscription) {
          await attivaDaSubscription(s.subscription, { userId: s.client_reference_id });
          await notificaAdminNuovoAbbonato(s.customer_details?.email || s.customer_email || null);
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const inv = evt.data.object;
        const subId = invoiceSubscriptionId(inv);
        if (subId) await attivaDaSubscription(subId);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = evt.data.object;
        // Profili attivati prima del fix su current_period_end possono avere
        // scadenza vuota: alla disdetta gliela diamo, altrimenti non scadrebbero mai
        const fine = unixToDate(periodEnd(sub) ?? sub.ended_at);
        if (fine) {
          await svc(`profiles?stripe_subscription_id=eq.${encodeURIComponent(sub.id)}&scadenza=is.null`, {
            method: "PATCH", headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ scadenza: fine }),
          });
        }
        await svc(`profiles?stripe_subscription_id=eq.${encodeURIComponent(sub.id)}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ stripe_subscription_id: null }),
        });
        break;
      }
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    await avvisaAdmin("stripe-webhook", `Errore interno sull'evento ${evt?.type} (Stripe riproverà)`, String(err));
    return new Response("Errore interno", { status: 500 });
  }
});
