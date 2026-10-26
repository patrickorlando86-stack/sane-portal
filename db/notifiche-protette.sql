-- ============================================================
--  S.A.N.E. — Notifiche email: niente doppioni e chiamate protette
--  Incolla nel SQL Editor di Supabase e "Run". Idempotente.
--
--  Cosa sistema:
--   1. Il webhook "notifica-approvazione" su profiles partiva a OGNI
--      modifica di un profilo (nome, rinnovo, scadenza notturna...) e
--      mandava ogni volta "account attivato". Faceva anche doppione con
--      trigger_notifica_approvazione, che già parte solo all'attivazione.
--      → lo togliamo.
--   2. Le tre chiamate alle funzioni di notifica usavano solo la chiave
--      anon, che è pubblica: chiunque poteva fare lo stesso e mandare email
--      a nome S.A.N.E. Ora mandano anche l'header x-notify-secret, letto
--      dal Vault di Supabase (la parola segreta non è scritta nel codice).
--
--  DOPO averlo eseguito: copia il valore restituito dall'ultima query in
--  Edge Functions → Secrets → NOTIFY_SECRET (vedi CONFIGURAZIONE.md).
--  Finché quel secret non è impostato tutto funziona come prima.
--
--  La chiave anon qui sotto è quella pubblica del sito (è anche in
--  valutazione.html): serve perché le funzioni hanno "Verify JWT" acceso.
-- ============================================================


-- 1. Webhook doppione: fuori ────────────────────────────────
drop trigger if exists "notifica-approvazione" on public.profiles;


-- 2. Parola segreta nel Vault (creata una volta sola, circa 240 bit casuali) ──
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'notify_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'notify_secret',
      'Header x-notify-secret delle funzioni di notifica (= secret NOTIFY_SECRET)'
    );
  end if;
end $$;


-- 3. Benvenuto (dopo l'iscrizione) ──────────────────────────
create or replace function public.fn_nuova_registrazione()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  perform net.http_post(
    url     := 'https://hjfosliokfskftmoukxa.supabase.co/functions/v1/nuova-registrazione',
    headers := jsonb_build_object(
                 'Content-Type',    'application/json',
                 'Authorization',   'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZm9zbGlva2Zza2Z0bW91a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDY3NTEsImV4cCI6MjA5MDYyMjc1MX0.eX9BL0tIy83zZ49hxzxFloH24hGIcbMRb2AsmCOiF9k',
                 'x-notify-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret'), '')
               ),
    body    := json_build_object('email', new.email, 'nome', new.nome)::jsonb
  );
  return new;
end;
$function$;


-- 4. Account attivato (solo quando lo stato DIVENTA 'active') ─
create or replace function public.fn_notifica_approvazione()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.stato = 'active' and (old.stato is distinct from 'active') then
    perform net.http_post(
      url     := 'https://hjfosliokfskftmoukxa.supabase.co/functions/v1/notifica-approvazione',
      headers := jsonb_build_object(
                   'Content-Type',    'application/json',
                   'Authorization',   'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZm9zbGlva2Zza2Z0bW91a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDY3NTEsImV4cCI6MjA5MDYyMjc1MX0.eX9BL0tIy83zZ49hxzxFloH24hGIcbMRb2AsmCOiF9k',
                   'x-notify-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret'), '')
                 ),
      body    := json_build_object('biologo_id', new.id, 'email', new.email, 'nome', new.nome)::jsonb
    );
  end if;
  return new;
end;
$function$;


-- 5. Avviso di scadenza, ogni giorno alle 08:00 UTC (stesso orario di prima) ──
select cron.schedule(
  'avviso-scadenza-daily',
  '0 8 * * *',
  $cron$
    select net.http_post(
      url     := 'https://hjfosliokfskftmoukxa.supabase.co/functions/v1/avviso-scadenza',
      headers := jsonb_build_object(
                   'Content-Type',    'application/json',
                   'Authorization',   'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZm9zbGlva2Zza2Z0bW91a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDY3NTEsImV4cCI6MjA5MDYyMjc1MX0.eX9BL0tIy83zZ49hxzxFloH24hGIcbMRb2AsmCOiF9k',
                   'x-notify-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret'), '')
                 ),
      body    := '{}'::jsonb
    );
  $cron$
);


-- 6. Il valore da copiare in Edge Functions → Secrets → NOTIFY_SECRET ──
select decrypted_secret as copia_in_notify_secret
from vault.decrypted_secrets where name = 'notify_secret';
