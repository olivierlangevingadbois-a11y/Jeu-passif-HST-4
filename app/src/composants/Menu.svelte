<script lang="ts">
  import type { Partie } from '../lib/partie.svelte.ts';
  import { jeu } from '../lib/donnees.ts';
  import { outilsLocaux } from '../lib/backend/local.ts';
  import { NOM_VILLE_MAX } from '@jeu/actions.ts';
  import { untrack } from 'svelte';
  import Modale from './Modale.svelte';

  let { partie, fermer, deconnecter }: { partie: Partie; fermer: () => void; deconnecter: () => void } = $props();

  let etat = $derived(partie.affiche!);
  let nom = $state(untrack(() => partie.affiche?.townName ?? ''));
  let local = $derived(partie.backend.mode === 'local');

  function nommer(e: SubmitEvent) {
    e.preventDefault();
    if (!partie.agir({ type: 'nommer_ville', nom })) partie.message('Nom enregistré.');
  }

  async function outil(f: () => void) {
    f();
    // Fermer le menu pour laisser voir la fenêtre d'événement (Voix reçues, absence...).
    fermer();
    await partie.synchroniserMaintenant();
  }

  function reinitialiser() {
    if (confirm('Effacer la partie locale et recommencer ?')) {
      outilsLocaux.reinitialiser();
      location.reload();
    }
  }
</script>

<Modale titre="Menu" {fermer}>
  <div class="pile">
    {#if partie.profil}
      <p>Connecté comme <strong>{partie.profil.pseudonyme}</strong> ({partie.profil.groupe})</p>
    {/if}

    <form onsubmit={nommer}>
      <label for="nom-ville">Nom de ta ville</label>
      <div class="ligne nowrap">
        <input id="nom-ville" bind:value={nom} maxlength={NOM_VILLE_MAX} placeholder="Ex. : Saint-Fabien-sur-Mer" autocomplete="off" />
        <button type="submit">OK</button>
      </div>
      <p class="petit-texte doux">Ton enseignant peut voir et modifier ce nom.</p>
    </form>

    <a href="#/confidentialite" onclick={fermer}>Confidentialité : quelles données sont gardées ?</a>

    {#if !local}
      <button class="secondaire" onclick={deconnecter}>Se déconnecter</button>
    {/if}

    {#if local}
      <div class="carte-ui outils">
        <h3>Outils de test (mode local)</h3>
        <p class="petit-texte doux">Ces outils simulent le tableau de bord de l'enseignant. Ils n'existent pas dans la version en ligne.</p>
        {#each jeu.ordreEras.filter((e) => e !== 'prologue') as era (era)}
          {@const ouverte = partie.contexte.erasOuvertes.includes(era)}
          <button class="petit" class:secondaire={!ouverte} onclick={() => outil(() => outilsLocaux.basculerEpoque(era))}>
            {ouverte ? 'Fermer' : 'Ouvrir'} : {jeu.eras.get(era)?.name}
          </button>
        {/each}
        <button class="petit" class:secondaire={!partie.contexte.modeRevision} onclick={() => outil(() => outilsLocaux.basculerRevision())}>
          Mode révision : {partie.contexte.modeRevision ? 'activé' : 'désactivé'}
        </button>
        <button class="petit secondaire" onclick={() => outil(() => outilsLocaux.donnerVoix(50, 'Essai de l\'enseignant'))}>Recevoir 50 Voix</button>
        <div class="ligne">
          <button class="petit secondaire" onclick={() => outil(() => outilsLocaux.voyagerDansLeTemps(1))}>Absence de 1 h</button>
          <button class="petit secondaire" onclick={() => outil(() => outilsLocaux.voyagerDansLeTemps(8))}>Absence de 8 h</button>
          <button class="petit secondaire" onclick={() => outil(() => outilsLocaux.voyagerDansLeTemps(24))}>Absence de 24 h</button>
        </div>
        <button class="petit danger" onclick={reinitialiser}>Recommencer la partie</button>
        <p class="petit-texte doux">Époque : {etat.era} · {jeu.brouillons ? 'brouillons visibles' : 'contenu validé seulement'}</p>
      </div>
    {/if}
  </div>
</Modale>

<style>
  .nowrap { flex-wrap: nowrap; }
  .outils { display: grid; gap: 0.4rem; }
  a { color: var(--accent); font-weight: 600; }
</style>
