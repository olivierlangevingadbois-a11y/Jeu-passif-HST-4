-- Tests des règles RLS et de la connexion par NIP. Chaque test lève une exception s'il échoue.
\set ON_ERROR_STOP on

-- Données : deux enseignants, deux groupes, trois élèves.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'prof1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'prof2@example.com'),
  ('00000000-0000-0000-0000-0000000000e1', 'e1@eleves.example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@eleves.example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'e3@eleves.example.com');
insert into public.teachers (id, display_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Prof 1'),
  ('00000000-0000-0000-0000-0000000000a2', 'Prof 2');
insert into public.groups (id, teacher_id, name, class_code) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', '401', 'ABC234'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', '402', 'XYZ789');
insert into public.students (id, group_id, pseudonym) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000001', 'Renard'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000001', 'Hibou'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-000000000002', 'Castor');
insert into public.student_secrets (student_id, pin_hash)
  select id, public.hacher_nip('1234') from public.students;
insert into public.game_states (student_id, state) select id, '{}'::jsonb from public.students;
insert into public.archives_attempts (student_id, question_id, concept, era, correct) values
  ('00000000-0000-0000-0000-0000000000e1', 'q1', 'c', 'prologue', true),
  ('00000000-0000-0000-0000-0000000000e3', 'q1', 'c', 'prologue', false);
insert into public.admin_log (teacher_id, action, reason) values ('00000000-0000-0000-0000-0000000000a1', 'test', 'essai');

create function pg_temp.verifier(condition boolean, message text) returns void language plpgsql as $$
begin
  if not condition then raise exception 'ÉCHEC : %', message; end if;
  raise notice 'ok : %', message;
end $$;

-- Connexion par NIP
select pg_temp.verifier((select statut from public.connexion_eleve('abc-234', ' renard ', '1234')) = 'ok', 'bon NIP, code et pseudonyme insensibles à la casse');
select pg_temp.verifier((select statut from public.connexion_eleve('ABC234', 'Renard', '0000')) = 'invalide', 'mauvais NIP');
select pg_temp.verifier((select statut from public.connexion_eleve('ZZZ999', 'Renard', '1234')) = 'invalide', 'mauvais code');
select public.connexion_eleve('ABC234', 'Hibou', '0000') from generate_series(1, 4);
select pg_temp.verifier((select statut from public.connexion_eleve('ABC234', 'Hibou', '0000')) = 'verrouille', '5e échec : verrouillé');
select pg_temp.verifier((select statut from public.connexion_eleve('ABC234', 'Hibou', '1234')) = 'verrouille', 'même le bon NIP est refusé pendant le verrou');
select pg_temp.verifier((select pin_hash from public.student_secrets limit 1) not like '%1234%', 'le NIP n''est pas stocké en clair');

-- Élève 1
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.verifier((select count(*) from public.students) = 1, 'élève : voit seulement son profil');
select pg_temp.verifier((select count(*) from public.game_states) = 1, 'élève : voit seulement sa partie');
select pg_temp.verifier((select count(*) from public.groups) = 1, 'élève : voit son groupe');
select pg_temp.verifier((select count(*) from public.archives_attempts) = 1, 'élève : voit ses réponses');
select pg_temp.verifier((select count(*) from public.admin_log) = 0, 'élève : ne voit pas le journal');
do $$ begin
  begin
    perform * from public.student_secrets;
    raise exception 'ÉCHEC : élève : lit les NIP';
  exception when insufficient_privilege then raise notice 'ok : élève : ne lit pas les NIP';
  end;
  begin
    update public.game_states set version = 99;
    raise exception 'ÉCHEC : élève : modifie sa partie';
  exception when insufficient_privilege then raise notice 'ok : élève : ne modifie pas sa partie directement';
  end;
  begin
    insert into public.voix_grants (student_id, amount) values ('00000000-0000-0000-0000-0000000000e1', 100);
    raise exception 'ÉCHEC : élève : se donne des Voix';
  exception when insufficient_privilege then raise notice 'ok : élève : ne se donne pas de Voix';
  end;
  begin
    perform public.connexion_eleve('ABC234', 'Renard', '1234');
    raise exception 'ÉCHEC : élève : appelle la fonction de connexion';
  exception when insufficient_privilege then raise notice 'ok : élève : n''appelle pas la fonction de connexion';
  end;
end $$;
reset role;

-- Enseignant 1
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.verifier((select count(*) from public.students) = 2, 'enseignant : voit les élèves de son groupe seulement');
select pg_temp.verifier((select count(*) from public.game_states) = 2, 'enseignant : voit les parties de ses élèves');
select pg_temp.verifier((select count(*) from public.groups) = 1, 'enseignant : voit son groupe seulement');
select pg_temp.verifier((select count(*) from public.stats_archives) = 1, 'enseignant : statistiques de son groupe seulement');
select pg_temp.verifier((select count(*) from public.admin_log) = 1, 'enseignant : voit son journal');
do $$ begin
  begin
    delete from public.admin_log;
    raise exception 'ÉCHEC : enseignant : efface le journal';
  exception when insufficient_privilege then raise notice 'ok : enseignant : n''efface pas le journal';
  end;
end $$;
reset role;

-- Visiteur anonyme
set role anon;
do $$ begin
  begin
    perform * from public.students;
    raise exception 'ÉCHEC : anonyme : lit les élèves';
  exception when insufficient_privilege then raise notice 'ok : anonyme : ne lit rien';
  end;
end $$;
reset role;

-- Purge de fin d'année
select pg_temp.verifier(public.purger_groupe('00000000-0000-0000-0000-000000000001') = 2, 'purge : 2 comptes effacés');
select pg_temp.verifier((select count(*) from public.students) = 1, 'purge : il reste l''élève de l''autre groupe');
select pg_temp.verifier((select count(*) from public.archives_attempts) = 1, 'purge : réponses effacées en cascade');
