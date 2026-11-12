// État complet d'un joueur. Sauvegardé tel quel (jsonb) dans game_states.state.
// Toutes les dates sont en millisecondes depuis 1970, selon l'horloge du SERVEUR.

import type { EraId } from './contenu.ts';
import type { Jeu } from './donnees.ts';

export const SCHEMA_ETAT = 1;

export interface Boost {
  kind: 'production';
  multiplier: number;
  endsAt: number;
}

export interface CriseActive {
  id: string;
  startedAt: number;
  endsAt: number;
  /** Mesures déjà appliquées, ex. « building:lot_colonisation », « archives », « resources ». */
  mitigations: string[];
}

/** Ce qui est remis à zéro à chaque recensement et à chaque passage d'époque. */
export interface Partie {
  habitants: number;
  argent: number;
  /** Production accumulée depuis le dernier recensement. */
  production: number;
  buildings: Record<string, number>;
  upgrades: string[];
}

/** Progression dans l'époque en cours (remise à zéro au passage d'époque). */
export interface ProgresEpoque {
  /** Production totale de l'époque, tous recensements confondus. */
  productionTotal: number;
  recensements: number;
  habitantsRecenses: number;
  /** Crises déjà survenues pendant l'époque. */
  crises: string[];
  jalonAtteintLe: number | null;
  debuteLe: number;
}

export interface CarteObtenue {
  niveau: number;
  obtenueLe: number;
}

export interface EtatJeu {
  schema: number;
  creeLe: number;
  /** Dernier instant jusqu'où la production a été calculée. */
  lastComputedAt: number;
  era: EraId;
  townName: string | null;
  partie: Partie;
  epoque: ProgresEpoque;
  heritage: number;
  heritageGagneTotal: number;
  heritageTree: string[];
  monuments: string[];
  conseil: (string | null)[];
  cartes: Record<string, CarteObtenue>;
  portefeuille: {
    voix: number;
    fragments: number;
    /** Paquets ouverts d'affilée sans carte épique. */
    pitie: number;
    paquetsGratuits: number;
    paquetsOuverts: number;
  };
  archives: {
    charges: number;
    chargesMajLe: number;
    /** Bonne réponse dont la récompense n'a pas encore été choisie. */
    enAttente: { questionId: string } | null;
    historique: Record<string, { vues: number; reussies: number }>;
  };
  boosts: Boost[];
  crise: CriseActive | null;
  /** Crises terminées dont le joueur n'a pas encore lu le dénouement. */
  crisesALire: string[];
  tutoriel: { etape: number; carteOfferte: boolean };
  historiqueEpoques: { era: EraId; heritage: number; termineLe: number; recensements: number }[];
}

export function nouvellePartie(jeu: Jeu, era: EraId, heritageTree: string[]): Partie {
  const eb = jeu.balance.eras[era]!;
  let argentDepart = eb.startingArgent;
  for (const n of jeu.balance.heritageTree) {
    if (heritageTree.includes(n.id) && n.effect.kind === 'starting_argent') argentDepart += n.effect.value;
  }
  return {
    habitants: eb.startingHabitants,
    argent: argentDepart,
    production: 0,
    buildings: { ...eb.startingBuildings },
    upgrades: [],
  };
}

export function nouvelEtat(jeu: Jeu, maintenant: number): EtatJeu {
  const era = jeu.ordreEras[0] ?? 'prologue';
  return {
    schema: SCHEMA_ETAT,
    creeLe: maintenant,
    lastComputedAt: maintenant,
    era,
    townName: null,
    partie: nouvellePartie(jeu, era, []),
    epoque: { productionTotal: 0, recensements: 0, habitantsRecenses: 0, crises: [], jalonAtteintLe: null, debuteLe: maintenant },
    heritage: 0,
    heritageGagneTotal: 0,
    heritageTree: [],
    monuments: [],
    conseil: Array(jeu.balance.conseil.baseSlots).fill(null),
    cartes: {},
    portefeuille: { voix: 0, fragments: 0, pitie: 0, paquetsGratuits: 0, paquetsOuverts: 0 },
    archives: { charges: jeu.balance.archives.maxCharges, chargesMajLe: maintenant, enAttente: null, historique: {} },
    boosts: [],
    crise: null,
    crisesALire: [],
    tutoriel: { etape: 0, carteOfferte: false },
    historiqueEpoques: [],
  };
}

export function cloner<T>(v: T): T {
  return structuredClone(v);
}

/**
 * Complète une sauvegarde ancienne avec les champs ajoutés depuis (valeurs par défaut).
 * À compléter si le format change de façon plus profonde (et augmenter SCHEMA_ETAT).
 */
export function migrerEtat(etat: EtatJeu, jeu: Jeu): EtatJeu {
  const defaut = nouvelEtat(jeu, etat.lastComputedAt ?? Date.now());
  const completer = (cible: Record<string, unknown>, modele: Record<string, unknown>) => {
    for (const [cle, valeur] of Object.entries(modele)) {
      if (!(cle in cible) || cible[cle] === undefined) cible[cle] = structuredClone(valeur);
      else if (valeur && typeof valeur === 'object' && !Array.isArray(valeur) && cible[cle] && typeof cible[cle] === 'object') {
        // Les dictionnaires libres (bâtiments, cartes, historique) ne sont pas complétés.
        if (['buildings', 'cartes', 'historique'].includes(cle)) continue;
        completer(cible[cle] as Record<string, unknown>, valeur as Record<string, unknown>);
      }
    }
  };
  completer(etat as unknown as Record<string, unknown>, defaut as unknown as Record<string, unknown>);
  if (!jeu.balance.eras[etat.era]) etat.era = defaut.era;
  etat.schema = SCHEMA_ETAT;
  return etat;
}
