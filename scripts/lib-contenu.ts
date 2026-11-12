// Lecture des fichiers de contenu et de balance, partagée par les scripts.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Contenu } from '../supabase/functions/_shared/jeu/contenu.ts';
import type { Balance } from '../supabase/functions/_shared/jeu/balance.ts';

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

export function lireJson(chemin: string): unknown {
  const texte = readFileSync(join(RACINE, chemin), 'utf8');
  try {
    return JSON.parse(texte);
  } catch (e) {
    throw new Error(`${chemin} : JSON invalide (${(e as Error).message})`);
  }
}

export function lireContenu(): Contenu {
  return {
    eras: (lireJson('content/eras.json') as { eras: Contenu['eras'] }).eras,
    buildings: (lireJson('content/buildings.json') as { buildings: Contenu['buildings'] }).buildings,
    cards: (lireJson('content/cards.json') as { cards: Contenu['cards'] }).cards,
    questions: (lireJson('content/questions.json') as { questions: Contenu['questions'] }).questions,
    crises: (lireJson('content/crises.json') as { crises: Contenu['crises'] }).crises,
  };
}

export function lireBalance(): Balance {
  return lireJson('balance.json') as Balance;
}
