// netlify/functions/crea-checkout.js
// Crea una sessione Stripe Checkout in modalità ABBONAMENTO (€50/anno).
// Il client (biologo.html) manda il proprio access_token Supabase; qui lo
// verifichiamo lato server per legare il pagamento all'utente giusto
// (client_reference_id = id utente Supabase). Ritorna { url } di Stripe.

const SUPABASE_URL      = process.env.SUPABASE_URL || 'https://hjfosliokfskftmoukxa.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZm9zbGlva2Zza2Z0bW91a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDY3NTEsImV4cCI6MjA5MDYyMjc1MX0.eX9BL0tIy83zZ49hxzxFloH24hGIcbMRb2AsmCOiF9k';
const SITE_URL          = process.env.SITE_URL || 'https://sane-italia.it';

async function getUser(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) return null;
  return await r.json(); // { id, email, ... }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

async function handle(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const secret  = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!secret || !priceId) {
      console.error('❌ STRIPE_SECRET_KEY o STRIPE_PRICE_ID mancanti nelle env Netlify');
      return { statusCode: 500, body: JSON.stringify({ error: 'Config Stripe mancante lato server' }) };
    }

    const { access_token } = JSON.parse(event.body || '{}');
    if (!access_token) return { statusCode: 400, body: JSON.stringify({ error: 'access_token mancante' }) };

    const user = await getUser(access_token);
    if (!user || !user.id) return { statusCode: 401, body: JSON.stringify({ error: 'Sessione non valida' }) };

    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('client_reference_id', user.id);
    if (user.email) params.append('customer_email', user.email);
    params.append('allow_promotion_codes', 'true');
    params.append('subscription_data[metadata][supabase_user_id]', user.id);
    params.append('success_url', `${SITE_URL}/biologo.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url',  `${SITE_URL}/biologo.html?checkout=cancel`);

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const session = await resp.json();
    if (!resp.ok) {
      console.error('❌ Stripe checkout non OK:', resp.status, session);
      return { statusCode: 502, body: JSON.stringify({ error: 'Errore Stripe' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    console.error('🔥 crea-checkout:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Errore interno' }) };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  const res = await handle(event);
  return { ...res, headers: { ...CORS, ...(res.headers || {}) } };
};
