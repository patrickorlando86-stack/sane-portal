-- ============================================================
--  S.A.N.E. — AUDIT & VERIFICA RLS
--  Incolla nel SQL Editor di Supabase. La PARTE 1 (ispezione) è
--  SOLA LETTURA: eseguila e basta per la diagnosi. La PARTE 2
--  contiene le policy CONSIGLIATE: LEGGI e adatta prima di eseguire
--  (sono idempotenti ma cambiano i permessi). La PARTE 3 riguarda il
--  flusso ANONIMO delle autovalutazioni, che è il punto più delicato.
--
--  Modello dati (dedotto dal codice del portale):
--    profiles(id, role, regione, stato, scadenza, ...)
--    scuole(biologo_id), pacchetti(biologo_id), classi(biologo_id),
--    autovalutazioni(biologo_id, token, stato), activity_log(biologo_id)
--    risposte(classe_id) -> classi.biologo_id
--    risposte_autovalutazione(autovalutazione_id) -> autovalutazioni.biologo_id
--    codici_accesso(...)  [RLS già definita in portale-abbonamenti.sql]
--
--  Contesti d'accesso:
--    - biologo   : JWT utente, possiede le proprie righe (biologo_id = auth.uid())
--    - admin     : JWT utente con profiles.role in ('admin','regional_admin')
--    - anonimo   : anon key SENZA login (solo valutazione.html, per token)
--    - server    : service_role (Netlify/Edge Functions) — BYPASSA la RLS
-- ============================================================


-- ============================================================
--  PARTE 1 — ISPEZIONE (sola lettura, esegui tutto)
-- ============================================================

-- 1a. RLS abilitata? (rowsecurity = true su ogni tabella sensibile)
select n.nspname as schema, c.relname as tabella, c.relrowsecurity as rls_on
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('profiles','scuole','pacchetti','classi','risposte',
                    'autovalutazioni','risposte_autovalutazione',
                    'codici_accesso','activity_log')
order by c.relname;

-- 1b. Policy esistenti per tabella (cosa consente, a chi, con quale USING/WITH CHECK)
select schemaname, tablename, policyname, cmd as operazione,
       roles, qual as using_expr, with_check as check_expr
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','scuole','pacchetti','classi','risposte',
                    'autovalutazioni','risposte_autovalutazione',
                    'codici_accesso','activity_log')
order by tablename, cmd, policyname;

-- 1c. TABELLE CON RLS ATTIVA MA SENZA ALCUNA POLICY (= nessuno legge/scrive,
--     tranne service_role). Se compare qui una tabella che il portale usa,
--     è la causa dei dati "vuoti"/warning RLS nel client.
select c.relname as tabella_senza_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p
                  where p.schemaname='public' and p.tablename=c.relname)
  and c.relname in ('profiles','scuole','pacchetti','classi','risposte',
                    'autovalutazioni','risposte_autovalutazione',
                    'codici_accesso','activity_log');

-- 1d. GRANT di tabella per i ruoli anon/authenticated (la RLS agisce SOPRA
--     i grant: se manca il grant, la policy non basta).
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privilegi
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated')
  and table_name in ('profiles','scuole','pacchetti','classi','risposte',
                     'autovalutazioni','risposte_autovalutazione',
                     'codici_accesso','activity_log')
group by table_name, grantee
order by table_name, grantee;


-- ============================================================
--  PARTE 2 — POLICY CONSIGLIATE (LEGGI PRIMA DI ESEGUIRE)
--  Modello: ogni biologo vede/gestisce SOLO le proprie righe;
--  admin/regional_admin vedono/gestiscono tutto. Idempotente.
-- ============================================================

-- Helper anti-ricorsione: is_staff() gira in SECURITY DEFINER così la
-- policy su profiles non richiama sé stessa (evita "infinite recursion").
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','regional_admin')
  );
$$;
-- NB: regional_admin qui ha visibilità piena; il filtro per regione oggi è
-- lato client (admin.html). Se serve isolare davvero le regioni a livello DB,
-- va aggiunta una condizione regione = (select regione from profiles where id=auth.uid()).

-- ── PROFILES ────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Ognuno legge sé stesso; lo staff legge tutti.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using ( id = auth.uid() or public.is_staff() );

-- Ognuno aggiorna la propria riga (i campi privilegiati restano protetti dal
-- trigger trg_profiles_protect_privileged_fields — vedi fix-rls-...sql);
-- lo staff aggiorna chiunque.
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using ( id = auth.uid() or public.is_staff() )
             with check ( id = auth.uid() or public.is_staff() );

-- L'INSERT del profilo avviene al signup (trigger handle_new_user) o via
-- upsert dal client subito dopo signUp: consenti l'insert della propria riga.
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check ( id = auth.uid() );

-- ── TABELLE POSSEDUTE DAL BIOLOGO (biologo_id = auth.uid()) ──
-- scuole, pacchetti, classi, autovalutazioni, activity_log
do $$
declare t text;
begin
  foreach t in array array['scuole','pacchetti','classi','autovalutazioni','activity_log']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t||'_owner_all', t);
    execute format($f$
      create policy %I on public.%I
        for all
        using ( biologo_id = auth.uid() or public.is_staff() )
        with check ( biologo_id = auth.uid() or public.is_staff() );
    $f$, t||'_owner_all', t);
  end loop;
end $$;

-- ── RISPOSTE (proprietà indiretta via classi.biologo_id) ────
alter table public.risposte enable row level security;
drop policy if exists "risposte_owner_all" on public.risposte;
create policy "risposte_owner_all" on public.risposte
  for all
  using (
    public.is_staff() or exists (
      select 1 from public.classi c
      where c.id = risposte.classe_id and c.biologo_id = auth.uid()
    )
  )
  with check (
    public.is_staff() or exists (
      select 1 from public.classi c
      where c.id = risposte.classe_id and c.biologo_id = auth.uid()
    )
  );


-- ============================================================
--  PARTE 3 — AUTOVALUTAZIONI ANONIME (punto più delicato)
--  valutazione.html gira con la anon key SENZA login:
--    1) SELECT autovalutazioni WHERE token = <token>
--    2) INSERT risposte_autovalutazione (le risposte)
--    3) UPDATE autovalutazioni SET stato='completata', punteggio...
--
--  RISCHIO: la RLS filtra RIGHE, non "il token nella WHERE". Se dài
--  ad anon una policy SELECT USING(true) su autovalutazioni, un anonimo
--  può togliere il filtro token e scaricare TUTTE le autovalutazioni
--  (nomi scuole, punteggi). Idem un UPDATE non vincolato allo stato.
--
--  CONSIGLIO FORTE: sposta questo flusso su una RPC SECURITY DEFINER (o
--  Edge Function con service_role), come già fatto per i codici di sblocco,
--  così l'anon non tocca mai direttamente le tabelle. Bozza sotto.
-- ============================================================

-- Opzione A (consigliata) — RPC che espone SOLO ciò che serve per token,
-- senza dare policy dirette ad anon sulle tabelle.
create or replace function public.autoval_get_by_token(p_token text)
returns table (id uuid, scuola_id uuid, anno_scolastico text, stato text,
               scuola_nome text, scuola_comune text)
language sql
security definer
stable
set search_path = public
as $$
  select a.id, a.scuola_id, a.anno_scolastico, a.stato,
         s.nome as scuola_nome, s.comune as scuola_comune
  from public.autovalutazioni a
  left join public.scuole s on s.id = a.scuola_id
  where a.token = p_token
  limit 1;
$$;

create or replace function public.autoval_submit(
  p_token text,
  p_righe jsonb,          -- [{area,domanda_id,domanda,valore,non_applicabile}, ...]
  p_punteggio int,
  p_punteggio_max int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_stato text;
begin
  select id, stato into v_id, v_stato
  from public.autovalutazioni where token = p_token limit 1;
  if v_id is null then return false; end if;
  -- una sola compilazione: rifiuta se non è più "in attesa"
  if v_stato <> 'attesa' then return false; end if;

  insert into public.risposte_autovalutazione
    (autovalutazione_id, area, domanda_id, domanda, valore, non_applicabile)
  select v_id,
         r->>'area', (r->>'domanda_id')::int, r->>'domanda',
         nullif(r->>'valore','')::int, (r->>'non_applicabile')::boolean
  from jsonb_array_elements(p_righe) as r;

  update public.autovalutazioni
    set stato='completata', punteggio_totale=p_punteggio,
        punteggio_max=p_punteggio_max, compilata_il=now()
  where id = v_id;
  return true;
end $$;

-- Concedi l'esecuzione all'anon SOLO delle due RPC (non delle tabelle).
grant execute on function public.autoval_get_by_token(text) to anon, authenticated;
grant execute on function public.autoval_submit(text, jsonb, int, int) to anon, authenticated;

-- Poi in valutazione.html: sostituire le chiamate dirette con
--   db.rpc('autoval_get_by_token', { p_token: token })
--   db.rpc('autoval_submit', { p_token, p_righe, p_punteggio, p_punteggio_max })
-- e NON dare policy anon dirette su autovalutazioni/risposte_autovalutazione.

-- Lettura per biologo/admin (dashboard) delle risposte_autovalutazione:
alter table public.risposte_autovalutazione enable row level security;
drop policy if exists "risposte_autoval_owner_read" on public.risposte_autovalutazione;
create policy "risposte_autoval_owner_read" on public.risposte_autovalutazione
  for select
  using (
    public.is_staff() or exists (
      select 1 from public.autovalutazioni a
      where a.id = risposte_autovalutazione.autovalutazione_id
        and a.biologo_id = auth.uid()
    )
  );

-- Opzione B (SOLO se NON adotti le RPC) — policy dirette per anon, il più
-- strette possibile. Restano intrinsecamente più esposte dell'Opzione A.
-- Scommenta consapevolmente:
--
-- grant select, update on public.autovalutazioni to anon;
-- grant insert on public.risposte_autovalutazione to anon;
--
-- create policy "autoval_anon_select" on public.autovalutazioni
--   for select to anon using ( token is not null );
-- create policy "autoval_anon_complete" on public.autovalutazioni
--   for update to anon
--   using ( stato = 'attesa' )           -- aggiornabile solo finché in attesa
--   with check ( stato = 'completata' );
-- create policy "autoval_anon_insert_risposte" on public.risposte_autovalutazione
--   for insert to anon
--   with check ( exists (select 1 from public.autovalutazioni a
--                        where a.id = autovalutazione_id and a.stato = 'attesa') );


-- ============================================================
--  PARTE 4 — RI-VERIFICA
--  Riesegui la PARTE 1 e conferma che:
--   • rls_on = true su tutte le tabelle
--   • nessuna tabella usata dal portale compare in 1c (senza policy)
--   • anon abbia privilegi SOLO dove serve (idealmente: solo EXECUTE sulle RPC)
-- ============================================================


-- ============================================================
--  PARTE 5 — POLICY PERICOLOSE TROVATE IN PRODUZIONE (2026-07-01)
--  L'ispezione (PARTE 1b) ha rivelato policy permissive stratificate
--  negli anni. Le policy permissive si sommano in OR: basta una riga
--  "true" per vanificare tutte le altre. Tre buchi reali:
--
--   A) profiles.profiles_select_auth  ->  {authenticated} USING true
--      Qualunque biologo loggato legge TUTTI i profili (email, role,
--      scadenza, stripe_*). Chiudibile SUBITO: la lettura corretta è già
--      garantita da profiles_select (id=auth.uid() OR is_staff()).
--
--   B) autovalutazioni: public_autovalutazioni_token/_update (USING true)
--      e "anon read/update by token" (token IS NOT NULL, sempre vero).
--      Chiunque legge/modifica qualsiasi autovalutazione.
--
--   C) risposte_autovalutazione: public_risposte_select/_insert (true).
--      Chiunque legge tutte le risposte e ne inserisce.
--
--  B e C esistono perché la vecchia valutazione.html accedeva alle
--  tabelle direttamente. Con le RPC (PARTE 3) + la nuova valutazione.html
--  non servono più e vanno rimosse — ma SOLO dopo che la pagina RPC è
--  online, altrimenti il questionario in produzione si rompe.
-- ============================================================

-- PASSO 1 (sicuro, subito):
drop policy if exists "profiles_select_auth" on public.profiles;

-- PASSO 4 (solo DOPO che la nuova valutazione.html è live):
drop policy if exists "public_autovalutazioni_token"  on public.autovalutazioni;
drop policy if exists "public_autovalutazioni_update" on public.autovalutazioni;
drop policy if exists "anon read by token"            on public.autovalutazioni;
drop policy if exists "anon update by token"          on public.autovalutazioni;
drop policy if exists "public_risposte_select"        on public.risposte_autovalutazione;
drop policy if exists "public_risposte_insert"        on public.risposte_autovalutazione;
drop policy if exists "anon insert risposte autoval"  on public.risposte_autovalutazione;

-- PULIZIA OPZIONALE (duplicati innocui ma disordinati): dopo aver
-- verificato che tutto funziona, si possono rimuovere le policy ridondanti
-- lasciando un solo set canonico (quelle *_owner_all con is_staff()):
-- drop policy if exists "biologo own autoval"     on public.autovalutazioni;
-- drop policy if exists "biologo_autovalutazioni" on public.autovalutazioni;
-- drop policy if exists "biologo own scuole"      on public.scuole;
-- drop policy if exists "biologo_scuole"          on public.scuole;
-- drop policy if exists "admin_scuole_select"     on public.scuole;
-- drop policy if exists "Admin read all scuole"   on public.scuole;
-- ... (idem per classi/pacchetti: tenere solo *_owner_all)
