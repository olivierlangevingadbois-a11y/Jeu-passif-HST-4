import { lireBalance, lireContenu } from '../scripts/lib-contenu.ts';
import { preparerJeu } from '../supabase/functions/_shared/jeu/donnees.ts';
import type { Jeu } from '../supabase/functions/_shared/jeu/donnees.ts';
import type { ContexteGroupe } from '../supabase/functions/_shared/jeu/archives.ts';

export function jeuDeTest(): Jeu {
  return preparerJeu({ brouillons: true, contenu: lireContenu(), balance: lireBalance() });
}

export const CTX_PROLOGUE: ContexteGroupe = { erasOuvertes: ['prologue'], modeRevision: false };
export const CTX_TOUT: ContexteGroupe = { erasOuvertes: ['prologue', 'epoque_1'], modeRevision: false };

export const T0 = Date.UTC(2026, 10, 1, 12, 0, 0);
export const MIN = 60_000;
export const HEURE = 3_600_000;
