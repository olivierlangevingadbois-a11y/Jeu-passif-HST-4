// État de la partie côté navigateur.
//
// - « serveur » : dernier état officiel reçu.
// - « enAttente » : actions faites depuis, pas encore envoyées.
// - « affiche » : ce qu'on montre, recalculé 4 fois par seconde avec le même moteur que le serveur.

import type { Action, ActionHorodatee } from '@jeu/actions.ts';
import { ACTIONS_SERVEUR } from '@jeu/actions.ts';
import type { ContexteGroupe } from '@jeu/archives.ts';
import type { EtatJeu } from '@jeu/etat.ts';
import type { Evenement } from '@jeu/evenements.ts';
import { synchroniser } from '@jeu/sync.ts';
import { jeu } from './donnees.ts';
import type { Backend, Profil, ReponseSync } from './backend/types.ts';
import { ErreurReseau, SessionExpiree } from './backend/types.ts';

const aleaPrediction = () => 0.5;

export class Partie {
  backend: Backend;
  serveur = $state.raw<EtatJeu | null>(null);
  affiche = $state.raw<EtatJeu | null>(null);
  contexte = $state.raw<ContexteGroupe>({ erasOuvertes: ['prologue'], modeRevision: false });
  profil = $state.raw<Profil | null>(null);
  /** Événements à montrer au joueur (fenêtres), dans l'ordre. */
  aMontrer = $state.raw<Evenement[]>([]);
  messages = $state<{ id: number; texte: string; type: 'info' | 'erreur' }[]>([]);
  horsLigne = $state(false);
  sessionExpiree = $state(false);
  /** Heure estimée du serveur, mise à jour à chaque tic. */
  maintenant = $state(Date.now());

  private enAttente: ActionHorodatee[] = [];
  private decalage = 0;
  private enCours: Promise<unknown> = Promise.resolve();
  private minuterie: ReturnType<typeof setTimeout> | null = null;
  private tic: ReturnType<typeof setInterval> | null = null;
  private intervalle: ReturnType<typeof setInterval> | null = null;
  private idMessage = 0;

  constructor(backend: Backend) {
    this.backend = backend;
  }

  heureServeur(): number {
    return Date.now() + this.decalage;
  }

  async demarrer(): Promise<void> {
    await this.synchroniserMaintenant();
    this.tic = setInterval(() => this.recalculer(), 250);
    this.intervalle = setInterval(() => {
      if (document.visibilityState === 'visible') void this.synchroniserMaintenant();
    }, jeu.balance.sync.intervalSeconds * 1000);
    document.addEventListener('visibilitychange', this.surVisibilite);
    window.addEventListener('pagehide', this.surFermeture);
  }

  arreter(): void {
    if (this.tic) clearInterval(this.tic);
    if (this.intervalle) clearInterval(this.intervalle);
    if (this.minuterie) clearTimeout(this.minuterie);
    document.removeEventListener('visibilitychange', this.surVisibilite);
    window.removeEventListener('pagehide', this.surFermeture);
  }

  private surVisibilite = () => {
    // Application mise en arrière-plan : sauvegarde normale (la réponse sera reçue au retour).
    // Fermeture de la page : envoi de dernière chance (pagehide).
    if (document.visibilityState === 'hidden') {
      if (this.enAttente.length) void this.synchroniserMaintenant();
    } else void this.synchroniserMaintenant();
  };

  private surFermeture = () => {
    if (this.enAttente.length && this.backend.envoyerAvantFermeture) {
      this.backend.envoyerAvantFermeture(this.enAttente);
      this.enAttente = [];
    }
  };

  /** Recalcule l'état affiché à partir de l'état officiel et des actions en attente. */
  recalculer(): void {
    if (!this.serveur) return;
    const t = this.heureServeur();
    this.maintenant = t;
    const r = synchroniser(this.serveur, this.enAttente, t, jeu, this.contexte, aleaPrediction);
    if (r.refus.length) {
      // Une action devenue impossible (rare) : on la retire.
      const refusees = new Set(r.refus.map((x) => x.index));
      this.enAttente = this.enAttente.filter((_, i) => !refusees.has(i));
    }
    this.affiche = r.etat;
  }

  /**
   * Fait une action. Retourne la raison du refus, ou null si elle est acceptée.
   * Les actions simples sont appliquées tout de suite puis envoyées un peu plus tard.
   */
  agir(action: Action): string | null {
    if (!this.serveur) return 'Partie pas encore chargée.';
    if (ACTIONS_SERVEUR.includes(action.type)) {
      void this.agirServeur(action);
      return null;
    }
    const a: ActionHorodatee = { action, at: this.heureServeur() };
    const essai = synchroniser(this.serveur, [...this.enAttente, a], a.at, jeu, this.contexte, aleaPrediction);
    const refus = essai.refus.find((x) => x.index === this.enAttente.length);
    if (refus) {
      this.message(refus.raison, 'erreur');
      return refus.raison;
    }
    this.enAttente.push(a);
    this.affiche = essai.etat;
    const importante = ['recensement', 'passage', 'heritage_acheter', 'tutoriel_carte', 'acheter_carte', 'ameliorer_carte'].includes(action.type);
    this.planifier(importante ? 0 : this.backend.mode === 'local' ? 1000 : 15000);
    return null;
  }

  /** Action dont le résultat vient du serveur (hasard) : on attend la réponse. */
  async agirServeur(action: Action): Promise<ReponseSync | null> {
    const a: ActionHorodatee = { action, at: this.heureServeur() };
    this.enAttente.push(a);
    return this.synchroniserMaintenant();
  }

  private planifier(delai: number): void {
    if (this.minuterie) clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => void this.synchroniserMaintenant(), delai);
  }

  synchroniserMaintenant(): Promise<ReponseSync | null> {
    const suite = this.enCours.then(() => this.faireSync());
    this.enCours = suite.catch(() => null);
    return suite;
  }

  private async faireSync(): Promise<ReponseSync | null> {
    if (this.minuterie) {
      clearTimeout(this.minuterie);
      this.minuterie = null;
    }
    const envoi = this.enAttente;
    this.enAttente = [];
    try {
      const r = await this.backend.synchroniser(envoi);
      this.decalage = r.maintenant - Date.now();
      this.serveur = r.etat;
      this.contexte = r.contexte;
      this.profil = r.profil;
      this.horsLigne = false;
      for (const ref of r.refus) {
        const a = envoi[ref.index];
        if (a && ACTIONS_SERVEUR.includes(a.action.type)) this.message(ref.raison, 'erreur');
      }
      // Les résultats d'Archives et de paquets sont affichés par leur écran ; le reste ouvre une fenêtre.
      const visibles = r.evenements.filter((e) => {
        if (e.type === 'archives_resultat' || e.type === 'archives_recompense' || e.type === 'paquet') return false;
        // Le dénouement d'une crise est lu depuis l'état (crisesALire), pour ne pas l'afficher deux fois.
        if (e.type === 'crise_fin') return false;
        if (e.type === 'crise_mesure') {
          this.message('Mesure appliquée : la crise est atténuée.');
          return false;
        }
        return e.type !== 'absence' || e.secondes > 600;
      });
      if (visibles.length) this.aMontrer = [...this.aMontrer, ...visibles];
      this.recalculer();
      return r;
    } catch (e) {
      if (e instanceof SessionExpiree) {
        this.sessionExpiree = true;
        return null;
      }
      if (e instanceof ErreurReseau) {
        // Pas de réseau : on garde les actions pour le prochain essai.
        this.enAttente = [...envoi, ...this.enAttente];
        this.horsLigne = true;
        return null;
      }
      // Le serveur a refusé le lot (erreur inattendue) : on l'abandonne pour ne pas rester bloqué.
      this.message((e as Error).message || 'Erreur du serveur.', 'erreur');
      this.recalculer();
      return null;
    }
  }

  fermerEvenement(): void {
    this.aMontrer = this.aMontrer.slice(1);
  }

  message(texte: string, type: 'info' | 'erreur' = 'info'): void {
    const id = ++this.idMessage;
    this.messages = [...this.messages, { id, texte, type }];
    setTimeout(() => {
      this.messages = this.messages.filter((m) => m.id !== id);
    }, 4000);
  }
}
