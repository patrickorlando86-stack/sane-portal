-- ============================================================
--  S.A.N.E. — Rate limit sul riscatto codici di sblocco
--  Incolla questo SQL nell'editor di Supabase (SQL Editor) e "Run".
--  È idempotente: puoi rilanciarlo senza rompere nulla.
--
--  Perché: la Netlify Function `riscatta-codice` accetta un codice
--  da un utente autenticato e lo verifica con la SERVICE ROLE KEY.
--  I codici hanno ~40 bit di entropia (SANE-XXXX-YYYY, alfabeto 32),
--  quindi il brute-force è di fatto infeasible; questa tabella serve
--  come difesa in profondità per limitare i tentativi (anti-hammering)
--  e per lasciare una traccia dei riscatti falliti.
-- ============================================================


-- 1. TABELLA TENTATIVI DI RISCATTO ───────────────────────────
--    Un record per ogni tentativo (riuscito o fallito). La function
--    conta i tentativi FALLITI recenti per decidere se bloccare.
create table if not exists public.codice_tentativi (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  ip         text,                        -- best-effort dall'header x-forwarded-for
  esito      text not null,               -- 'ok' | 'fail'
  created_at timestamptz not null default now()
);

-- Indice per la query di conteggio (per utente, nella finestra temporale)
create index if not exists codice_tentativi_user_created_idx
  on public.codice_tentativi (user_id, created_at desc);

-- Indice per l'eventuale rate limit per IP
create index if not exists codice_tentativi_ip_created_idx
  on public.codice_tentativi (ip, created_at desc);


-- 2. ROW LEVEL SECURITY ──────────────────────────────────────
--    Come per codici_accesso: la scrittura/lettura avviene solo dalla
--    Netlify Function con la SERVICE ROLE KEY (bypassa la RLS). Non
--    diamo NESSUNA policy agli utenti "authenticated": un biologo non
--    deve poter leggere o alterare il proprio conteggio di tentativi.
alter table public.codice_tentativi enable row level security;


-- 3. PULIZIA (opzionale) ─────────────────────────────────────
--    I record vecchi non servono al rate limit (finestra di minuti).
--    Puoi schedulare questa cancellazione con pg_cron, oppure lanciarla
--    manualmente ogni tanto. Non è necessaria per il funzionamento.
--    delete from public.codice_tentativi where created_at < now() - interval '30 days';
