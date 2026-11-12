<script lang="ts">
  import type { Card } from '@jeu/contenu.ts';
  import { RARETES } from '../lib/textes.ts';

  let {
    carte,
    niveau = null,
    compacte = false,
    attenuee = false,
    onclick,
  }: { carte: Card; niveau?: number | null; compacte?: boolean; attenuee?: boolean; onclick?: () => void } = $props();

  let initiales = $derived(
    carte.name
      .split(/[\s-]+/)
      .filter((m) => m.length > 2 || /^[A-ZÉ]/.test(m))
      .map((m) => m[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );
</script>

<button class="carte {carte.rarity}" class:compacte class:attenuee {onclick} type="button" aria-label="{carte.name}, {RARETES[carte.rarity]}">
  <span class="portrait pixel" aria-hidden="true">
    <svg viewBox="0 0 16 16">
      <rect width="16" height="16" fill="currentColor" opacity="0.15" />
      <rect x="5" y="3" width="6" height="6" fill="currentColor" opacity="0.55" />
      <rect x="3" y="10" width="10" height="6" fill="currentColor" opacity="0.55" />
    </svg>
    <span class="initiales">{initiales}</span>
  </span>
  <span class="texte">
    <strong class="nom">{carte.name}</strong>
    <span class="rarete">{RARETES[carte.rarity]}{niveau ? ` · niv. ${niveau}` : ''}</span>
    {#if !compacte}<span class="effet">{carte.effectText}</span>{/if}
    {#if !carte.validated}<span class="brouillon">Brouillon</span>{/if}
  </span>
</button>

<style>
  .carte {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    width: 100%;
    text-align: left;
    background: var(--fond-2);
    color: var(--encre);
    border: 3px solid var(--commune);
    padding: 0.45rem;
    font-weight: 400;
  }
  .carte.rare { border-color: var(--rare); }
  .carte.epique { border-color: var(--epique); box-shadow: 0 0 0 2px color-mix(in srgb, var(--epique) 35%, transparent); }
  .carte.attenuee { opacity: 0.75; }
  .portrait { position: relative; width: 48px; height: 48px; flex: none; color: var(--commune); }
  .rare .portrait { color: var(--rare); }
  .epique .portrait { color: var(--epique); }
  .portrait svg { width: 100%; height: 100%; display: block; }
  .initiales { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 800; color: var(--encre); font-size: 0.85rem; }
  .texte { display: grid; gap: 0.1rem; min-width: 0; }
  .nom { font-size: 0.95rem; }
  .rarete { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--encre-douce); }
  .effet { font-size: 0.8rem; }
  .compacte .portrait { width: 36px; height: 36px; }
</style>
