// Synchronisation de la partie d'un élève : calcul officiel des gains (horloge du serveur),
// actions du joueur, ouverture des paquets, récompenses des Archives, Voix reçues.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';
import { clientAdmin, utilisateur } from '../_shared/serveur/clients.ts';
import { ErreurPublique, json, lireCorps, servir } from '../_shared/serveur/http.ts';
import { jeu } from '../_shared/serveur/donnees.ts';
import { aleaCrypto } from '../_shared/jeu/alea.ts';
import type { EtatJeu } from '../_shared/jeu/etat.ts';
import { ErreurSync, traiterSync, type Depot } from '../_shared/jeu/serveur-sync.ts';

function depotSupabase(db: SupabaseClient): Depot {
  const verifier = (error: unknown) => {
    if (error) throw error;
  };
  return {
    async chargerEleve(id) {
      const { data, error } = await db.from('students').select('id, group_id, pseudonym, groups(name)').eq('id', id).maybeSingle();
      verifier(error);
      if (!data) return null;
      const groupe = data.groups as unknown as { name: string } | null;
      return { id: data.id, groupId: data.group_id, pseudonyme: data.pseudonym, nomGroupe: groupe?.name ?? '' };
    },
    async chargerContexte(groupId) {
      const [g, o] = await Promise.all([
        db.from('groups').select('revision_mode').eq('id', groupId).single(),
        db.from('era_openings').select('era').eq('group_id', groupId),
      ]);
      verifier(g.error);
      verifier(o.error);
      return { erasOuvertes: ['prologue', ...(o.data ?? []).map((x) => x.era as string)], modeRevision: !!g.data?.revision_mode };
    },
    async chargerPartie(id) {
      const { data, error } = await db.from('game_states').select('state, version').eq('student_id', id).maybeSingle();
      verifier(error);
      return data ? { etat: data.state as EtatJeu, version: data.version as number } : null;
    },
    async chargerDons(id) {
      const { data, error } = await db.from('voix_grants').select('id, amount, reason').eq('student_id', id).is('claimed_at', null);
      verifier(error);
      return (data ?? []).map((d) => ({ id: d.id, montant: d.amount, raison: d.reason }));
    },
    async ecrirePartie(id, etat, versionAttendue) {
      const ligne = {
        state: etat,
        era: etat.era,
        heritage: etat.heritage,
        town_name: etat.townName,
        updated_at: new Date().toISOString(),
      };
      if (versionAttendue === null) {
        const { error } = await db.from('game_states').insert({ student_id: id, version: 1, ...ligne });
        if (error && error.code === '23505') return false; // déjà créée par une autre requête
        verifier(error);
        return true;
      }
      const { data, error } = await db
        .from('game_states')
        .update({ ...ligne, version: versionAttendue + 1 })
        .eq('student_id', id)
        .eq('version', versionAttendue)
        .select('student_id');
      verifier(error);
      return (data ?? []).length === 1;
    },
    async marquerDons(ids, quand) {
      const { error } = await db.from('voix_grants').update({ claimed_at: new Date(quand).toISOString() }).in('id', ids).is('claimed_at', null);
      verifier(error);
    },
    async noterReponses(lignes, eleveId) {
      const { error } = await db.from('archives_attempts').insert(
        lignes.map((l) => ({ student_id: eleveId, question_id: l.questionId, concept: l.concept, era: l.era, correct: l.correct })),
      );
      verifier(error);
    },
    async noterPaquets(lignes, eleveId) {
      const { error } = await db.from('pack_openings').insert(lignes.map((l) => ({ student_id: eleveId, source: l.source, cards: l.cartes })));
      verifier(error);
    },
    async noterVisite(id, quand) {
      const { error } = await db.from('students').update({ last_seen_at: new Date(quand).toISOString() }).eq('id', id);
      verifier(error);
    },
  };
}

Deno.serve(
  servir(async (req) => {
    const admin = clientAdmin();
    const eleveId = await utilisateur(req, admin);
    const { actions } = await lireCorps<{ actions?: unknown }>(req);
    try {
      const r = await traiterSync(depotSupabase(admin), eleveId, actions, () => Date.now(), jeu, aleaCrypto());
      return json(r);
    } catch (e) {
      if (e instanceof ErreurSync) throw new ErreurPublique(e.message, e.statut);
      throw e;
    }
  }),
);
