// netlify/functions/stripe-webhook.js
// Riceve gli eventi Stripe e tiene allineato profiles.stato/scadenza.
//   checkout.session.completed  -> lega customer+subscription al profilo e attiva
//   invoice.paid                -> rinnovo annuale: aggiorna la scadenza
//   customer.subscription.deleted -> abbonamento disdetto: stop rinnovo (l'accesso
//                                    resta fino alla scadenza già pagata)
// La firma è verificata a mano con HMAC-SHA256 (niente dipendenze npm).

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hjfosliokfskftmoukxa.supabase.co';

function svc(path, opts = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
}

async function getSubscription(id) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${secret}` }
  });
  if (!r.ok) return null;
  return await r.json();
}

function unixToDate(sec) {
  if (!sec) return null;
  return new Date(sec * 1000).toISOString().split('T')[0];
}

// Verifica firma Stripe: header "t=...,v1=..." ; signed = `${t}.${rawBody}`
function verifySignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false;
  const parts = {};
  sigHeader.split(',').forEach(kv => { const i = kv.indexOf('='); if (i > 0) parts[kv.slice(0, i)] = kv.slice(i + 1); });
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  // tolleranza 5 minuti contro replay
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(t, 10)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Attiva/rinnova un profilo dato l'id subscription: legge la scadenza reale da Stripe
async function attivaDaSubscription(subId, opts = {}) {
  const sub = await getSubscription(subId);
  if (!sub) { console.error('⚠️ subscription non trovata:', subId); return; }
  const scadenza = unixToDate(sub.current_period_end);
  const patch = { stato: 'active', scadenza, stripe_subscription_id: sub.id, stripe_customer_id: sub.customer };
  // Trova il profilo: prima per user id esplicito, poi per subscription, poi per customer
  const userId = opts.userId || sub.metadata?.supabase_user_id;
  let filtro;
  if (userId)                    filtro = `id=eq.${userId}`;
  else                           filtro = `stripe_subscription_id=eq.${encodeURIComponent(sub.id)}`;
  let r = await svc(`profiles?${filtro}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
  let rows = await r.json();
  if ((!Array.isArray(rows) || rows.length === 0) && !userId) {
    // fallback per customer
    r = await svc(`profiles?stripe_customer_id=eq.${encodeURIComponent(sub.customer)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
    rows = await r.json();
  }
  if (!Array.isArray(rows) || rows.length === 0) console.error('⚠️ nessun profilo aggiornato per sub', sub.id, 'user', userId);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ STRIPE_WEBHOOK_SECRET o SERVICE_ROLE_KEY mancanti');
    return { statusCode: 500, body: 'Config mancante' };
  }

  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!verifySignature(rawBody, sig, secret)) {
    return { statusCode: 400, body: 'Firma non valida' };
  }

  let evt;
  try { evt = JSON.parse(rawBody); } catch { return { statusCode: 400, body: 'Body non valido' }; }

  try {
    switch (evt.type) {
      case 'checkout.session.completed': {
        const s = evt.data.object;
        if (s.mode === 'subscription' && s.subscription) {
          await attivaDaSubscription(s.subscription, { userId: s.client_reference_id });
        }
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const inv = evt.data.object;
        if (inv.subscription) await attivaDaSubscription(inv.subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = evt.data.object;
        // stop rinnovo: sganciamo la subscription (l'accesso resta fino a scadenza già pagata)
        await svc(`profiles?stripe_subscription_id=eq.${encodeURIComponent(sub.id)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ stripe_subscription_id: null })
        });
        break;
      }
      default:
        // ignoriamo gli altri eventi
        break;
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('🔥 stripe-webhook:', err);
    return { statusCode: 500, body: 'Errore interno' };
  }
};
