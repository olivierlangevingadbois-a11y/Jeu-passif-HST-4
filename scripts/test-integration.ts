// Test de bout en bout contre un Supabase local (supabase start) ou un projet de TEST.
// Ne jamais lancer contre le projet de production : le script crée et efface des comptes.
//
//   SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SECRET_KEY=... node scripts/test-integration.ts
//
// Étapes : compte enseignant, groupe, élèves et NIP, connexion élève, synchronisation, Voix, paquet,
// époque lancée, verrouillage après 5 mauvais NIP, correction journalisée, RLS entre élèves, purge.

import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const FONCTIONS = process.env.FUNCTIONS_URL ?? `${URL}/functions/v1`;
const PUBLIQUE = process.env.SUPABASE_PUBLISHABLE_KEY!;
const SECRETE = process.env.SUPABASE_SECRET_KEY!;
if (!PUBLIQUE || !SECRETE) {
  console.error('Variables SUPABASE_PUBLISHABLE_KEY et SUPABASE_SECRET_KEY requises.');
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, SECRETE, opts);
let echecs = 0;

function verifier(condition: unknown, message: string) {
  if (condition) console.log(`  ✓ ${message}`);
  else {
    console.log(`  ✗ ${message}`);
    echecs++;
  }
}

async function appeler(fonction: string, corps: unknown, jeton: string) {
  const r = await fetch(`${FONCTIONS}/${fonction}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: PUBLIQUE, Authorization: `Bearer ${jeton}` },
    body: JSON.stringify(corps),
  });
  const json = await r.json().catch(() => null);
  return { statut: r.status, json };
}

const courriel = `prof-${Date.now()}@example.com`;
const mdp = `essai-${crypto.randomUUID()}`;

console.log('Enseignant');
const { data: u, error: eu } = await admin.auth.admin.createUser({ email: courriel, password: mdp, email_confirm: true });
if (eu) throw eu;
await admin.from('teachers').insert({ id: u.user.id, display_name: 'Essai' });
const prof = createClient(URL, PUBLIQUE, opts);
const { data: sp, error: esp } = await prof.auth.signInWithPassword({ email: courriel, password: mdp });
if (esp) throw esp;
const jetonProf = sp.session!.access_token;

const g = await appeler('teacher-admin', { op: 'creer_groupe', nom: 'Essai 401' }, jetonProf);
verifier(g.statut === 200 && /^[A-Z0-9]{6}$/.test(g.json.class_code), `groupe créé, code ${g.json?.class_code}`);
const groupe = g.json as { id: string; class_code: string };

const e = await appeler('teacher-admin', { op: 'creer_eleves', groupeId: groupe.id, pseudonymes: ['Renard', 'Hibou', 'renard'] }, jetonProf);
verifier(e.statut === 200 && e.json.crees.length === 2, 'deux élèves créés');
verifier(e.json.erreurs.length === 1, 'pseudonyme en double refusé');
const [renard, hibou] = e.json.crees as { id: string; pseudonyme: string; nip: string }[];

console.log('Connexion élève');
const mauvais = await appeler('student-login', { code: groupe.class_code, pseudonyme: 'Renard', nip: '0000' }, PUBLIQUE);
verifier(mauvais.statut === 401, 'mauvais NIP refusé');
const bon = await appeler('student-login', { code: groupe.class_code.toLowerCase(), pseudonyme: 'renard', nip: renard.nip }, PUBLIQUE);
verifier(bon.statut === 200 && bon.json.access_token, 'bon NIP accepté (code et pseudonyme sans tenir compte des majuscules)');
const jetonRenard = bon.json.access_token as string;

console.log('Synchronisation');
const s1 = await appeler('game-sync', { actions: [] }, jetonRenard);
verifier(s1.statut === 200 && s1.json.etat.era === 'prologue', 'première synchronisation : nouvelle partie');
verifier(s1.json.profil.pseudonyme === 'Renard', 'profil retourné');
const s2 = await appeler('game-sync', { actions: [{ at: Date.now(), action: { type: 'construire', batiment: 'terre_censitaire' } }] }, jetonRenard);
verifier(s2.statut === 200 && s2.json.etat.partie.buildings.terre_censitaire === 2 && s2.json.refus.length === 0, 'construction acceptée');
const sansSession = await appeler('game-sync', { actions: [] }, PUBLIQUE);
verifier(sansSession.statut === 401, 'synchronisation refusée sans session');
const parProf = await appeler('game-sync', { actions: [] }, jetonProf);
verifier(parProf.statut === 403, 'un enseignant ne peut pas jouer');

console.log('Voix et paquets');
const v = await appeler('teacher-admin', { op: 'donner_voix', cible: 'groupe', id: groupe.id, montant: 20, raison: 'Bravo' }, jetonProf);
verifier(v.statut === 200 && v.json.eleves === 2, 'Voix données au groupe');
const s3 = await appeler('game-sync', { actions: [] }, jetonRenard);
verifier(s3.json.etat.portefeuille.voix === 20 && s3.json.evenements.some((x: { type: string }) => x.type === 'voix_recues'), 'Voix reçues à la synchronisation');
const s4 = await appeler('game-sync', { actions: [] }, jetonRenard);
verifier(s4.json.etat.portefeuille.voix === 20, 'Voix reçues une seule fois');
const p = await appeler('game-sync', { actions: [{ at: Date.now(), action: { type: 'ouvrir_paquet', source: 'voix' } }] }, jetonRenard);
const paquet = p.json.evenements.find((x: { type: string }) => x.type === 'paquet');
verifier(paquet && paquet.cartes.length === 3 && p.json.etat.portefeuille.voix === 10, 'paquet ouvert sur le serveur');

console.log('Lecture et RLS');
const eleveClient = createClient(URL, PUBLIQUE, opts);
await eleveClient.auth.setSession({ access_token: jetonRenard, refresh_token: bon.json.refresh_token });
const lus = await eleveClient.from('students').select('id');
verifier(lus.data?.length === 1, 'un élève ne voit que lui-même');
const secrets = await eleveClient.from('student_secrets').select('*');
verifier(!secrets.data?.length, 'un élève ne lit aucun NIP');
const triche = await eleveClient.from('game_states').update({ heritage: 999999 }).eq('student_id', renard.id).select();
verifier(!triche.data?.length, 'un élève ne modifie pas sa partie directement');
const vueProf = await prof.from('students').select('id, pseudonym, game_states(era)').eq('group_id', groupe.id);
verifier(vueProf.data?.length === 2, 'l\'enseignant voit ses deux élèves');
const stats = await prof.from('stats_archives').select('*').eq('group_id', groupe.id);
verifier(!stats.error, 'statistiques des Archives lisibles');

console.log('Époques');
const passageRefuse = await appeler('game-sync', { actions: [{ at: Date.now(), action: { type: 'passage' } }] }, jetonRenard);
verifier(passageRefuse.json.refus.length === 1, 'passage refusé (jalon non atteint)');
const lance = await appeler('teacher-admin', { op: 'lancer_epoque', groupeId: groupe.id, era: 'epoque_1' }, jetonProf);
verifier(lance.statut === 200, 'Époque 1 lancée');
const ctx = await appeler('game-sync', { actions: [] }, jetonRenard);
verifier(ctx.json.contexte.erasOuvertes.includes('epoque_1'), 'l\'élève voit l\'époque ouverte');

console.log('Verrouillage du NIP');
for (let i = 0; i < 5; i++) await appeler('student-login', { code: groupe.class_code, pseudonyme: 'Hibou', nip: '0000' }, PUBLIQUE);
const verrou = await appeler('student-login', { code: groupe.class_code, pseudonyme: 'Hibou', nip: hibou.nip }, PUBLIQUE);
verifier(verrou.statut === 429, 'compte verrouillé après 5 échecs');
const nouveau = await appeler('teacher-admin', { op: 'reinitialiser_nip', eleveId: hibou.id }, jetonProf);
const apres = await appeler('student-login', { code: groupe.class_code, pseudonyme: 'Hibou', nip: nouveau.json.nip }, PUBLIQUE);
verifier(apres.statut === 200, 'réinitialisation du NIP : déverrouillé');

console.log('Correction et journal');
const sansRaison = await appeler('teacher-admin', { op: 'corriger', eleveId: renard.id, modifications: { townName: 'Saint-Essai' } }, jetonProf);
verifier(sansRaison.statut === 400, 'correction refusée sans raison');
const corr = await appeler('teacher-admin', { op: 'corriger', eleveId: renard.id, modifications: { townName: 'Saint-Essai' }, raison: 'Test' }, jetonProf);
verifier(corr.statut === 200, 'correction enregistrée');
const s5 = await appeler('game-sync', { actions: [] }, jetonRenard);
verifier(s5.json.etat.townName === 'Saint-Essai', 'la correction est visible par l\'élève');
const j = await prof.from('admin_log').select('action, reason').eq('group_id', groupe.id);
verifier(j.data?.some((x) => x.action === 'corriger' && x.reason === 'Test'), 'correction inscrite au journal avec sa raison');
const eleveNonProf = await appeler('teacher-admin', { op: 'creer_groupe', nom: 'Pirate' }, jetonRenard);
verifier(eleveNonProf.statut === 403, 'un élève ne peut pas utiliser les outils de l\'enseignant');

console.log('Purge');
const purge = await appeler('teacher-admin', { op: 'purger_groupe', groupeId: groupe.id, confirmation: 'Essai 401' }, jetonProf);
verifier(purge.statut === 200 && purge.json.eleves === 2, 'groupe effacé');
const restants = await admin.from('students').select('id').in('id', [renard.id, hibou.id]);
verifier(restants.data?.length === 0, 'élèves effacés');
await admin.auth.admin.deleteUser(u.user.id);

if (echecs) {
  console.log(`\n${echecs} échec(s).`);
  process.exit(1);
}
console.log('\n✓ Tous les tests d\'intégration réussissent.');
