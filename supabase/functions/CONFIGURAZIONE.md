# Configurazione e gestione (secret e passi manuali)

Tutto quello che non sta nel codice e va fatto una volta dai pannelli.
In ordine di importanza:

| # | Cosa | Dove | Sezione |
|---|---|---|---|
| 1 | Eseguire i file SQL | Supabase → SQL Editor | 4 |
| 2 | Attivare il Customer Portal | Stripe → Settings → Billing | 3 |
| 3 | Verificare il dominio e impostare `EMAIL_FROM` | Resend + Supabase | 1 |
| 4 | Secret del backup | GitHub → Settings → Secrets | 5 |
| 5 | `NOTIFY_SECRET` | Supabase | 2 |

Le funzioni si ridistribuiscono da sole a ogni push su `main`
(`.github/workflows/deploy-functions.yml`). I secret invece si impostano a mano:
Dashboard Supabase → **Edge Functions** → **Manage secrets**.

| Secret | Usato da | Note |
|---|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL` | pagamenti | vedi `MIGRAZIONE-DA-NETLIFY.md` |
| `RESEND_API_KEY` | tutte le email | |
| `EMAIL_FROM` | tutte le email | es. `S.A.N.E. Italia <info@sane-italia.it>` — vedi sotto |
| `NOTIFY_SECRET` | `nuova-registrazione`, `notifica-approvazione`, `avviso-scadenza` | vedi sotto |

Errori su pagamenti, codici, eliminazioni e config mancanti arrivano per email
a info@sane-italia.it (oggetto "🚨 Portale: problema in ..."), con il dettaglio.
Funziona solo se le email partono (sezione 1).

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

## 3. Area abbonamento Stripe (Customer Portal)

Nel portale la voce **Abbonamento** apre, per chi è abbonato, la pagina Stripe
dove cambia carta, scarica le ricevute e disdice. Stripe la mostra solo dopo che
ne hai salvato la configurazione una volta:

1. Stripe → **Settings** → **Billing** → **Customer portal**
2. Attiva: *Update payment methods*, *View invoice history*, *Cancel subscriptions*
   (consigliato: "Cancel at end of billing period", così l'accesso resta fino
   alla scadenza pagata)
3. **Save**. Fallo sia in modalità Test sia in Live.

Chi non è abbonato e ha ancora giorni di licenza (es. da codice) può abbonarsi
dalla stessa voce: il primo addebito arriva il giorno della scadenza attuale.

Fatture: Stripe manda la ricevuta solo se in **Settings → Customer emails** è
attivo *Successful payments*. Se vi serve la fattura elettronica (SDI), chiedete
al commercialista: Stripe da solo non la invia.

## 4. File SQL da eseguire (Supabase → SQL Editor)

Ognuno si può rilanciare senza danni.

| File | Cosa fa |
|---|---|
| `db/hardening-2026-10.sql` | paywall anche nel database, protezione dei profili, regionale limitato alla sua regione, codici solo admin, niente doppio invio autovalutazione |
| `db/automazioni.sql` | ogni notte mette "scaduto" chi ha la licenza scaduta; ogni domenica cancella tentativi codice (>30 giorni) e log (>24 mesi). Serve l'estensione pg_cron (Database → Extensions) |

## 5. Backup del database

Ogni lunedì `.github/workflows/backup-database.yml` salva ruoli, struttura e
dati, **cifrati**, tra gli artifact di GitHub (tenuti 90 giorni). Il repo è
pubblico: senza cifratura chiunque potrebbe scaricarli.

**Attivazione** (GitHub → Settings → Secrets and variables → Actions → New):
- `SUPABASE_DB_URL`: Supabase → **Connect** → *Session pooler* → copia l'URI e
  sostituisci `[YOUR-PASSWORD]` con la password del database (se non la ricordi:
  Project Settings → Database → Reset database password).
- `BACKUP_PASSPHRASE`: una frase lunga. **Salvala anche fuori da GitHub**
  (gestore password): senza, i backup non si aprono.

Poi Actions → *Backup database* → **Run workflow** per provarlo subito.
Se fallisce, GitHub ti manda un'email.

Nota: GitHub sospende i workflow programmati dei repo pubblici dopo 60 giorni
senza commit. Se succede, nella tab Actions compare un pulsante per riattivarli.

**Ripristino** (serve un computer con `gpg` e `psql`):
```bash
gpg -d sane-backup-AAAA-MM-GG.tar.gz.gpg | tar xz      # chiede la passphrase
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file backup/roles.sql --file backup/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file backup/data.sql --dbname "URI_DEL_DATABASE"
```
Su un progetto Supabase nuovo conviene ripristinare lì e poi spostare il sito,
invece di sovrascrivere quello in uso.

## 6. Cose automatiche da sapere

- **Controlli**: a ogni push `.github/workflows/controlli.yml` prova funzioni e
  pagine. Spunta rossa = qualcosa si è rotto: guardare prima di fare il merge.
- **Deploy funzioni**: parte da solo su main, ma solo se i controlli delle
  funzioni passano.
- **Tailwind**: le pagine del portale usano `css/tailwind.css`, generato dalle
  classi presenti nel codice. Su main si rigenera da solo
  (`.github/workflows/tailwind.yml`).
- **Header di sicurezza (HSTS, CSP)**: il sito è su GitHub Pages, che non
  permette di impostarli. Servirebbe spostare l'hosting (Netlify o Cloudflare
  Pages, gratuiti per un sito così). Non è urgente: il traffico è già HTTPS.
