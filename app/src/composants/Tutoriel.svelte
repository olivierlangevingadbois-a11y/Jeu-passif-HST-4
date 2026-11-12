<script lang="ts">
  // Tutoriel du prologue : une mécanique à la fois. Les étapes d'action avancent toutes seules.
  import type { Partie } from '../lib/partie.svelte.ts';
  import { TUTORIEL } from '../lib/textes.ts';
  import type { EtatJeu } from '@jeu/etat.ts';

  type Onglet = 'village' | 'conseil' | 'archives' | 'paquets' | 'heritage';
  let { partie, aller }: { partie: Partie; aller: (o: Onglet) => void } = $props();

  let etat = $derived(partie.affiche!);
  let etape = $derived(etat.tutoriel.etape);
  let info = $derived(TUTORIEL[etape]);
  let actif = $derived(etat.era === 'prologue' && etape < TUTORIEL.length);

  /** Vrai quand l'étape d'action est accomplie. */
  function accomplie(e: EtatJeu, n: number): boolean {
    const b = e.partie.buildings;
    switch (n) {
      case 1: return (b.terre_censitaire ?? 0) >= 2;
      case 2: return (b.moulin_banal ?? 0) >= 1;
      case 3: return (b.eglise_paroissiale ?? 0) >= 1;
      case 4: return Object.keys(e.archives.historique).length > 0;
      case 5: return e.conseil.some((c) => c !== null);
      default: return false;
    }
  }

  const INFORMATIVES = [0, 6, 7];

  $effect(() => {
    if (actif && !INFORMATIVES.includes(etape) && accomplie(etat, etape)) {
      partie.agir({ type: 'tutoriel', etape: etape + 1 });
    }
  });

  function suivant() {
    partie.agir({ type: 'tutoriel', etape: etape + 1 });
  }

  function passer() {
    partie.agir({ type: 'tutoriel', etape: TUTORIEL.length });
    if (!etat.tutoriel.carteOfferte) partie.agir({ type: 'tutoriel_carte' });
  }
</script>

{#if actif && info}
  <aside class="tuto carte-ui" aria-live="polite">
    <div class="ligne espace">
      <strong>{info.titre}</strong>
      <span class="petit-texte doux">{etape + 1} / {TUTORIEL.length}</span>
    </div>
    <p>{info.texte}</p>
    <div class="ligne">
      {#if INFORMATIVES.includes(etape)}
        <button class="petit" onclick={suivant}>{etape === 0 ? 'Commencer' : 'Compris'}</button>
      {:else if info.onglet}
        <button class="petit secondaire" onclick={() => aller(info.onglet!)}>Y aller</button>
      {/if}
      <button class="petit secondaire" onclick={passer}>Passer le tutoriel</button>
    </div>
  </aside>
{/if}

<style>
  .tuto { border-color: var(--or); background: color-mix(in srgb, var(--or) 12%, var(--fond-2)); margin-bottom: 0.75rem; }
  .tuto p { margin: 0.3rem 0 0.4rem; }
</style>
