// Avance le temps : production, croissance, crises, bonus temporaires.
// Le même code tourne dans le navigateur (affichage en direct) et sur le serveur (calcul officiel).

import type { Jeu } from './donnees.ts';
import type { EtatJeu } from './etat.ts';
import { calculerModificateurs, calculerTaux, jalonAtteint } from './economie.ts';
import type { Evenement } from './evenements.ts';

export interface OptionsAvance {
  /** Fraction des gains conservée (hors ligne). */
  efficacite?: number;
  evenements?: Evenement[];
}

export interface Gains {
  habitants: number;
  production: number;
  argent: number;
}

/**
 * Avance l'état jusqu'à « jusqua » par pas de balance.simulation.stepSeconds.
 * Modifie l'état en place et retourne les gains.
 */
export function avancer(etat: EtatJeu, jeu: Jeu, jusqua: number, opts: OptionsAvance = {}): Gains {
  const gains: Gains = { habitants: 0, production: 0, argent: 0 };
  const eff = opts.efficacite ?? 1;
  const pasMax = jeu.balance.simulation.stepSeconds * 1000;
  let t = etat.lastComputedAt;
  if (jusqua <= t) return gains;

  while (t < jusqua) {
    verifierCrise(etat, jeu, t, opts.evenements);
    let fin = Math.min(jusqua, t + pasMax);
    // Couper le pas aux moments où quelque chose change (fin d'un bonus, fin de crise).
    for (const b of etat.boosts) if (b.endsAt > t && b.endsAt < fin) fin = b.endsAt;
    if (etat.crise && etat.crise.endsAt > t && etat.crise.endsAt < fin) fin = etat.crise.endsAt;

    const dt = (fin - t) / 1000;
    const mods = calculerModificateurs(etat, jeu, t);
    const taux = calculerTaux(etat, jeu, mods);
    const p = etat.partie;

    const avantH = p.habitants;
    if (p.habitants > taux.plafondHabitants) {
      p.habitants = taux.plafondHabitants;
    } else {
      p.habitants = Math.min(taux.plafondHabitants, p.habitants + taux.habitants * dt * eff);
    }
    gains.habitants += p.habitants - avantH;

    const prod = taux.production * dt * eff;
    const arg = taux.argent * dt * eff;
    p.production += prod;
    etat.epoque.productionTotal += prod;
    p.argent += arg;
    gains.production += prod;
    gains.argent += arg;

    t = fin;
    etat.lastComputedAt = t;
    nettoyer(etat, jeu, t, opts.evenements);
    if (etat.epoque.jalonAtteintLe === null && jalonAtteint(etat, jeu)) {
      etat.epoque.jalonAtteintLe = t;
      opts.evenements?.push({ type: 'jalon_atteint', era: etat.era });
    }
  }
  return gains;
}

/** Démarre la crise de l'époque si le seuil d'habitants est atteint (une fois par époque). */
export function verifierCrise(etat: EtatJeu, jeu: Jeu, t: number, evenements?: Evenement[]): void {
  if (etat.crise) return;
  for (const c of jeu.contenu.crises) {
    if (c.era !== etat.era || c.scope !== 'solo') continue;
    if (etat.epoque.crises.includes(c.id)) continue;
    const cb = jeu.balance.crises[c.id];
    if (!cb || etat.partie.habitants < cb.triggerHabitants) continue;
    etat.crise = { id: c.id, startedAt: t, endsAt: t + cb.durationMinutes * 60_000, mitigations: [] };
    etat.epoque.crises.push(c.id);
    evenements?.push({ type: 'crise_debut', crise: c.id });
    return;
  }
}

/** Retire les bonus expirés et termine la crise si son temps est écoulé. */
export function nettoyer(etat: EtatJeu, _jeu: Jeu, t: number, evenements?: Evenement[]): void {
  if (etat.boosts.some((b) => b.endsAt <= t)) etat.boosts = etat.boosts.filter((b) => b.endsAt > t);
  if (etat.crise && etat.crise.endsAt <= t) {
    const id = etat.crise.id;
    etat.crise = null;
    if (!etat.crisesALire.includes(id)) etat.crisesALire.push(id);
    evenements?.push({ type: 'crise_fin', crise: id });
  }
}

/**
 * Absence prolongée : le temps au-delà du plafond hors ligne est perdu.
 * Retourne la durée réellement comptée (en secondes).
 */
export function avancerHorsLigne(etat: EtatJeu, jeu: Jeu, jusqua: number, evenements: Evenement[]): void {
  const debut = etat.lastComputedAt;
  const ecart = jusqua - debut;
  const mods = calculerModificateurs(etat, jeu, debut);
  const plafond = mods.offlineHeures * 3600_000;
  const compte = Math.min(ecart, plafond);
  const gains = avancer(etat, jeu, debut + compte, { efficacite: jeu.balance.offline.efficiency, evenements });
  // Le reste du temps passe sans production.
  etat.lastComputedAt = jusqua;
  nettoyer(etat, jeu, jusqua, evenements);
  evenements.push({
    type: 'absence',
    secondes: Math.round(ecart / 1000),
    secondesComptees: Math.round(compte / 1000),
    plafondHeures: mods.offlineHeures,
    gains,
  });
}
