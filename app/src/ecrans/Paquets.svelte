<script lang="ts">
  import type { Partie } from '../lib/partie.svelte.ts';
  import { jeu } from '../lib/donnees.ts';
  import { cartesAccessibles } from '@jeu/economie.ts';
  import { RARITIES } from '@jeu/contenu.ts';
  import type { CarteTiree } from '@jeu/evenements.ts';
  import { nombre, pourcentage } from '../lib/format.ts';
  import { RARETES } from '../lib/textes.ts';
  import CarteConseiller from '../composants/CarteConseiller.svelte';
  import Modale from '../composants/Modale.svelte';

  let { partie }: { partie: Partie } = $props();

  const P = jeu.balance.packs;
  let etat = $derived(partie.affiche!);
  let pf = $derived(etat.portefeuille);
  let restants = $derived(Math.max(1, P.pityPacks - pf.pitie));
  let aAcheter = $derived(cartesAccessibles(etat, jeu).filter((id) => !etat.cartes[id]).map((id) => jeu.cards.get(id)!));

  let envoi = $state(false);
  let tirage = $state<CarteTiree[] | null>(null);
  let reveles = $state(0);
  let pitie = $state(false);

  async function ouvrir(source: 'voix' | 'gratuit') {
    envoi = true;
    const r = await partie.agirServeur({ type: 'ouvrir_paquet', source });
    envoi = false;
    const ev = r?.evenements.find((e) => e.type === 'paquet');
    if (ev && ev.type === 'paquet') {
      tirage = ev.cartes;
      pitie = ev.pitieDeclenchee;
      reveles = 0;
    }
  }
</script>

<section class="pile">
  <div class="carte-ui">
    <h2>Paquets d'archives</h2>
    <p>Chaque paquet contient {P.size} cartes de conseillers des époques que tu as atteintes, dont au moins une {RARETES[P.guaranteeAtLeast]} ou mieux.</p>
    <div class="ligne espace">
      <span><strong>{nombre(pf.voix)}</strong> Voix</span>
      <span><strong>{pf.paquetsGratuits}</strong> paquet{pf.paquetsGratuits > 1 ? 's' : ''} gratuit{pf.paquetsGratuits > 1 ? 's' : ''}</span>
      <span><strong>{nombre(pf.fragments)}</strong> fragments</span>
    </div>
  </div>

  <div class="ligne boutons">
    {#if pf.paquetsGratuits > 0}
      <button disabled={envoi} onclick={() => ouvrir('gratuit')}>Ouvrir un paquet gratuit</button>
    {/if}
    <button disabled={envoi || pf.voix < P.costVoix} onclick={() => ouvrir('voix')}>Ouvrir un paquet : {P.costVoix} Voix</button>
  </div>
  <p class="petit-texte doux">Les Voix sont données par ton enseignant. Elles ne s'achètent pas.</p>

  <div class="carte-ui">
    <h3>Chances par carte</h3>
    <table>
      <tbody>
        {#each RARITIES as r (r)}
          <tr><td class={r}>{RARETES[r]}</td><td>{pourcentage(P.odds[r])}</td></tr>
        {/each}
      </tbody>
    </table>
    <p class="petit-texte">
      Garantie : une carte Épique au plus tard dans <strong>{restants} paquet{restants > 1 ? 's' : ''}</strong>
      (compteur : {pf.pitie} / {P.pityPacks}).
    </p>
    <p class="petit-texte doux">
      Une carte en double devient des fragments ({RARITIES.map((r) => `${RARETES[r]} : ${P.duplicateFragments[r]}`).join(', ')}).
      Les fragments servent à monter le niveau d'une carte ou à choisir une carte précise.
    </p>
  </div>

  {#if aAcheter.length}
    <div class="carte-ui pile">
      <h3>Choisir une carte avec des fragments</h3>
      {#each aAcheter as c (c.id)}
        <div class="ligne espace">
          <span>{c.name} <span class="doux petit-texte">({RARETES[c.rarity]})</span></span>
          <button class="petit" disabled={pf.fragments < P.buyCardFragments[c.rarity]} onclick={() => partie.agir({ type: 'acheter_carte', carte: c.id })}>
            {P.buyCardFragments[c.rarity]} fragments
          </button>
        </div>
      {/each}
    </div>
  {/if}
</section>

{#if tirage}
  <Modale titre="Paquet d'archives" fermer={reveles >= tirage.length ? () => (tirage = null) : undefined}>
    <div class="pile">
      {#if pitie}<p class="petit-texte"><strong>Garantie activée : une carte Épique !</strong></p>{/if}
      {#each tirage as t, i (i)}
        {@const c = jeu.cards.get(t.id)!}
        {#if i < reveles}
          <div class="tiree">
            <CarteConseiller carte={c} />
            <p class="petit-texte">{t.nouvelle ? 'Nouvelle carte !' : `Déjà obtenue : +${t.fragments} fragments`}</p>
          </div>
        {:else}
          <button class="dos {t.rarity}" onclick={() => (reveles = i + 1)} disabled={i !== reveles}>Toucher pour révéler</button>
        {/if}
      {/each}
      {#if reveles >= tirage.length}
        <button onclick={() => (tirage = null)}>Super !</button>
      {:else}
        <button class="secondaire" onclick={() => (reveles = tirage!.length)}>Tout révéler</button>
      {/if}
    </div>
  </Modale>
{/if}

<style>
  .boutons > button { flex: 1 1 200px; }
  table { border-collapse: collapse; margin-bottom: 0.5rem; }
  td { padding: 0.15rem 1rem 0.15rem 0; }
  td.commune { color: var(--commune); font-weight: 700; }
  td.rare { color: var(--rare); font-weight: 700; }
  td.epique { color: var(--epique); font-weight: 700; }
  .dos { width: 100%; min-height: 64px; background: var(--fond-2); color: var(--encre); border: 3px dashed var(--bord); }
  .tiree { animation: apparition 0.35s ease-out; }
  @keyframes apparition { from { transform: scale(0.9); opacity: 0; } to { transform: none; opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .tiree { animation: none; } }
</style>
