<script lang="ts">
  import type { Snippet } from 'svelte';

  let { titre, fermer, children }: { titre: string; fermer?: () => void; children: Snippet } = $props();

  let boite: HTMLDivElement | undefined = $state();

  $effect(() => {
    boite?.focus();
  });

  function touche(e: KeyboardEvent) {
    if (e.key === 'Escape' && fermer) fermer();
  }
</script>

<svelte:window onkeydown={touche} />

<div class="fond" role="presentation">
  <div class="boite carte-ui" role="dialog" aria-modal="true" aria-label={titre} tabindex="-1" bind:this={boite}>
    <div class="ligne espace entete">
      <h2>{titre}</h2>
      {#if fermer}
        <button class="secondaire petit" onclick={fermer} aria-label="Fermer">✕</button>
      {/if}
    </div>
    <div class="contenu">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .fond {
    position: fixed;
    inset: 0;
    background: rgba(20, 14, 8, 0.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 50;
    padding: 0.5rem;
  }
  .boite {
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow-y: auto;
    outline: none;
  }
  .entete { flex-wrap: nowrap; align-items: flex-start; }
  .contenu :global(button) { margin-top: 0.4rem; }
  @media (min-width: 700px) {
    .fond { align-items: center; }
  }
</style>
