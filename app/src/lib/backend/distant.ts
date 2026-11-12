// Mode en ligne : la partie est calculée et sauvegardée par Supabase (edge function game-sync).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ActionHorodatee } from '@jeu/actions.ts';
import { FONCTIONS_URL, SUPABASE_CLE, SUPABASE_URL } from '../config.ts';
import type { Backend, ReponseSync } from './types.ts';
import { ErreurReseau, SessionExpiree } from './types.ts';

let client: SupabaseClient | null = null;
/** Dernier jeton connu, gardé à part pour pouvoir l'utiliser sans attendre quand la page se ferme. */
let jetonCourant: string | null = null;

/** Client Supabase du navigateur (clé publique seulement). La session est gardée sur l'appareil. */
export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_CLE, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'paroisse-session' },
    });
    client.auth.onAuthStateChange((_evenement, session) => {
      jetonCourant = session?.access_token ?? null;
    });
  }
  return client;
}

/** Appelle une edge function et retourne sa réponse, ou lance une erreur avec le message en français. */
export async function appeler<T>(fonction: string, corps: unknown, jeton?: string): Promise<T> {
  let reponse: Response;
  try {
    const entetes: Record<string, string> = { 'Content-Type': 'application/json', apikey: SUPABASE_CLE };
    const session = jeton ?? (await supabase().auth.getSession()).data.session?.access_token;
    entetes.Authorization = `Bearer ${session ?? SUPABASE_CLE}`;
    reponse = await fetch(`${FONCTIONS_URL}/${fonction}`, {
      method: 'POST',
      headers: entetes,
      body: JSON.stringify(corps),
    });
  } catch {
    throw new ErreurReseau('Pas de connexion au serveur.');
  }
  let donnees: unknown = null;
  try {
    donnees = await reponse.json();
  } catch {
    // réponse vide
  }
  if (reponse.status === 401) throw new SessionExpiree((donnees as { erreur?: string })?.erreur ?? 'Session expirée.');
  if (!reponse.ok) throw new Error((donnees as { erreur?: string })?.erreur ?? `Erreur ${reponse.status}`);
  return donnees as T;
}

export async function connexionEleve(code: string, pseudonyme: string, nip: string): Promise<void> {
  const r = await appeler<{ access_token: string; refresh_token: string }>('student-login', { code, pseudonyme, nip }, SUPABASE_CLE);
  const { error } = await supabase().auth.setSession(r);
  if (error) throw new Error('Impossible d\'ouvrir la session.');
}

export async function sessionExistante(): Promise<boolean> {
  const { data } = await supabase().auth.getSession();
  return !!data.session;
}

export function creerBackendDistant(): Backend {
  return {
    mode: 'distant',
    async synchroniser(actions: ActionHorodatee[]): Promise<ReponseSync> {
      return appeler<ReponseSync>('game-sync', { actions });
    },
    envoyerAvantFermeture(actions) {
      // La page se ferme : envoi sans attendre la réponse (keepalive).
      if (!jetonCourant) return;
      fetch(`${FONCTIONS_URL}/game-sync`, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_CLE, Authorization: `Bearer ${jetonCourant}` },
        body: JSON.stringify({ actions }),
      }).catch(() => {});
    },
    async deconnecter() {
      await supabase().auth.signOut();
    },
  };
}
