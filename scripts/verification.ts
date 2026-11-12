// Règles de vérification du contenu et de la balance.
// Utilisé par scripts/verifier-contenu.ts (CI) et par les tests.

import { ERAS, RARITIES, RESOURCES } from '../supabase/functions/_shared/jeu/contenu.ts';
import type { Contenu, EraId, Validable } from '../supabase/functions/_shared/jeu/contenu.ts';
import type { Balance } from '../supabase/functions/_shared/jeu/balance.ts';

export interface Rapport {
  erreurs: string[];
  avertissements: string[];
}

const TIRET_CADRATIN = '\u2014';
const ID_VALIDE = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const CONCEPT_VALIDE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Parcourt toutes les chaînes d'une valeur JSON, avec leur chemin. */
export function chainesDe(valeur: unknown, chemin: string, visite: (texte: string, chemin: string) => void): void {
  if (typeof valeur === 'string') visite(valeur, chemin);
  else if (Array.isArray(valeur)) valeur.forEach((v, i) => chainesDe(v, `${chemin}[${i}]`, visite));
  else if (valeur && typeof valeur === 'object') {
    for (const [k, v] of Object.entries(valeur)) chainesDe(v, `${chemin}.${k}`, visite);
  }
}

export function chercherTiretsCadratins(valeur: unknown, chemin: string, erreurs: string[]): void {
  chainesDe(valeur, chemin, (texte, ch) => {
    if (texte.includes(TIRET_CADRATIN)) erreurs.push(`${ch} : tiret cadratin (le tiret long) interdit, utilise un deux-points, une virgule ou une nouvelle phrase.`);
  });
}

export function verifier(contenu: Contenu, balance: Balance): Rapport {
  const erreurs: string[] = [];
  const avertissements: string[] = [];

  const verifierListe = (nom: string, liste: Validable[]) => {
    const vus = new Set<string>();
    for (const e of liste) {
      const ou = `${nom} « ${e.id} »`;
      if (typeof e.id !== 'string' || !ID_VALIDE.test(e.id)) erreurs.push(`${ou} : id invalide (minuscules et _ seulement).`);
      if (vus.has(e.id)) erreurs.push(`${ou} : id en double.`);
      vus.add(e.id);
      if (typeof e.validated !== 'boolean') erreurs.push(`${ou} : « validated » doit être true ou false.`);
      if (e.teacherNote !== null && typeof e.teacherNote !== 'string') erreurs.push(`${ou} : « teacherNote » doit être un texte ou null.`);
      if (e.validated === false && !e.teacherNote) {
        erreurs.push(`${ou} : une entrée non validée doit expliquer quoi vérifier dans « teacherNote ».`);
      }
      if ('era' in e && !ERAS.includes((e as unknown as { era: never }).era)) erreurs.push(`${ou} : époque inconnue.`);
    }
    return vus;
  };

  const idsEras = verifierListe('Époque', contenu.eras);
  const idsBatiments = verifierListe('Bâtiment', contenu.buildings);
  const idsCartes = verifierListe('Carte', contenu.cards);
  verifierListe('Question', contenu.questions);
  const idsCrises = verifierListe('Crise', contenu.crises);
  const concepts = new Set(contenu.questions.map((q) => q.concept));

  for (const id of idsEras) if (!ERAS.includes(id as never)) erreurs.push(`Époque « ${id} » : id inconnu (attendu : ${ERAS.join(', ')}).`);

  // Époques
  for (const era of contenu.eras) {
    const monument = contenu.buildings.find((b) => b.id === era.monumentBuildingId);
    if (!monument) erreurs.push(`Époque « ${era.id} » : monumentBuildingId « ${era.monumentBuildingId} » introuvable.`);
    else if (!monument.monument) erreurs.push(`Époque « ${era.id} » : « ${monument.id} » n'est pas marqué comme monument.`);
    else if (monument.era !== era.id) erreurs.push(`Époque « ${era.id} » : le monument « ${monument.id} » appartient à une autre époque.`);
    if (!era.recensementFacts?.length) avertissements.push(`Époque « ${era.id} » : aucun fait de recensement.`);
    const vusFaits = new Set<string>();
    for (const f of era.recensementFacts ?? []) {
      if (vusFaits.has(f.id)) erreurs.push(`Époque « ${era.id} » : fait de recensement « ${f.id} » en double.`);
      vusFaits.add(f.id);
    }
    if (!balance.eras[era.id as EraId]) erreurs.push(`balance.json : aucune valeur pour l'époque « ${era.id} ».`);
  }

  // Effets (bâtiments et cartes)
  const verifierEffet = (ou: string, effet: { kind: string; target: string | null }) => {
    switch (effet.kind) {
      case 'produce':
      case 'cap':
        if (!RESOURCES.includes(effet.target as never)) erreurs.push(`${ou} : la cible « ${effet.target} » doit être une ressource.`);
        break;
      case 'multiplier':
        if (!RESOURCES.includes(effet.target as never) && !idsBatiments.has(effet.target ?? '')) {
          erreurs.push(`${ou} : la cible « ${effet.target} » n'est ni une ressource ni un bâtiment.`);
        }
        break;
      case 'archives_bonus':
      case 'heritage_gain':
        if (effet.target !== null) erreurs.push(`${ou} : la cible doit être null.`);
        break;
      case 'crisis_mitigation':
        if (!idsCrises.has(effet.target ?? '')) erreurs.push(`${ou} : la crise « ${effet.target} » est introuvable.`);
        break;
      default:
        erreurs.push(`${ou} : type d'effet « ${effet.kind} » inconnu.`);
    }
  };

  const idsAmeliorations = new Set<string>();
  for (const b of contenu.buildings) {
    const ou = `Bâtiment « ${b.id} »`;
    verifierEffet(ou, b.effect);
    if (b.effect.kind === 'crisis_mitigation') erreurs.push(`${ou} : un bâtiment ne peut pas avoir un effet crisis_mitigation.`);
    const bb = balance.buildings[b.id];
    if (!bb) erreurs.push(`balance.json : aucune valeur pour le bâtiment « ${b.id} ».`);
    else {
      const champ = {
        produce: 'ratePerLevel',
        cap: 'capPerLevel',
        multiplier: 'multiplierPerLevel',
        archives_bonus: 'archivesBonusPerLevel',
        heritage_gain: 'heritageBonusPerLevel',
      }[b.effect.kind as string];
      if (champ && typeof (bb as unknown as Record<string, unknown>)[champ] !== 'number') {
        erreurs.push(`balance.json : le bâtiment « ${b.id} » a besoin de « ${champ} ».`);
      }
    }
    for (const u of b.upgrades ?? []) {
      if (idsAmeliorations.has(u.id)) erreurs.push(`Amélioration « ${u.id} » en double.`);
      idsAmeliorations.add(u.id);
      if (!ID_VALIDE.test(u.id)) erreurs.push(`Amélioration « ${u.id} » : id invalide.`);
      if (!balance.upgrades[u.id]) erreurs.push(`balance.json : aucune valeur pour l'amélioration « ${u.id} ».`);
    }
  }

  for (const c of contenu.cards) {
    const ou = `Carte « ${c.id} »`;
    verifierEffet(ou, c.effect);
    if (!RARITIES.includes(c.rarity)) erreurs.push(`${ou} : rareté « ${c.rarity} » inconnue.`);
    if (c.type !== 'personnage' && c.type !== 'figure') erreurs.push(`${ou} : type « ${c.type} » inconnu.`);
    if (c.effect.kind === 'cap') erreurs.push(`${ou} : l'effet cap n'est pas prévu pour les cartes.`);
    if (c.synergy) {
      const partenaire = contenu.cards.find((x) => x.id === c.synergy!.with);
      if (!partenaire) erreurs.push(`${ou} : synergie avec « ${c.synergy.with} » introuvable.`);
      else if (partenaire.synergy?.with !== c.id) avertissements.push(`${ou} : la synergie avec « ${partenaire.id} » n'est pas réciproque.`);
    }
  }

  // Mélange des types par rareté (hors prologue)
  for (const era of ERAS) {
    if (era === 'prologue') continue;
    for (const r of RARITIES) {
      const cartes = contenu.cards.filter((c) => c.era === era && c.rarity === r);
      if (cartes.length === 0) continue;
      const types = new Set(cartes.map((c) => c.type));
      if (types.size < 2) avertissements.push(`Cartes ${era} ${r} : un seul type (${[...types][0]}), le GDD demande un mélange personnages et figures.`);
    }
  }

  // Questions
  for (const q of contenu.questions) {
    const ou = `Question « ${q.id} »`;
    if (typeof q.concept !== 'string' || !CONCEPT_VALIDE.test(q.concept)) erreurs.push(`${ou} : concept invalide (minuscules et - seulement).`);
    if (!q.explanation) erreurs.push(`${ou} : explication manquante.`);
    if (q.type === 'quiz' || q.type === 'quisuisje') {
      if (!Array.isArray(q.choices) || q.choices.length !== 4) erreurs.push(`${ou} : il faut exactement 4 choix.`);
      else if (new Set(q.choices).size !== 4) erreurs.push(`${ou} : deux choix identiques.`);
      if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= (q.choices?.length ?? 0)) {
        erreurs.push(`${ou} : answerIndex hors limites.`);
      }
      if (q.type === 'quiz' && !q.prompt) erreurs.push(`${ou} : énoncé manquant.`);
      if (q.type === 'quisuisje' && (!Array.isArray(q.clues) || q.clues.length < 2 || q.clues.length > 3)) {
        erreurs.push(`${ou} : il faut 2 ou 3 indices.`);
      }
    } else if (q.type === 'chronologie') {
      if (!q.prompt) erreurs.push(`${ou} : énoncé manquant.`);
      if (!Array.isArray(q.events) || q.events.length < 4 || q.events.length > 5) erreurs.push(`${ou} : il faut 4 ou 5 événements.`);
      else {
        const annees = q.events.map((e) => e.year);
        if (annees.some((a) => !Number.isInteger(a))) erreurs.push(`${ou} : chaque événement a besoin d'une année.`);
        if (new Set(annees).size !== annees.length) erreurs.push(`${ou} : deux événements ont la même année, l'ordre serait ambigu.`);
      }
    } else {
      erreurs.push(`${ou} : type « ${(q as { type: string }).type} » inconnu.`);
    }
  }

  // Crises
  for (const c of contenu.crises) {
    const ou = `Crise « ${c.id} »`;
    if (!['solo', 'groupe', 'monde'].includes(c.scope)) erreurs.push(`${ou} : scope « ${c.scope} » inconnu.`);
    if (!['growth_reduction', 'habitants_loss', 'income_reduction', 'buildings_disabled'].includes(c.penalty.kind)) {
      erreurs.push(`${ou} : pénalité « ${c.penalty.kind} » inconnue.`);
    }
    for (const m of c.mitigations) {
      if (m.kind === 'building' && !idsBatiments.has(m.ref ?? '')) erreurs.push(`${ou} : bâtiment « ${m.ref} » introuvable.`);
      else if (m.kind === 'card' && !idsCartes.has(m.ref ?? '')) erreurs.push(`${ou} : carte « ${m.ref} » introuvable.`);
      else if (m.kind === 'resources' && !RESOURCES.includes(m.ref as never)) erreurs.push(`${ou} : ressource « ${m.ref} » inconnue.`);
      else if (m.kind === 'archives' && m.ref !== null && !concepts.has(m.ref)) {
        erreurs.push(`${ou} : aucune question n'a le concept « ${m.ref} ».`);
      } else if (!['building', 'card', 'resources', 'archives'].includes(m.kind)) erreurs.push(`${ou} : atténuation « ${m.kind} » inconnue.`);
    }
    if (c.scope === 'solo' && !balance.crises[c.id]) erreurs.push(`balance.json : aucune valeur pour la crise « ${c.id} ».`);
  }

  // Balance : clés orphelines et cohérence
  for (const id of Object.keys(balance.buildings)) if (!idsBatiments.has(id)) avertissements.push(`balance.json : le bâtiment « ${id} » n'existe pas dans le contenu.`);
  for (const id of Object.keys(balance.upgrades)) if (!idsAmeliorations.has(id)) avertissements.push(`balance.json : l'amélioration « ${id} » n'existe pas dans le contenu.`);
  for (const id of Object.keys(balance.crises)) if (!idsCrises.has(id)) avertissements.push(`balance.json : la crise « ${id} » n'existe pas dans le contenu.`);
  for (const id of Object.keys(balance.cards.overrides)) if (!idsCartes.has(id)) avertissements.push(`balance.json : la carte « ${id} » n'existe pas dans le contenu.`);
  for (const [era, eb] of Object.entries(balance.eras)) {
    if (!eb) continue;
    for (const b of Object.keys(eb.startingBuildings)) if (!idsBatiments.has(b)) erreurs.push(`balance.json : bâtiment de départ « ${b} » (${era}) introuvable.`);
  }
  const somme = RARITIES.reduce((s, r) => s + balance.packs.odds[r], 0);
  if (Math.abs(somme - 1) > 1e-9) erreurs.push(`balance.json : les cotes des paquets totalisent ${somme}, pas 1.`);
  if (!idsCartes.has(balance.tutorial.freeCardId)) erreurs.push(`balance.json : la carte offerte « ${balance.tutorial.freeCardId} » est introuvable.`);
  const idsNoeuds = new Set(balance.heritageTree.map((n) => n.id));
  for (const n of balance.heritageTree) {
    if (n.requires && !idsNoeuds.has(n.requires)) erreurs.push(`balance.json : le nœud « ${n.id} » requiert « ${n.requires} », introuvable.`);
  }

  chercherTiretsCadratins(contenu, 'content', erreurs);

  return { erreurs, avertissements };
}
