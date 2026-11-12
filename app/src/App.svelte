<script lang="ts">
  import { onDestroy } from 'svelte';
  import { MODE_LOCAL } from './lib/config.ts';
  import { routeur } from './lib/routeur.svelte.ts';
  import { Partie } from './lib/partie.svelte.ts';
  import { creerBackendLocal } from './lib/backend/local.ts';
  import type { Backend } from './lib/backend/types.ts';
  import Jeu from './ecrans/Jeu.svelte';
  import Confidentialite from './ecrans/Confidentialite.svelte';
  import Connexion from './ecrans/Connexion.svelte';
  import Enseignant from './ecrans/Enseignant.svelte';
  import { NOM_JEU } from './lib/textes.ts';

  let partie = $state<Partie | null>(null);
  let erreur = $state<string | null>(null);

  async function demarrer(backend: Backend) {
    const p = new Partie(backend);
    try {
      await p.demarrer();
      if (!p.serveur) throw new Error('Impossible de charger la partie. Vérifie ta connexion.');
      partie = p;
    } catch (e) {
      p.arreter();
      erreur = (e as Error).message;
    }
  }

  async function deconnecter() {
    if (!partie) return;
    await partie.synchroniserMaintenant();
    partie.arreter();
    await partie.backend.deconnecter();
    partie = null;
  }

  if (MODE_LOCAL) void demarrer(creerBackendLocal());

  onDestroy(() => partie?.arreter());
</script>

{#if routeur.route === 'confidentialite'}
  <Confidentialite retour={() => routeur.aller('jeu')} />
{:else if routeur.route === 'enseignant'}
  <Enseignant />
{:else if partie && partie.affiche && !partie.sessionExpiree}
  <Jeu {partie} {deconnecter} />
{:else if MODE_LOCAL && !erreur}
  <p class="chargement">Chargement de {NOM_JEU}…</p>
{:else}
  <Connexion {demarrer} {erreur} sessionExpiree={partie?.sessionExpiree ?? false} />
{/if}

<style>
  .chargement { text-align: center; margin-top: 30vh; }
</style>
