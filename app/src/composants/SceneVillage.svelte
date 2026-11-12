<script lang="ts">
  // Scène provisoire du village : des tuiles simples, en attendant le pixel art.
  import type { EtatJeu } from '@jeu/etat.ts';
  import { batimentsDisponibles } from '@jeu/economie.ts';
  import { jeu } from '../lib/donnees.ts';
  import { COULEURS_EPOQUE, visuel } from '../lib/visuels.ts';

  let { etat }: { etat: EtatJeu } = $props();

  const L = 160;
  const H = 64;

  function nbTuiles(niveau: number): number {
    if (niveau <= 0) return 0;
    if (niveau <= 5) return niveau;
    return Math.min(12, 5 + Math.floor(Math.log2(niveau - 4) * 2));
  }

  let tuiles = $derived.by(() => {
    const liste: { x: number; y: number; id: string; grand: boolean }[] = [];
    const batiments = batimentsDisponibles(etat, jeu);
    let x = 4;
    let rang = 0;
    for (const b of batiments) {
      const n = nbTuiles(etat.partie.buildings[b.id] ?? 0);
      const grand = b.monument;
      const nombre = grand ? Math.min(n, 1) : n;
      for (let i = 0; i < nombre; i++) {
        const largeur = grand ? 14 : 9;
        if (x + largeur > L - 4) {
          x = 4;
          rang++;
        }
        liste.push({ x, y: 34 - rang * 13 + (grand ? -5 : 0), id: b.id, grand });
        x += largeur + 1;
      }
      x += 3;
    }
    return liste;
  });

  let couleurs = $derived(COULEURS_EPOQUE[etat.era] ?? COULEURS_EPOQUE.prologue);
  let anciensMonuments = $derived(etat.monuments.filter((m) => jeu.buildings.get(m)?.era !== etat.era));
</script>

<svg class="pixel scene" viewBox="0 0 {L} {H}" role="img" aria-label="Vue de ta paroisse">
  <rect width={L} height={H} fill={couleurs.ciel} />
  <rect y="28" width={L} height="26" fill={couleurs.sol} />
  <rect y="54" width={L} height="10" fill="var(--fleuve)" />
  <rect y="56" x="10" width="20" height="1" fill="#ffffff" opacity="0.5" />
  <rect y="59" x="70" width="26" height="1" fill="#ffffff" opacity="0.5" />
  <rect y="57" x="120" width="18" height="1" fill="#ffffff" opacity="0.5" />
  {#each tuiles as t, i (i)}
    {@const v = visuel(t.id)}
    {#if t.grand}
      <rect x={t.x} y={t.y + 6} width="14" height="12" fill={v.couleur} stroke="#4a3a2a" stroke-width="0.5" />
      <polygon points="{t.x - 1},{t.y + 6} {t.x + 7},{t.y} {t.x + 15},{t.y + 6}" fill={v.toit} />
      <rect x={t.x + 6} y={t.y - 4} width="2" height="5" fill={v.toit} />
      <rect x={t.x + 6} y={t.y + 12} width="3" height="6" fill="#4a3a2a" />
    {:else}
      <rect x={t.x} y={t.y + 4} width="9" height="8" fill={v.couleur} stroke="#4a3a2a" stroke-width="0.5" />
      <polygon points="{t.x - 1},{t.y + 4} {t.x + 4.5},{t.y} {t.x + 10},{t.y + 4}" fill={v.toit} />
      <rect x={t.x + 4} y={t.y + 8} width="2" height="4" fill="#4a3a2a" />
    {/if}
  {/each}
  {#if tuiles.length === 0}
    <text x={L / 2} y="42" text-anchor="middle" font-size="6" fill="#4a3a2a">Une forêt à défricher…</text>
  {/if}
</svg>
{#if anciensMonuments.length}
  <p class="petit-texte doux monuments">
    Monuments du passé : {anciensMonuments.map((m) => jeu.buildings.get(m)?.name).join(', ')}
  </p>
{/if}

<style>
  .scene {
    width: 100%;
    height: auto;
    display: block;
    border: 2px solid var(--bord);
    border-radius: var(--rayon);
    background: var(--fond-2);
  }
  .monuments {
    margin: 0.3rem 0 0;
  }
</style>
