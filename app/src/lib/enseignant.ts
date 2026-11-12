// Accès aux données pour le tableau de bord de l'enseignant.
// Lecture : directement dans la base (protégée par la RLS). Écriture : edge function teacher-admin (journalisée).

import { appeler, supabase } from './backend/distant.ts';

export interface Groupe {
  id: string;
  name: string;
  class_code: string;
  revision_mode: boolean;
}

export interface Eleve {
  id: string;
  pseudonym: string;
  team_id: string | null;
  last_seen_at: string | null;
  created_at: string;
  partie: { era: string; heritage: number; town_name: string | null; voix: number | null } | null;
}

export interface Equipe {
  id: string;
  name: string;
}

export interface StatQuestion {
  question_id: string;
  concept: string;
  era: string;
  tentatives: number;
  reussites: number;
}

export interface EntreeJournal {
  id: number;
  action: string;
  details: Record<string, unknown>;
  reason: string | null;
  created_at: string;
  student_id: string | null;
}

function verifier<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function connexionEnseignant(courriel: string, motDePasse: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email: courriel, password: motDePasse });
  if (error) throw new Error('Courriel ou mot de passe incorrect.');
}

export async function estEnseignant(): Promise<boolean> {
  const { data: s } = await supabase().auth.getSession();
  if (!s.session) return false;
  const r = await supabase().from('teachers').select('id').eq('id', s.session.user.id).maybeSingle();
  return !!r.data;
}

export async function deconnexion(): Promise<void> {
  await supabase().auth.signOut();
}

export async function groupes(): Promise<Groupe[]> {
  return verifier(await supabase().from('groups').select('id, name, class_code, revision_mode').order('name'));
}

export async function eleves(groupeId: string): Promise<Eleve[]> {
  const lignes = verifier(
    await supabase()
      .from('students')
      .select('id, pseudonym, team_id, last_seen_at, created_at, game_states(era, heritage, town_name, voix:state->portefeuille->voix)')
      .eq('group_id', groupeId)
      .order('pseudonym'),
  ) as unknown as (Omit<Eleve, 'partie'> & { game_states: Eleve['partie'] | Eleve['partie'][] })[];
  return lignes.map(({ game_states, ...e }) => ({ ...e, partie: Array.isArray(game_states) ? (game_states[0] ?? null) : game_states }));
}

export async function equipes(groupeId: string): Promise<Equipe[]> {
  return verifier(await supabase().from('teams').select('id, name').eq('group_id', groupeId).order('name'));
}

export async function epoquesOuvertes(groupeId: string): Promise<string[]> {
  const r = verifier(await supabase().from('era_openings').select('era').eq('group_id', groupeId));
  return (r as { era: string }[]).map((x) => x.era);
}

export async function statsArchives(groupeId: string): Promise<StatQuestion[]> {
  return verifier(await supabase().from('stats_archives').select('question_id, concept, era, tentatives, reussites').eq('group_id', groupeId));
}

export async function journal(groupeId: string): Promise<EntreeJournal[]> {
  return verifier(
    await supabase()
      .from('admin_log')
      .select('id, action, details, reason, created_at, student_id')
      .eq('group_id', groupeId)
      .order('created_at', { ascending: false })
      .limit(200),
  );
}

export async function partieComplete(eleveId: string): Promise<unknown> {
  const r = verifier(await supabase().from('game_states').select('state').eq('student_id', eleveId).maybeSingle());
  return (r as { state: unknown } | null)?.state ?? null;
}

/** Action d'écriture : passe par l'edge function teacher-admin (vérifiée et journalisée). */
export function admin<T = unknown>(op: string, params: Record<string, unknown>): Promise<T> {
  return appeler<T>('teacher-admin', { op, ...params });
}

export const ACTIONS_JOURNAL: Record<string, string> = {
  creer_groupe: 'Groupe créé',
  creer_eleves: 'Élèves ajoutés',
  reinitialiser_nip: 'NIP réinitialisé',
  renommer_eleve: 'Pseudonyme modifié',
  supprimer_eleve: 'Élève supprimé',
  creer_equipe: 'Équipe créée',
  supprimer_equipe: 'Équipe supprimée',
  donner_voix: 'Voix données',
  lancer_epoque: 'Époque lancée',
  mode_revision: 'Mode révision',
  nouveau_code: 'Nouveau code de classe',
  corriger: 'Correction',
  reinitialiser_partie: 'Partie réinitialisée',
  purger_groupe: 'Groupe effacé',
};
