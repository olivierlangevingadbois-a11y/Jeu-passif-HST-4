<script lang="ts">
  // Fiches à imprimer et à découper : une par élève. Le NIP n'est montré qu'ici, une seule fois.
  import { NOM_JEU } from '../../lib/textes.ts';

  let { fiches, groupe, code, fermer }: { fiches: { pseudonyme: string; nip: string }[]; groupe: string; code: string; fermer: () => void } = $props();
  let adresse = location.href.split('#')[0];
</script>

<div class="fiches-fond" role="dialog" aria-modal="true" aria-label="Fiches de connexion">
  <div class="barre-outils ligne espace">
    <p><strong>Note ces NIP maintenant :</strong> ils ne seront plus jamais affichés. En cas d'oubli, réinitialise le NIP.</p>
    <div class="ligne">
      <button onclick={() => window.print()}>Imprimer</button>
      <button class="secondaire" onclick={fermer}>Fermer</button>
    </div>
  </div>
  <div class="fiches">
    {#each fiches as f (f.pseudonyme)}
      <article class="fiche">
        <h3>{NOM_JEU}</h3>
        <p class="petit">{adresse}</p>
        <dl>
          <dt>Code de classe</dt><dd>{code}</dd>
          <dt>Pseudonyme</dt><dd>{f.pseudonyme}</dd>
          <dt>NIP</dt><dd>{f.nip}</dd>
        </dl>
        <p class="petit">Groupe {groupe}. Garde ton NIP pour toi.</p>
      </article>
    {/each}
  </div>
</div>

<style>
  .fiches-fond { position: fixed; inset: 0; background: var(--fond); z-index: 100; overflow: auto; padding: 1rem; }
  .barre-outils { max-width: 900px; margin: 0 auto 1rem; }
  .fiches { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.5rem; max-width: 900px; margin: 0 auto; }
  .fiche { border: 2px dashed #555; padding: 0.7rem; background: #fff; color: #111; break-inside: avoid; }
  .fiche h3 { font-size: 1rem; margin: 0 0 0.2rem; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 0.2rem 0.6rem; margin: 0.4rem 0; }
  dt { font-weight: 600; }
  dd { margin: 0; font-family: ui-monospace, monospace; font-size: 1.15rem; letter-spacing: 0.06em; }
  .petit { font-size: 0.75rem; margin: 0; word-break: break-all; }
  @media print {
    :global(body) { background: #fff; }
    :global(#app > *:not(.fiches-fond)), .barre-outils { display: none !important; }
    .fiches-fond { position: static; padding: 0; background: #fff; }
    .fiches { grid-template-columns: repeat(3, 1fr); max-width: none; }
  }
</style>
