import { describe, expect, it } from 'vitest';
import { HEURE, T0, jeuDeTest } from './aide.ts';
import { aleaGraine, cloner } from '../supabase/functions/_shared/jeu/index.ts';
import type { EtatJeu } from '../supabase/functions/_shared/jeu/index.ts';
import { ErreurSync, traiterSync, validerActions } from '../supabase/functions/_shared/jeu/serveur-sync.ts';
import type { Depot } from '../supabase/functions/_shared/jeu/serveur-sync.ts';

const jeu = jeuDeTest();

function depotMemoire() {
  const parties = new Map<string, { etat: EtatJeu; version: number }>();
  const dons = [{ id: 'd1', montant: 30, raison: 'Bravo', reclame: false }];
  const reponses: unknown[] = [];
  let conflitsAProvoquer = 0;
  const depot: Depot = {
    async chargerEleve(id) {
      return id === 'e1' ? { id, groupId: 'g1', pseudonyme: 'Renard', nomGroupe: '401' } : null;
    },
    async chargerContexte() {
      return { erasOuvertes: ['prologue'], modeRevision: false };
    },
    async chargerPartie(id) {
      const p = parties.get(id);
      return p ? { etat: cloner(p.etat), version: p.version } : null;
    },
    async chargerDons() {
      return dons.filter((d) => !d.reclame).map(({ id, montant, raison }) => ({ id, montant, raison }));
    },
    async ecrirePartie(id, etat, version) {
      if (conflitsAProvoquer > 0) {
        conflitsAProvoquer--;
        // Une autre requête a écrit entre-temps.
        const p = parties.get(id);
        if (p) p.version++;
        return false;
      }
      const p = parties.get(id);
      if ((p?.version ?? null) !== version) return false;
      parties.set(id, { etat: cloner(etat), version: (version ?? 0) + 1 });
      return true;
    },
    async marquerDons(ids) {
      for (const d of dons) if (ids.includes(d.id)) d.reclame = true;
    },
    async noterReponses(lignes) {
      reponses.push(...lignes);
    },
    async noterPaquets() {},
    async noterVisite() {},
  };
  return { depot, parties, dons, reponses, conflit: (n: number) => (conflitsAProvoquer = n) };
}

describe('synchronisation serveur', () => {
  it('crée une partie au premier appel et applique les Voix une seule fois', async () => {
    const m = depotMemoire();
    const r1 = await traiterSync(m.depot, 'e1', [], () => T0, jeu, aleaGraine(1));
    expect(r1.etat.portefeuille.voix).toBe(30);
    expect(r1.profil.pseudonyme).toBe('Renard');
    const r2 = await traiterSync(m.depot, 'e1', [], () => T0 + 1000, jeu, aleaGraine(1));
    expect(r2.etat.portefeuille.voix).toBe(30);
    expect(m.parties.get('e1')!.version).toBe(2);
  });

  it('recommence en cas de conflit de version', async () => {
    const m = depotMemoire();
    await traiterSync(m.depot, 'e1', [], () => T0, jeu, aleaGraine(1));
    m.conflit(2);
    const r = await traiterSync(m.depot, 'e1', [], () => T0 + HEURE, jeu, aleaGraine(1));
    expect(r.etat.lastComputedAt).toBe(T0 + HEURE);
  });

  it('refuse un compte qui n\'est pas élève', async () => {
    const m = depotMemoire();
    await expect(traiterSync(m.depot, 'inconnu', [], () => T0, jeu, aleaGraine(1))).rejects.toBeInstanceOf(ErreurSync);
  });

  it('note les réponses aux Archives', async () => {
    const m = depotMemoire();
    const q = jeu.contenu.questions.find((x) => x.era === 'prologue' && x.type === 'quiz')!;
    await traiterSync(m.depot, 'e1', [{ at: T0, action: { type: 'archives_repondre', questionId: q.id, reponse: 0 } }], () => T0, jeu, aleaGraine(1));
    expect(m.reponses).toHaveLength(1);
  });

  it('ignore l\'horloge du client', async () => {
    const m = depotMemoire();
    await traiterSync(m.depot, 'e1', [], () => T0, jeu, aleaGraine(1));
    const r = await traiterSync(m.depot, 'e1', [{ at: T0 + 100 * HEURE, action: { type: 'tutoriel', etape: 1 } }], () => T0 + 1000, jeu, aleaGraine(1));
    expect(r.etat.lastComputedAt).toBe(T0 + 1000);
  });

  it('rejette une requête mal formée', () => {
    expect(() => validerActions('bonjour')).toThrow(ErreurSync);
    expect(() => validerActions([{ action: 3 }])).toThrow(ErreurSync);
    expect(validerActions(undefined)).toEqual([]);
    expect(validerActions([{ action: { type: 'x' } }])[0].at).toBeNaN();
  });

  it('refuse proprement des actions farfelues', async () => {
    const m = depotMemoire();
    const r = await traiterSync(
      m.depot,
      'e1',
      [
        { at: T0, action: { type: 'construire', batiment: '__proto__', quantite: 1e9 } },
        { at: T0, action: { type: 'nommer_ville', nom: 42 } },
        { at: T0, action: { type: 'conseil', emplacement: 99, carte: 'meunier' } },
        { at: T0, action: { type: 'pirater' } },
      ],
      () => T0,
      jeu,
      aleaGraine(1),
    );
    expect(r.refus).toHaveLength(4);
  });
});
