// Actions de l'enseignant. Chaque action qui change quelque chose est inscrite au journal (admin_log).
// La lecture (listes, statistiques) se fait directement dans la base, protégée par la RLS.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';
import { clientAdmin, utilisateur } from '../_shared/serveur/clients.ts';
import { ErreurPublique, json, lireCorps, servir } from '../_shared/serveur/http.ts';
import { jeu } from '../_shared/serveur/donnees.ts';
import type { EtatJeu } from '../_shared/jeu/etat.ts';
import { nouvelEtat } from '../_shared/jeu/etat.ts';
import { nettoyerNomVille } from '../_shared/jeu/actions.ts';

// Les comptes élèves ont un identifiant technique en forme de courriel, sans donnée personnelle.
// Aucun courriel n'est jamais envoyé à cette adresse.
const DOMAINE = Deno.env.get('DOMAINE_IDENTIFIANTS_ELEVES') ?? 'eleves.example.com';
const ALPHABET_CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ERAS_LANCABLES = ['epoque_1', 'epoque_2', 'epoque_3', 'epoque_4'];

type Corps = Record<string, unknown> & { op?: string };

function hasard(n: number): number {
  const t = new Uint32Array(1);
  crypto.getRandomValues(t);
  return t[0] % n;
}

function nouveauCode(): string {
  return Array.from({ length: 6 }, () => ALPHABET_CODE[hasard(ALPHABET_CODE.length)]).join('');
}

/** NIP de 4 chiffres, en évitant les plus faciles à deviner. */
export function nouveauNip(): string {
  for (;;) {
    const nip = String(hasard(10000)).padStart(4, '0');
    if (/^(\d)\1{3}$/.test(nip)) continue; // 0000, 1111...
    if ('0123456789'.includes(nip) || '9876543210'.includes(nip)) continue; // 1234, 4321...
    if (/^(19|20)\d\d$/.test(nip)) continue; // années
    return nip;
  }
}

function texte(v: unknown, nom: string, max: number): string {
  if (typeof v !== 'string' || !v.trim()) throw new ErreurPublique(`${nom} manquant.`);
  const t = v.trim().replace(/\s+/g, ' ');
  if (t.length > max) throw new ErreurPublique(`${nom} trop long (${max} caractères au maximum).`);
  return t;
}

function id(v: unknown, nom = 'Identifiant'): string {
  if (typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v)) throw new ErreurPublique(`${nom} invalide.`);
  return v;
}

function entier(v: unknown, nom: string, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new ErreurPublique(`${nom} : nombre entier entre ${min} et ${max}.`);
  return n;
}

class Admin {
  constructor(private db: SupabaseClient, private prof: string) {}

  private async verifier<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
    const { data, error } = await p;
    if (error) throw error;
    return data;
  }

  async journal(action: string, details: Record<string, unknown>, cible: { groupe?: string | null; eleve?: string | null }, raison: string | null = null) {
    await this.verifier(
      this.db.from('admin_log').insert({
        teacher_id: this.prof,
        group_id: cible.groupe ?? null,
        student_id: cible.eleve ?? null,
        action,
        details,
        reason: raison,
      }),
    );
  }

  async groupe(gid: string): Promise<{ id: string; name: string }> {
    const g = await this.verifier(this.db.from('groups').select('id, name, teacher_id').eq('id', gid).maybeSingle());
    if (!g || (g as { teacher_id: string }).teacher_id !== this.prof) throw new ErreurPublique('Groupe introuvable.', 404);
    return g as { id: string; name: string };
  }

  async eleve(eid: string): Promise<{ id: string; group_id: string; pseudonym: string }> {
    const e = await this.verifier(this.db.from('students').select('id, group_id, pseudonym').eq('id', eid).maybeSingle());
    if (!e) throw new ErreurPublique('Élève introuvable.', 404);
    await this.groupe((e as { group_id: string }).group_id);
    return e as { id: string; group_id: string; pseudonym: string };
  }

  async creerGroupe(nom: string) {
    for (let i = 0; i < 5; i++) {
      const { data, error } = await this.db
        .from('groups')
        .insert({ teacher_id: this.prof, name: nom, class_code: nouveauCode() })
        .select('id, name, class_code')
        .single();
      if (error?.code === '23505') continue;
      if (error) throw error;
      await this.journal('creer_groupe', { nom }, { groupe: data.id });
      return data;
    }
    throw new ErreurPublique('Impossible de créer un code de classe unique. Réessaie.');
  }

  async creerEleves(gid: string, pseudonymes: string[]) {
    await this.groupe(gid);
    const crees: { id: string; pseudonyme: string; nip: string }[] = [];
    const erreurs: string[] = [];
    for (const brut of pseudonymes) {
      const pseudonyme = brut.trim().replace(/\s+/g, ' ');
      if (!pseudonyme) continue;
      if (pseudonyme.length > 30) {
        erreurs.push(`« ${pseudonyme} » : trop long (30 caractères au maximum).`);
        continue;
      }
      const deja = await this.verifier(this.db.from('students').select('id').eq('group_id', gid).ilike('pseudonym', pseudonyme.replace(/[%_\\]/g, '\\$&')));
      if ((deja as unknown[]).length) {
        erreurs.push(`« ${pseudonyme} » : ce pseudonyme existe déjà dans ce groupe.`);
        continue;
      }
      const { data: u, error: eu } = await this.db.auth.admin.createUser({
        email: `${crypto.randomUUID()}@${DOMAINE}`,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
        app_metadata: { role: 'student' },
      });
      if (eu || !u.user) {
        erreurs.push(`« ${pseudonyme} » : création du compte impossible (${eu?.message ?? 'erreur inconnue'}).`);
        continue;
      }
      const nip = nouveauNip();
      try {
        await this.verifier(this.db.from('students').insert({ id: u.user.id, group_id: gid, pseudonym: pseudonyme }));
        const hash = await this.verifier(this.db.rpc('hacher_nip', { nip }));
        await this.verifier(this.db.from('student_secrets').insert({ student_id: u.user.id, pin_hash: hash }));
      } catch (e) {
        await this.db.auth.admin.deleteUser(u.user.id);
        throw e;
      }
      crees.push({ id: u.user.id, pseudonyme, nip });
    }
    if (crees.length) await this.journal('creer_eleves', { pseudonymes: crees.map((c) => c.pseudonyme) }, { groupe: gid });
    return { crees, erreurs };
  }

  async reinitialiserNip(eid: string) {
    const e = await this.eleve(eid);
    const nip = nouveauNip();
    const hash = await this.verifier(this.db.rpc('hacher_nip', { nip }));
    await this.verifier(this.db.from('student_secrets').update({ pin_hash: hash, failed_attempts: 0, locked_until: null }).eq('student_id', eid));
    await this.journal('reinitialiser_nip', {}, { groupe: e.group_id, eleve: eid });
    return { pseudonyme: e.pseudonym, nip };
  }

  async renommerEleve(eid: string, pseudonyme: string) {
    const e = await this.eleve(eid);
    const { error } = await this.db.from('students').update({ pseudonym: pseudonyme }).eq('id', eid);
    if (error?.code === '23505') throw new ErreurPublique('Ce pseudonyme existe déjà dans ce groupe.');
    if (error) throw error;
    await this.journal('renommer_eleve', { avant: e.pseudonym, apres: pseudonyme }, { groupe: e.group_id, eleve: eid });
    return { ok: true };
  }

  async supprimerEleve(eid: string, raison: string) {
    const e = await this.eleve(eid);
    await this.journal('supprimer_eleve', { pseudonyme: e.pseudonym }, { groupe: e.group_id, eleve: null }, raison);
    const { error } = await this.db.auth.admin.deleteUser(eid);
    if (error) throw error;
    return { ok: true };
  }

  async equipe(gid: string, nom: string) {
    await this.groupe(gid);
    const data = await this.verifier(this.db.from('teams').insert({ group_id: gid, name: nom }).select('id, name').single());
    await this.journal('creer_equipe', { nom }, { groupe: gid });
    return data;
  }

  async supprimerEquipe(tid: string) {
    const t = await this.verifier(this.db.from('teams').select('id, group_id, name').eq('id', tid).maybeSingle());
    if (!t) throw new ErreurPublique('Équipe introuvable.', 404);
    const equipe = t as { group_id: string; name: string };
    await this.groupe(equipe.group_id);
    await this.verifier(this.db.from('teams').delete().eq('id', tid));
    await this.journal('supprimer_equipe', { nom: equipe.name }, { groupe: equipe.group_id });
    return { ok: true };
  }

  async assignerEquipe(eid: string, tid: string | null) {
    const e = await this.eleve(eid);
    if (tid) {
      const t = await this.verifier(this.db.from('teams').select('group_id').eq('id', tid).maybeSingle());
      if (!t || (t as { group_id: string }).group_id !== e.group_id) throw new ErreurPublique('Équipe introuvable dans ce groupe.');
    }
    await this.verifier(this.db.from('students').update({ team_id: tid }).eq('id', eid));
    return { ok: true };
  }

  async donnerVoix(cible: string, cid: string, montant: number, raison: string | null) {
    let eleves: { id: string; group_id: string }[];
    let groupe: string;
    if (cible === 'eleve') {
      const e = await this.eleve(cid);
      eleves = [e];
      groupe = e.group_id;
    } else if (cible === 'equipe') {
      const t = await this.verifier(this.db.from('teams').select('group_id').eq('id', cid).maybeSingle());
      if (!t) throw new ErreurPublique('Équipe introuvable.', 404);
      groupe = (t as { group_id: string }).group_id;
      await this.groupe(groupe);
      eleves = (await this.verifier(this.db.from('students').select('id, group_id').eq('team_id', cid))) as { id: string; group_id: string }[];
    } else if (cible === 'groupe') {
      await this.groupe(cid);
      groupe = cid;
      eleves = (await this.verifier(this.db.from('students').select('id, group_id').eq('group_id', cid))) as { id: string; group_id: string }[];
    } else throw new ErreurPublique('Cible invalide.');
    if (!eleves.length) throw new ErreurPublique('Aucun élève à qui donner des Voix.');
    await this.verifier(
      this.db.from('voix_grants').insert(eleves.map((e) => ({ student_id: e.id, amount: montant, reason: raison, granted_by: this.prof }))),
    );
    await this.journal('donner_voix', { cible, montant, eleves: eleves.length }, { groupe, eleve: cible === 'eleve' ? cid : null }, raison);
    return { eleves: eleves.length };
  }

  async lancerEpoque(gid: string, era: string) {
    await this.groupe(gid);
    if (!ERAS_LANCABLES.includes(era)) throw new ErreurPublique('Époque inconnue.');
    const { error } = await this.db.from('era_openings').insert({ group_id: gid, era, opened_by: this.prof });
    if (error?.code === '23505') throw new ErreurPublique('Cette époque est déjà ouverte pour ce groupe.');
    if (error) throw error;
    await this.journal('lancer_epoque', { era }, { groupe: gid });
    return { ok: true };
  }

  async modeRevision(gid: string, actif: boolean) {
    await this.groupe(gid);
    await this.verifier(this.db.from('groups').update({ revision_mode: actif }).eq('id', gid));
    await this.journal('mode_revision', { actif }, { groupe: gid });
    return { ok: true };
  }

  async nouveauCodeClasse(gid: string) {
    await this.groupe(gid);
    for (let i = 0; i < 5; i++) {
      const code = nouveauCode();
      const { error } = await this.db.from('groups').update({ class_code: code }).eq('id', gid);
      if (error?.code === '23505') continue;
      if (error) throw error;
      await this.journal('nouveau_code', {}, { groupe: gid });
      return { code };
    }
    throw new ErreurPublique('Réessaie.');
  }

  /** Correction de la partie d'un élève (bug, exploit, nom de ville inapproprié). Raison obligatoire. */
  async corriger(eid: string, modifs: Record<string, unknown>, raison: string, reinitialiser: boolean) {
    const e = await this.eleve(eid);
    for (let essai = 0; essai < 4; essai++) {
      const ligne = await this.verifier(this.db.from('game_states').select('state, version').eq('student_id', eid).maybeSingle());
      const avant = ligne ? ((ligne as { state: EtatJeu }).state) : null;
      let etat: EtatJeu = reinitialiser || !avant ? nouvelEtat(jeu, Date.now()) : structuredClone(avant);
      if (reinitialiser && avant) etat = { ...etat, townName: avant.townName };
      const changements: Record<string, { avant: unknown; apres: unknown }> = {};
      const changer = (cle: string, lire: () => unknown, ecrire: (v: number | string | null) => void, v: number | string | null) => {
        changements[cle] = { avant: lire(), apres: v };
        ecrire(v);
      };
      if ('townName' in modifs) {
        const nom = modifs.townName === null || modifs.townName === '' ? null : nettoyerNomVille(String(modifs.townName));
        changer('townName', () => etat.townName, (v) => (etat.townName = v as string | null), nom);
      }
      if ('heritage' in modifs) changer('heritage', () => etat.heritage, (v) => (etat.heritage = v as number), entier(modifs.heritage, 'Héritage', 0, 1e9));
      if ('voix' in modifs) changer('voix', () => etat.portefeuille.voix, (v) => (etat.portefeuille.voix = v as number), entier(modifs.voix, 'Voix', 0, 100000));
      if ('fragments' in modifs) changer('fragments', () => etat.portefeuille.fragments, (v) => (etat.portefeuille.fragments = v as number), entier(modifs.fragments, 'Fragments', 0, 1e6));
      if ('paquetsGratuits' in modifs) {
        changer('paquetsGratuits', () => etat.portefeuille.paquetsGratuits, (v) => (etat.portefeuille.paquetsGratuits = v as number), entier(modifs.paquetsGratuits, 'Paquets gratuits', 0, 100));
      }
      if (!reinitialiser && Object.keys(changements).length === 0) throw new ErreurPublique('Aucune modification.');
      const valeurs = { state: etat, era: etat.era, heritage: etat.heritage, town_name: etat.townName, updated_at: new Date().toISOString() };
      let ok: boolean;
      if (!ligne) {
        const { error } = await this.db.from('game_states').insert({ student_id: eid, version: 1, ...valeurs });
        ok = !error;
      } else {
        const v = (ligne as { version: number }).version;
        const data = await this.verifier(this.db.from('game_states').update({ ...valeurs, version: v + 1 }).eq('student_id', eid).eq('version', v).select('student_id'));
        ok = (data as unknown[]).length === 1;
      }
      if (!ok) continue;
      await this.journal(reinitialiser ? 'reinitialiser_partie' : 'corriger', { changements }, { groupe: e.group_id, eleve: eid }, raison);
      return { ok: true, changements };
    }
    throw new ErreurPublique('L\'élève joue en ce moment. Réessaie dans quelques secondes.', 409);
  }

  async purger(gid: string, confirmation: string) {
    const g = await this.groupe(gid);
    if (confirmation !== g.name) throw new ErreurPublique('Pour confirmer, écris le nom exact du groupe.');
    const n = await this.verifier(this.db.rpc('purger_groupe', { gid }));
    await this.journal('purger_groupe', { nom: g.name, eleves: n }, { groupe: null });
    return { eleves: n };
  }
}

Deno.serve(
  servir(async (req) => {
    const db = clientAdmin();
    const uid = await utilisateur(req, db);
    const { data: prof } = await db.from('teachers').select('id').eq('id', uid).maybeSingle();
    if (!prof) throw new ErreurPublique('Réservé aux enseignants.', 403);
    const a = new Admin(db, uid);
    const c = await lireCorps<Corps>(req);
    const raison = (v: unknown) => (typeof v === 'string' && v.trim() ? texte(v, 'Raison', 120) : null);

    switch (c.op) {
      case 'creer_groupe':
        return json(await a.creerGroupe(texte(c.nom, 'Nom du groupe', 60)));
      case 'creer_eleves': {
        if (!Array.isArray(c.pseudonymes) || c.pseudonymes.length > 60) throw new ErreurPublique('Liste de pseudonymes invalide (60 au maximum).');
        return json(await a.creerEleves(id(c.groupeId), c.pseudonymes.map(String)));
      }
      case 'reinitialiser_nip':
        return json(await a.reinitialiserNip(id(c.eleveId)));
      case 'renommer_eleve':
        return json(await a.renommerEleve(id(c.eleveId), texte(c.pseudonyme, 'Pseudonyme', 30)));
      case 'supprimer_eleve':
        return json(await a.supprimerEleve(id(c.eleveId), texte(c.raison, 'Raison', 120)));
      case 'creer_equipe':
        return json(await a.equipe(id(c.groupeId), texte(c.nom, 'Nom de l\'équipe', 40)));
      case 'supprimer_equipe':
        return json(await a.supprimerEquipe(id(c.equipeId)));
      case 'assigner_equipe':
        return json(await a.assignerEquipe(id(c.eleveId), c.equipeId ? id(c.equipeId) : null));
      case 'donner_voix':
        return json(await a.donnerVoix(String(c.cible), id(c.id), entier(c.montant, 'Montant', 1, 1000), raison(c.raison)));
      case 'lancer_epoque':
        return json(await a.lancerEpoque(id(c.groupeId), String(c.era)));
      case 'mode_revision':
        return json(await a.modeRevision(id(c.groupeId), c.actif === true));
      case 'nouveau_code':
        return json(await a.nouveauCodeClasse(id(c.groupeId)));
      case 'corriger': {
        if (!c.modifications || typeof c.modifications !== 'object') throw new ErreurPublique('Modifications manquantes.');
        return json(await a.corriger(id(c.eleveId), c.modifications as Record<string, unknown>, texte(c.raison, 'Raison', 120), false));
      }
      case 'reinitialiser_partie':
        return json(await a.corriger(id(c.eleveId), {}, texte(c.raison, 'Raison', 120), true));
      case 'purger_groupe':
        return json(await a.purger(id(c.groupeId), String(c.confirmation ?? '')));
      default:
        throw new ErreurPublique('Action inconnue.');
    }
  }),
);
