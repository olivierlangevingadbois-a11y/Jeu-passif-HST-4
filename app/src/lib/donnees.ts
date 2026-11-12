// Contenu et balance pour le navigateur (fichier généré par scripts/generer-donnees.ts).
import brut from '@donnees/donnees.json';
import { preparerJeu } from '@jeu/donnees.ts';
import type { DonneesBrutes } from '@jeu/donnees.ts';

export const jeu = preparerJeu(brut as unknown as DonneesBrutes);
