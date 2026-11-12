// Mode local : le « serveur » tourne dans le navigateur et la partie est gardée sur l'appareil.
// Sert au développement et aux essais de l'enseignant avant que Supabase soit branché.
// Ce mode n'est pas protégé contre la triche (l'horloge de l'appareil fait foi).

import { aleaCrypto } from '@jeu/alea.ts';
import type { ActionHorodatee } from '@jeu/actions.ts';
import type { ContexteGroupe } from '@jeu/archives.ts';
import { nouvelEtat } from '@jeu/etat.ts';
import type { EtatJeu } from '@jeu/etat.ts';
import { synchroniser, type DonVoix } from '@jeu/sync.ts';
import { jeu } from '../donnees.ts';
import type { Backend, ReponseSync } from './types.ts';

// La version d'essai (/test/) et la version élèves ont chacune leur sauvegarde.
const CLE = `paroisse-local-v1:${import.meta.env.BASE_URL}`;

interface Sauvegarde {
  etat: EtatJeu;
  contexte: ContexteGroupe;
  dons: DonVoix[];
}

function lire(): Sauvegarde | null {
  try {
    const texte = localStorage.getItem(CLE);
    return texte ? (JSON.parse(texte) as Sauvegarde) : null;
  } catch {
    return null;
  }
}

function ecrire(s: Sauvegarde): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(s));
  } catch {
    // Stockage plein ou bloqué : la partie continue en mémoire.
  }
}

let memoire: Sauvegarde | null = null;

function charger(): Sauvegarde {
  if (!memoire) {
    memoire = lire() ?? {
      etat: nouvelEtat(jeu, Date.now()),
      contexte: { erasOuvertes: ['prologue'], modeRevision: false },
      dons: [],
    };
  }
  return memoire;
}

export function creerBackendLocal(): Backend {
  const alea = aleaCrypto();
  return {
    mode: 'local',
    async synchroniser(actions: ActionHorodatee[]): Promise<ReponseSync> {
      const s = charger();
      const maintenant = Date.now();
      const r = synchroniser(s.etat, actions, maintenant, jeu, s.contexte, alea, s.dons);
      s.etat = r.etat;
      s.dons = s.dons.filter((d) => !r.donsAppliques.includes(d.id));
      ecrire(s);
      return { ...r, contexte: s.contexte, maintenant, profil: { pseudonyme: 'Joueur local', groupe: 'Essai' } };
    },
    envoyerAvantFermeture(actions) {
      if (actions.length) void this.synchroniser(actions);
    },
    async deconnecter() {},
  };
}

// ---------- Outils de test (mode local seulement) ----------

export const outilsLocaux = {
  contexte(): ContexteGroupe {
    return charger().contexte;
  },
  basculerEpoque(era: string): void {
    const s = charger();
    s.contexte.erasOuvertes = s.contexte.erasOuvertes.includes(era)
      ? s.contexte.erasOuvertes.filter((e) => e !== era)
      : [...s.contexte.erasOuvertes, era];
    ecrire(s);
  },
  basculerRevision(): void {
    const s = charger();
    s.contexte.modeRevision = !s.contexte.modeRevision;
    ecrire(s);
  },
  donnerVoix(montant: number, raison: string | null): void {
    const s = charger();
    s.dons.push({ id: `local-${Date.now()}`, montant, raison });
    ecrire(s);
  },
  /** Fait comme si le joueur avait été absent pendant « heures » heures. */
  voyagerDansLeTemps(heures: number): void {
    const s = charger();
    const d = heures * 3_600_000;
    s.etat.lastComputedAt -= d;
    s.etat.archives.chargesMajLe -= d;
    for (const b of s.etat.boosts) b.endsAt -= d;
    if (s.etat.crise) {
      s.etat.crise.startedAt -= d;
      s.etat.crise.endsAt -= d;
    }
    ecrire(s);
  },
  reinitialiser(): void {
    memoire = null;
    try {
      localStorage.removeItem(CLE);
    } catch {
      // rien
    }
  },
};
