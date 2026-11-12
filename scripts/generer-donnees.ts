// Produit supabase/functions/_shared/donnees/donnees.json à partir de content/ et balance.json.
// Ce fichier unique est lu par le jeu (navigateur) et par les edge functions.
//
//   node scripts/generer-donnees.ts              → production : entrées non validées retirées
//   node scripts/generer-donnees.ts --brouillons → développement : tout est gardé (marqué « Brouillon »)
//
// La variable d'environnement INCLURE_BROUILLONS=1 a le même effet que --brouillons.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { lireBalance, lireContenu, RACINE } from './lib-contenu.ts';
import { filtrerValides } from '../supabase/functions/_shared/jeu/donnees.ts';

const brouillons = process.argv.includes('--brouillons') || process.env.INCLURE_BROUILLONS === '1';
const brut = lireContenu();
const contenu = brouillons ? brut : filtrerValides(brut);
const balance = lireBalance();

const sortie = join(RACINE, 'supabase/functions/_shared/donnees');
mkdirSync(sortie, { recursive: true });
writeFileSync(
  join(sortie, 'donnees.json'),
  JSON.stringify({ brouillons, contenu, balance }, null, 1),
);

const retires = (Object.keys(brut) as (keyof typeof brut)[]).reduce(
  (n, k) => n + brut[k].length - contenu[k].length,
  0,
);
console.log(
  `✓ Données générées (${brouillons ? 'avec brouillons' : 'production'}${retires ? `, ${retires} entrée(s) non validée(s) retirée(s)` : ''}).`,
);
