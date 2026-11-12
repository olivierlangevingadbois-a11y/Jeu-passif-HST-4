// Types du contenu historique (content/*.json). Voir content/SCHEMA.md.
// Ce fichier est partagé entre le navigateur (Vite) et les edge functions (Deno) :
// aucune dépendance, imports relatifs avec extension .ts seulement.

export const ERAS = ['prologue', 'epoque_1', 'epoque_2', 'epoque_3', 'epoque_4'] as const;
export type EraId = (typeof ERAS)[number];

export type Resource = 'habitants' | 'production' | 'argent';
export const RESOURCES: Resource[] = ['habitants', 'production', 'argent'];

export type EffectKind =
  | 'produce'
  | 'multiplier'
  | 'cap'
  | 'archives_bonus'
  | 'heritage_gain'
  | 'crisis_mitigation';

export interface Effect {
  kind: EffectKind;
  target: string | null;
}

export interface Validable {
  id: string;
  validated: boolean;
  teacherNote: string | null;
}

export interface Era extends Validable {
  order: number;
  name: string;
  period: { start: number | null; end: number | null };
  programTitle: string;
  townStage: string;
  intro: string;
  monumentBuildingId: string;
  milestone: { id: string; name: string; year: number; eventText: string };
  recensementFacts: { id: string; text: string }[];
}

export interface Upgrade {
  id: string;
  name: string;
  note: string;
}

export interface Building extends Validable {
  era: EraId;
  name: string;
  monument: boolean;
  effect: Effect;
  description: string;
  upgrades: Upgrade[];
}

export type Rarity = 'commune' | 'rare' | 'epique';
export const RARITIES: Rarity[] = ['commune', 'rare', 'epique'];

export interface Card extends Validable {
  era: EraId;
  name: string;
  type: 'personnage' | 'figure';
  rarity: Rarity;
  effect: Effect;
  effectText: string;
  synergy: { with: string; text: string } | null;
  bio: string;
  source: string | null;
}

interface QuestionBase extends Validable {
  era: EraId;
  concept: string;
  explanation: string;
}

export interface QuizQuestion extends QuestionBase {
  type: 'quiz';
  prompt: string;
  choices: string[];
  answerIndex: number;
}

export interface ChronoQuestion extends QuestionBase {
  type: 'chronologie';
  prompt: string;
  events: { text: string; year: number }[];
}

export interface QuiSuisJeQuestion extends QuestionBase {
  type: 'quisuisje';
  clues: string[];
  choices: string[];
  answerIndex: number;
}

export type Question = QuizQuestion | ChronoQuestion | QuiSuisJeQuestion;

export type CrisisScope = 'solo' | 'groupe' | 'monde';
export type PenaltyKind = 'growth_reduction' | 'habitants_loss' | 'income_reduction' | 'buildings_disabled';
export type MitigationKind = 'building' | 'card' | 'resources' | 'archives';

export interface Crisis extends Validable {
  era: EraId;
  scope: CrisisScope;
  name: string;
  year: number | null;
  description: string;
  penalty: { kind: PenaltyKind; target: string | null };
  mitigations: { kind: MitigationKind; ref: string | null }[];
  aftermath: string;
}

/** Ensemble du contenu chargé par le jeu. */
export interface Contenu {
  eras: Era[];
  buildings: Building[];
  cards: Card[];
  questions: Question[];
  crises: Crisis[];
}

export function eraOrder(era: EraId): number {
  return ERAS.indexOf(era);
}
