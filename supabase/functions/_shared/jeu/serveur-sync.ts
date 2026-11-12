// Traitement d'une synchronisation côté serveur, indépendant de la base de données.
// L'edge function game-sync fournit un « Dépôt » branché sur Supabase ; les tests en fournissent un en mémoire.

import type { ActionHorodatee } from './actions.ts';
import type { Alea, ContexteGroupe } from './archives.ts';
import type { Jeu } from './donnees.ts';
import type { EtatJeu } from './etat.ts';
import { nouvelEtat } from './etat.ts';
import type { Evenement } from './evenements.ts';
import type { DonVoix } from './sync.ts';
import { MAX_ACTIONS_PAR_SYNC, synchroniser } from './sync.ts';

export interface EleveServeur {
  id: string;
  groupId: string;
  pseudonyme: string;
  nomGroupe: string;
}

export interface Depot {
  chargerEleve(id: string): Promise<EleveServeur | null>;
  chargerContexte(groupId: string): Promise<ContexteGroupe>;
  chargerPartie(id: string): Promise<{ etat: EtatJeu; version: number } | null>;
  chargerDons(id: string): Promise<DonVoix[]>;
  /** Écrit la partie si la version n'a pas changé. Retourne false en cas de conflit. */
  ecrirePartie(id: string, etat: EtatJeu, versionAttendue: number | null): Promise<boolean>;
  marquerDons(ids: string[], quand: number): Promise<void>;
  noterReponses(lignes: { questionId: string; concept: string; era: string; correct: boolean }[], eleveId: string): Promise<void>;
  noterPaquets(lignes: { source: string; cartes: unknown }[], eleveId: string): Promise<void>;
  noterVisite(id: string, quand: number): Promise<void>;
}

export class ErreurSync extends Error {
  statut: number;
  constructor(message: string, statut = 400) {
    super(message);
    this.statut = statut;
  }
}

/** Vérifie la forme des actions reçues du navigateur (le moteur vérifie le reste). */
export function validerActions(brut: unknown): ActionHorodatee[] {
  if (brut === undefined || brut === null) return [];
  if (!Array.isArray(brut)) throw new ErreurSync('Requête invalide.');
  if (brut.length > MAX_ACTIONS_PAR_SYNC) throw new ErreurSync('Trop d\'actions d\'un coup.');
  return brut.map((a) => {
    if (!a || typeof a !== 'object') throw new ErreurSync('Requête invalide.');
    const { action, at } = a as { action?: unknown; at?: unknown };
    if (!action || typeof action !== 'object' || typeof (action as { type?: unknown }).type !== 'string') {
      throw new ErreurSync('Requête invalide.');
    }
    return { action: action as ActionHorodatee['action'], at: typeof at === 'number' ? at : Number.NaN };
  });
}

export interface ReponseServeur {
  etat: EtatJeu;
  evenements: Evenement[];
  refus: { index: number; raison: string }[];
  contexte: ContexteGroupe;
  maintenant: number;
  profil: { pseudonyme: string; groupe: string };
}

export async function traiterSync(
  depot: Depot,
  eleveId: string,
  actionsBrutes: unknown,
  horloge: () => number,
  jeu: Jeu,
  alea: Alea,
): Promise<ReponseServeur> {
  const actions = validerActions(actionsBrutes);
  const eleve = await depot.chargerEleve(eleveId);
  if (!eleve) throw new ErreurSync('Compte élève introuvable.', 403);
  const contexte = await depot.chargerContexte(eleve.groupId);

  for (let essai = 0; essai < 4; essai++) {
    const partie = await depot.chargerPartie(eleveId);
    const maintenant = horloge();
    const etat = partie?.etat ?? nouvelEtat(jeu, maintenant);
    const dons = await depot.chargerDons(eleveId);
    const r = synchroniser(etat, actions, maintenant, jeu, contexte, alea, dons);
    const ok = await depot.ecrirePartie(eleveId, r.etat, partie ? partie.version : null);
    if (!ok) continue; // Une autre synchronisation est passée entre-temps : on recommence.

    if (r.donsAppliques.length) await depot.marquerDons(r.donsAppliques, maintenant);
    const reponses = r.evenements
      .filter((e): e is Extract<Evenement, { type: 'archives_resultat' }> => e.type === 'archives_resultat')
      .map((e) => {
        const q = jeu.questions.get(e.questionId)!;
        return { questionId: q.id, concept: q.concept, era: q.era, correct: e.correct };
      });
    if (reponses.length) await depot.noterReponses(reponses, eleveId);
    const paquets = r.evenements
      .filter((e): e is Extract<Evenement, { type: 'paquet' }> => e.type === 'paquet')
      .map((e) => ({ source: e.source, cartes: e.cartes }));
    if (paquets.length) await depot.noterPaquets(paquets, eleveId);
    await depot.noterVisite(eleveId, maintenant);

    return {
      etat: r.etat,
      evenements: r.evenements,
      refus: r.refus,
      contexte,
      maintenant,
      profil: { pseudonyme: eleve.pseudonyme, groupe: eleve.nomGroupe },
    };
  }
  throw new ErreurSync('Le serveur est occupé. Réessaie dans un instant.', 409);
}
