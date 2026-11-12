<script lang="ts">
  import { jeu } from '../../lib/donnees.ts';
  import {
    ACTIONS_JOURNAL,
    admin,
    eleves as chargerEleves,
    epoquesOuvertes,
    equipes as chargerEquipes,
    journal as chargerJournal,
    statsArchives,
    type Eleve,
    type EntreeJournal,
    type Equipe,
    type Groupe,
    type StatQuestion,
  } from '../../lib/enseignant.ts';
  import { nombre } from '../../lib/format.ts';
  import Modale from '../../composants/Modale.svelte';
  import FichesNip from './FichesNip.svelte';
  import Correction from './Correction.svelte';

  let { groupe, recharger }: { groupe: Groupe; recharger: () => Promise<void> } = $props();

  type Onglet = 'eleves' | 'voix' | 'epoques' | 'archives' | 'journal' | 'fin';
  let onglet = $state<Onglet>('eleves');
  let eleves = $state<Eleve[]>([]);
  let equipes = $state<Equipe[]>([]);
  let ouvertes = $state<string[]>([]);
  let stats = $state<StatQuestion[]>([]);
  let entrees = $state<EntreeJournal[]>([]);
  let message = $state<{ texte: string; erreur: boolean } | null>(null);
  let occupe = $state(false);

  let pseudonymes = $state('');
  let fiches = $state<{ pseudonyme: string; nip: string }[] | null>(null);
  let correction = $state<Eleve | null>(null);
  let nomEquipe = $state('');
  let voix = $state({ cible: 'groupe' as 'eleve' | 'equipe' | 'groupe', id: '', montant: 10, raison: '' });
  let confirmationPurge = $state('');

  async function charger() {
    try {
      [eleves, equipes, ouvertes] = await Promise.all([chargerEleves(groupe.id), chargerEquipes(groupe.id), epoquesOuvertes(groupe.id)]);
      if (onglet === 'archives') stats = await statsArchives(groupe.id);
      if (onglet === 'journal') entrees = await chargerJournal(groupe.id);
    } catch (e) {
      message = { texte: (e as Error).message, erreur: true };
    }
  }

  $effect(() => {
    void groupe.id;
    void onglet;
    void charger();
  });

  async function action<T>(op: string, params: Record<string, unknown>, succes?: string): Promise<T | null> {
    occupe = true;
    message = null;
    try {
      const r = await admin<T>(op, params);
      if (succes) message = { texte: succes, erreur: false };
      await charger();
      return r;
    } catch (e) {
      message = { texte: (e as Error).message, erreur: true };
      return null;
    } finally {
      occupe = false;
    }
  }

  async function ajouterEleves(e: SubmitEvent) {
    e.preventDefault();
    const liste = pseudonymes.split(/\n|,/).map((p) => p.trim()).filter(Boolean);
    if (!liste.length) return;
    const r = await action<{ crees: { pseudonyme: string; nip: string }[]; erreurs: string[] }>('creer_eleves', { groupeId: groupe.id, pseudonymes: liste });
    if (r) {
      pseudonymes = r.erreurs.length ? r.erreurs.join('\n') : '';
      if (r.erreurs.length) message = { texte: `Certains pseudonymes n'ont pas été créés :\n${r.erreurs.join('\n')}`, erreur: true };
      if (r.crees.length) fiches = r.crees;
    }
  }

  async function reinitialiserNip(e: Eleve) {
    if (!confirm(`Créer un nouveau NIP pour ${e.pseudonym} ? L'ancien ne fonctionnera plus.`)) return;
    const r = await action<{ pseudonyme: string; nip: string }>('reinitialiser_nip', { eleveId: e.id });
    if (r) fiches = [r];
  }

  async function renommer(e: Eleve) {
    const nom = prompt('Nouveau pseudonyme', e.pseudonym);
    if (nom && nom.trim() !== e.pseudonym) await action('renommer_eleve', { eleveId: e.id, pseudonyme: nom }, 'Pseudonyme modifié.');
  }

  async function supprimer(e: Eleve) {
    const raison = prompt(`Supprimer ${e.pseudonym} et toute sa partie ? Indique la raison (ex. : a quitté le groupe).`);
    if (raison) await action('supprimer_eleve', { eleveId: e.id, raison }, 'Élève supprimé.');
  }

  async function donnerVoix(e: SubmitEvent) {
    e.preventDefault();
    const id = voix.cible === 'groupe' ? groupe.id : voix.id;
    if (!id) return;
    const r = await action<{ eleves: number }>('donner_voix', { cible: voix.cible, id, montant: voix.montant, raison: voix.raison || null });
    if (r) message = { texte: `${voix.montant} Voix données à ${r.eleves} élève${r.eleves > 1 ? 's' : ''}. Elles apparaîtront à leur prochaine connexion.`, erreur: false };
  }

  async function lancer(era: string) {
    const nom = jeu.eras.get(era as never)?.name ?? era;
    if (confirm(`Lancer « ${nom} » pour le groupe ${groupe.name} ? Les élèves qui ont atteint le jalon pourront y passer. Cette action ne peut pas être annulée.`)) {
      await action('lancer_epoque', { groupeId: groupe.id, era }, `${nom} est lancée.`);
    }
  }

  async function revision() {
    await action('mode_revision', { groupeId: groupe.id, actif: !groupe.revision_mode }, 'Mode révision modifié.');
    await recharger();
  }

  async function nouveauCode() {
    if (confirm('Créer un nouveau code de classe ? L\'ancien ne fonctionnera plus pour se connecter.')) {
      await action('nouveau_code', { groupeId: groupe.id }, 'Nouveau code créé.');
      await recharger();
    }
  }

  async function purger() {
    if (confirmationPurge !== groupe.name) return;
    if (!confirm(`Dernière vérification : effacer définitivement le groupe ${groupe.name} et toutes les données de ses élèves ?`)) return;
    const r = await action<{ eleves: number }>('purger_groupe', { groupeId: groupe.id, confirmation: confirmationPurge });
    if (r) await recharger();
  }

  function depuis(date: string | null): string {
    if (!date) return 'jamais';
    const min = Math.round((Date.now() - new Date(date).getTime()) / 60000);
    if (min < 2) return 'à l\'instant';
    if (min < 60) return `il y a ${min} min`;
    const h = Math.round(min / 60);
    if (h < 48) return `il y a ${h} h`;
    return `il y a ${Math.round(h / 24)} jours`;
  }

  const nomEra = (id: string) => jeu.eras.get(id as never)?.name ?? id;
  const nomEquipeDe = (id: string | null) => equipes.find((t) => t.id === id)?.name ?? '';

  let parQuestion = $derived(
    [...stats].sort((a, b) => a.reussites / a.tentatives - b.reussites / b.tentatives),
  );
  let parConcept = $derived.by(() => {
    const m = new Map<string, { tentatives: number; reussites: number }>();
    for (const s of stats) {
      const x = m.get(s.concept) ?? { tentatives: 0, reussites: 0 };
      x.tentatives += s.tentatives;
      x.reussites += s.reussites;
      m.set(s.concept, x);
    }
    return [...m.entries()].sort((a, b) => a[1].reussites / a[1].tentatives - b[1].reussites / b[1].tentatives);
  });
  let parEpoque = $derived.by(() => {
    const m: Record<string, number> = {};
    for (const e of eleves) {
      const era = e.partie?.era ?? 'prologue';
      m[era] = (m[era] ?? 0) + 1;
    }
    return m;
  });

  function libelleQuestion(id: string): string {
    const q = jeu.questions.get(id);
    if (!q) return id;
    return q.type === 'quisuisje' ? `Qui suis-je ? ${q.clues[0]}` : q.prompt;
  }

  const pct = (r: number, t: number) => (t ? `${Math.round((r / t) * 100)} %` : '');
</script>

<section class="pile">
  <div class="carte-ui ligne espace">
    <div>
      <h2>Groupe {groupe.name}</h2>
      <p>Code de classe : <strong class="code">{groupe.class_code}</strong></p>
    </div>
    <div class="petit-texte">
      {eleves.length} élève{eleves.length > 1 ? 's' : ''}
      {#each Object.entries(parEpoque) as [era, n] (era)}<br />{nomEra(era).split(':')[0]} : {n}{/each}
    </div>
  </div>

  <nav class="ligne" aria-label="Sections du groupe">
    {#each [['eleves', 'Élèves'], ['voix', 'Voix'], ['epoques', 'Époques'], ['archives', 'Archives'], ['journal', 'Journal'], ['fin', 'Fin d\'année']] as [id, nom] (id)}
      <button class="petit" class:secondaire={onglet !== id} onclick={() => (onglet = id as Onglet)}>{nom}</button>
    {/each}
  </nav>

  {#if message}<p class:avis={message.erreur} class:ok={!message.erreur} role="status">{message.texte}</p>{/if}

  {#if onglet === 'eleves'}
    <div class="carte-ui table-defilante">
      <table>
        <thead><tr><th>Pseudonyme</th><th>Équipe</th><th>Époque</th><th>Héritage</th><th>Voix</th><th>Ville</th><th>Dernière visite</th><th></th></tr></thead>
        <tbody>
          {#each eleves as e (e.id)}
            <tr>
              <td><strong>{e.pseudonym}</strong></td>
              <td>
                <select aria-label="Équipe de {e.pseudonym}" value={e.team_id ?? ''} onchange={(ev) => action('assigner_equipe', { eleveId: e.id, equipeId: (ev.currentTarget as HTMLSelectElement).value || null })}>
                  <option value="">Aucune</option>
                  {#each equipes as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
                </select>
              </td>
              <td>{nomEra(e.partie?.era ?? 'prologue').split(':')[0]}</td>
              <td>{nombre(Number(e.partie?.heritage ?? 0))}</td>
              <td>{e.partie?.voix ?? 0}</td>
              <td>{e.partie?.town_name ?? ''}</td>
              <td>{depuis(e.last_seen_at)}</td>
              <td class="actions">
                <button class="petit secondaire" disabled={occupe} onclick={() => reinitialiserNip(e)}>NIP</button>
                <button class="petit secondaire" disabled={occupe} onclick={() => (correction = e)}>Corriger</button>
                <button class="petit secondaire" disabled={occupe} onclick={() => renommer(e)}>Renommer</button>
                <button class="petit danger" disabled={occupe} onclick={() => supprimer(e)}>Supprimer</button>
              </td>
            </tr>
          {:else}
            <tr><td colspan="8">Aucun élève pour l'instant.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    <form class="carte-ui" onsubmit={ajouterEleves}>
      <h3>Ajouter des élèves</h3>
      <p class="petit-texte doux">Un pseudonyme par ligne. Évite les noms de famille. Un NIP de 4 chiffres sera créé pour chacun ; il ne s'affiche qu'une fois, sur une fiche à imprimer.</p>
      <textarea rows="6" bind:value={pseudonymes} aria-label="Pseudonymes, un par ligne"></textarea>
      <button type="submit" disabled={occupe || !pseudonymes.trim()}>Créer les comptes</button>
    </form>

    <div class="carte-ui">
      <h3>Équipes</h3>
      <div class="ligne">
        {#each equipes as t (t.id)}
          <span class="etiquette">{t.name} <button class="petit secondaire" aria-label="Supprimer l'équipe {t.name}" onclick={() => confirm(`Supprimer l'équipe ${t.name} ?`) && action('supprimer_equipe', { equipeId: t.id })}>✕</button></span>
        {/each}
      </div>
      <form class="ligne" onsubmit={(e) => { e.preventDefault(); if (nomEquipe.trim()) { void action('creer_equipe', { groupeId: groupe.id, nom: nomEquipe }); nomEquipe = ''; } }}>
        <input class="court" bind:value={nomEquipe} placeholder="Nom de l'équipe" maxlength="40" aria-label="Nom de la nouvelle équipe" />
        <button class="petit" type="submit" disabled={!nomEquipe.trim()}>Créer l'équipe</button>
      </form>
    </div>
  {:else if onglet === 'voix'}
    <form class="carte-ui pile" onsubmit={donnerVoix}>
      <h3>Donner des Voix</h3>
      <p class="petit-texte doux">Les Voix récompensent l'effort en classe. Elles ne sont jamais retirées comme sanction ; une correction de bogue passe par « Corriger », avec une raison.</p>
      <div class="ligne">
        <label><input type="radio" bind:group={voix.cible} value="groupe" /> Tout le groupe</label>
        <label><input type="radio" bind:group={voix.cible} value="equipe" /> Une équipe</label>
        <label><input type="radio" bind:group={voix.cible} value="eleve" /> Un élève</label>
      </div>
      {#if voix.cible === 'equipe'}
        <select bind:value={voix.id} aria-label="Équipe">
          <option value="">Choisir une équipe</option>
          {#each equipes as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
        </select>
      {:else if voix.cible === 'eleve'}
        <select bind:value={voix.id} aria-label="Élève">
          <option value="">Choisir un élève</option>
          {#each eleves as e (e.id)}<option value={e.id}>{e.pseudonym}</option>{/each}
        </select>
      {/if}
      <label for="montant">Nombre de Voix (un paquet coûte {jeu.balance.packs.costVoix} Voix)</label>
      <input id="montant" type="number" min="1" max="1000" bind:value={voix.montant} />
      <label for="raison">Raison montrée à l'élève (facultative)</label>
      <input id="raison" bind:value={voix.raison} maxlength="120" placeholder="Ex. : Excellente évaluation" />
      <button type="submit" disabled={occupe || (voix.cible !== 'groupe' && !voix.id)}>Donner</button>
    </form>
  {:else if onglet === 'epoques'}
    <div class="carte-ui pile">
      <h3>Époques</h3>
      <p class="petit-texte doux">Chaque époque reste verrouillée jusqu'à ce que tu la lances pour le groupe. Les élèves qui atteignent le jalon avant continuent d'accumuler en attendant.</p>
      <ul class="epoques">
        <li>{nomEra('prologue')} : toujours ouvert</li>
        {#each jeu.ordreEras.filter((e) => e !== 'prologue') as era (era)}
          <li class="ligne espace">
            <span>{nomEra(era)}</span>
            {#if ouvertes.includes(era)}
              <strong>Lancée</strong>
            {:else}
              <button class="petit" disabled={occupe} onclick={() => lancer(era)}>Lancer</button>
            {/if}
          </li>
        {/each}
      </ul>
      <p class="petit-texte doux">Les époques suivantes apparaîtront ici quand leur contenu sera prêt.</p>
    </div>
    <div class="carte-ui pile">
      <h3>Mode révision</h3>
      <p>Quand il est activé, les Archives proposent des questions de toutes les époques, même celles que l'élève n'a pas atteintes. Utile avant l'examen.</p>
      <button class:secondaire={!groupe.revision_mode} disabled={occupe} onclick={revision}>
        {groupe.revision_mode ? 'Désactiver le mode révision' : 'Activer le mode révision'}
      </button>
    </div>
    <div class="carte-ui pile">
      <h3>Code de classe</h3>
      <p>Code actuel : <strong class="code">{groupe.class_code}</strong>. En cas de fuite, crée un nouveau code : les NIP ne changent pas.</p>
      <button class="secondaire" disabled={occupe} onclick={nouveauCode}>Créer un nouveau code</button>
    </div>
  {:else if onglet === 'archives'}
    <div class="carte-ui">
      <h3>Notions à revoir</h3>
      <p class="petit-texte doux">Taux de réussite par concept, du plus faible au plus élevé. Données du groupe entier.</p>
      <table>
        <thead><tr><th>Concept</th><th>Réponses</th><th>Réussite</th></tr></thead>
        <tbody>
          {#each parConcept as [concept, s] (concept)}
            <tr><td>{concept}</td><td>{s.tentatives}</td><td>{pct(s.reussites, s.tentatives)}</td></tr>
          {:else}
            <tr><td colspan="3">Aucune réponse pour l'instant.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="carte-ui table-defilante">
      <h3>Par question</h3>
      <table>
        <thead><tr><th>Question</th><th>Époque</th><th>Réponses</th><th>Réussite</th></tr></thead>
        <tbody>
          {#each parQuestion as s (s.question_id)}
            <tr><td>{libelleQuestion(s.question_id)}</td><td>{nomEra(s.era).split(':')[0]}</td><td>{s.tentatives}</td><td>{pct(s.reussites, s.tentatives)}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if onglet === 'journal'}
    <div class="carte-ui table-defilante">
      <h3>Journal des actions</h3>
      <table>
        <thead><tr><th>Date</th><th>Action</th><th>Élève</th><th>Détails</th><th>Raison</th></tr></thead>
        <tbody>
          {#each entrees as j (j.id)}
            <tr>
              <td>{new Date(j.created_at).toLocaleString('fr-CA')}</td>
              <td>{ACTIONS_JOURNAL[j.action] ?? j.action}</td>
              <td>{eleves.find((e) => e.id === j.student_id)?.pseudonym ?? ''}</td>
              <td class="details"><code>{JSON.stringify(j.details)}</code></td>
              <td>{j.reason ?? ''}</td>
            </tr>
          {:else}
            <tr><td colspan="5">Aucune action.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if onglet === 'fin'}
    <div class="carte-ui pile danger-zone">
      <h3>Effacer le groupe (fin d'année)</h3>
      <p>Efface définitivement le groupe, les comptes des élèves, leurs parties, leurs réponses et le journal lié à ces élèves. Cette action ne peut pas être annulée.</p>
      <label for="confirmation">Pour confirmer, écris le nom du groupe : <strong>{groupe.name}</strong></label>
      <input id="confirmation" bind:value={confirmationPurge} autocomplete="off" />
      <button class="danger" disabled={occupe || confirmationPurge !== groupe.name} onclick={purger}>Effacer le groupe {groupe.name}</button>
    </div>
  {/if}
</section>

{#if fiches}
  <FichesNip {fiches} groupe={groupe.name} code={groupe.class_code} fermer={() => (fiches = null)} />
{/if}

{#if correction}
  <Modale titre="Corriger : {correction.pseudonym}" fermer={() => (correction = null)}>
    <Correction eleve={correction} fini={async (texte) => { correction = null; message = { texte, erreur: false }; await charger(); }} />
  </Modale>
{/if}

<style>
  .code { font-family: ui-monospace, monospace; font-size: 1.2rem; letter-spacing: 0.1em; }
  .table-defilante { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
  th, td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--bord); vertical-align: top; }
  th { font-size: 0.8rem; color: var(--encre-douce); }
  td select { min-height: 32px; padding: 0.15rem; width: auto; }
  .actions { white-space: nowrap; }
  .actions button { margin: 0 0.15rem 0.15rem 0; }
  textarea { font-family: inherit; }
  .court { width: 14rem; }
  .etiquette { border: 1px solid var(--bord); border-radius: 999px; padding: 0.1rem 0.2rem 0.1rem 0.7rem; }
  .epoques { list-style: none; padding: 0; margin: 0; }
  .epoques li { padding: 0.3rem 0; border-bottom: 1px dashed var(--bord); }
  .details code { font-size: 0.75rem; word-break: break-word; }
  .avis { color: var(--alerte); font-weight: 600; white-space: pre-line; }
  .ok { color: var(--accent); font-weight: 600; }
  .danger-zone { border-color: var(--alerte); }
  label:has(input[type='radio']) { font-weight: 400; display: inline-flex; gap: 0.3rem; align-items: center; margin: 0; }
  input[type='radio'] { width: auto; min-height: 0; }
</style>
