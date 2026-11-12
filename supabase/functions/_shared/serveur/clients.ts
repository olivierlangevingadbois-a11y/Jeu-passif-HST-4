// Clients Supabase pour les edge functions.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';
import { ErreurPublique } from './http.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
// Clé secrète : injectée automatiquement par Supabase dans les edge functions. Jamais envoyée au navigateur.
const CLE_SECRETE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLE_PUBLIQUE = Deno.env.get('SUPABASE_ANON_KEY') ?? CLE_SECRETE;

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Client avec tous les droits (contourne la RLS) : à utiliser seulement après vérification. */
export function clientAdmin(): SupabaseClient {
  return createClient(URL, CLE_SECRETE, options);
}

/** Client public, sans session (sert à ouvrir une session élève). */
export function clientPublic(): SupabaseClient {
  return createClient(URL, CLE_PUBLIQUE, options);
}

/** Identifie l'utilisateur à partir du jeton envoyé par le navigateur. */
export async function utilisateur(req: Request, admin: SupabaseClient): Promise<string> {
  const entete = req.headers.get('Authorization') ?? '';
  const jeton = entete.replace(/^Bearer\s+/i, '');
  if (!jeton) throw new ErreurPublique('Connexion requise.', 401);
  const { data, error } = await admin.auth.getUser(jeton);
  if (error || !data.user) throw new ErreurPublique('Session expirée. Reconnecte-toi.', 401);
  return data.user.id;
}
