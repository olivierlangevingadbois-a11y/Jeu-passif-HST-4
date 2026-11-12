// Simulateur de rythme : fait jouer des joueurs fictifs avec le vrai moteur et balance.json.
//
//   npm run simuler
//
// Les joueurs achètent le bâtiment le plus rentable, font des recensements quand ça vaut la peine,
// répondent aux Archives, placent leurs meilleures cartes et passent à l'époque suivante dès que possible.
// Les résultats sont des ordres de grandeur pour régler balance.json, pas des promesses.

import { lireBalance, lireContenu } from './lib-contenu.ts';
import { filtrerValides, preparerJeu } from '../supabase/functions/_shared/jeu/donnees.ts';
import type { Jeu } from '../supabase/functions/_shared/jeu/donnees.ts';
import { nouvelEtat } from '../supabase/functions/_shared/jeu/etat.ts';
import type { EtatJeu } from '../supabase/functions/_shared/jeu/etat.ts';
import { synchroniser } from '../supabase/functions/_shared/jeu/sync.ts';
import type { Action } from '../supabase/functions/_shared/jeu/actions.ts';
import { aleaGraine } from '../supabase/functions/_shared/jeu/alea.ts';
import type { ContexteGroupe } from '../supabase/functions/_shared/jeu/archives.ts';
import { chargesDisponibles, choisirQuestion, ordreChronologique } from '../supabase/functions/_shared/jeu/archives.ts';
import {
  batimentsDisponibles,
  calculerModificateurs,
  calculerTaux,
  cartesAccessibles,
  coutNiveau,
  estDebloque,
  multiplicateurRecensement,
  nombreEmplacements,
  puissanceCarte,
} from '../supabase/functions/_shared/jeu/economie.ts';
import { eraSuivante } from '../supabase/functions/_shared/jeu/donnees.ts';
import type { EraId } from '../supabase/functions/_shared/jeu/contenu.ts';

const MIN = 60_000;
const HEURE = 60 * MIN;
const JOUR = 24 * HEURE;

interface Profil {
  nom: string;
  /** Heures de début des séances, chaque jour. */
  seances: number[];
  minutesParSeance: number;
  tauxReussite: number;
  /** Voix données par l'enseignant chaque semaine. */
  voixParSemaine: number;
}

const PROFILS: Profil[] = [
  { nom: 'Découverte (1 séance de 60 min, pour mesurer le prologue)', seances: [9], minutesParSeance: 60, tauxReussite: 0.7, voixParSemaine: 0 },
  { nom: 'Assidu (4 × 10 min/jour)', seances: [7.5, 12, 16, 20], minutesParSeance: 10, tauxReussite: 0.8, voixParSemaine: 20 },
  { nom: 'Régulier (2 × 10 min/jour)', seances: [12, 19], minutesParSeance: 10, tauxReussite: 0.7, voixParSemaine: 10 },
  { nom: 'Occasionnel (1 × 10 min/jour)', seances: [19], minutesParSeance: 10, tauxReussite: 0.6, voixParSemaine: 10 },
];

const PAS_DECISION = 10_000;
const DETAIL = process.argv.includes('--detail');
const MAX_JOURS = 90;

function choisirAchat(e: EtatJeu, jeu: Jeu, t: number): Action | null {
  const mods = calculerModificateurs(e, jeu, t);
  const base = calculerTaux(e, jeu, mods);
  const presDuPlafond = e.partie.habitants >= base.plafondHabitants * 0.85;
  let meilleur: { id: string; score: number; cout: number } | null = null;
  for (const b of batimentsDisponibles(e, jeu)) {
    if (!estDebloque(e, jeu, b.id)) continue;
    const cout = coutNiveau(jeu, b.id, e.partie.buildings[b.id] ?? 0);
    const essai = structuredClone(e);
    essai.partie.buildings[b.id] = (essai.partie.buildings[b.id] ?? 0) + 1;
    const apres = calculerTaux(essai, jeu, calculerModificateurs(essai, jeu, t));
    let gain = apres.argent - base.argent + (apres.production - base.production) * 0.5;
    gain += (apres.habitants - base.habitants) * (presDuPlafond ? 0.5 : 8) * Math.max(1, base.argent / Math.max(1, e.partie.habitants));
    if (presDuPlafond) gain += (apres.plafondHabitants - base.plafondHabitants) * 0.3 * Math.max(1, base.argent / Math.max(1, e.partie.habitants));
    if (b.effect.kind === 'archives_bonus') gain += base.argent * 0.02;
    const score = gain / cout;
    if (score > 0 && (!meilleur || score > meilleur.score)) meilleur = { id: b.id, score, cout };
  }
  // Améliorations : achetées dès qu'elles coûtent moins de la moitié de l'argent.
  for (const b of batimentsDisponibles(e, jeu)) {
    for (const u of b.upgrades) {
      const ub = jeu.balance.upgrades[u.id];
      if (!ub || e.partie.upgrades.includes(u.id)) continue;
      if ((e.partie.buildings[b.id] ?? 0) >= ub.requiresLevel && e.partie.argent >= ub.cost) return { type: 'ameliorer', amelioration: u.id };
    }
  }
  if (meilleur && e.partie.argent >= meilleur.cout) return { type: 'construire', batiment: meilleur.id };
  return null;
}

interface Resultat {
  jalons: Partial<Record<EraId, { jours: number; minutesActives: number; recensements: number }>>;
}

function simuler(jeu: Jeu, profil: Profil, graine: number): Resultat {
  const alea = aleaGraine(graine);
  const ctx: ContexteGroupe = { erasOuvertes: jeu.ordreEras, modeRevision: false };
  const debut = Date.UTC(2026, 0, 5, 0, 0, 0);
  let e = nouvelEtat(jeu, debut);
  let minutesActives = 0;
  const res: Resultat = { jalons: {} };
  const derniere = jeu.ordreEras[jeu.ordreEras.length - 1];
  let derniersDons = debut;
  let dernierRec = debut;

  const sync = (actions: Action[], t: number) => {
    const r = synchroniser(e, actions.map((action) => ({ action, at: t })), t, jeu, ctx, alea);
    e = r.etat;
    return r;
  };

  for (let jour = 0; jour < MAX_JOURS; jour++) {
    if (DETAIL && profil === PROFILS[2] && (jour < 5 || jour % 5 === 0)) {
      const tx = calculerTaux(e, jeu, calculerModificateurs(e, jeu, debut + jour * JOUR));
      const b = Object.entries(e.partie.buildings).map(([k, v]) => `${k}:${v}`).join(' ');
      console.log(`  j${jour} ${e.era} hab ${Math.round(e.partie.habitants)}/${tx.plafondHabitants} prodTot ${e.epoque.productionTotal.toExponential(2)} prod/s ${tx.production.toFixed(1)} arg/s ${tx.argent.toFixed(1)} arg ${Math.round(e.partie.argent)} rec ${e.epoque.recensements} H ${e.heritage.toFixed(1)} | ${b}`);
    }
    for (const h of profil.seances) {
      let t = debut + jour * JOUR + h * HEURE;
      if (t - derniersDons >= 7 * JOUR) {
        e.portefeuille.voix += profil.voixParSemaine;
        derniersDons = t;
      }
      sync([], t);
      const fin = t + profil.minutesParSeance * MIN;
      // Archives : toutes les charges, récompense « élan ».
      while (chargesDisponibles(e, jeu, t) > 0) {
        const q = choisirQuestion(e, jeu, ctx, alea);
        if (!q) break;
        const juste = alea() < profil.tauxReussite;
        const reponse = q.type === 'chronologie' ? (juste ? ordreChronologique(q) : [0, 0, 0, 0]) : juste ? q.answerIndex : (q.answerIndex + 1) % 4;
        sync([{ type: 'archives_repondre', questionId: q.id, reponse }], t);
        if (e.archives.enAttente) sync([{ type: 'archives_recompense', choix: e.heritage < 3 ? 'heritage' : 'boost' }], t);
      }
      // Paquets, conseil, Héritage.
      while (e.portefeuille.paquetsGratuits > 0) sync([{ type: 'ouvrir_paquet', source: 'gratuit' }], t);
      while (e.portefeuille.voix >= jeu.balance.packs.costVoix && cartesAccessibles(e, jeu).length) sync([{ type: 'ouvrir_paquet', source: 'voix' }], t);
      if (e.tutoriel.carteOfferte === false) sync([{ type: 'tutoriel_carte' }], t);
      const places = nombreEmplacements(e, jeu);
      const classement = Object.keys(e.cartes)
        .filter((id) => jeu.cards.get(id)?.effect.kind !== 'crisis_mitigation')
        .sort((a, b) => puissanceCarte(e, jeu, b, []) - puissanceCarte(e, jeu, a, []));
      classement.slice(0, places).forEach((id, i) => {
        if (e.conseil[i] !== id) sync([{ type: 'conseil', emplacement: i, carte: id }], t);
      });
      for (const n of jeu.balance.heritageTree) {
        if (!e.heritageTree.includes(n.id) && e.heritage >= n.cost && (!n.requires || e.heritageTree.includes(n.requires))) {
          sync([{ type: 'heritage_acheter', noeud: n.id }], t);
        }
      }
      if (e.crise && !e.crise.mitigations.includes('resources') && e.partie.argent > (jeu.balance.crises[e.crise.id]?.mitigationArgent ?? Infinity) * 3) {
        sync([{ type: 'crise_payer' }], t);
      }

      while (t < fin) {
        // Passage d'époque dès que possible.
        if (e.epoque.jalonAtteintLe !== null) {
          const era = e.era;
          if (!res.jalons[era]) {
            res.jalons[era] = {
              jours: (e.epoque.jalonAtteintLe - debut) / JOUR,
              minutesActives,
              recensements: e.epoque.recensements,
            };
          }
          if (era === derniere || !eraSuivante(jeu, era)) return res;
          sync([{ type: 'passage' }], t);
          continue;
        }
        // Recensement quand il double presque le multiplicateur et que la partie s'essouffle.
        const eb = jeu.balance.eras[e.era]!;
        if (e.partie.habitants >= eb.recensement.minHabitants && t - dernierRec > (e.era === 'prologue' ? 3 * MIN : 12 * HEURE)) {
          const avant = multiplicateurRecensement(jeu, e.epoque.habitantsRecenses);
          const apres = multiplicateurRecensement(jeu, e.epoque.habitantsRecenses + Math.floor(e.partie.habitants));
          if (apres / avant >= (e.era === 'prologue' ? 1.6 : 1.3)) {
            sync([{ type: 'recensement' }], t);
            dernierRec = t;
          }
        }
        let achats = 0;
        for (;;) {
          const a = choisirAchat(e, jeu, t);
          if (!a || achats > 50) break;
          const r = sync([a], t);
          if (r.refus.length) break;
          achats++;
        }
        t += PAS_DECISION;
        minutesActives += PAS_DECISION / MIN;
        sync([], t);
      }
    }
  }
  return res;
}

const brouillons = process.argv.includes('--brouillons');
const brut = lireContenu();
const jeu = preparerJeu({ brouillons, contenu: brouillons ? brut : filtrerValides(brut), balance: lireBalance() });

console.log(`Simulation du rythme (${MAX_JOURS} jours maximum, toutes les époques ouvertes dès que possible)\n`);
for (const p of DETAIL ? [PROFILS[2]] : PROFILS) {
  const r = simuler(jeu, p, 1);
  console.log(p.nom);
  for (const era of jeu.ordreEras) {
    const j = r.jalons[era];
    const nom = jeu.eras.get(era)?.name ?? era;
    if (!j) {
      console.log(`  ${nom} : jalon non atteint en ${MAX_JOURS} jours`);
      continue;
    }
    console.log(`  ${nom} : jalon au jour ${j.jours.toFixed(1)} (${Math.round(j.minutesActives)} min de jeu actif au total, ${j.recensements} recensement(s))`);
  }
  console.log('');
}
