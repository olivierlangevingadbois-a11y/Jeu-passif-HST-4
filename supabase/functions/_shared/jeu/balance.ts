// Types de balance.json : tous les chiffres d'équilibrage. Voir balance.md.

import type { EraId, Rarity, Resource } from './contenu.ts';

export interface BuildingBalance {
  /** Habitants nécessaires pour débloquer le bâtiment. */
  unlockHabitants: number;
  /** Coût du premier niveau, en argent. */
  baseCost: number;
  /** Chaque niveau coûte costGrowth fois plus que le précédent. */
  costGrowth: number;
  /** Pour kind = produce : quantité par seconde, par niveau. */
  ratePerLevel?: number;
  /** Pour kind = cap : plafond ajouté par niveau. */
  capPerLevel?: number;
  /** Pour kind = multiplier : bonus ajouté par niveau (0.1 = +10 %). */
  multiplierPerLevel?: number;
  /** Pour kind = archives_bonus : bonus des récompenses par niveau. */
  archivesBonusPerLevel?: number;
  /** Pour kind = heritage_gain : bonus d'Héritage par niveau. */
  heritageBonusPerLevel?: number;
}

export interface UpgradeBalance {
  cost: number;
  requiresLevel: number;
  /** Multiplie l'effet du bâtiment. */
  multiplier: number;
}

export interface EraBalance {
  startingArgent: number;
  startingHabitants: number;
  /** Bâtiments donnés gratuitement au début de l'époque (id -> niveau). */
  startingBuildings: Record<string, number>;
  milestone: { habitants: number; productionTotal: number };
  recensement: { minHabitants: number };
}

export type HeritageEffect =
  | { kind: 'multiplier'; target: Resource; value: number }
  | { kind: 'offline_hours'; value: number }
  | { kind: 'archives_bonus'; value: number }
  | { kind: 'conseil_slot'; value: number }
  | { kind: 'starting_argent'; value: number }
  | { kind: 'heritage_gain'; value: number };

export interface HeritageNode {
  id: string;
  cost: number;
  /** Nœud à acheter avant celui-ci, ou null. */
  requires: string | null;
  effect: HeritageEffect;
}

export interface CrisisBalance {
  /** La crise commence quand les habitants atteignent ce nombre (une fois par époque). */
  triggerHabitants: number;
  durationMinutes: number;
  /** Force de la pénalité (0.5 = -50 %). */
  strength: number;
  /** Chaque mesure d'atténuation réduit la force de cette fraction. */
  mitigationStrength: number;
  /** Coût en argent de la mesure « ressources ». */
  mitigationArgent: number;
}

export interface Balance {
  version: number;
  simulation: { stepSeconds: number };
  sync: { intervalSeconds: number };
  offline: { capHours: number; efficiency: number; thresholdSeconds: number };
  habitants: { baseCap: number; productionBonusPerHabitant: number; argentPerHabitant: number };
  /** Part de la production vendue chaque seconde en argent. */
  productionToArgent: number;
  eras: Record<EraId, EraBalance | undefined>;
  buildings: Record<string, BuildingBalance>;
  upgrades: Record<string, UpgradeBalance>;
  recensement: { coefficient: number; divisor: number };
  heritage: { coefficient: number; divisor: number; recensementWeight: number; minimum: number };
  heritageTree: HeritageNode[];
  conseil: { baseSlots: number; maxSlots: number };
  cards: {
    rarityPower: Record<Rarity, number>;
    outOfEraFactor: number;
    levelBonus: number;
    maxLevel: number;
    synergyFactor: number;
    /** Puissance propre à une carte (remplace rarityPower). */
    overrides: Record<string, number>;
  };
  packs: {
    costVoix: number;
    size: number;
    odds: Record<Rarity, number>;
    guaranteeAtLeast: Rarity;
    pityPacks: number;
    duplicateFragments: Record<Rarity, number>;
    levelUpFragments: number[];
    buyCardFragments: Record<Rarity, number>;
    freePacksOnPassage: number;
    archivesPackChance: number;
  };
  archives: {
    maxCharges: number;
    rechargeMinutes: number;
    rewards: {
      boost: { multiplier: number; minutes: number };
      heritage: number;
      fragments: number;
    };
    pastEraShare: number;
    correctRepeatWeight: number;
  };
  crises: Record<string, CrisisBalance>;
  tutorial: { freeCardId: string };
}
