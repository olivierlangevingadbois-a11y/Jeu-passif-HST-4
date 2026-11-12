// Interface commune au mode local (sauvegarde sur l'appareil) et au mode en ligne (Supabase).
import type { ActionHorodatee } from '@jeu/actions.ts';
import type { ContexteGroupe } from '@jeu/archives.ts';
import type { EtatJeu } from '@jeu/etat.ts';
import type { Evenement } from '@jeu/evenements.ts';

export interface Profil {
  pseudonyme: string;
  groupe: string;
}

export interface ReponseSync {
  etat: EtatJeu;
  evenements: Evenement[];
  refus: { index: number; raison: string }[];
  contexte: ContexteGroupe;
  /** Heure du serveur au moment du calcul (ms). */
  maintenant: number;
  profil: Profil;
}

export interface Backend {
  mode: 'local' | 'distant';
  synchroniser(actions: ActionHorodatee[]): Promise<ReponseSync>;
  /** Envoi de dernière chance quand la page se ferme (sans attendre de réponse). */
  envoyerAvantFermeture?(actions: ActionHorodatee[]): void;
  deconnecter(): Promise<void>;
}

export class ErreurReseau extends Error {}
export class SessionExpiree extends Error {}
