// Vérifie content/*.json et balance.json. Lancé par « npm run verifier » et par la CI.
// Vérifie aussi qu'aucun tiret cadratin ne se glisse dans les textes de l'interface et la documentation.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { lireBalance, lireContenu, RACINE } from './lib-contenu.ts';
import { verifier } from './verification.ts';

function fichiers(dossier: string, extensions: string[]): string[] {
  const resultat: string[] = [];
  let entrees: string[] = [];
  try {
    entrees = readdirSync(dossier);
  } catch {
    return resultat;
  }
  for (const nom of entrees) {
    if (nom === 'node_modules' || nom.startsWith('.')) continue;
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) resultat.push(...fichiers(chemin, extensions));
    else if (extensions.includes(extname(nom))) resultat.push(chemin);
  }
  return resultat;
}

let rapport;
try {
  rapport = verifier(lireContenu(), lireBalance());
} catch (e) {
  console.error(`✗ ${(e as Error).message}`);
  process.exit(1);
}

// Textes de l'interface, documentation pour l'enseignant, balance.
const aScanner = [
  ...fichiers(join(RACINE, 'app/src'), ['.svelte', '.ts', '.html', '.css']),
  ...fichiers(join(RACINE, 'docs'), ['.md']),
  ...fichiers(join(RACINE, 'supabase'), ['.ts', '.sql']),
  join(RACINE, 'balance.json'),
  join(RACINE, 'balance.md'),
  join(RACINE, 'README.md'),
  join(RACINE, 'app/index.html'),
];
for (const f of aScanner) {
  let texte: string;
  try {
    texte = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  texte.split('\n').forEach((ligne, i) => {
    if (ligne.includes('\u2014')) rapport.erreurs.push(`${relative(RACINE, f)}:${i + 1} : tiret cadratin (le tiret long) interdit.`);
  });
}

for (const a of rapport.avertissements) console.warn(`⚠ ${a}`);
for (const e of rapport.erreurs) console.error(`✗ ${e}`);
if (rapport.erreurs.length > 0) {
  console.error(`\n${rapport.erreurs.length} erreur(s). Corrige-les avant de publier.`);
  process.exit(1);
}
console.log(`✓ Contenu et balance valides (${rapport.avertissements.length} avertissement(s)).`);
