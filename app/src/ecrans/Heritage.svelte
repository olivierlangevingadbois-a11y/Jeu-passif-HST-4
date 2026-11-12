<script lang="ts">
  import type { Partie } from '../lib/partie.svelte.ts';
  import { jeu } from '../lib/donnees.ts';
  import { nombre } from '../lib/format.ts';
  import { NOEUDS_HERITAGE, descriptionEffetHeritage } from '../lib/textes.ts';

  let { partie }: { partie: Partie } = $props();
  let etat = $derived(partie.affiche!);
</script>

<section class="pile">
  <div class="carte-ui">
    <h2>Héritage</h2>
    <p>Tu as <strong>{nombre(etat.heritage)}</strong> Héritage. Il se gagne surtout au passage d'époque et ne se perd jamais.</p>
    <p class="petit-texte doux">Les bonus achetés sont permanents et s'appliquent à toutes les époques.</p>
  </div>

  <div class="arbre">
    {#each jeu.balance.heritageTree as n (n.id)}
      {@const acquis = etat.heritageTree.includes(n.id)}
      {@const accessible = !n.requires || etat.heritageTree.includes(n.requires)}
      <article class="carte-ui noeud" class:acquis class:bloque={!accessible}>
        <h3>{NOEUDS_HERITAGE[n.id] ?? n.id}</h3>
        <p class="petit-texte">{descriptionEffetHeritage(n.effect)}</p>
        {#if acquis}
          <p class="petit-texte"><strong>✓ Acquis</strong></p>
        {:else if !accessible}
          <p class="petit-texte doux">Demande d'abord : {NOEUDS_HERITAGE[n.requires!] ?? n.requires}</p>
        {:else}
          <button class="petit" disabled={etat.heritage < n.cost} onclick={() => partie.agir({ type: 'heritage_acheter', noeud: n.id })}>
            {n.cost} Héritage
          </button>
        {/if}
      </article>
    {/each}
  </div>

  {#if etat.historiqueEpoques.length}
    <div class="carte-ui">
      <h3>Époques terminées</h3>
      <ul>
        {#each etat.historiqueEpoques as h, i (i)}
          <li>{jeu.eras.get(h.era)?.name ?? h.era} : +{nombre(h.heritage)} Héritage, {h.recensements} recensement{h.recensements > 1 ? 's' : ''}</li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<style>
  .arbre { display: grid; gap: 0.6rem; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .noeud { display: grid; gap: 0.2rem; align-content: start; }
  .noeud h3 { font-size: 0.95rem; }
  .noeud.acquis { border-color: var(--accent); background: var(--accent-clair); }
  .noeud.bloque { opacity: 0.6; }
  ul { padding-left: 1.2rem; margin: 0; }
</style>
