// Sert les edge functions avec Deno, sur l'ordinateur, sans Docker pour les fonctions.
// Utile quand le conteneur « edge runtime » de Supabase ne peut pas télécharger ses dépendances.
//
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
//   deno run --allow-net --allow-env --allow-read scripts/serveur-fonctions-local.ts
//
// Les fonctions répondent ensuite à http://127.0.0.1:54399/functions/v1/<nom>.

const gestionnaires: Record<string, (req: Request) => Response | Promise<Response>> = {};
const serveurReel = Deno.serve.bind(Deno);
let enCours = '';
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: (req: Request) => Response | Promise<Response>) => {
  gestionnaires[enCours] = h;
  return { finished: Promise.resolve(), shutdown: async () => {}, ref() {}, unref() {}, addr: { hostname: '', port: 0, transport: 'tcp' } };
};
for (const nom of ['student-login', 'game-sync', 'teacher-admin']) {
  enCours = nom;
  await import(`../supabase/functions/${nom}/index.ts`);
}
const port = Number(Deno.env.get('PORT') ?? 54399);
serveurReel({ port, hostname: '127.0.0.1' }, (req) => {
  const nom = new URL(req.url).pathname.replace(/^\/functions\/v1\//, '');
  const h = gestionnaires[nom];
  return h ? h(req) : new Response('Fonction inconnue', { status: 404 });
});
