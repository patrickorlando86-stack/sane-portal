// netlify/functions/riscatta-codice.js
// Riscatto di un codice di sblocco manuale.
// Il client manda { access_token, codice }. Qui verifichiamo l'utente,
// controlliamo il codice con la SERVICE ROLE KEY (bypassa la RLS, così il
// biologo NON può attivarsi da solo) e, se valido, mettiamo il suo profilo
// a stato='active' con la scadenza del codice. Codice a uso singolo.

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY mancante');
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Config server mancante' }) };
    }

    const body   = JSON.parse(event.body || '{}');
    const token  = body.access_token;
    const codice = (body.codice || '').trim();
    if (!token)  return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Sessione non valida' }) };
    if (!codice) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Codice mancante' }) };

    const user = await getUser(token);
    if (!user || !user.id) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Sessione non valida' }) };

    // 1) Cerca il codice
    const q = await svc(`codici_accesso?codice=eq.${encodeURIComponent(codice)}&select=*`);
    const rows = await q.json();
    const c = Array.isArray(rows) ? rows[0] : null;
    if (!c)          return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Codice non valido' }) };
    if (!c.attivo)   return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Codice disattivato' }) };
    if (c.usato_da)  return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Codice già utilizzato' }) };

    const oggi = new Date().toISOString().split('T')[0];
    if (c.scadenza < oggi) return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Codice scaduto' }) };

    // 2) Marca il codice come usato (condizione usato_da IS NULL per evitare doppio riscatto)
    const upd = await svc(`codici_accesso?id=eq.${c.id}&usato_da=is.null`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ usato_da: user.id, usato_il: new Date().toISOString() })
    });
    const updRows = await upd.json();
    if (!Array.isArray(updRows) || updRows.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Codice già utilizzato' }) };
    }

    // 3) Attiva il profilo con la scadenza del codice
    const pUp = await svc(`profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ stato: 'active', scadenza: c.scadenza })
    });
    if (!pUp.ok) {
      console.error('⚠️ Aggiornamento profilo non OK:', pUp.status, await pUp.text());
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Errore attivazione profilo' }) };
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, scadenza: c.scadenza }) };
  } catch (err) {
    console.error('🔥 riscatta-codice:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Errore interno' }) };
  }
};
