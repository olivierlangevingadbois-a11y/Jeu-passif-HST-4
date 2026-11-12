// Archives : charges, choix des questions, correction des réponses.

import type { Question } from './contenu.ts';
import { eraOrder } from './contenu.ts';
import type { Jeu } from './donnees.ts';
import type { EtatJeu } from './etat.ts';

export type Alea = () => number;

export interface ContexteGroupe {
  /** Époques ouvertes par l'enseignant pour le groupe (le prologue l'est toujours). */
  erasOuvertes: string[];
  modeRevision: boolean;
}

// ---------- Charges ----------

export function chargesDisponibles(etat: EtatJeu, jeu: Jeu, maintenant: number): number {
  const A = jeu.balance.archives;
  const a = etat.archives;
  if (a.charges >= A.maxCharges) return A.maxCharges;
  const gagnees = Math.floor(Math.max(0, maintenant - a.chargesMajLe) / (A.rechargeMinutes * 60_000));
  return Math.min(A.maxCharges, a.charges + gagnees);
}

/** Moment où la prochaine charge arrive, ou null si les charges sont pleines. */
export function prochaineCharge(etat: EtatJeu, jeu: Jeu, maintenant: number): number | null {
  const A = jeu.balance.archives;
  if (chargesDisponibles(etat, jeu, maintenant) >= A.maxCharges) return null;
  const duree = A.rechargeMinutes * 60_000;
  const ecoule = Math.max(0, maintenant - etat.archives.chargesMajLe);
  return etat.archives.chargesMajLe + (Math.floor(ecoule / duree) + 1) * duree;
}

export function consommerCharge(etat: EtatJeu, jeu: Jeu, maintenant: number): boolean {
  const A = jeu.balance.archives;
  const dispo = chargesDisponibles(etat, jeu, maintenant);
  if (dispo < 1) return false;
  const duree = A.rechargeMinutes * 60_000;
  if (etat.archives.charges >= A.maxCharges || dispo >= A.maxCharges) {
    // Les charges étaient pleines : la recharge repart de maintenant.
    etat.archives.chargesMajLe = maintenant;
  } else {
    // Garder la recharge déjà entamée.
    const gagnees = Math.floor((maintenant - etat.archives.chargesMajLe) / duree);
    etat.archives.chargesMajLe += gagnees * duree;
  }
  etat.archives.charges = dispo - 1;
  return true;
}

// ---------- Questions ----------

/** Questions que le joueur peut recevoir : époques atteintes, ou toutes en mode révision. */
export function questionsAutorisees(etat: EtatJeu, jeu: Jeu, ctx: ContexteGroupe): Question[] {
  if (ctx.modeRevision) return jeu.contenu.questions;
  const max = eraOrder(etat.era);
  return jeu.contenu.questions.filter((q) => eraOrder(q.era) <= max);
}

/**
 * Choisit une question : surtout de l'époque en cours, parfois d'une époque passée (révision espacée).
 * Une question déjà réussie revient moins souvent. Pendant une crise liée à un concept, ce concept est favorisé.
 */
export function choisirQuestion(etat: EtatJeu, jeu: Jeu, ctx: ContexteGroupe, alea: Alea, exclure: string[] = []): Question | null {
  const A = jeu.balance.archives;
  let toutes = questionsAutorisees(etat, jeu, ctx).filter((q) => !exclure.includes(q.id));
  if (toutes.length === 0) toutes = questionsAutorisees(etat, jeu, ctx);
  if (toutes.length === 0) return null;

  let bassin = toutes;
  const crise = etat.crise ? jeu.crises.get(etat.crise.id) : undefined;
  const conceptCrise = crise?.mitigations.find((m) => m.kind === 'archives')?.ref;
  if (conceptCrise && alea() < 0.5) {
    const lies = toutes.filter((q) => q.concept === conceptCrise);
    if (lies.length) bassin = lies;
  } else if (!ctx.modeRevision) {
    const actuelles = toutes.filter((q) => q.era === etat.era);
    const passees = toutes.filter((q) => q.era !== etat.era);
    if (actuelles.length && passees.length) bassin = alea() < A.pastEraShare ? passees : actuelles;
    else bassin = actuelles.length ? actuelles : passees;
  }

  const poids = bassin.map((q) => {
    const h = etat.archives.historique[q.id];
    if (!h) return 1.5; // jamais vue : un peu favorisée
    return Math.pow(A.correctRepeatWeight, h.reussies);
  });
  const total = poids.reduce((a, b) => a + b, 0);
  let r = alea() * total;
  for (let i = 0; i < bassin.length; i++) {
    r -= poids[i];
    if (r <= 0) return bassin[i];
  }
  return bassin[bassin.length - 1];
}

/**
 * Réponse :
 * - quiz et qui suis-je : index du choix dans l'ordre du fichier ;
 * - chronologie : liste des index des événements (ordre du fichier), dans l'ordre choisi.
 */
export type Reponse = number | number[];

export function estCorrecte(q: Question, reponse: Reponse): boolean {
  if (q.type === 'chronologie') {
    if (!Array.isArray(reponse) || reponse.length !== q.events.length) return false;
    if (new Set(reponse).size !== reponse.length) return false;
    for (let i = 1; i < reponse.length; i++) {
      const a = q.events[reponse[i - 1]];
      const b = q.events[reponse[i]];
      if (!a || !b || a.year > b.year) return false;
    }
    return true;
  }
  return typeof reponse === 'number' && reponse === q.answerIndex;
}

/** Ordre correct d'une chronologie (index du fichier). */
export function ordreChronologique(q: Question): number[] {
  if (q.type !== 'chronologie') return [];
  return q.events.map((e, i) => ({ e, i })).sort((a, b) => a.e.year - b.e.year).map((x) => x.i);
}

/** Mélange de Fisher-Yates. */
export function melanger<T>(liste: T[], alea: Alea): T[] {
  const l = [...liste];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}
