// Accès au contenu et à la balance, indexés par id.

import type { Balance } from './balance.ts';
import type { Building, Card, Contenu, Crisis, Era, EraId, Question } from './contenu.ts';
import { ERAS } from './contenu.ts';

export interface DonneesBrutes {
  brouillons: boolean;
  contenu: Contenu;
  balance: Balance;
}

/** Retire les entrées que l'enseignant n'a pas encore validées. */
export function filtrerValides(c: Contenu): Contenu {
  return {
    eras: c.eras.filter((e) => e.validated),
    buildings: c.buildings.filter((e) => e.validated),
    cards: c.cards.filter((e) => e.validated),
    questions: c.questions.filter((e) => e.validated),
    crises: c.crises.filter((e) => e.validated),
  };
}

export interface Jeu {
  brouillons: boolean;
  balance: Balance;
  contenu: Contenu;
  eras: Map<EraId, Era>;
  /** Époques présentes dans le contenu, dans l'ordre. */
  ordreEras: EraId[];
  buildings: Map<string, Building>;
  cards: Map<string, Card>;
  questions: Map<string, Question>;
  crises: Map<string, Crisis>;
  /** Amélioration -> bâtiment. */
  upgradeOwner: Map<string, string>;
}

export function preparerJeu(d: DonneesBrutes): Jeu {
  const eras = new Map(d.contenu.eras.map((e) => [e.id as EraId, e]));
  const upgradeOwner = new Map<string, string>();
  for (const b of d.contenu.buildings) for (const u of b.upgrades) upgradeOwner.set(u.id, b.id);
  return {
    brouillons: d.brouillons,
    balance: d.balance,
    contenu: d.contenu,
    eras,
    ordreEras: ERAS.filter((e) => eras.has(e) && d.balance.eras[e]),
    buildings: new Map(d.contenu.buildings.map((b) => [b.id, b])),
    cards: new Map(d.contenu.cards.map((c) => [c.id, c])),
    questions: new Map(d.contenu.questions.map((q) => [q.id, q])),
    crises: new Map(d.contenu.crises.map((c) => [c.id, c])),
    upgradeOwner,
  };
}

export function eraSuivante(jeu: Jeu, era: EraId): EraId | null {
  const i = jeu.ordreEras.indexOf(era);
  return i >= 0 && i + 1 < jeu.ordreEras.length ? jeu.ordreEras[i + 1] : null;
}
