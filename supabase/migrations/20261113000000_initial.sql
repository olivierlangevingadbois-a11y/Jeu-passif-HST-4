-- De la paroisse à la ville : schéma initial.
--
-- Principes :
-- - Les élèves et l'enseignant LISENT avec les règles RLS ci-dessous.
-- - Toutes les ÉCRITURES passent par les edge functions (rôle service_role), qui valident tout.
-- - Aucune règle INSERT/UPDATE/DELETE pour les rôles anon et authenticated.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
comment on table public.teachers is 'Comptes enseignants (connexion par courriel et mot de passe).';

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  class_code text not null unique check (class_code ~ '^[A-Z0-9]{6}$'),
  revision_mode boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.groups is 'Groupes-classes. class_code : code de classe donné aux élèves.';

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  pseudonym text not null check (char_length(pseudonym) between 1 and 30),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create unique index students_pseudonyme_unique on public.students (group_id, lower(pseudonym));
comment on table public.students is 'Élèves. Aucun courriel ni date de naissance (Loi 25).';

create table public.student_secrets (
  student_id uuid primary key references public.students (id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz
);
comment on table public.student_secrets is 'NIP haché (bcrypt). Lisible par personne, sauf le serveur.';

create table public.era_openings (
  group_id uuid not null references public.groups (id) on delete cascade,
  era text not null check (era in ('epoque_1', 'epoque_2', 'epoque_3', 'epoque_4')),
  opened_at timestamptz not null default now(),
  opened_by uuid references public.teachers (id) on delete set null,
  primary key (group_id, era)
);
comment on table public.era_openings is 'Époques lancées par l''enseignant pour un groupe (le prologue est toujours ouvert).';

create table public.game_states (
  student_id uuid primary key references public.students (id) on delete cascade,
  state jsonb not null,
  version integer not null default 1,
  era text not null default 'prologue',
  heritage numeric not null default 0,
  town_name text,
  updated_at timestamptz not null default now()
);
comment on table public.game_states is 'Sauvegarde complète du joueur (state). era, heritage, town_name : copies pour le tableau de bord.';

create table public.voix_grants (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  amount integer not null check (amount > 0 and amount <= 1000),
  reason text check (reason is null or char_length(reason) <= 120),
  granted_by uuid references public.teachers (id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index voix_grants_a_reclamer on public.voix_grants (student_id) where claimed_at is null;
comment on table public.voix_grants is 'Voix données par l''enseignant. Ajoutées au joueur à sa prochaine synchronisation (claimed_at).';

create table public.archives_attempts (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  question_id text not null,
  concept text not null,
  era text not null,
  correct boolean not null,
  answered_at timestamptz not null default now()
);
create index archives_attempts_eleve on public.archives_attempts (student_id);

create table public.pack_openings (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  source text not null check (source in ('voix', 'gratuit')),
  cards jsonb not null,
  opened_at timestamptz not null default now()
);

create table public.admin_log (
  id bigint generated always as identity primary key,
  teacher_id uuid references public.teachers (id) on delete set null,
  group_id uuid references public.groups (id) on delete set null,
  student_id uuid references public.students (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now()
);
comment on table public.admin_log is 'Journal des actions de l''enseignant (date, raison). Ajouts seulement.';

-- ---------------------------------------------------------------------------
-- Fonctions utilitaires pour les règles RLS
-- ---------------------------------------------------------------------------

create or replace function public.est_enseignant_du_groupe(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.groups g where g.id = gid and g.teacher_id = (select auth.uid()));
$$;

create or replace function public.groupe_de_l_eleve()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select s.group_id from public.students s where s.id = (select auth.uid());
$$;

create or replace function public.est_enseignant_de_l_eleve(sid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.students s join public.groups g on g.id = s.group_id
    where s.id = sid and g.teacher_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security : lecture seulement
-- ---------------------------------------------------------------------------

alter table public.teachers enable row level security;
alter table public.groups enable row level security;
alter table public.teams enable row level security;
alter table public.students enable row level security;
alter table public.student_secrets enable row level security;
alter table public.era_openings enable row level security;
alter table public.game_states enable row level security;
alter table public.voix_grants enable row level security;
alter table public.archives_attempts enable row level security;
alter table public.pack_openings enable row level security;
alter table public.admin_log enable row level security;

create policy "enseignant : son compte" on public.teachers
  for select to authenticated using (id = (select auth.uid()));

create policy "enseignant : ses groupes" on public.groups
  for select to authenticated using (teacher_id = (select auth.uid()));
create policy "élève : son groupe" on public.groups
  for select to authenticated using (id = (select public.groupe_de_l_eleve()));

create policy "enseignant : équipes de ses groupes" on public.teams
  for select to authenticated using ((select public.est_enseignant_du_groupe(group_id)));

create policy "élève : son profil" on public.students
  for select to authenticated using (id = (select auth.uid()));
create policy "enseignant : élèves de ses groupes" on public.students
  for select to authenticated using ((select public.est_enseignant_du_groupe(group_id)));

-- student_secrets : aucune règle, donc aucun accès sauf service_role.

create policy "élève : époques de son groupe" on public.era_openings
  for select to authenticated using (group_id = (select public.groupe_de_l_eleve()));
create policy "enseignant : époques de ses groupes" on public.era_openings
  for select to authenticated using ((select public.est_enseignant_du_groupe(group_id)));

create policy "élève : sa partie" on public.game_states
  for select to authenticated using (student_id = (select auth.uid()));
create policy "enseignant : parties de ses élèves" on public.game_states
  for select to authenticated using ((select public.est_enseignant_de_l_eleve(student_id)));

create policy "élève : ses Voix" on public.voix_grants
  for select to authenticated using (student_id = (select auth.uid()));
create policy "enseignant : Voix de ses élèves" on public.voix_grants
  for select to authenticated using ((select public.est_enseignant_de_l_eleve(student_id)));

create policy "élève : ses réponses" on public.archives_attempts
  for select to authenticated using (student_id = (select auth.uid()));
create policy "enseignant : réponses de ses élèves" on public.archives_attempts
  for select to authenticated using ((select public.est_enseignant_de_l_eleve(student_id)));

create policy "élève : ses paquets" on public.pack_openings
  for select to authenticated using (student_id = (select auth.uid()));
create policy "enseignant : paquets de ses élèves" on public.pack_openings
  for select to authenticated using ((select public.est_enseignant_de_l_eleve(student_id)));

create policy "enseignant : son journal" on public.admin_log
  for select to authenticated using (teacher_id = (select auth.uid()));

-- Droits : lecture pour les utilisateurs connectés, rien pour les visiteurs anonymes.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
revoke select on public.student_secrets from authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Statistiques des Archives (respectent la RLS de l'appelant)
-- ---------------------------------------------------------------------------

create view public.stats_archives
with (security_invoker = true) as
select
  s.group_id,
  a.question_id,
  a.concept,
  a.era,
  count(*)::integer as tentatives,
  count(*) filter (where a.correct)::integer as reussites
from public.archives_attempts a
join public.students s on s.id = a.student_id
group by s.group_id, a.question_id, a.concept, a.era;

revoke all on public.stats_archives from anon;
grant select on public.stats_archives to authenticated;

-- ---------------------------------------------------------------------------
-- NIP : hachage et connexion (appelées seulement par les edge functions)
-- ---------------------------------------------------------------------------

create or replace function public.hacher_nip(nip text)
returns text
language sql volatile security definer set search_path = ''
as $$
  select extensions.crypt(nip, extensions.gen_salt('bf', 10));
$$;

-- Vérifie un NIP et gère le verrouillage après plusieurs échecs.
-- statut : 'ok', 'invalide' (code, pseudonyme ou NIP incorrect) ou 'verrouille'.
create or replace function public.connexion_eleve(
  code text,
  pseudo text,
  nip text,
  max_essais integer default 5,
  minutes_verrou integer default 15
)
returns table (student_id uuid, statut text, verrouille_jusqua timestamptz)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  eleve uuid;
  secret public.student_secrets%rowtype;
begin
  select s.id into eleve
  from public.students s
  join public.groups g on g.id = s.group_id
  where g.class_code = upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'))
    and lower(s.pseudonym) = lower(btrim(pseudo));

  if eleve is null then
    return query select null::uuid, 'invalide'::text, null::timestamptz;
    return;
  end if;

  select * into secret from public.student_secrets ss where ss.student_id = eleve for update;
  if not found then
    return query select null::uuid, 'invalide'::text, null::timestamptz;
    return;
  end if;

  if secret.locked_until is not null and secret.locked_until > now() then
    return query select null::uuid, 'verrouille'::text, secret.locked_until;
    return;
  end if;

  if secret.pin_hash = extensions.crypt(nip, secret.pin_hash) then
    update public.student_secrets set failed_attempts = 0, locked_until = null where student_secrets.student_id = eleve;
    update public.students set last_seen_at = now() where id = eleve;
    return query select eleve, 'ok'::text, null::timestamptz;
    return;
  end if;

  if secret.failed_attempts + 1 >= max_essais then
    update public.student_secrets
      set failed_attempts = 0, locked_until = now() + make_interval(mins => minutes_verrou)
      where student_secrets.student_id = eleve;
    return query select null::uuid, 'verrouille'::text, now() + make_interval(mins => minutes_verrou);
  else
    update public.student_secrets set failed_attempts = failed_attempts + 1 where student_secrets.student_id = eleve;
    return query select null::uuid, 'invalide'::text, null::timestamptz;
  end if;
end;
$$;

-- Fin d'année : efface un groupe et tous ses élèves (comptes de connexion compris).
create or replace function public.purger_groupe(gid uuid)
returns integer
language plpgsql volatile security definer set search_path = ''
as $$
declare
  n integer;
begin
  with supprimes as (
    delete from auth.users u
    where u.id in (select s.id from public.students s where s.group_id = gid)
    returning u.id
  )
  select count(*) into n from supprimes;
  delete from public.groups where id = gid;
  return n;
end;
$$;

revoke all on function public.hacher_nip(text) from public, anon, authenticated;
revoke all on function public.connexion_eleve(text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.purger_groupe(uuid) from public, anon, authenticated;
grant execute on function public.hacher_nip(text) to service_role;
grant execute on function public.connexion_eleve(text, text, text, integer, integer) to service_role;
grant execute on function public.purger_groupe(uuid) to service_role;
