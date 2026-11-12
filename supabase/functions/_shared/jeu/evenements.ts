// Événements produits par une synchronisation, affichés au joueur (fenêtres, notifications).

import type { EraId, Rarity } from './contenu.ts';
import type { Gains } from './simulation.ts';

export interface CarteTiree {
  id: string;
  rarity: Rarity;
  nouvelle: boolean;
  fragments: number;
}

export type Evenement =
  | { type: 'absence'; secondes: number; secondesComptees: number; plafondHeures: number; gains: Gains }
  | { type: 'jalon_atteint'; era: EraId }
  | { type: 'crise_debut'; crise: string }
  | { type: 'crise_fin'; crise: string }
  | { type: 'crise_mesure'; crise: string; mesure: string }
  | { type: 'recensement'; era: EraId; factId: string | null; habitantsComptes: number; multiplicateur: number }
  | { type: 'passage'; de: EraId; vers: EraId; heritage: number; paquetsGratuits: number; monument: string | null }
  | { type: 'archives_resultat'; questionId: string; correct: boolean }
  | { type: 'archives_recompense'; choix: 'boost' | 'heritage' | 'fragments'; valeur: number; paquetBonus: boolean }
  | { type: 'paquet'; source: 'voix' | 'gratuit'; cartes: CarteTiree[]; pitieDeclenchee: boolean }
  | { type: 'voix_recues'; montant: number; raison: string | null }
  | { type: 'carte_offerte'; carte: string };
