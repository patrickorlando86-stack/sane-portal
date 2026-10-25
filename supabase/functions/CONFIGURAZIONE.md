# Configurazione delle funzioni (secret e passi manuali)

Le funzioni si ridistribuiscono da sole a ogni push su `main`
(`.github/workflows/deploy-functions.yml`). I secret invece si impostano a mano:
Dashboard Supabase → **Edge Functions** → **Manage secrets**.

| Secret | Usato da | Note |
|---|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL` | pagamenti | vedi `MIGRAZIONE-DA-NETLIFY.md` |
| `RESEND_API_KEY` | tutte le email | |
| `EMAIL_FROM` | tutte le email | es. `S.A.N.E. Italia <info@sane-italia.it>` — vedi sotto |
| `NOTIFY_SECRET` | `nuova-registrazione`, `notifica-approvazione`, `avviso-scadenza` | vedi sotto |

## 1. Mittente delle email (`EMAIL_FROM`)

Senza questo secret le email partono da `onboarding@resend.dev`, l'indirizzo di
prova di Resend, che consegna **solo all'email del proprietario dell'account
Resend**. Le notifiche all'admin arrivano, quelle ai biologi (benvenuto,
approvazione, scadenza) no. Nei log Resend compare l'errore
*"You can only send testing emails to your own email address"*.

1. Resend → **Domains** → *Add domain* → `sane-italia.it` → aggiungi i record
   DNS che indica (dal pannello del registrar del dominio) → attendi "Verified".
2. Su Supabase imposta `EMAIL_FROM` = `S.A.N.E. Italia <info@sane-italia.it>`.

## 2. Chi può chiamare le funzioni di notifica (`NOTIFY_SECRET`)

Le tre funzioni di notifica hanno "Verify JWT" acceso, ma basta la chiave anon
(pubblica, è nel codice del sito) per chiamarle: chiunque potrebbe far partire
email a nome S.A.N.E. verso indirizzi a piacere. Il codice ora accetta solo:

- chiamate con la **service role key** (è quella che usano di solito i Database
  Webhooks di Supabase), oppure
- chiamate con l'header `x-notify-secret` uguale a `NOTIFY_SECRET`.

Finché `NOTIFY_SECRET` non è impostato si accetta tutto come prima, ma nei log
compare `⚠️ NOTIFY_SECRET non impostato: accetto una chiamata con ruolo "..."`.

1. Dopo una registrazione / un'approvazione / il giro di `avviso-scadenza`,
   guarda i log della funzione (Edge Functions → funzione → Logs):
   - nessun avviso, oppure ruolo `"service_role"` → il chiamante è già a posto;
   - ruolo `"anon"` → il trigger/cron usa la chiave anon: aggiungi alla sua
     chiamata l'header `x-notify-secret` (Database → Webhooks → modifica →
     HTTP Headers; oppure nel `net.http_post` del cron, dentro `headers`).
2. Imposta `NOTIFY_SECRET` con una stringa casuale lunga (la stessa messa
   nell'header, se serve).
3. Riprova una registrazione di test: l'email deve arrivare. Se la funzione
   risponde 401, il chiamante non manda né la service role key né l'header.
