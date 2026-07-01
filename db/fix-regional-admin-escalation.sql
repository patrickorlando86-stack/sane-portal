-- ============================================================
--  S.A.N.E. — Fix: escalation del Responsabile Regionale
--
--  PROBLEMA (trovato il 2026-07-01): il confine regionale del
--  regional_admin esiste solo nell'interfaccia (admin.html filtra i dati
--  e nasconde i pulsanti). A livello DB:
--    - la RLS usa is_staff() = admin OR regional_admin -> accesso pieno;
--    - il trigger anti-escalation faceva "return new" ANCHE per
--      regional_admin, senza proteggere alcun campo.
--  Risultato: un regional_admin, dalla console del browser, poteva agire
--  sui biologi di QUALSIASI regione e soprattutto AUTO-PROMUOVERSI ad
--  admin:  update profiles set role='admin' where id = auth.uid()
--
--  QUESTO FIX ridefinisce il trigger (sostituisce quello di
--  fix-rls-profiles-autoescalation.sql) con tre livelli:
--    - admin           : nessun limite (approva/sospende/cambia ruoli ovunque)
--    - regional_admin  : può cambiare stato/scadenza SOLO dei biologi della
--                        propria regione; NON può mai toccare role/stripe_*,
--                        né i profili di altre regioni, né la propria licenza
--    - biologo         : nessun campo privilegiato (come prima)
--  Bypassa i contesti senza JWT utente (SQL Editor, service role). Idempotente.
-- ============================================================

create or replace function public.profiles_protect_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role    text;
  actor_id      uuid;
  actor_regione text;
begin
  actor_id := auth.uid();

  -- Nessun utente autenticato nel contesto (SQL Editor, connessioni dirette,
  -- service role delle Netlify Functions): contesti già privilegiati, bypassa.
  if actor_id is null then
    return new;
  end if;

  select p.role, p.regione
    into actor_role, actor_regione
    from public.profiles p
   where p.id = actor_id;

  -- Admin pieno: può modificare qualunque profilo e qualunque campo.
  if actor_role = 'admin' then
    return new;
  end if;

  -- Responsabile regionale: poteri limitati.
  if actor_role = 'regional_admin' then
    -- Non può MAI cambiare il ruolo (niente auto-promozione ad admin) né i
    -- campi Stripe.
    new.role                   := old.role;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;

    -- Può cambiare stato/scadenza SOLO dei biologi della propria regione, e
    -- MAI del proprio profilo (niente auto-concessione di licenza). Fuori da
    -- questi casi, ripristina i campi che governano l'accesso.
    if (old.regione is distinct from actor_regione) or (old.id = actor_id) then
      new.stato    := old.stato;
      new.scadenza := old.scadenza;
    end if;

    return new;
  end if;

  -- Biologo normale che aggiorna la propria riga: blocca tutti i campi che
  -- governano l'accesso.
  new.stato                  := old.stato;
  new.scadenza               := old.scadenza;
  new.role                   := old.role;
  new.stripe_customer_id     := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_privileged_fields on public.profiles;
create trigger trg_profiles_protect_privileged_fields
  before update on public.profiles
  for each row
  execute function public.profiles_protect_privileged_fields();

-- ============================================================
--  NOTA — LETTURA (SELECT): questo fix riguarda solo la SCRITTURA.
--  Con is_staff() il regional_admin può ancora LEGGERE i profili di tutte le
--  regioni (admin.html filtra lato client). Se vuoi isolare davvero anche la
--  lettura per regione, va cambiata la policy profiles_select, ad es.:
--
--    -- helper: regione dell'utente corrente (SECURITY DEFINER, anti-ricorsione)
--    -- e policy: id = auth.uid()
--    --        OR exists(select 1 from profiles a where a.id=auth.uid() and a.role='admin')
--    --        OR (is_staff() and regione = (select regione from profiles where id=auth.uid()))
--
--  Da valutare: alcune viste "nazionali" del pannello potrebbero volere il
--  dato aggregato di tutte le regioni. Per questo lo lascio come scelta.
-- ============================================================
