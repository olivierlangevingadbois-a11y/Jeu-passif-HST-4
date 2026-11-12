// Synchronisation : le calcul officiel fait par le serveur à chaque sauvegarde.
//
// 1. Les Voix données par l'enseignant sont ajoutées.
// 2. Si le joueur était absent depuis longtemps, les gains hors ligne sont calculés (avec plafond).
// 3. Les actions sont appliquées dans l'ordre, chacune à son moment (borné entre le dernier calcul et maintenant).
// 4. La production est calculée jusqu'à maintenant.
//
// « maintenant » vient toujours de l'horloge du serveur : changer l'heure du téléphone ne donne rien.

import type { Jeu } from './donnees.ts';
import type { EtatJeu } from './etat.ts';
import { cloner } from './etat.ts';
import type { Evenement } from './evenements.ts';
import { avancer, avancerHorsLigne, nettoyer, verifierCrise } from './simulation.ts';
import type { ActionHorodatee } from './actions.ts';
import { appliquerAction, Refus } from './actions.ts';
import type { Alea, ContexteGroupe } from './archives.ts';

export interface DonVoix {
  id: string;
  montant: number;
  raison: string | null;
}

export interface ResultatSync {
  etat: EtatJeu;
  evenements: Evenement[];
  /** Actions refusées (index dans la liste reçue) avec la raison, en français. */
  refus: { index: number; raison: string }[];
  /** Dons de Voix appliqués (à marquer comme réclamés). */
  donsAppliques: string[];
}

export const MAX_ACTIONS_PAR_SYNC = 500;

export function synchroniser(
  etatInitial: EtatJeu,
  actions: ActionHorodatee[],
  maintenant: number,
  jeu: Jeu,
  ctx: ContexteGroupe,
  alea: Alea,
  dons: DonVoix[] = [],
): ResultatSync {
  let etat = cloner(etatInitial);
  const evenements: Evenement[] = [];
  const refus: ResultatSync['refus'] = [];
  const donsAppliques: string[] = [];

  // Un état venant du futur (horloge corrigée) est ramené à maintenant.
  if (etat.lastComputedAt > maintenant) etat.lastComputedAt = maintenant;

  for (const d of dons) {
    if (d.montant <= 0) continue;
    etat.portefeuille.voix += Math.floor(d.montant);
    donsAppliques.push(d.id);
    evenements.push({ type: 'voix_recues', montant: Math.floor(d.montant), raison: d.raison });
  }

  const liste = actions.slice(0, MAX_ACTIONS_PAR_SYNC);
  const borne = (at: number) => Math.min(maintenant, Math.max(etat.lastComputedAt, Number.isFinite(at) ? at : maintenant));

  // Absence prolongée avant la première action.
  const premier = liste.length ? borne(liste[0].at) : maintenant;
  if (premier - etat.lastComputedAt > jeu.balance.offline.thresholdSeconds * 1000) {
    avancerHorsLigne(etat, jeu, premier, evenements);
  }

  liste.forEach((a, index) => {
    const t = borne(a.at);
    avancer(etat, jeu, t, { evenements });
    const sauvegarde = cloner(etat);
    const evAvant = evenements.length;
    try {
      appliquerAction(etat, jeu, ctx, a.action, t, alea, evenements);
      // Une action peut faire commencer ou finir une crise.
      verifierCrise(etat, jeu, t, evenements);
      nettoyer(etat, jeu, t, evenements);
    } catch (e) {
      etat = sauvegarde;
      evenements.length = evAvant;
      refus.push({ index, raison: e instanceof Refus ? e.message : 'Action invalide.' });
    }
  });

  avancer(etat, jeu, maintenant, { evenements });
  return { etat, evenements, refus, donsAppliques };
}
