-- ============================================================
--  S.A.N.E. — Portale Biologi: abbonamenti Stripe + codici sblocco
--  Incolla questo SQL nell'editor di Supabase (SQL Editor) e "Run".
--  È idempotente: puoi rilanciarlo senza rompere nulla.
--
--  Modello d'accesso (NON cambia): l'accesso al portale resta
--  governato da  profiles.stato = 'active'  +  profiles.scadenza.
--  Qui aggiungiamo solo (1) i campi Stripe e (2) la tabella dei
--  codici di sblocco manuale con scadenza.
-- ============================================================


-- 1. PROFILI: campi Stripe ───────────────────────────────────
--    Servono al webhook per ritrovare l'utente ai rinnovi/disdette.
alter table public.profiles add column if not exists stripe_customer_id     text;
alter table public.profiles add column if not exists stripe_subscription_id text;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);
create index if not exists profiles_stripe_subscription_idx
  on public.profiles (stripe_subscription_id);


-- 2. TABELLA CODICI DI SBLOCCO ───────────────────────────────
--    Un codice, quando riscattato, mette il profilo del biologo
--    a stato='active' con scadenza = quella del codice.
create table if not exists public.codici_accesso (
  id         uuid primary key default gen_random_uuid(),
  codice     text unique not null,
  scadenza   date not null,               -- fin quando dà accesso il biologo che lo riscatta
  etichetta  text,                        -- nota libera (es. "Scuola X, omaggio 2026")
  attivo     boolean not null default true,
  usato_da   uuid references auth.users(id) on delete set null,
  usato_il   timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists codici_accesso_codice_idx on public.codici_accesso (codice);


-- 3. ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.codici_accesso enable row level security;

-- Il riscatto del codice avviene tramite una Netlify Function con la
-- SERVICE ROLE KEY (che bypassa la RLS): così il biologo NON può
-- flaggarsi da solo stato='active' dal browser. Per questo NON diamo
-- alcuna policy di lettura/scrittura agli utenti "authenticated" normali.

-- Solo admin / admin regionale possono vedere e gestire i codici
-- (il pannello admin.html usa la anon key con il ruolo dell'utente).
drop policy if exists "admin gestisce codici" on public.codici_accesso;
create policy "admin gestisce codici"
  on public.codici_accesso
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','regional_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','regional_admin')
    )
  );

-- Nota: la SERVICE ROLE KEY bypassa comunque la RLS, quindi la
-- funzione di riscatto e il webhook Stripe funzionano a prescindere
-- da queste policy.
