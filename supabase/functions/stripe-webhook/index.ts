// supabase/functions/stripe-webhook/index.ts
// Riceve gli eventi Stripe e tiene allineato profiles.stato/scadenza.
//   checkout.session.completed     -> lega customer+subscription al profilo e attiva
//   invoice.paid / payment_succeeded -> rinnovo: aggiorna la scadenza
//   customer.subscription.deleted  -> disdetta: stop rinnovo (accesso fino a scadenza)
// La firma è verificata a mano con HMAC-SHA256 via Web Crypto (nessuna dipendenza).
// IMPORTANTE: deploy con --no-verify-jwt (Stripe non manda un JWT Supabase; la
// sicurezza è data dalla verifica della firma qui sotto).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

function svc(path: string, opts: RequestInit = {}) {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

async function getSubscription(id: string) {
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!r.ok) return null;
  return await r.json();
}

function unixToDate(sec: number | null | undefined) {
  if (!sec) return null;
  return new Date(sec * 1000).toISOString().split("T")[0];
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
  if (!sub) { console.error("⚠️ subscription non trovata:", subId); return; }
  const scadenza = unixToDate(sub.current_period_end);
  const patch = { stato: "active", scadenza, stripe_subscription_id: sub.id, stripe_customer_id: sub.customer };
  const userId = opts.userId || sub.metadata?.supabase_user_id;
  const filtro = userId ? `id=eq.${userId}` : `stripe_subscription_id=eq.${encodeURIComponent(sub.id)}`;
  let r = await svc(`profiles?${filtro}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
  let rows = await r.json();
  if ((!Array.isArray(rows) || rows.length === 0) && !userId) {
    r = await svc(`profiles?stripe_customer_id=eq.${encodeURIComponent(sub.customer)}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch),
    });
    rows = await r.json();
  }
  if (!Array.isArray(rows) || rows.length === 0) console.error("⚠️ nessun profilo aggiornato per sub", sub.id, "user", userId);
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    console.error("❌ STRIPE_WEBHOOK_SECRET o SERVICE_ROLE_KEY mancanti");
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
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const inv = evt.data.object;
        if (inv.subscription) await attivaDaSubscription(inv.subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = evt.data.object;
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
    console.error("🔥 stripe-webhook:", err);
    return new Response("Errore interno", { status: 500 });
  }
});
