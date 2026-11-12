<script lang="ts">
  import type { Partie } from '../lib/partie.svelte.ts';
  import { jeu } from '../lib/donnees.ts';
  import { cartesAccessibles, cartesAuConseil, nombreEmplacements, puissanceCarte } from '@jeu/economie.ts';
  import { coutNiveauCarte } from '@jeu/paquets.ts';
  import type { Card } from '@jeu/contenu.ts';
  import { nombre, pourcentage } from '../lib/format.ts';
  import { TYPES_CARTE, RARETES } from '../lib/textes.ts';
  import CarteConseiller from '../composants/CarteConseiller.svelte';
  import Modale from '../composants/Modale.svelte';

  let { partie }: { partie: Partie } = $props();

  let etat = $derived(partie.affiche!);
  let places = $derived(nombreEmplacements(etat, jeu));
  let conseil = $derived(cartesAuConseil(etat, jeu));
  let accessibles = $derived(cartesAccessibles(etat, jeu).map((id) => jeu.cards.get(id)!));
  let possedees = $derived(accessibles.filter((c) => etat.cartes[c.id]));
  let jamaisVues = $derived(accessibles.filter((c) => !etat.cartes[c.id]));

  let detail = $state<Card | null>(null);
  let choixPlace = $state<number | null>(null);

  function placer(id: string | null, place: number) {
    partie.agir({ type: 'conseil', emplacement: place, carte: id });
  }

  function premiereLibre(): number {
    for (let i = 0; i < places; i++) if (!etat.conseil[i] || !etat.cartes[etat.conseil[i]!]) return i;
    return 0;
  }

  const NOMS_EPOQUE = (id: string) => jeu.eras.get(id as never)?.name ?? id;
</script>

<section class="pile">
  <div class="carte-ui">
    <h2>Le conseil</h2>
    <p class="petit-texte doux">
      Tes conseillers donnent des bonus. Une carte est à pleine puissance dans son époque, et à moitié ensuite : son influence s'estompe.
    </p>
  </div>

  {#if etat.tutoriel.etape === 5 && !etat.tutoriel.carteOfferte}
    <div class="carte-ui">
      <p>Un premier conseiller veut t'aider.</p>
      <button onclick={() => partie.agir({ type: 'tutoriel_carte' })}>Recevoir ma première carte</button>
    </div>
  {/if}

  <div class="places">
    {#each Array(places) as _, i (i)}
      {@const id = etat.conseil[i]}
      {@const carte = id && etat.cartes[id] ? jeu.cards.get(id) : undefined}
      <div class="place">
        <span class="petit-texte doux">Place {i + 1}</span>
        {#if carte}
          <CarteConseiller {carte} niveau={etat.cartes[carte.id].niveau} attenuee={carte.era !== etat.era} onclick={() => (detail = carte)} />
          <p class="petit-texte">
            Bonus actuel : {carte.effect.kind === 'crisis_mitigation' ? 'aide pendant la crise' : `+${pourcentage(puissanceCarte(etat, jeu, carte.id, conseil))}`}
            {#if carte.era !== etat.era}<span class="doux"> (demi-puissance)</span>{/if}
          </p>
        {:else}
          <button class="secondaire vide" onclick={() => (choixPlace = i)} disabled={possedees.length === 0}>+ Choisir un conseiller</button>
        {/if}
      </div>
    {/each}
  </div>
  {#if places < jeu.balance.conseil.maxSlots}
    <p class="petit-texte doux">D'autres places s'ouvrent avec l'Héritage.</p>
  {/if}

  <div class="ligne espace">
    <h2>Collection</h2>
    <span class="doux">{possedees.length} / {accessibles.length} · {nombre(etat.portefeuille.fragments)} fragments</span>
  </div>
  {#if possedees.length === 0}
    <p class="doux">Aucune carte pour l'instant. Les paquets d'archives en contiennent.</p>
  {/if}
  <div class="grille">
    {#each possedees as c (c.id)}
      <CarteConseiller carte={c} niveau={etat.cartes[c.id].niveau} compacte onclick={() => (detail = c)} />
    {/each}
    {#each jamaisVues as c (c.id)}
      <div class="inconnue {c.rarity}">
        <strong>?</strong>
        <span class="petit-texte">{RARETES[c.rarity]} · {NOMS_EPOQUE(c.era).split(':')[0]}</span>
      </div>
    {/each}
  </div>
</section>

{#if choixPlace !== null}
  <Modale titre="Choisir un conseiller" fermer={() => (choixPlace = null)}>
    <div class="pile">
      {#each possedees as c (c.id)}
        <CarteConseiller carte={c} niveau={etat.cartes[c.id].niveau} onclick={() => { placer(c.id, choixPlace!); choixPlace = null; }} />
      {/each}
    </div>
  </Modale>
{/if}

{#if detail}
  {@const c = detail}
  {@const possede = etat.cartes[c.id]}
  {@const place = etat.conseil.indexOf(c.id)}
  {@const cout = possede ? coutNiveauCarte(jeu, possede.niveau) : null}
  <Modale titre={c.name} fermer={() => (detail = null)}>
    <div class="pile">
      <CarteConseiller carte={c} niveau={possede?.niveau ?? null} />
      <p class="petit-texte doux">{TYPES_CARTE[c.type]} · {NOMS_EPOQUE(c.era)}</p>
      <p>{c.bio}</p>
      {#if c.source}<p class="petit-texte doux">Source : {c.source}</p>{/if}
      {#if c.synergy}<p class="petit-texte"><strong>Synergie :</strong> {c.synergy.text}</p>{/if}
      {#if possede}
        <div class="ligne">
          {#if place >= 0 && place < places}
            <button class="secondaire" onclick={() => { placer(null, place); detail = null; }}>Retirer du conseil</button>
          {:else}
            <button onclick={() => { placer(c.id, premiereLibre()); detail = null; }}>Placer au conseil</button>
          {/if}
          {#if cout !== null}
            <button class="secondaire" disabled={etat.portefeuille.fragments < cout} onclick={() => partie.agir({ type: 'ameliorer_carte', carte: c.id })}>
              Niveau {possede.niveau + 1} : {cout} fragments
            </button>
          {:else}
            <span class="doux">Niveau maximum</span>
          {/if}
        </div>
      {/if}
    </div>
  </Modale>
{/if}

<style>
  .places { display: grid; gap: 0.6rem; }
  .place { display: grid; gap: 0.25rem; }
  .vide { width: 100%; min-height: 64px; border-style: dashed; }
  .grille { display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .inconnue {
    border: 3px dashed var(--commune);
    border-radius: var(--rayon);
    padding: 0.45rem;
    display: grid;
    place-items: center;
    min-height: 56px;
    color: var(--encre-douce);
  }
  .inconnue.rare { border-color: var(--rare); }
  .inconnue.epique { border-color: var(--epique); }
  @media (min-width: 600px) {
    .places { grid-template-columns: repeat(3, 1fr); }
  }
</style>
