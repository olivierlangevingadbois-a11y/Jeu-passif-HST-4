// Actions du joueur. Chacune est validée puis appliquée par le serveur ;
// le navigateur applique les mêmes règles pour afficher le résultat tout de suite.

import type { EraId } from './contenu.ts';
import type { Jeu } from './donnees.ts';
import { eraSuivante } from './donnees.ts';
import type { EtatJeu } from './etat.ts';
import { nouvellePartie } from './etat.ts';
import type { Evenement } from './evenements.ts';
import {
  batimentsDisponibles,
  calculerModificateurs,
  cartesAccessibles,
  coutNiveau,
  estDebloque,
  heritageAuPassage,
  mesuresCriseActives,
  niveau,
  nombreEmplacements,
} from './economie.ts';
import type { Alea, ContexteGroupe, Reponse } from './archives.ts';
import { consommerCharge, estCorrecte, questionsAutorisees } from './archives.ts';
import { coutNiveauCarte, ouvrirPaquet } from './paquets.ts';

export type Action =
  | { type: 'construire'; batiment: string; quantite?: number }
  | { type: 'ameliorer'; amelioration: string }
  | { type: 'recensement' }
  | { type: 'passage' }
  | { type: 'conseil'; emplacement: number; carte: string | null }
  | { type: 'archives_repondre'; questionId: string; reponse: Reponse }
  | { type: 'archives_recompense'; choix: 'boost' | 'heritage' | 'fragments' }
  | { type: 'ouvrir_paquet'; source: 'voix' | 'gratuit' }
  | { type: 'ameliorer_carte'; carte: string }
  | { type: 'acheter_carte'; carte: string }
  | { type: 'heritage_acheter'; noeud: string }
  | { type: 'crise_payer' }
  | { type: 'nommer_ville'; nom: string }
  | { type: 'tutoriel'; etape: number }
  | { type: 'tutoriel_carte' }
  | { type: 'crise_lue'; crise: string };

/** Actions dont le résultat dépend du hasard : seul le serveur peut les appliquer. */
export const ACTIONS_SERVEUR: Action['type'][] = ['ouvrir_paquet', 'archives_repondre', 'archives_recompense'];

export interface ActionHorodatee {
  action: Action;
  /** Moment de l'action, estimé selon l'horloge du serveur (ms). */
  at: number;
}

export class Refus extends Error {}

function refuser(raison: string): never {
  throw new Refus(raison);
}

export const NOM_VILLE_MAX = 30;

export function nettoyerNomVille(nom: string): string {
  return nom.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NOM_VILLE_MAX);
}

/**
 * Applique une action à l'instant t (l'état doit déjà être avancé jusqu'à t).
 * Lance un Refus si l'action n'est pas permise ; l'état n'est alors pas modifié.
 */
export function appliquerAction(
  etat: EtatJeu,
  jeu: Jeu,
  ctx: ContexteGroupe,
  action: Action,
  t: number,
  alea: Alea,
  evenements: Evenement[],
): void {
  const B = jeu.balance;
  const p = etat.partie;

  switch (action.type) {
    case 'construire': {
      const b = batimentsDisponibles(etat, jeu).find((x) => x.id === action.batiment);
      if (!b || !B.buildings[b.id]) refuser('Bâtiment indisponible.');
      if (!estDebloque(etat, jeu, b.id)) refuser('Il faut plus d\'habitants pour ce bâtiment.');
      const n = Math.max(1, Math.min(100, Math.floor(action.quantite ?? 1)));
      let achetes = 0;
      for (let i = 0; i < n; i++) {
        const cout = coutNiveau(jeu, b.id, niveau(etat, b.id));
        if (p.argent < cout) break;
        p.argent -= cout;
        p.buildings[b.id] = niveau(etat, b.id) + 1;
        achetes++;
      }
      if (achetes === 0) refuser('Pas assez d\'argent.');
      return;
    }

    case 'ameliorer': {
      const proprio = jeu.upgradeOwner.get(action.amelioration);
      const ub = B.upgrades[action.amelioration];
      if (!proprio || !ub || !batimentsDisponibles(etat, jeu).some((b) => b.id === proprio)) refuser('Amélioration indisponible.');
      if (p.upgrades.includes(action.amelioration)) refuser('Amélioration déjà achetée.');
      if (niveau(etat, proprio) < ub.requiresLevel) refuser(`Il faut le niveau ${ub.requiresLevel}.`);
      if (p.argent < ub.cost) refuser('Pas assez d\'argent.');
      p.argent -= ub.cost;
      p.upgrades.push(action.amelioration);
      return;
    }

    case 'recensement': {
      const min = B.eras[etat.era]!.recensement.minHabitants;
      if (p.habitants < min) refuser(`Il faut au moins ${min} habitants pour un recensement.`);
      const comptes = Math.floor(p.habitants);
      etat.epoque.habitantsRecenses += comptes;
      etat.epoque.recensements += 1;
      etat.partie = nouvellePartie(jeu, etat.era, etat.heritageTree);
      const faits = jeu.eras.get(etat.era)?.recensementFacts ?? [];
      const fait = faits.length ? faits[(etat.epoque.recensements - 1) % faits.length] : null;
      const mods = calculerModificateurs(etat, jeu, t);
      evenements.push({ type: 'recensement', era: etat.era, factId: fait?.id ?? null, habitantsComptes: comptes, multiplicateur: mods.recensement });
      return;
    }

    case 'passage': {
      if (etat.epoque.jalonAtteintLe === null) refuser('Le jalon de l\'époque n\'est pas encore atteint.');
      const suivante = eraSuivante(jeu, etat.era);
      if (!suivante) refuser('La prochaine époque n\'est pas encore disponible.');
      if (!eraOuverte(ctx, suivante)) refuser('Ton enseignant n\'a pas encore ouvert la prochaine époque.');
      const mods = calculerModificateurs(etat, jeu, t);
      const gain = heritageAuPassage(etat, jeu, mods);
      const de = etat.era;
      const monument = jeu.eras.get(de)?.monumentBuildingId ?? null;
      etat.heritage += gain;
      etat.heritageGagneTotal += gain;
      if (monument && jeu.buildings.has(monument) && !etat.monuments.includes(monument)) etat.monuments.push(monument);
      etat.historiqueEpoques.push({ era: de, heritage: gain, termineLe: t, recensements: etat.epoque.recensements });
      etat.portefeuille.paquetsGratuits += B.packs.freePacksOnPassage;
      etat.era = suivante;
      etat.partie = nouvellePartie(jeu, suivante, etat.heritageTree);
      etat.epoque = { productionTotal: 0, recensements: 0, habitantsRecenses: 0, crises: [], jalonAtteintLe: null, debuteLe: t };
      etat.crise = null;
      evenements.push({ type: 'passage', de, vers: suivante, heritage: gain, paquetsGratuits: B.packs.freePacksOnPassage, monument });
      return;
    }

    case 'conseil': {
      const n = nombreEmplacements(etat, jeu);
      const i = Math.floor(action.emplacement);
      if (i < 0 || i >= n) refuser('Emplacement invalide.');
      while (etat.conseil.length < n) etat.conseil.push(null);
      if (action.carte !== null) {
        if (!etat.cartes[action.carte] || !jeu.cards.has(action.carte)) refuser('Tu n\'as pas cette carte.');
        // Une carte ne siège qu'une fois : elle quitte son ancien emplacement.
        etat.conseil = etat.conseil.map((c) => (c === action.carte ? null : c));
      }
      etat.conseil[i] = action.carte;
      return;
    }

    case 'archives_repondre': {
      if (etat.archives.enAttente) refuser('Choisis d\'abord ta récompense.');
      const q = jeu.questions.get(action.questionId);
      if (!q || !questionsAutorisees(etat, jeu, ctx).some((x) => x.id === q.id)) refuser('Question indisponible.');
      if (!consommerCharge(etat, jeu, t)) refuser('Plus de charges : reviens plus tard.');
      const correct = estCorrecte(q, action.reponse);
      const h = (etat.archives.historique[q.id] ??= { vues: 0, reussies: 0 });
      h.vues += 1;
      if (correct) {
        h.reussies += 1;
        etat.archives.enAttente = { questionId: q.id };
        // Atténuation de crise par les Archives.
        if (etat.crise) {
          const crise = jeu.crises.get(etat.crise.id);
          const m = crise?.mitigations.find((x) => x.kind === 'archives');
          if (m && (m.ref === null ? q.era === etat.era : m.ref === q.concept) && !etat.crise.mitigations.includes('archives')) {
            etat.crise.mitigations.push('archives');
            evenements.push({ type: 'crise_mesure', crise: etat.crise.id, mesure: 'archives' });
          }
        }
      }
      evenements.push({ type: 'archives_resultat', questionId: q.id, correct });
      return;
    }

    case 'archives_recompense': {
      if (!etat.archives.enAttente) refuser('Aucune récompense en attente.');
      const R = B.archives.rewards;
      const bonus = 1 + calculerModificateurs(etat, jeu, t).archivesBonus;
      let valeur = 0;
      if (action.choix === 'boost') {
        const duree = R.boost.minutes * bonus * 60_000;
        const actif = etat.boosts.find((b) => b.kind === 'production' && b.endsAt > t);
        if (actif) actif.endsAt += duree;
        else etat.boosts.push({ kind: 'production', multiplier: R.boost.multiplier, endsAt: t + duree });
        valeur = Math.round(R.boost.minutes * bonus);
      } else if (action.choix === 'heritage') {
        valeur = Math.round(R.heritage * bonus * 10) / 10;
        etat.heritage += valeur;
        etat.heritageGagneTotal += valeur;
      } else if (action.choix === 'fragments') {
        valeur = Math.max(1, Math.round(R.fragments * bonus));
        etat.portefeuille.fragments += valeur;
      } else refuser('Choix inconnu.');
      const paquetBonus = alea() < B.packs.archivesPackChance;
      if (paquetBonus) etat.portefeuille.paquetsGratuits += 1;
      etat.archives.enAttente = null;
      evenements.push({ type: 'archives_recompense', choix: action.choix, valeur, paquetBonus });
      return;
    }

    case 'ouvrir_paquet': {
      if (cartesAccessibles(etat, jeu).length === 0) refuser('Aucune carte disponible pour l\'instant.');
      if (action.source === 'gratuit') {
        if (etat.portefeuille.paquetsGratuits < 1) refuser('Aucun paquet gratuit.');
        etat.portefeuille.paquetsGratuits -= 1;
      } else {
        if (etat.portefeuille.voix < B.packs.costVoix) refuser('Pas assez de Voix.');
        etat.portefeuille.voix -= B.packs.costVoix;
      }
      const r = ouvrirPaquet(etat, jeu, alea, t);
      evenements.push({ type: 'paquet', source: action.source, cartes: r.cartes, pitieDeclenchee: r.pitieDeclenchee });
      return;
    }

    case 'ameliorer_carte': {
      const c = etat.cartes[action.carte];
      if (!c) refuser('Tu n\'as pas cette carte.');
      const cout = coutNiveauCarte(jeu, c.niveau);
      if (cout === null) refuser('Cette carte est déjà au niveau maximum.');
      if (etat.portefeuille.fragments < cout) refuser('Pas assez de fragments.');
      etat.portefeuille.fragments -= cout;
      c.niveau += 1;
      return;
    }

    case 'acheter_carte': {
      const carte = jeu.cards.get(action.carte);
      if (!carte || !cartesAccessibles(etat, jeu).includes(carte.id)) refuser('Carte indisponible.');
      if (etat.cartes[carte.id]) refuser('Tu as déjà cette carte.');
      const cout = B.packs.buyCardFragments[carte.rarity];
      if (etat.portefeuille.fragments < cout) refuser('Pas assez de fragments.');
      etat.portefeuille.fragments -= cout;
      etat.cartes[carte.id] = { niveau: 1, obtenueLe: t };
      return;
    }

    case 'heritage_acheter': {
      const noeud = B.heritageTree.find((n) => n.id === action.noeud);
      if (!noeud) refuser('Bonus inconnu.');
      if (etat.heritageTree.includes(noeud.id)) refuser('Bonus déjà acquis.');
      if (noeud.requires && !etat.heritageTree.includes(noeud.requires)) refuser('Il faut d\'abord acquérir le bonus précédent.');
      if (etat.heritage < noeud.cost) refuser('Pas assez d\'Héritage.');
      etat.heritage -= noeud.cost;
      etat.heritageTree.push(noeud.id);
      if (noeud.effect.kind === 'conseil_slot') {
        while (etat.conseil.length < nombreEmplacements(etat, jeu)) etat.conseil.push(null);
      }
      return;
    }

    case 'crise_payer': {
      const c = etat.crise;
      if (!c) refuser('Aucune crise en cours.');
      const crise = jeu.crises.get(c.id);
      const m = crise?.mitigations.find((x) => x.kind === 'resources');
      const cb = B.crises[c.id];
      if (!m || !cb) refuser('Cette crise ne se règle pas avec des ressources.');
      if (c.mitigations.includes('resources')) refuser('Mesure déjà prise.');
      if (p.argent < cb.mitigationArgent) refuser('Pas assez d\'argent.');
      p.argent -= cb.mitigationArgent;
      c.mitigations.push('resources');
      evenements.push({ type: 'crise_mesure', crise: c.id, mesure: 'resources' });
      return;
    }

    case 'nommer_ville': {
      const nom = nettoyerNomVille(action.nom ?? '');
      if (nom.length < 2) refuser('Le nom doit avoir au moins 2 caractères.');
      etat.townName = nom;
      return;
    }

    case 'tutoriel': {
      const e = Math.floor(action.etape);
      if (e > etat.tutoriel.etape && e <= 100) etat.tutoriel.etape = e;
      return;
    }

    case 'tutoriel_carte': {
      if (etat.tutoriel.carteOfferte) refuser('Carte déjà offerte.');
      const id = B.tutorial.freeCardId;
      if (!jeu.cards.has(id)) refuser('Carte indisponible.');
      etat.tutoriel.carteOfferte = true;
      if (!etat.cartes[id]) etat.cartes[id] = { niveau: 1, obtenueLe: t };
      evenements.push({ type: 'carte_offerte', carte: id });
      return;
    }

    case 'crise_lue': {
      etat.crisesALire = etat.crisesALire.filter((c) => c !== action.crise);
      return;
    }

    default:
      refuser('Action inconnue.');
  }
}

export function eraOuverte(ctx: ContexteGroupe, era: EraId): boolean {
  return era === 'prologue' || ctx.erasOuvertes.includes(era);
}

/** Mesures d'atténuation de la crise en cours (pour l'affichage). */
export { mesuresCriseActives };
