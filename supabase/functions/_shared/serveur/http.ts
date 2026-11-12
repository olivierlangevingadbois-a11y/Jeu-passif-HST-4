// Réponses HTTP communes aux edge functions (Deno).

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Erreur montrée telle quelle à l'utilisateur (en français). */
export class ErreurPublique extends Error {
  statut: number;
  constructor(message: string, statut = 400) {
    super(message);
    this.statut = statut;
  }
}

/** Enveloppe un gestionnaire : CORS, méthode POST, erreurs. */
export function servir(gestionnaire: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return json({ erreur: 'Méthode non permise.' }, 405);
    try {
      return await gestionnaire(req);
    } catch (e) {
      if (e instanceof ErreurPublique) return json({ erreur: e.message }, e.statut);
      console.error(e);
      return json({ erreur: 'Erreur du serveur. Réessaie dans un moment.' }, 500);
    }
  };
}

export async function lireCorps<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ErreurPublique('Requête invalide.');
  }
}
