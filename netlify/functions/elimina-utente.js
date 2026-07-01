// netlify/functions/elimina-utente.js
// Hard-delete di un utente. Il client (admin.html) manda { access_token, user_id }.
// Qui: (1) verifichiamo il token del CHIAMANTE, (2) controlliamo con la
// SERVICE ROLE KEY che il chiamante sia davvero 'admin' (non ci si fida del
// front-end), (3) marchiamo il profilo come 'eliminato' e (4) cancelliamo
// l'account da Supabase Auth (libera l'email). Operazione irreversibile.

const SUPABASE_URL      = process.env.SUPABASE_URL || 'https://hjfosliokfskftmoukxa.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZm9zbGlva2Zza2Z0bW91a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDY3NTEsImV4cCI6MjA5MDYyMjc1MX0.eX9BL0tIy83zZ49hxzxFloH24hGIcbMRb2AsmCOiF9k';

async function getUser(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) return null;
  return await r.json();
}

// Helper REST con service role (bypassa RLS)
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

async function handle(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY mancante');
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Config server mancante' }) };
    }

    const body    = JSON.parse(event.body || '{}');
    const token   = body.access_token;
    const userId  = body.user_id;
    if (!token)  return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Sessione non valida' }) };
    if (!userId) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'user_id mancante' }) };

    // 1) Chi chiama?
    const caller = await getUser(token);
    if (!caller || !caller.id) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Sessione non valida' }) };

    // 2) Il chiamante deve essere admin (verifica lato server, non ci fidiamo del client)
    const rq = await svc(`profiles?id=eq.${caller.id}&select=role`);
    const rows = await rq.json();
    const callerRole = Array.isArray(rows) && rows[0] ? rows[0].role : null;
    if (callerRole !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Solo un amministratore può eliminare un utente' }) };
    }

    // 3) No auto-eliminazione
    if (userId === caller.id) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Non puoi eliminare il tuo stesso account' }) };
    }

    // 4) Marca il profilo come eliminato (se la riga sopravvive alla cancellazione dell'utente)
    await svc(`profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ stato: 'eliminato' })
    });

    // 5) Cancella l'account da Supabase Auth (libera l'email, invalida le sessioni)
    const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    // 404 = utente già assente: lo consideriamo comunque un successo (idempotente)
    if (!del.ok && del.status !== 404) {
      console.error('⚠️ delete auth user non OK:', del.status, await del.text());
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: 'Errore eliminazione account' }) };
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('🔥 elimina-utente:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Errore interno' }) };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  const res = await handle(event);
  return { ...res, headers: { ...CORS, ...(res.headers || {}) } };
};
