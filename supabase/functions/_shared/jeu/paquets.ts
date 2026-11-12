// Paquets d'archives : tirage de 3 cartes avec cotes visibles, garantie de rareté et compteur de pitié.
// Le tirage officiel se fait seulement sur le serveur.

import type { Rarity } from './contenu.ts';
import { RARITIES } from './contenu.ts';
import type { Jeu } from './donnees.ts';
import type { EtatJeu } from './etat.ts';
import type { CarteTiree } from './evenements.ts';
import { cartesAccessibles } from './economie.ts';
import type { Alea } from './archives.ts';

const RANG: Record<Rarity, number> = { commune: 0, rare: 1, epique: 2 };

function tirerRarete(odds: Record<Rarity, number>, alea: Alea, minimum: Rarity = 'commune'): Rarity {
  const possibles = RARITIES.filter((r) => RANG[r] >= RANG[minimum]);
  const total = possibles.reduce((s, r) => s + odds[r], 0);
  let x = alea() * total;
  for (const r of possibles) {
    x -= odds[r];
    if (x < 0) return r;
  }
  return possibles[possibles.length - 1];
}

/** Carte au hasard de la rareté voulue ; si aucune n'existe, la rareté la plus proche. */
function tirerCarte(jeu: Jeu, bassin: string[], rarete: Rarity, alea: Alea): string {
  const ordre = [rarete, ...RARITIES.filter((r) => r !== rarete).sort((a, b) => Math.abs(RANG[a] - RANG[rarete]) - Math.abs(RANG[b] - RANG[rarete]))];
  for (const r of ordre) {
    const cartes = bassin.filter((id) => jeu.cards.get(id)?.rarity === r);
    if (cartes.length) return cartes[Math.floor(alea() * cartes.length)];
  }
  throw new Error('Aucune carte disponible');
}

export interface ResultatPaquet {
  cartes: CarteTiree[];
  pitieDeclenchee: boolean;
}

export function ouvrirPaquet(etat: EtatJeu, jeu: Jeu, alea: Alea, maintenant: number): ResultatPaquet {
  const P = jeu.balance.packs;
  const bassin = cartesAccessibles(etat, jeu);
  if (bassin.length === 0) throw new Error('Aucune carte disponible');

  const raretes: Rarity[] = [];
  for (let i = 0; i < P.size; i++) raretes.push(tirerRarete(P.odds, alea));
  // Au moins une carte de la rareté garantie.
  if (!raretes.some((r) => RANG[r] >= RANG[P.guaranteeAtLeast])) {
    raretes[raretes.length - 1] = tirerRarete(P.odds, alea, P.guaranteeAtLeast);
  }
  // Pitié : le Ne paquet d'affilée sans épique en contient une.
  let pitieDeclenchee = false;
  const epiqueDisponible = bassin.some((id) => jeu.cards.get(id)?.rarity === 'epique');
  if (!raretes.includes('epique') && epiqueDisponible && etat.portefeuille.pitie + 1 >= P.pityPacks) {
    raretes[raretes.length - 1] = 'epique';
    pitieDeclenchee = true;
  }

  const cartes: CarteTiree[] = [];
  let aEuEpique = false;
  for (const r of raretes) {
    const id = tirerCarte(jeu, bassin, r, alea);
    const rarity = jeu.cards.get(id)!.rarity;
    if (rarity === 'epique') aEuEpique = true;
    if (etat.cartes[id]) {
      const f = P.duplicateFragments[rarity];
      etat.portefeuille.fragments += f;
      cartes.push({ id, rarity, nouvelle: false, fragments: f });
    } else {
      etat.cartes[id] = { niveau: 1, obtenueLe: maintenant };
      cartes.push({ id, rarity, nouvelle: true, fragments: 0 });
    }
  }
  etat.portefeuille.pitie = aEuEpique ? 0 : etat.portefeuille.pitie + 1;
  etat.portefeuille.paquetsOuverts += 1;
  return { cartes, pitieDeclenchee };
}

export function coutNiveauCarte(jeu: Jeu, niveauActuel: number): number | null {
  const couts = jeu.balance.packs.levelUpFragments;
  if (niveauActuel >= jeu.balance.cards.maxLevel || niveauActuel - 1 >= couts.length) return null;
  return couts[niveauActuel - 1];
}
