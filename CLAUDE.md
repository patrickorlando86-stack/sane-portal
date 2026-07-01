# CLAUDE.md — S.A.N.E. Portale Biologi

Note per sessioni future di Claude Code. Sito statico (HTML+JS vanilla) su
GitHub Pages a `https://sane-italia.it`, con backend serverless su Supabase +
Netlify Functions (`https://saneportal.netlify.app/.netlify/functions`).

## Architettura in breve
- **Frontend**: pagine `.html` alla radice (portale biologi `biologo.html`,
  pannello `admin.html`, pagine pubbliche `index.html`, ecc.). Nessun build:
  si editano direttamente gli `<script>` inline.
- **Auth/DB**: Supabase (anon key nel client; RLS a proteggere le tabelle).
- **Azioni privilegiate**: Netlify Functions in `netlify/functions/` che usano
  la `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS) — così il biologo non può
  auto-attivarsi dal browser. Migrazioni SQL idempotenti in `db/`.
- **viewAs**: l'admin apre `biologo.html?viewAs=<id>` per vedere il portale di
  un biologo in sola lettura. ⚠️ I dati del biologo vengono renderizzati nel
  browser dell'admin (sessione privilegiata) → vettore XSS da tenere sempre a
  mente quando si rendono dati utente in `biologo.html`.

## Convenzioni di sicurezza (già applicate — mantenerle)
- **XSS / escaping**: MAI inserire dati controllati dall'utente grezzi in
  `innerHTML`. Usare la funzione `esc()` presente in `admin.html` e
  `biologo.html`:
  ```js
  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  ```
  Si escapano: nomi scuole/pacchetti/classi, comune, note, referente, materia,
  regione, ordine, autovalutazioni, ecc. NON si escapano: id UUID negli
  handler `onclick`, campi numerici, valori dentro `encodeURIComponent`,
  assegnazioni a `.textContent`/`.value` (non sono sink HTML).
- **CORS Functions**: allowlist di origin (non `*`) via helper `corsHeaders(event)`
  in ogni function browser-facing. `stripe-webhook.js` non ha CORS (è
  server-to-server). L'auth vera è sul Bearer token nel body, non su cookie.
- **Rate limit riscatto codici**: `riscatta-codice.js` conta i tentativi
  falliti (per utente e per IP, finestra 15 min, max 5) sulla tabella
  `public.codice_tentativi` e risponde `429`. È **fail-open**: se il
  logging/conteggio fallisce, il riscatto legittimo non viene mai bloccato.

## Migrazioni DB (da eseguire a mano nel SQL Editor di Supabase)
Le migrazioni in `db/` non si applicano da sole: vanno incollate nel SQL
Editor di Supabase e lanciate (sono idempotenti).
- `db/portale-abbonamenti.sql` — campi Stripe + tabella `codici_accesso`.
- `db/rate-limit-riscatto.sql` — tabella `codice_tentativi` (rate limit).
  ✅ Già eseguita in produzione (2026-07). Il rate limit è attivo.
- `db/audit-rls.sql` — audit delle policy RLS.

## Note operative
- Modello d'accesso al portale: `profiles.stato = 'active'` + `profiles.scadenza`.
- Codici di sblocco: formato `SANE-XXXX-YYYY`, alfabeto di 32, generati con
  `crypto.getRandomValues` (~40 bit di entropia → brute force infeasible).
- Eliminazione utente (`elimina-utente.js`): anonimizza il profilo (GDPR) e
  banna l'account invece di fare DELETE, per non perdere dati statistici via
  ON DELETE CASCADE.
- I merge delle PR fatti dall'API di GitHub producono merge commit con
  committer `GitHub <noreply@github.com>`: è normale e non va "corretto"
  riscrivendo la storia.

## Convenzioni git
- Identità commit: `Claude <noreply@anthropic.com>`.
- I messaggi di commit sono in italiano, prima riga in stile
  `Area: sintesi` (es. `Sicurezza: ...`).
