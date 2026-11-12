import { describe, expect, it } from 'vitest';
import { CTX_PROLOGUE, CTX_TOUT, HEURE, MIN, T0, jeuDeTest } from './aide.ts';
import {
  aleaGraine,
  appliquerAction,
  avancer,
  calculerModificateurs,
  calculerTaux,
  chargesDisponibles,
  cloner,
  coutNiveau,
  estCorrecte,
  multiplicateurRecensement,
  nouvelEtat,
  ordreChronologique,
  puissanceCarte,
  synchroniser,
} from '../supabase/functions/_shared/jeu/index.ts';
import type { ActionHorodatee, EtatJeu, Question } from '../supabase/functions/_shared/jeu/index.ts';

const jeu = jeuDeTest();
const alea = aleaGraine(42);

function etatRiche(): EtatJeu {
  const e = nouvelEtat(jeu, T0);
  e.partie.argent = 1e9;
  return e;
}

describe('économie de base', () => {
  it('fait croître les habitants jusqu\'au plafond', () => {
    const e = nouvelEtat(jeu, T0);
    avancer(e, jeu, T0 + 10 * HEURE);
    expect(e.partie.habitants).toBe(jeu.balance.habitants.baseCap);
    expect(e.partie.argent).toBeGreaterThan(jeu.balance.eras.prologue!.startingArgent);
  });

  it('applique le coût croissant des niveaux', () => {
    const b = jeu.balance.buildings.terre_censitaire;
    expect(coutNiveau(jeu, 'terre_censitaire', 0)).toBe(Math.ceil(b.baseCost));
    expect(coutNiveau(jeu, 'terre_censitaire', 3)).toBe(Math.ceil(b.baseCost * b.costGrowth ** 3));
  });

  it('refuse une construction sans assez d\'argent, sans rien modifier', () => {
    const e = nouvelEtat(jeu, T0);
    e.partie.argent = 0;
    const r = synchroniser(e, [{ at: T0, action: { type: 'construire', batiment: 'terre_censitaire' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.refus).toHaveLength(1);
    expect(r.etat.partie.buildings.terre_censitaire).toBe(1);
  });

  it('refuse un bâtiment encore verrouillé', () => {
    const e = etatRiche();
    const r = synchroniser(e, [{ at: T0, action: { type: 'construire', batiment: 'manoir_seigneurial' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.refus[0]?.raison).toMatch(/habitants/);
  });

  it('refuse un bâtiment d\'une autre époque', () => {
    const e = etatRiche();
    const r = synchroniser(e, [{ at: T0, action: { type: 'construire', batiment: 'scierie_chantier' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.refus).toHaveLength(1);
  });

  it('l\'église augmente le plafond d\'habitants', () => {
    const e = etatRiche();
    e.partie.habitants = 15;
    const avant = calculerTaux(e, jeu, calculerModificateurs(e, jeu, T0)).plafondHabitants;
    const r = synchroniser(e, [{ at: T0, action: { type: 'construire', batiment: 'eglise_paroissiale' } }], T0, jeu, CTX_PROLOGUE, alea);
    const apres = calculerTaux(r.etat, jeu, calculerModificateurs(r.etat, jeu, T0)).plafondHabitants;
    expect(apres).toBe(avant + jeu.balance.buildings.eglise_paroissiale.capPerLevel!);
  });
});

describe('synchronisation et temps', () => {
  it('plafonne les gains hors ligne', () => {
    const e = nouvelEtat(jeu, T0);
    const r = synchroniser(e, [], T0 + 48 * HEURE, jeu, CTX_PROLOGUE, alea);
    const absence = r.evenements.find((ev) => ev.type === 'absence');
    expect(absence).toBeDefined();
    if (absence?.type === 'absence') {
      expect(absence.secondesComptees).toBe(jeu.balance.offline.capHours * 3600);
      expect(absence.secondes).toBe(48 * 3600);
    }
    expect(r.etat.lastComputedAt).toBe(T0 + 48 * HEURE);
  });

  it('donne la même chose pour 8 h et 48 h d\'absence', () => {
    const e = nouvelEtat(jeu, T0);
    const a = synchroniser(e, [], T0 + 8 * HEURE, jeu, CTX_PROLOGUE, alea).etat;
    const b = synchroniser(e, [], T0 + 48 * HEURE, jeu, CTX_PROLOGUE, alea).etat;
    expect(b.partie.argent).toBeCloseTo(a.partie.argent, 6);
  });

  it('ignore une heure d\'action dans le futur ou avant le dernier calcul', () => {
    const e = etatRiche();
    const futur: ActionHorodatee = { at: T0 + 999 * HEURE, action: { type: 'construire', batiment: 'terre_censitaire' } };
    const r = synchroniser(e, [futur], T0 + MIN, jeu, CTX_PROLOGUE, alea);
    expect(r.etat.lastComputedAt).toBe(T0 + MIN);
    const passe: ActionHorodatee = { at: T0 - 999 * HEURE, action: { type: 'construire', batiment: 'terre_censitaire' } };
    const r2 = synchroniser(r.etat, [passe], T0 + 2 * MIN, jeu, CTX_PROLOGUE, alea);
    expect(r2.refus).toHaveLength(0);
    expect(r2.etat.lastComputedAt).toBe(T0 + 2 * MIN);
  });

  it('la prédiction du navigateur égale le calcul du serveur', () => {
    const e = nouvelEtat(jeu, T0);
    const actions: ActionHorodatee[] = [
      { at: T0 + 30_000, action: { type: 'construire', batiment: 'terre_censitaire' } },
      { at: T0 + 45_000, action: { type: 'construire', batiment: 'terre_censitaire' } },
    ];
    const client = synchroniser(e, actions, T0 + 55_000, jeu, CTX_PROLOGUE, aleaGraine(1));
    const serveur = synchroniser(e, actions, T0 + 55_000, jeu, CTX_PROLOGUE, aleaGraine(2));
    expect(client.etat).toEqual(serveur.etat);
  });

  it('découper le temps en plusieurs synchronisations donne le même résultat', () => {
    const e = nouvelEtat(jeu, T0);
    const d = synchroniser(e, [], T0 + 4 * MIN, jeu, CTX_PROLOGUE, alea).etat;
    let m = e;
    for (let i = 1; i <= 4; i++) m = synchroniser(m, [], T0 + i * MIN, jeu, CTX_PROLOGUE, alea).etat;
    expect(m.partie.argent).toBeCloseTo(d.partie.argent, 6);
  });

  it('applique les Voix données par l\'enseignant', () => {
    const e = nouvelEtat(jeu, T0);
    const r = synchroniser(e, [], T0, jeu, CTX_PROLOGUE, alea, [{ id: 'd1', montant: 20, raison: 'Belle collaboration' }]);
    expect(r.etat.portefeuille.voix).toBe(20);
    expect(r.donsAppliques).toEqual(['d1']);
  });
});

describe('recensement et passage d\'époque', () => {
  it('le multiplicateur suit une racine carrée', () => {
    const r = jeu.balance.recensement;
    expect(multiplicateurRecensement(jeu, 0)).toBe(1);
    expect(multiplicateurRecensement(jeu, r.divisor * 4)).toBeCloseTo(1 + r.coefficient * 2);
  });

  it('le recensement remet la partie à zéro et garde le compte', () => {
    const e = etatRiche();
    e.partie.habitants = 40;
    e.epoque.productionTotal = 500;
    const r = synchroniser(e, [{ at: T0, action: { type: 'recensement' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.refus).toEqual([]);
    expect(r.etat.epoque.recensements).toBe(1);
    expect(r.etat.epoque.habitantsRecenses).toBe(40);
    expect(r.etat.epoque.productionTotal).toBe(500);
    expect(r.etat.partie.argent).toBe(jeu.balance.eras.prologue!.startingArgent);
    const ev = r.evenements.find((x) => x.type === 'recensement');
    expect(ev && ev.type === 'recensement' && ev.factId).toBe('rec_talon_1666');
  });

  it('refuse le passage tant que l\'enseignant n\'a pas ouvert l\'époque', () => {
    const e = etatRiche();
    e.epoque.jalonAtteintLe = T0;
    const r = synchroniser(e, [{ at: T0, action: { type: 'passage' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.refus[0]?.raison).toMatch(/enseignant/);
  });

  it('le passage donne de l\'Héritage, un monument et un paquet gratuit', () => {
    const e = etatRiche();
    e.epoque.jalonAtteintLe = T0;
    e.epoque.productionTotal = 9000;
    e.cartes.meunier = { niveau: 1, obtenueLe: T0 };
    const r = synchroniser(e, [{ at: T0, action: { type: 'passage' } }], T0, jeu, CTX_TOUT, alea);
    expect(r.refus).toEqual([]);
    expect(r.etat.era).toBe('epoque_1');
    expect(r.etat.heritage).toBe(Math.floor(Math.sqrt(9000 / jeu.balance.heritage.divisor)));
    expect(r.etat.monuments).toContain('eglise_paroissiale');
    expect(r.etat.portefeuille.paquetsGratuits).toBe(1);
    expect(r.etat.cartes.meunier).toBeDefined();
    expect(r.etat.partie.buildings).toEqual(jeu.balance.eras.epoque_1!.startingBuildings);
  });

  it('l\'église reste constructible en Époque 1', () => {
    const e = etatRiche();
    e.era = 'epoque_1';
    e.monuments = ['eglise_paroissiale'];
    e.partie.buildings = {};
    const r = synchroniser(e, [{ at: T0, action: { type: 'construire', batiment: 'eglise_paroissiale' } }], T0, jeu, CTX_TOUT, alea);
    expect(r.refus).toEqual([]);
  });

  it('atteint le jalon et le note', () => {
    const e = etatRiche();
    const m = jeu.balance.eras.prologue!.milestone;
    e.partie.habitants = m.habitants;
    e.partie.buildings.eglise_paroissiale = 10;
    e.epoque.productionTotal = m.productionTotal;
    const r = synchroniser(e, [], T0 + 20_000, jeu, CTX_PROLOGUE, alea);
    expect(r.etat.epoque.jalonAtteintLe).not.toBeNull();
    expect(r.evenements.some((x) => x.type === 'jalon_atteint')).toBe(true);
  });
});

describe('conseil', () => {
  it('donne la demi-puissance hors de l\'époque de la carte', () => {
    const e = etatRiche();
    e.cartes.meunier = { niveau: 1, obtenueLe: T0 };
    e.conseil[0] = 'meunier';
    const pleine = puissanceCarte(e, jeu, 'meunier');
    e.era = 'epoque_1';
    expect(puissanceCarte(e, jeu, 'meunier')).toBeCloseTo(pleine * jeu.balance.cards.outOfEraFactor);
  });

  it('double l\'effet de Baldwin et La Fontaine ensemble', () => {
    const e = etatRiche();
    e.era = 'epoque_1';
    e.cartes.robert_baldwin = { niveau: 1, obtenueLe: T0 };
    e.cartes.louis_hippolyte_la_fontaine = { niveau: 1, obtenueLe: T0 };
    e.conseil = ['robert_baldwin', null, null];
    const seul = puissanceCarte(e, jeu, 'robert_baldwin');
    e.conseil = ['robert_baldwin', 'louis_hippolyte_la_fontaine', null];
    expect(puissanceCarte(e, jeu, 'robert_baldwin')).toBeCloseTo(seul * jeu.balance.cards.synergyFactor);
  });

  it('une carte ne siège qu\'une fois', () => {
    const e = etatRiche();
    e.cartes.meunier = { niveau: 1, obtenueLe: T0 };
    let r = synchroniser(e, [{ at: T0, action: { type: 'conseil', emplacement: 0, carte: 'meunier' } }], T0, jeu, CTX_PROLOGUE, alea);
    r = synchroniser(r.etat, [{ at: T0, action: { type: 'conseil', emplacement: 2, carte: 'meunier' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.etat.conseil).toEqual([null, null, 'meunier']);
  });

  it('refuse une carte qu\'on n\'a pas', () => {
    const e = etatRiche();
    const r = synchroniser(e, [{ at: T0, action: { type: 'conseil', emplacement: 0, carte: 'louis_riel' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.refus).toHaveLength(1);
  });
});

describe('Archives', () => {
  const chrono = jeu.contenu.questions.find((q) => q.type === 'chronologie') as Question;

  it('corrige une chronologie', () => {
    expect(estCorrecte(chrono, ordreChronologique(chrono))).toBe(true);
    expect(estCorrecte(chrono, [...ordreChronologique(chrono)].reverse())).toBe(false);
    expect(estCorrecte(chrono, [0, 0, 0, 0, 0])).toBe(false);
  });

  it('consomme et recharge les charges', () => {
    const e = etatRiche();
    const q = jeu.contenu.questions.find((x) => x.type === 'quiz' && x.era === 'prologue')!;
    let etat = e;
    for (let i = 0; i < 3; i++) {
      const r = synchroniser(etat, [{ at: T0, action: { type: 'archives_repondre', questionId: q.id, reponse: 99 } }], T0, jeu, CTX_PROLOGUE, alea);
      expect(r.refus).toEqual([]);
      etat = r.etat;
    }
    expect(chargesDisponibles(etat, jeu, T0)).toBe(0);
    const bloque = synchroniser(etat, [{ at: T0, action: { type: 'archives_repondre', questionId: q.id, reponse: 0 } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(bloque.refus).toHaveLength(1);
    expect(chargesDisponibles(etat, jeu, T0 + HEURE)).toBe(1);
    expect(chargesDisponibles(etat, jeu, T0 + 5 * HEURE)).toBe(3);
  });

  it('une bonne réponse permet de choisir une récompense, une seule fois', () => {
    const e = etatRiche();
    const q = jeu.contenu.questions.find((x) => x.type === 'quiz' && x.era === 'prologue');
    if (!q || q.type !== 'quiz') throw new Error('question manquante');
    const r = synchroniser(
      e,
      [
        { at: T0, action: { type: 'archives_repondre', questionId: q.id, reponse: q.answerIndex } },
        { at: T0, action: { type: 'archives_recompense', choix: 'fragments' } },
        { at: T0, action: { type: 'archives_recompense', choix: 'fragments' } },
      ],
      T0,
      jeu,
      CTX_PROLOGUE,
      alea,
    );
    expect(r.refus.map((x) => x.index)).toEqual([2]);
    expect(r.etat.portefeuille.fragments).toBe(jeu.balance.archives.rewards.fragments);
  });

  it('refuse une question d\'une époque pas encore atteinte, sauf en mode révision', () => {
    const e = etatRiche();
    const q = jeu.contenu.questions.find((x) => x.era === 'epoque_1')!;
    const a: ActionHorodatee = { at: T0, action: { type: 'archives_repondre', questionId: q.id, reponse: 0 } };
    expect(synchroniser(e, [a], T0, jeu, CTX_PROLOGUE, alea).refus).toHaveLength(1);
    expect(synchroniser(e, [a], T0, jeu, { ...CTX_PROLOGUE, modeRevision: true }, alea).refus).toHaveLength(0);
  });

  it('le bonus de production double la production pendant sa durée', () => {
    const e = etatRiche();
    e.partie.buildings.moulin_banal = 5;
    const sans = calculerTaux(e, jeu, calculerModificateurs(e, jeu, T0)).production;
    e.boosts.push({ kind: 'production', multiplier: 2, endsAt: T0 + 15 * MIN });
    const avec = calculerTaux(e, jeu, calculerModificateurs(e, jeu, T0)).production;
    expect(avec).toBeCloseTo(sans * 2);
    expect(calculerModificateurs(e, jeu, T0 + 16 * MIN).boost).toBe(1);
  });
});

describe('paquets', () => {
  function etatEpoque1(): EtatJeu {
    const e = etatRiche();
    e.era = 'epoque_1';
    e.portefeuille.voix = 100000;
    return e;
  }

  it('respecte les cotes affichées (à peu près) et la garantie d\'une Rare', () => {
    let e = etatEpoque1();
    const compte = { commune: 0, rare: 0, epique: 0 };
    const a = aleaGraine(7);
    for (let i = 0; i < 2000; i++) {
      const r = synchroniser(e, [{ at: T0, action: { type: 'ouvrir_paquet', source: 'voix' } }], T0, jeu, CTX_TOUT, a);
      e = r.etat;
      const ev = r.evenements.find((x) => x.type === 'paquet');
      if (ev?.type !== 'paquet') throw new Error('pas de paquet');
      expect(ev.cartes).toHaveLength(3);
      expect(ev.cartes.some((c) => c.rarity !== 'commune')).toBe(true);
      for (const c of ev.cartes) compte[c.rarity]++;
    }
    const total = compte.commune + compte.rare + compte.epique;
    expect(compte.epique / total).toBeGreaterThan(0.04);
    expect(compte.epique / total).toBeLessThan(0.12);
    expect(compte.commune / total).toBeGreaterThan(0.55);
  });

  it('garantit une Épique au 10e paquet sans Épique', () => {
    const e = etatEpoque1();
    e.portefeuille.pitie = jeu.balance.packs.pityPacks - 1;
    const r = synchroniser(e, [{ at: T0, action: { type: 'ouvrir_paquet', source: 'voix' } }], T0, jeu, CTX_TOUT, aleaGraine(3));
    const ev = r.evenements.find((x) => x.type === 'paquet');
    expect(ev?.type === 'paquet' && ev.cartes.some((c) => c.rarity === 'epique')).toBe(true);
    expect(r.etat.portefeuille.pitie).toBe(0);
  });

  it('transforme les doublons en fragments', () => {
    const e = etatEpoque1();
    for (const c of jeu.contenu.cards) e.cartes[c.id] = { niveau: 1, obtenueLe: T0 };
    const r = synchroniser(e, [{ at: T0, action: { type: 'ouvrir_paquet', source: 'voix' } }], T0, jeu, CTX_TOUT, aleaGraine(5));
    expect(r.etat.portefeuille.fragments).toBeGreaterThan(0);
  });

  it('refuse sans Voix', () => {
    const e = etatEpoque1();
    e.portefeuille.voix = 0;
    const r = synchroniser(e, [{ at: T0, action: { type: 'ouvrir_paquet', source: 'voix' } }], T0, jeu, CTX_TOUT, alea);
    expect(r.refus[0]?.raison).toMatch(/Voix/);
  });

  it('ne tire que des cartes des époques atteintes', () => {
    let e = etatRiche();
    e.portefeuille.voix = 1000;
    for (let i = 0; i < 50; i++) {
      e = synchroniser(e, [{ at: T0, action: { type: 'ouvrir_paquet', source: 'voix' } }], T0, jeu, CTX_PROLOGUE, aleaGraine(i)).etat;
    }
    for (const id of Object.keys(e.cartes)) expect(jeu.cards.get(id)!.era).toBe('prologue');
  });
});

describe('crises', () => {
  it('le choléra commence au seuil d\'habitants et finit après sa durée', () => {
    const e = etatRiche();
    const cb = jeu.balance.crises.cholera_1832;
    e.partie.habitants = cb.triggerHabitants;
    e.partie.buildings.eglise_paroissiale = 5;
    const r = synchroniser(e, [], T0 + 20_000, jeu, CTX_PROLOGUE, alea);
    expect(r.etat.crise?.id).toBe('cholera_1832');
    const fin = synchroniser(r.etat, [], T0 + cb.durationMinutes * MIN + 30_000, jeu, CTX_PROLOGUE, alea);
    expect(fin.etat.crise).toBeNull();
    expect(fin.etat.crisesALire).toContain('cholera_1832');
    // Une seule fois par époque.
    const encore = synchroniser(fin.etat, [], T0 + 2 * HEURE, jeu, CTX_PROLOGUE, alea);
    expect(encore.etat.crise).toBeNull();
  });

  it('payer réduit la pénalité', () => {
    const e = etatRiche();
    e.partie.habitants = 30;
    e.partie.buildings.eglise_paroissiale = 5;
    e.crise = { id: 'cholera_1832', startedAt: T0, endsAt: T0 + HEURE, mitigations: [] };
    const avant = calculerModificateurs(e, jeu, T0).crise.croissance;
    const r = synchroniser(e, [{ at: T0, action: { type: 'crise_payer' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.refus).toEqual([]);
    expect(calculerModificateurs(r.etat, jeu, T0).crise.croissance).toBeGreaterThan(avant);
  });

  it('Antoine Labelle au conseil atténue l\'exode', () => {
    const e = etatRiche();
    e.era = 'epoque_1';
    e.crise = { id: 'exode_nouvelle_angleterre', startedAt: T0, endsAt: T0 + HEURE, mitigations: [] };
    e.partie.buildings = {};
    const sans = calculerModificateurs(e, jeu, T0).crise.plafond;
    e.cartes.antoine_labelle = { niveau: 1, obtenueLe: T0 };
    e.conseil = ['antoine_labelle', null, null];
    expect(calculerModificateurs(e, jeu, T0).crise.plafond).toBeGreaterThan(sans);
  });
});

describe('Héritage', () => {
  it('achète un bonus et ajoute un emplacement de conseil', () => {
    const e = etatRiche();
    e.heritage = 1000;
    const arbre = ['production_1', 'absence_1', 'production_2', 'conseil_4'];
    const r = synchroniser(e, arbre.map((noeud) => ({ at: T0, action: { type: 'heritage_acheter' as const, noeud } })), T0, jeu, CTX_PROLOGUE, alea);
    expect(r.refus).toEqual([]);
    expect(r.etat.conseil).toHaveLength(4);
  });

  it('refuse un bonus sans son prérequis', () => {
    const e = etatRiche();
    e.heritage = 1000;
    const r = synchroniser(e, [{ at: T0, action: { type: 'heritage_acheter', noeud: 'conseil_5' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.refus).toHaveLength(1);
  });
});

describe('divers', () => {
  it('nettoie le nom de la ville', () => {
    const e = etatRiche();
    const r = synchroniser(e, [{ at: T0, action: { type: 'nommer_ville', nom: '  Saint-<b>Bidule</b>   des Prés ' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.etat.townName).toBe('Saint-bBidule/b des Prés');
  });

  it('offre la carte du tutoriel une seule fois', () => {
    const e = etatRiche();
    const r = synchroniser(e, [{ at: T0, action: { type: 'tutoriel_carte' } }, { at: T0, action: { type: 'tutoriel_carte' } }], T0, jeu, CTX_PROLOGUE, alea);
    expect(r.etat.cartes.meunier).toBeDefined();
    expect(r.refus).toHaveLength(1);
  });

  it('appliquerAction ne touche pas l\'état d\'origine via synchroniser', () => {
    const e = etatRiche();
    const copie = cloner(e);
    synchroniser(e, [{ at: T0, action: { type: 'construire', batiment: 'terre_censitaire' } }], T0 + MIN, jeu, CTX_PROLOGUE, alea);
    expect(e).toEqual(copie);
    void appliquerAction;
  });
});

describe('paliers', () => {
  it('doublent la production d\'un bâtiment producteur au niveau 25', () => {
    const e = etatRiche();
    e.partie.buildings.moulin_banal = 24;
    const avant = calculerTaux(e, jeu, calculerModificateurs(e, jeu, T0)).parBatiment.moulin_banal;
    e.partie.buildings.moulin_banal = 25;
    const apres = calculerTaux(e, jeu, calculerModificateurs(e, jeu, T0)).parBatiment.moulin_banal;
    expect(apres / avant).toBeCloseTo((25 / 24) * jeu.balance.paliers.multiplicateur);
  });

  it('ne touchent pas le plafond de l\'église', () => {
    const e = etatRiche();
    e.partie.buildings.eglise_paroissiale = 25;
    const cap = calculerTaux(e, jeu, calculerModificateurs(e, jeu, T0)).plafondHabitants;
    expect(cap).toBe(jeu.balance.habitants.baseCap + 25 * jeu.balance.buildings.eglise_paroissiale.capPerLevel!);
  });
});
