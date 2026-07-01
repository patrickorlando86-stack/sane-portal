// netlify/functions/verify-payment.js
// Sblocco immediato al ritorno da Stripe (senza aspettare il webhook).
// Il client manda { access_token, session_id }. Verifichiamo l'utente,
// controlliamo su Stripe che la sessione sia pagata e appartenga a lui,
// poi attiviamo il profilo con la scadenza reale della subscription.
// Idempotente: se il webhook è già passato, non fa danni.

const SUPABASE_URL      = process.env.SUPABASE_URL || 'https://hjfosliokfskftmoukxa.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZm9zbGlva2Zza2Z0bW91a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDY3NTEsImV4cCI6MjA5MDYyMjc1MX0.eX9BL0tIy83zZ49hxzxFloH24hGIcbMRb2AsmCOiF9k';

async function getUser(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) return null;
  return await r.json();
}

function svc(path, opts = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
}

function unixToDate(sec) { return sec ? new Date(sec * 1000).toISOString().split('T')[0] : null; }

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ paid: false, error: 'Config mancante' }) };
    }
    const { access_token, session_id } = JSON.parse(event.body || '{}');
    if (!access_token || !session_id) return { statusCode: 400, body: JSON.stringify({ paid: false, error: 'Parametri mancanti' }) };

    const user = await getUser(access_token);
    if (!user || !user.id) return { statusCode: 401, body: JSON.stringify({ paid: false, error: 'Sessione non valida' }) };

    // Recupera la sessione da Stripe
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`, {
      headers: { Authorization: `Bearer ${secret}` }
    });
    if (!r.ok) return { statusCode: 502, body: JSON.stringify({ paid: false, error: 'Errore Stripe' }) };
    const session = await r.json();

    const paid = session.payment_status === 'paid';
    // La sessione deve appartenere all'utente loggato
    if (!paid || session.client_reference_id !== user.id) {
      return { statusCode: 200, body: JSON.stringify({ paid: false }) };
    }

    // Leggi la scadenza reale dalla subscription
    let scadenza = null;
    if (session.subscription) {
      const sr = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(session.subscription)}`, {
        headers: { Authorization: `Bearer ${secret}` }
      });
      if (sr.ok) { const sub = await sr.json(); scadenza = unixToDate(sub.current_period_end); }
    }

    const patch = { stato: 'active', stripe_customer_id: session.customer, stripe_subscription_id: session.subscription };
    if (scadenza) patch.scadenza = scadenza;
    await svc(`profiles?id=eq.${user.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid: true, scadenza }) };
  } catch (err) {
    console.error('🔥 verify-payment:', err);
    return { statusCode: 500, body: JSON.stringify({ paid: false, error: 'Errore interno' }) };
  }
};
