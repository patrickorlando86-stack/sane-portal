# Migrazione funzioni: Netlify → Supabase Edge Functions

Obiettivo: spostare le 5 funzioni serverless da Netlify a Supabase, così il
portale gira solo su **GitHub Pages** (sito) + **Supabase** (DB, auth, funzioni).
Niente più Netlify → niente più crediti Netlify.

Le 5 funzioni (già scritte in `supabase/functions/`):
`crea-checkout` · `verify-payment` · `riscatta-codice` · `elimina-utente` · `stripe-webhook`

> ⚠️ **ORDINE IMPORTANTE:** esegui i passi 1→3 (deploy + secrets + Stripe) **PRIMA**
> di fare il merge di questa PR. Il merge cambia `FN_BASE` nel portale e lo fa
> puntare a Supabase: se le funzioni non sono ancora online, pagamento/codici/
> eliminazione non funzionano finché non le deployi. (Il resto del sito è su
> GitHub Pages e non è toccato.)

---

## 1) Imposta i secret delle funzioni

Supabase fornisce **già in automatico** alle Edge Functions:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Non toccarli.

Devi impostare solo i secret di Stripe + il sito. Sono gli **stessi valori** che
hai già nelle variabili d'ambiente di Netlify.

**Da terminale (Supabase CLI):**
```bash
supabase link --project-ref hjfosliokfskftmoukxa   # una volta sola
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_PRICE_ID=price_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  SITE_URL=https://sane-italia.it
```

**Oppure da Dashboard:** Project → **Edge Functions** → **Manage secrets** →
aggiungi le 4 chiavi sopra.

---

## 2) Deploya le 5 funzioni

Tutte vanno deployate **senza verifica JWT** (`--no-verify-jwt`): l'autenticazione
è fatta *dentro* la funzione (verifica del token nel body per 4 di esse, verifica
della firma HMAC per lo `stripe-webhook`).

**Da terminale (CLI):**
```bash
supabase functions deploy crea-checkout   --no-verify-jwt
supabase functions deploy verify-payment  --no-verify-jwt
supabase functions deploy riscatta-codice --no-verify-jwt
supabase functions deploy elimina-utente  --no-verify-jwt
supabase functions deploy stripe-webhook  --no-verify-jwt
```

**Oppure da Dashboard:** Edge Functions → *Create/Deploy a new function* →
incolla il contenuto di `supabase/functions/<nome>/index.ts` → e **disattiva
"Verify JWT"** per ciascuna.

Dopo il deploy l'URL di ogni funzione è:
`https://hjfosliokfskftmoukxa.supabase.co/functions/v1/<nome>`
(è esattamente il nuovo `FN_BASE` che la PR imposta nel portale).

---

## 3) Aggiorna il webhook su Stripe

Nel Dashboard Stripe → **Developers → Webhooks** → l'endpoint esistente
(che oggi punta a `saneportal.netlify.app/.netlify/functions/stripe-webhook`):
- cambia l'URL in
  `https://hjfosliokfskftmoukxa.supabase.co/functions/v1/stripe-webhook`
- eventi: `checkout.session.completed`, `invoice.paid`,
  `invoice.payment_succeeded`, `customer.subscription.deleted`
- copia il nuovo **Signing secret** (`whsec_...`) e assicurati che sia quello
  impostato in `STRIPE_WEBHOOK_SECRET` (passo 1). Se ne crei uno nuovo,
  aggiorna il secret su Supabase.

---

## 4) Merge della PR + test (Stripe in TEST mode)

Fatti i passi 1–3, **mergia la PR** (aggiorna `FN_BASE` a Supabase). Poi verifica:

- [ ] **Abbonamento** — da `biologo.html` (profilo non attivo) → "Abbonati": si
      apre Stripe Checkout, paghi con carta di test `4242 4242 4242 4242`, torni
      al portale e lo stato diventa `active` (lo fa `verify-payment`).
- [ ] **Webhook** — in Stripe → Webhooks → l'endpoint mostra consegne `200`.
      In "Send test event" prova `invoice.paid`: la scadenza si aggiorna.
- [ ] **Codice** — da `biologo.html` "Sblocca con codice": un codice valido
      attiva il profilo; uno errato dà errore (e dopo 5 errori → 429).
- [ ] **Elimina biologo** — da `admin.html`: il biologo diventa "Biologo rimosso",
      email liberata, scuole/statistiche restano.

Se qualcosa non torna, guarda i log: Dashboard → Edge Functions → (funzione) → Logs.

---

## 5) Scollega Netlify (solo dopo che tutto funziona)

- Nel Dashboard Netlify: **Site settings → Danger zone → Delete/Unlink site**
  (oppure disattiva i deploy). Il dominio `sane-italia.it` è su GitHub Pages,
  quindi il sito pubblico non ne risente.
- Nel repo puoi rimuovere la cartella `netlify/functions/` e il file `_redirects`
  residui (le Edge Functions le hanno sostituite). Lasciarli non fa danni.

Fatto: il portale gira su **GitHub Pages + Supabase**, un backend solo.
