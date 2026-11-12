<script lang="ts">
  // Bandeau de la crise en cours, avec les mesures possibles.
  import type { Partie } from '../lib/partie.svelte.ts';
  import { jeu } from '../lib/donnees.ts';
  import { forceCrise, mesuresCriseActives } from '@jeu/economie.ts';
  import { duree, nombre, pourcentage } from '../lib/format.ts';

  let { partie }: { partie: Partie } = $props();

  let etat = $derived(partie.affiche!);
  let active = $derived(etat.crise);
  let crise = $derived(active ? jeu.crises.get(active.id) : undefined);
  let cb = $derived(active ? jeu.balance.crises[active.id] : undefined);
  let mesures = $derived(mesuresCriseActives(etat, jeu));
  let force = $derived(forceCrise(etat, jeu, partie.maintenant));

  const PENALITES: Record<string, string> = {
    growth_reduction: 'Croissance des habitants réduite',
    habitants_loss: 'Des habitants quittent la paroisse',
    income_reduction: "Revenus d'argent réduits",
    buildings_disabled: 'Certains bâtiments sont arrêtés',
  };

  function libelle(kind: string, ref: string | null): string {
    if (kind === 'building') return `Avoir le bâtiment « ${jeu.buildings.get(ref ?? '')?.name ?? ref} »`;
    if (kind === 'card') return `Placer « ${jeu.cards.get(ref ?? '')?.name ?? ref} » au conseil`;
    if (kind === 'resources') return `Dépenser ${nombre(cb?.mitigationArgent ?? 0)} argent`;
    if (kind === 'archives') return ref ? `Réussir une question des Archives sur ce sujet` : `Réussir une question des Archives de l'époque`;
    return kind;
  }

  function cle(kind: string, ref: string | null): string {
    return kind === 'building' || kind === 'card' ? `${kind}:${ref}` : kind;
  }
</script>

{#if active && crise && cb}
  <div class="carte-ui crise" role="status">
    <div class="ligne espace">
      <h3>⚠ Crise : {crise.name}{crise.year ? ` (${crise.year})` : ''}</h3>
      <span class="petit-texte">{duree((active.endsAt - partie.maintenant) / 1000)}</span>
    </div>
    {#if !crise.validated}<span class="brouillon">Brouillon</span>{/if}
    <p>{crise.description}</p>
    <p class="petit-texte"><strong>{PENALITES[crise.penalty.kind]} : -{pourcentage(force)}</strong></p>
    <p class="petit-texte">Pour atténuer la crise (chaque mesure aide) :</p>
    <ul>
      {#each crise.mitigations as m (cle(m.kind, m.ref))}
        {@const fait = mesures.includes(cle(m.kind, m.ref))}
        <li class:fait>
          {fait ? '✓' : '○'} {libelle(m.kind, m.ref)}
          {#if m.kind === 'resources' && !fait}
            <button class="petit" disabled={etat.partie.argent < cb.mitigationArgent} onclick={() => partie.agir({ type: 'crise_payer' })}>Payer</button>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .crise { border-color: var(--alerte); background: var(--alerte-fond); }
  ul { padding-left: 0.2rem; list-style: none; margin: 0; }
  li { margin: 0.3rem 0; }
  li.fait { color: var(--accent); font-weight: 600; }
</style>
