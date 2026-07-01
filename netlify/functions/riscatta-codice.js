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

// Origin allowlist: le pagine del portale girano su sane-italia.it (GitHub Pages)
// e chiamano queste function su saneportal.netlify.app (cross-origin). L'auth è
// sul Bearer token nel body (non su cookie), quindi il CORS non è un confine di
// sicurezza qui — ma restringiamo comunque l'Origin per igiene, invece di '*'.
const ALLOWED_ORIGINS = [
  'https://sane-italia.it',
  'https://www.sane-italia.it',
  'https://saneportal.netlify.app'
];
function corsHeaders(event) {
  const h = event.headers || {};
  const origin = h.origin || h.Origin || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

// ── Rate limit (difesa in profondità: i codici hanno ~40 bit di entropia,
//    il brute-force è già infeasible; qui limitiamo l'hammering) ──────────
const RL_WINDOW_MIN = 15;   // finestra scorrevole
const RL_MAX_FAILS  = 5;    // tentativi FALLITI ammessi per utente (e per IP) nella finestra

// IP best-effort dagli header (Netlify: x-nf-client-connection-ip / x-forwarded-for)
function clientIp(event) {
  const h = event.headers || {};
  const xff = h['x-forwarded-for'] || h['X-Forwarded-For'] || '';
  return (xff.split(',')[0] || '').trim()
    || h['x-nf-client-connection-ip'] || h['client-ip'] || null;
}

// Conta i tentativi falliti recenti su una colonna (user_id o ip). Restituisce
// un numero; in caso di errore restituisce 0 così un problema di logging non
// blocca mai un riscatto legittimo (fail-open sul rate limit).
async function contaFail(colonna, valore) {
  if (!valore) return 0;
  const since = new Date(Date.now() - RL_WINDOW_MIN * 60000).toISOString();
  try {
    const r = await svc(
      `codice_tentativi?${colonna}=eq.${encodeURIComponent(valore)}` +
      `&esito=eq.fail&created_at=gte.${encodeURIComponent(since)}&select=id`,
      { headers: { Prefer: 'count=exact', Range: '0-0' } }
    );
    // Content-Range: "0-0/<totale>" oppure "*/0"
    const cr = r.headers.get('content-range') || '';
    const tot = parseInt(cr.split('/')[1], 10);
    return Number.isFinite(tot) ? tot : 0;
  } catch (e) {
    console.error('rate-limit contaFail:', e);
    return 0;
  }
}

// Registra un tentativo (best-effort: non deve mai far fallire il riscatto).
async function logTentativo(userId, ip, esito) {
  try {
    await svc('codice_tentativi', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: userId, ip, esito })
    });
  } catch (e) {
    console.error('rate-limit logTentativo:', e);
  }
}

async function handle(event) {
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

    const ip = clientIp(event);

    // Rate limit: troppi tentativi FALLITI recenti (per utente o per IP) → blocca.
    const [failUser, failIp] = await Promise.all([
      contaFail('user_id', user.id),
      contaFail('ip', ip)
    ]);
    if (failUser >= RL_MAX_FAILS || failIp >= RL_MAX_FAILS) {
      return {
        statusCode: 429,
        headers: { 'Retry-After': String(RL_WINDOW_MIN * 60) },
        body: JSON.stringify({ ok: false, error: `Troppi tentativi. Riprova tra ${RL_WINDOW_MIN} minuti.` })
      };
    }

    // Un tentativo con codice errato/inutilizzabile viene registrato come 'fail'
    // (è il segnale di brute-force che alimenta il rate limit).
    const denyCode = async (error) => {
      await logTentativo(user.id, ip, 'fail');
      return { statusCode: 200, body: JSON.stringify({ ok: false, error }) };
    };

    // 1) Cerca il codice
    const q = await svc(`codici_accesso?codice=eq.${encodeURIComponent(codice)}&select=*`);
    const rows = await q.json();
    const c = Array.isArray(rows) ? rows[0] : null;
    if (!c)          return await denyCode('Codice non valido');
    if (!c.attivo)   return await denyCode('Codice disattivato');
    if (c.usato_da)  return await denyCode('Codice già utilizzato');

    const oggi = new Date().toISOString().split('T')[0];
    if (c.scadenza < oggi) return await denyCode('Codice scaduto');

    // 2) Marca il codice come usato (condizione usato_da IS NULL per evitare doppio riscatto)
    const upd = await svc(`codici_accesso?id=eq.${c.id}&usato_da=is.null`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ usato_da: user.id, usato_il: new Date().toISOString() })
    });
    const updRows = await upd.json();
    if (!Array.isArray(updRows) || updRows.length === 0) {
      return await denyCode('Codice già utilizzato');
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

    await logTentativo(user.id, ip, 'ok');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, scadenza: c.scadenza }) };
  } catch (err) {
    console.error('🔥 riscatta-codice:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Errore interno' }) };
  }
}

exports.handler = async (event) => {
  const CORS = corsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  const res = await handle(event);
  return { ...res, headers: { ...CORS, ...(res.headers || {}) } };
};
