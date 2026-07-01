-- ============================================================
--  S.A.N.E. — Fix: impedisce l'auto-escalation dei biologi
--  Un biologo autenticato può (giustamente) aggiornare la propria
--  riga in `profiles` per nome/regione/ordine/genere. Ma la RLS
--  esistente lavora a livello di RIGA, non di colonna: senza
--  questo fix, lo stesso UPDATE può includere anche
--  stato/scadenza/role/stripe_*, bypassando pagamento e codici.
--
--  Verificato in produzione il 2026-07-01: un biologo di test ha
--  potuto impostare stato='active' su se stesso via console del
--  browser con successo (data: Array(1), error: null).
--
--  Questo trigger ripristina i campi sensibili al valore precedente per
--  qualsiasi UPDATE eseguito da un utente autenticato che non sia
--  admin/regional_admin. Bypassa i contesti senza JWT utente (SQL Editor,
--  service role delle Netlify Functions, connessioni dirette). Idempotente.
-- ============================================================

create or replace function public.profiles_protect_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  actor_id   uuid;
begin
  actor_id := auth.uid();

  -- Nessun utente autenticato nel contesto (SQL Editor, connessioni
  -- dirette, service role delle Netlify Functions): auth.uid() è NULL
  -- in tutti questi casi. Sono contesti già privilegiati: bypassa.
  if actor_id is null then
    return new;
  end if;

  -- Se chi esegue l'update (con un vero JWT utente) è admin/regional_admin,
  -- può modificare qualunque profilo (approvazioni, sospensioni, admin.html).
  select p.role into actor_role from public.profiles p where p.id = actor_id;
  if actor_role in ('admin', 'regional_admin') then
    return new;
  end if;

  -- Altrimenti: è un biologo che aggiorna la propria riga.
  -- Blocca i campi che governano l'accesso: non toccarli mai qui.
  new.stato                  := old.stato;
  new.scadenza                := old.scadenza;
  new.role                    := old.role;
  new.stripe_customer_id      := old.stripe_customer_id;
  new.stripe_subscription_id  := old.stripe_subscription_id;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_privileged_fields on public.profiles;
create trigger trg_profiles_protect_privileged_fields
  before update on public.profiles
  for each row
  execute function public.profiles_protect_privileged_fields();
