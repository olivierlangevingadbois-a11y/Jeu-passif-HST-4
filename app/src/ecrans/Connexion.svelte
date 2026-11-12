<script lang="ts">
  import type { Backend } from '../lib/backend/types.ts';
  import { NOM_JEU } from '../lib/textes.ts';

  let { demarrer, erreur, sessionExpiree }: { demarrer: (b: Backend) => Promise<void>; erreur: string | null; sessionExpiree: boolean } = $props();
  void demarrer;
</script>

<section class="connexion pile">
  <h1>{NOM_JEU}</h1>
  {#if sessionExpiree}<p>Ta session a expiré. Reconnecte-toi.</p>{/if}
  {#if erreur}<p class="erreur">{erreur}</p>{/if}
  <p>La connexion en ligne arrive bientôt.</p>
</section>

<style>
  .connexion { max-width: 420px; margin: 10vh auto; padding: 1rem; }
  .erreur { color: var(--alerte); font-weight: 600; }
</style>
