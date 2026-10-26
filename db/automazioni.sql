-- ============================================================
--  S.A.N.E. — Lavori automatici notturni (pg_cron)
--  Incolla nel SQL Editor di Supabase e "Run". Idempotente: rilanciarlo
--  aggiorna i job esistenti invece di duplicarli.
--
--  Se compare "extension pg_cron is not available": Dashboard →
--  Database → Extensions → cerca "pg_cron" → Enable, poi rilancia.
--
--  Per vedere i job:          select * from cron.job;
--  Per vedere le esecuzioni:  select * from cron.job_run_details order by start_time desc limit 20;
--  Per toglierne uno:         select cron.unschedule('sane-scadenze');
-- ============================================================

create extension if not exists pg_cron;


-- ── 1. Licenze scadute → stato 'expired' (ogni notte alle 00:10 UTC) ──
--  Oggi lo stato diventa 'expired' solo quando un admin apre il pannello:
--  fino ad allora liste, conteggi ed export mostrano come attivi anche i
--  biologi scaduti. Stessa regola di verificaScadenzeAuto() in admin.html.
--  Gli abbonati Stripe non ne risentono: il rinnovo arriva il giorno stesso
--  della scadenza e, se il pagamento slitta, il webhook li riattiva appena
--  Stripe incassa.
select cron.schedule(
  'sane-scadenze',
  '10 0 * * *',
  $$
    update public.profiles
       set stato = 'expired'
     where stato = 'active'
       and scadenza is not null
       and scadenza < current_date
       and role in ('biologo', 'regional_admin');
  $$
);


-- ── 2. Pulizia dei dati che non servono più (ogni domenica alle 03:20 UTC) ──
--  Minimizzazione (GDPR art. 5): si tiene solo quello che serve.
--   • codice_tentativi: serve al rate limit dei codici (finestra di 15 minuti);
--     30 giorni bastano anche per controllare eventuali abusi.
--   • activity_log e admin_access_log: storico accessi/azioni. Il pannello ne
--     mostra gli ultimi 500/200; si tengono 24 mesi. Se vi serve uno storico
--     più lungo, cambiate '24 months' qui sotto e rilanciate il file.
--  Le risposte dei questionari NON vengono toccate: sono il dato del progetto.
select cron.schedule(
  'sane-pulizia',
  '20 3 * * 0',
  $$
    delete from public.codice_tentativi where created_at < now() - interval '30 days';
    delete from public.activity_log     where created_at < now() - interval '24 months';
    delete from public.admin_access_log where created_at < now() - interval '24 months';
  $$
);


-- ── 3. (Opzionale) avviso-scadenza ogni mattina ─────────────
--  Serve solo se la funzione avviso-scadenza NON è già schedulata altrove
--  (controlla con: select * from cron.job; e in Dashboard → Edge Functions →
--  avviso-scadenza → Logs, se gira ogni giorno). Richiede l'estensione pg_net
--  e la service role key salvata nel Vault:
--    Dashboard → Project Settings → Vault → New secret
--      nome: service_role_key   valore: la service role key (Settings → API)
--  Poi togli i commenti qui sotto e rilancia.
--
-- create extension if not exists pg_net;
-- select cron.schedule(
--   'sane-avviso-scadenza',
--   '0 7 * * *',
--   $$
--     select net.http_post(
--       url     := 'https://hjfosliokfskftmoukxa.supabase.co/functions/v1/avviso-scadenza',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--       ),
--       body    := '{}'::jsonb
--     );
--   $$
-- );
