// Connexion élève : code de classe + pseudonyme + NIP. Aucun courriel.
//
// 1. La base vérifie le NIP (haché) et gère le verrouillage après 5 échecs.
// 2. Si c'est bon, le serveur ouvre une session Supabase pour le compte de l'élève
//    (lien de connexion généré puis vérifié ici même, sans rien envoyer par courriel).

import { clientAdmin, clientPublic } from '../_shared/serveur/clients.ts';
import { ErreurPublique, json, lireCorps, servir } from '../_shared/serveur/http.ts';

interface Corps {
  code?: string;
  pseudonyme?: string;
  nip?: string;
}

const INVALIDE = 'Code de classe, pseudonyme ou NIP incorrect.';

Deno.serve(
  servir(async (req) => {
    const { code = '', pseudonyme = '', nip = '' } = await lireCorps<Corps>(req);
    if (!/^\d{4,6}$/.test(nip) || code.length > 20 || pseudonyme.length > 40 || !code || !pseudonyme) {
      throw new ErreurPublique(INVALIDE, 401);
    }
    const admin = clientAdmin();
    const { data, error } = await admin.rpc('connexion_eleve', { code, pseudo: pseudonyme, nip });
    if (error) throw error;
    const resultat = (data as { student_id: string | null; statut: string; verrouille_jusqua: string | null }[])[0];
    if (resultat?.statut === 'verrouille') {
      const minutes = resultat.verrouille_jusqua
        ? Math.max(1, Math.ceil((new Date(resultat.verrouille_jusqua).getTime() - Date.now()) / 60_000))
        : 15;
      throw new ErreurPublique(`Trop d'essais. Réessaie dans ${minutes} min ou demande à ton enseignant de réinitialiser ton NIP.`, 429);
    }
    if (resultat?.statut !== 'ok' || !resultat.student_id) throw new ErreurPublique(INVALIDE, 401);

    const { data: u, error: eu } = await admin.auth.admin.getUserById(resultat.student_id);
    if (eu || !u.user?.email) throw new Error('Compte de connexion introuvable');
    const { data: lien, error: el } = await admin.auth.admin.generateLink({ type: 'magiclink', email: u.user.email });
    if (el || !lien.properties?.hashed_token) throw el ?? new Error('Lien de connexion non généré');
    const { data: s, error: es } = await clientPublic().auth.verifyOtp({ token_hash: lien.properties.hashed_token, type: 'email' });
    if (es || !s.session) throw es ?? new Error('Session non ouverte');

    return json({
      access_token: s.session.access_token,
      refresh_token: s.session.refresh_token,
    });
  }),
);
