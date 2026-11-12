// Formules de l'économie : coûts, bonus des cartes, taux de production.
// Tous les chiffres viennent de balance.json.

import type { Building, EraId, Resource } from './contenu.ts';
import { eraOrder } from './contenu.ts';
import type { Jeu } from './donnees.ts';
import type { EtatJeu } from './etat.ts';

// ---------- Bâtiments ----------

/** Bâtiments proposés dans l'époque : ceux de l'époque + les monuments des époques passées. */
export function batimentsDisponibles(etat: EtatJeu, jeu: Jeu): Building[] {
  const liste: Building[] = [];
  for (const id of etat.monuments) {
    const b = jeu.buildings.get(id);
    if (b && b.era !== etat.era) liste.push(b);
  }
  for (const b of jeu.contenu.buildings) if (b.era === etat.era) liste.push(b);
  return liste;
}

export function niveau(etat: EtatJeu, id: string): number {
  return etat.partie.buildings[id] ?? 0;
}

export function estDebloque(etat: EtatJeu, jeu: Jeu, id: string): boolean {
  const bb = jeu.balance.buildings[id];
  if (!bb) return false;
  // Les monuments des époques passées restent débloqués : le village garde son passé.
  if (etat.monuments.includes(id)) return true;
  return niveau(etat, id) > 0 || etat.partie.habitants >= bb.unlockHabitants;
}

/** Coût pour passer du niveau actuel au suivant. */
export function coutNiveau(jeu: Jeu, id: string, niveauActuel: number): number {
  const bb = jeu.balance.buildings[id];
  return Math.ceil(bb.baseCost * Math.pow(bb.costGrowth, niveauActuel));
}

/** Coût total de n niveaux à partir du niveau actuel. */
export function coutNiveaux(jeu: Jeu, id: string, niveauActuel: number, n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) total += coutNiveau(jeu, id, niveauActuel + i);
  return total;
}

/** Multiplicateur venant des améliorations achetées d'un bâtiment. */
function multAmeliorations(etat: EtatJeu, jeu: Jeu, b: Building): number {
  let m = 1;
  for (const u of b.upgrades) {
    if (etat.partie.upgrades.includes(u.id)) m *= jeu.balance.upgrades[u.id]?.multiplier ?? 1;
  }
  return m;
}

// ---------- Conseil ----------

export function nombreEmplacements(etat: EtatJeu, jeu: Jeu): number {
  let n = jeu.balance.conseil.baseSlots;
  for (const noeud of jeu.balance.heritageTree) {
    if (etat.heritageTree.includes(noeud.id) && noeud.effect.kind === 'conseil_slot') n += noeud.effect.value;
  }
  return Math.min(n, jeu.balance.conseil.maxSlots);
}

export function cartesAuConseil(etat: EtatJeu, jeu: Jeu): string[] {
  const n = nombreEmplacements(etat, jeu);
  return etat.conseil.slice(0, n).filter((id): id is string => !!id && !!jeu.cards.get(id) && !!etat.cartes[id]);
}

/** Puissance d'une carte au conseil (0.3 = +30 %). */
export function puissanceCarte(etat: EtatJeu, jeu: Jeu, id: string, auConseil = cartesAuConseil(etat, jeu)): number {
  const carte = jeu.cards.get(id);
  const possede = etat.cartes[id];
  if (!carte || !possede) return 0;
  const cb = jeu.balance.cards;
  let p = cb.overrides[id] ?? cb.rarityPower[carte.rarity];
  p *= 1 + cb.levelBonus * (Math.min(possede.niveau, cb.maxLevel) - 1);
  if (carte.era !== etat.era) p *= cb.outOfEraFactor;
  if (carte.synergy && auConseil.includes(carte.synergy.with)) p *= cb.synergyFactor;
  return p;
}

/** Vrai si la carte est « dans son époque » (pleine puissance). */
export function carteDansSonEpoque(etat: EtatJeu, jeu: Jeu, id: string): boolean {
  return jeu.cards.get(id)?.era === etat.era;
}

/** Cartes qu'on peut obtenir : celles des époques déjà atteintes. */
export function cartesAccessibles(etat: EtatJeu, jeu: Jeu): string[] {
  const max = eraOrder(etat.era);
  return jeu.contenu.cards.filter((c) => eraOrder(c.era) <= max).map((c) => c.id);
}

// ---------- Modificateurs ----------

export interface Modificateurs {
  /** Multiplicateur par bâtiment (améliorations + cartes). */
  batiment: Record<string, number>;
  /** Multiplicateur par ressource (cartes, Héritage, bâtiments comme la gare). */
  ressource: Record<Resource, number>;
  recensement: number;
  boost: number;
  archivesBonus: number;
  heritageBonus: number;
  offlineHeures: number;
  /** Effets de la crise en cours (1 = aucun effet). */
  crise: { croissance: number; plafond: number; revenu: number };
}

export function multiplicateurRecensement(jeu: Jeu, habitantsRecenses: number): number {
  const r = jeu.balance.recensement;
  return 1 + r.coefficient * Math.sqrt(Math.max(0, habitantsRecenses) / r.divisor);
}

export function forceCrise(etat: EtatJeu, jeu: Jeu, maintenant: number): number {
  const c = etat.crise;
  if (!c || maintenant < c.startedAt || maintenant >= c.endsAt) return 0;
  const cb = jeu.balance.crises[c.id];
  if (!cb) return 0;
  let s = cb.strength;
  for (const _ of mesuresCriseActives(etat, jeu)) s *= 1 - cb.mitigationStrength;
  return s;
}

/** Mesures d'atténuation en vigueur : celles appliquées + bâtiments et cartes présents. */
export function mesuresCriseActives(etat: EtatJeu, jeu: Jeu): string[] {
  const c = etat.crise;
  if (!c) return [];
  const crise = jeu.crises.get(c.id);
  if (!crise) return [];
  const mesures = new Set(c.mitigations);
  const conseil = cartesAuConseil(etat, jeu);
  for (const m of crise.mitigations) {
    if (m.kind === 'building' && m.ref && niveau(etat, m.ref) > 0) mesures.add(`building:${m.ref}`);
    if (m.kind === 'card' && m.ref && conseil.includes(m.ref)) mesures.add(`card:${m.ref}`);
  }
  // Une carte dont l'effet est crisis_mitigation compte aussi, même si la crise ne la nomme pas.
  for (const id of conseil) {
    const carte = jeu.cards.get(id);
    if (carte?.effect.kind === 'crisis_mitigation' && carte.effect.target === c.id) mesures.add(`card:${id}`);
  }
  return [...mesures];
}

export function calculerModificateurs(etat: EtatJeu, jeu: Jeu, maintenant: number): Modificateurs {
  const B = jeu.balance;
  const mods: Modificateurs = {
    batiment: {},
    ressource: { habitants: 1, production: 1, argent: 1 },
    recensement: multiplicateurRecensement(jeu, etat.epoque.habitantsRecenses),
    boost: 1,
    archivesBonus: 0,
    heritageBonus: 0,
    offlineHeures: B.offline.capHours,
    crise: { croissance: 1, plafond: 1, revenu: 1 },
  };

  const bonusRessource: Record<Resource, number> = { habitants: 0, production: 0, argent: 0 };
  const bonusHeritageArbre: Record<Resource, number> = { habitants: 0, production: 0, argent: 0 };

  // Bâtiments : améliorations, et effets de multiplicateur / Archives / Héritage.
  const dispo = batimentsDisponibles(etat, jeu);
  for (const b of dispo) mods.batiment[b.id] = multAmeliorations(etat, jeu, b);
  for (const b of dispo) {
    const n = niveau(etat, b.id);
    if (n === 0) continue;
    const bb = B.buildings[b.id];
    const m = mods.batiment[b.id];
    if (b.effect.kind === 'multiplier' && bb.multiplierPerLevel) {
      const bonus = n * bb.multiplierPerLevel * m;
      if (b.effect.target === 'habitants' || b.effect.target === 'production' || b.effect.target === 'argent') {
        bonusRessource[b.effect.target] += bonus;
      } else if (b.effect.target && mods.batiment[b.effect.target] !== undefined) {
        mods.batiment[b.effect.target] *= 1 + bonus;
      }
    } else if (b.effect.kind === 'archives_bonus' && bb.archivesBonusPerLevel) {
      mods.archivesBonus += n * bb.archivesBonusPerLevel * m;
    } else if (b.effect.kind === 'heritage_gain' && bb.heritageBonusPerLevel) {
      mods.heritageBonus += n * bb.heritageBonusPerLevel * m;
    }
  }

  // Cartes au conseil.
  const conseil = cartesAuConseil(etat, jeu);
  const bonusCartesBatiment: Record<string, number> = {};
  for (const id of conseil) {
    const carte = jeu.cards.get(id)!;
    const p = puissanceCarte(etat, jeu, id, conseil);
    const t = carte.effect.target;
    switch (carte.effect.kind) {
      case 'multiplier':
        if (t === 'habitants' || t === 'production' || t === 'argent') bonusRessource[t] += p;
        else if (t) bonusCartesBatiment[t] = (bonusCartesBatiment[t] ?? 0) + p;
        break;
      case 'archives_bonus':
        mods.archivesBonus += p;
        break;
      case 'heritage_gain':
        mods.heritageBonus += p;
        break;
      default:
        break;
    }
  }
  for (const [id, p] of Object.entries(bonusCartesBatiment)) {
    if (mods.batiment[id] === undefined) continue;
    const b = jeu.buildings.get(id)!;
    // Une carte qui renforce un bâtiment-multiplicateur (ex. la gare) renforce son bonus.
    if (b.effect.kind === 'multiplier' && (b.effect.target === 'habitants' || b.effect.target === 'production' || b.effect.target === 'argent')) {
      const bb = B.buildings[id];
      bonusRessource[b.effect.target] += niveau(etat, id) * (bb.multiplierPerLevel ?? 0) * mods.batiment[id] * p;
    }
    mods.batiment[id] *= 1 + p;
  }

  // Arbre d'Héritage.
  for (const noeud of B.heritageTree) {
    if (!etat.heritageTree.includes(noeud.id)) continue;
    const e = noeud.effect;
    if (e.kind === 'multiplier') bonusHeritageArbre[e.target] += e.value;
    else if (e.kind === 'offline_hours') mods.offlineHeures += e.value;
    else if (e.kind === 'archives_bonus') mods.archivesBonus += e.value;
    else if (e.kind === 'heritage_gain') mods.heritageBonus += e.value;
  }

  for (const r of ['habitants', 'production', 'argent'] as Resource[]) {
    mods.ressource[r] = (1 + bonusRessource[r]) * (1 + bonusHeritageArbre[r]);
  }

  // Boosts (Archives).
  for (const b of etat.boosts) if (b.endsAt > maintenant && b.kind === 'production') mods.boost = Math.max(mods.boost, b.multiplier);

  // Crise.
  const force = forceCrise(etat, jeu, maintenant);
  if (force > 0 && etat.crise) {
    const crise = jeu.crises.get(etat.crise.id);
    switch (crise?.penalty.kind) {
      case 'growth_reduction':
        mods.crise.croissance = 1 - force;
        break;
      case 'habitants_loss':
        mods.crise.plafond = 1 - force;
        mods.crise.croissance = 1 - force;
        break;
      case 'income_reduction':
        mods.crise.revenu = 1 - force;
        break;
      default:
        break;
    }
  }
  return mods;
}

// ---------- Taux ----------

export interface Taux {
  habitants: number;
  production: number;
  argent: number;
  plafondHabitants: number;
  /** Production par seconde de chaque bâtiment (pour l'affichage). */
  parBatiment: Record<string, number>;
}

export function calculerTaux(etat: EtatJeu, jeu: Jeu, mods: Modificateurs): Taux {
  const B = jeu.balance;
  const t: Taux = { habitants: 0, production: 0, argent: 0, plafondHabitants: B.habitants.baseCap, parBatiment: {} };
  let prodBase = 0;
  let argentBase = 0;
  for (const b of batimentsDisponibles(etat, jeu)) {
    const n = niveau(etat, b.id);
    if (n === 0) continue;
    const bb = B.buildings[b.id];
    const m = mods.batiment[b.id] ?? 1;
    if (b.effect.kind === 'produce' && bb.ratePerLevel) {
      const v = n * bb.ratePerLevel * m;
      t.parBatiment[b.id] = v;
      if (b.effect.target === 'habitants') t.habitants += v;
      else if (b.effect.target === 'production') prodBase += v;
      else if (b.effect.target === 'argent') argentBase += v;
    } else if (b.effect.kind === 'cap' && b.effect.target === 'habitants' && bb.capPerLevel) {
      t.plafondHabitants += n * bb.capPerLevel * m;
    }
  }
  const h = etat.partie.habitants;
  t.plafondHabitants = Math.floor(t.plafondHabitants * mods.crise.plafond);
  t.habitants *= mods.ressource.habitants * mods.crise.croissance;
  const multProd = mods.ressource.production * (1 + h * B.habitants.productionBonusPerHabitant) * mods.recensement * mods.boost;
  t.production = prodBase * multProd;
  for (const [id, v] of Object.entries(t.parBatiment)) {
    const b = jeu.buildings.get(id)!;
    if (b.effect.target === 'production') t.parBatiment[id] = v * multProd;
  }
  t.argent =
    (h * B.habitants.argentPerHabitant + argentBase + t.production * B.productionToArgent) *
    mods.ressource.argent *
    mods.crise.revenu;
  return t;
}

// ---------- Jalon et Héritage ----------

export function jalonAtteint(etat: EtatJeu, jeu: Jeu): boolean {
  const m = jeu.balance.eras[etat.era]?.milestone;
  if (!m) return false;
  return etat.partie.habitants >= m.habitants && etat.epoque.productionTotal >= m.productionTotal;
}

/** Héritage obtenu si le joueur passait à l'époque suivante maintenant. */
export function heritageAuPassage(etat: EtatJeu, jeu: Jeu, mods: Modificateurs): number {
  const H = jeu.balance.heritage;
  const base = Math.max(H.minimum, H.coefficient * Math.sqrt(etat.epoque.productionTotal / H.divisor));
  const bonusRec = 1 + H.recensementWeight * (mods.recensement - 1);
  return Math.floor(base * bonusRec * (1 + mods.heritageBonus));
}

export function eraAtteinte(etat: EtatJeu, era: EraId): boolean {
  return eraOrder(era) <= eraOrder(etat.era);
}
