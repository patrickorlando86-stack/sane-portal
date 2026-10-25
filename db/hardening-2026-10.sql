-- ============================================================
--  S.A.N.E. — Rinforzi di sicurezza (revisione ottobre 2026)
--  Incolla nel SQL Editor di Supabase e "Run". Idempotente.
--  Cinque blocchi indipendenti: puoi eseguirli anche uno alla volta.
-- ============================================================


-- ── 1. PROFILES: protezione anche sull'INSERT ───────────────
--  Il trigger trg_profiles_protect_privileged_fields copre solo l'UPDATE.
--  La policy profiles_insert_self (id = auth.uid()) permette a un utente
--  di inserire la PROPRIA riga: se per qualunque motivo la riga non esiste
--  (trigger di signup mancante, riga cancellata), potrebbe crearla già con
--  role='admin' o stato='active'. Questo trigger lo impedisce.
--  Non tocca il signup normale: il trigger handle_new_user gira senza JWT
--  utente (auth.uid() è NULL) e l'upsert di biologo.html non manda campi
--  privilegiati.
create or replace function public.profiles_protect_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  -- SQL Editor, service role, trigger di signup: contesti già privilegiati
  if auth.uid() is null then
    return new;
  end if;

  select p.role into actor_role from public.profiles p where p.id = auth.uid();
  if actor_role = 'admin' then
    return new;
  end if;

  if new.role in ('admin', 'regional_admin')
     or new.stato = 'active'
     or new.scadenza is not null
     or new.stripe_customer_id is not null
     or new.stripe_subscription_id is not null then
    raise exception 'campi privilegiati non ammessi in inserimento';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_insert on public.profiles;
create trigger trg_profiles_protect_insert
  before insert on public.profiles
  for each row
  execute function public.profiles_protect_insert();


-- ── 2. PAYWALL anche lato database ─────────────────────────
--  Oggi il paywall esiste solo in biologo.html: le policy *_owner_all
--  controllano biologo_id = auth.uid() ma non la licenza. Un biologo
--  in attesa o scaduto può, dalla console del browser, cambiare
--  profilo.stato in memoria e usare il portale gratis (scuole, classi,
--  questionari vengono salvati normalmente).
--
--  Le policy RESTRICTIVE vanno in AND con tutte le altre (anche con le
--  policy vecchie stratificate trovate nell'audit), quindi chiudono il
--  buco senza dover ripulire prima tutto il resto.
--  Solo scrittura: un biologo scaduto continua a VEDERE i propri dati.
--  activity_log è esclusa apposta (la registrazione e il login scrivono
--  lì quando il profilo è ancora in attesa).
create or replace function public.has_active_license()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (
        role in ('admin', 'regional_admin')
        or (stato = 'active' and (scadenza is null or scadenza >= current_date))
      )
  );
$$;

do $$
declare t text;
begin
  foreach t in array array['scuole','pacchetti','classi','autovalutazioni','risposte']
  loop
    execute format('drop policy if exists %I on public.%I;', t||'_licenza_insert', t);
    execute format('drop policy if exists %I on public.%I;', t||'_licenza_update', t);
    execute format('drop policy if exists %I on public.%I;', t||'_licenza_delete', t);
    execute format('create policy %I on public.%I as restrictive for insert to authenticated
                      with check ( public.has_active_license() );', t||'_licenza_insert', t);
    execute format('create policy %I on public.%I as restrictive for update to authenticated
                      using ( public.has_active_license() ) with check ( public.has_active_license() );', t||'_licenza_update', t);
    execute format('create policy %I on public.%I as restrictive for delete to authenticated
                      using ( public.has_active_license() );', t||'_licenza_delete', t);
  end loop;
end $$;


-- ── 3. AUTOVALUTAZIONE: niente doppio invio ─────────────────
--  La versione in audit-rls.sql legge lo stato e POI aggiorna: due invii
--  quasi simultanei (doppio click, rete lenta) passano entrambi il
--  controllo e duplicano le risposte. Qui l'UPDATE condizionato prende
--  il "lucchetto": solo il primo invio trova stato='attesa'.
--  Limita anche il numero di righe (il questionario ne ha 25).
create or replace function public.autoval_submit(
  p_token text,
  p_righe jsonb,
  p_punteggio int,
  p_punteggio_max int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) > 100 then
    return false;
  end if;

  update public.autovalutazioni
     set stato = 'completata', punteggio_totale = p_punteggio,
         punteggio_max = p_punteggio_max, compilata_il = now()
   where token = p_token and stato = 'attesa'
  returning id into v_id;

  if v_id is null then return false; end if;

  insert into public.risposte_autovalutazione
    (autovalutazione_id, area, domanda_id, domanda, valore, non_applicabile)
  select v_id,
         r->>'area', (r->>'domanda_id')::int, r->>'domanda',
         nullif(r->>'valore','')::int, (r->>'non_applicabile')::boolean
  from jsonb_array_elements(p_righe) as r;

  return true;
end $$;

grant execute on function public.autoval_submit(text, jsonb, int, int) to anon, authenticated;


-- ── 4. RESPONSABILE REGIONALE: vede solo la propria regione ──
--  Oggi il filtro per regione esiste solo in admin.html: dalla console
--  del browser un regional_admin legge profili (email, scadenze, stripe_*)
--  e dati di tutte le regioni. admin.html filtra già per regione e nasconde
--  la vista nazionale, quindi il pannello non perde nulla.
--  Anche qui policy RESTRICTIVE: valgono qualunque altra policy ci sia.
--  Per admin e biologi non cambia niente.
create or replace function public.is_regional_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'regional_admin');
$$;

-- vero se il biologo indicato è della regione del regional_admin corrente
create or replace function public.in_mia_regione(p_biologo uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles b on b.regione = me.regione
    where me.id = auth.uid() and b.id = p_biologo
  );
$$;

drop policy if exists "profiles_regione" on public.profiles;
create policy "profiles_regione" on public.profiles
  as restrictive for all to authenticated
  using ( not public.is_regional_admin() or id = auth.uid() or public.in_mia_regione(id) );

do $$
declare t text;
begin
  foreach t in array array['scuole','pacchetti','classi','autovalutazioni','activity_log']
  loop
    execute format('drop policy if exists %I on public.%I;', t||'_regione', t);
    execute format('create policy %I on public.%I as restrictive for all to authenticated
                      using ( not public.is_regional_admin() or biologo_id = auth.uid()
                              or public.in_mia_regione(biologo_id) );', t||'_regione', t);
  end loop;
end $$;

drop policy if exists "risposte_regione" on public.risposte;
create policy "risposte_regione" on public.risposte
  as restrictive for all to authenticated
  using ( not public.is_regional_admin() or exists (
            select 1 from public.classi c
            where c.id = risposte.classe_id
              and (c.biologo_id = auth.uid() or public.in_mia_regione(c.biologo_id)) ) );

drop policy if exists "risposte_autoval_regione" on public.risposte_autovalutazione;
create policy "risposte_autoval_regione" on public.risposte_autovalutazione
  as restrictive for all to authenticated
  using ( not public.is_regional_admin() or exists (
            select 1 from public.autovalutazioni a
            where a.id = risposte_autovalutazione.autovalutazione_id
              and (a.biologo_id = auth.uid() or public.in_mia_regione(a.biologo_id)) ) );


-- ── 5. CODICI DI SBLOCCO: solo admin ────────────────────────
--  admin.html nasconde la sezione Codici ai regional_admin, ma la policy
--  li lasciava creare: un codice dà una licenza a chiunque, di qualsiasi
--  regione, aggirando il limite regionale del trigger sui profili.
drop policy if exists "admin gestisce codici" on public.codici_accesso;
create policy "admin gestisce codici"
  on public.codici_accesso
  for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );


-- ── VERIFICA ────────────────────────────────────────────────
--  Dopo l'esecuzione, da un account biologo in attesa (console del browser):
--    await db.from('scuole').insert({biologo_id:(await db.auth.getUser()).data.user.id,nome:'test',comune:'x',classi:1})
--  deve dare errore "new row violates row-level security policy".
--  Da un biologo attivo lo stesso insert deve funzionare.
--  Da un Responsabile Regionale:
--    await db.from('profiles').select('regione')
--  deve restituire solo profili della sua regione (più il proprio).
