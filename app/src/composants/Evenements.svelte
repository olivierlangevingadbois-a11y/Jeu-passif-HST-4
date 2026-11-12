<script lang="ts">
  // Fenêtres d'événements : absence, jalon, recensement, passage d'époque, crises, Voix reçues.
  import type { Partie } from '../lib/partie.svelte.ts';
  import { jeu } from '../lib/donnees.ts';
  import { duree, multiplicateur, nombre } from '../lib/format.ts';
  import Modale from './Modale.svelte';
  import CarteConseiller from './CarteConseiller.svelte';

  let { partie }: { partie: Partie } = $props();

  let ev = $derived(partie.aMontrer[0]);
  // Dénouement d'une crise terminée pendant l'absence ou sur un autre appareil.
  let aLire = $derived(!ev && partie.affiche ? partie.affiche.crisesALire[0] : undefined);

  function fermer() {
    if (ev?.type === 'crise_fin') partie.agir({ type: 'crise_lue', crise: ev.crise });
    partie.fermerEvenement();
  }

  function lireCrise(id: string) {
    partie.agir({ type: 'crise_lue', crise: id });
  }
</script>

{#if ev}
  {#if ev.type === 'absence'}
    <Modale titre="Pendant ton absence" fermer={fermer}>
      <p>Tu as été absent {duree(ev.secondes)}. Ta paroisse a continué de travailler{ev.secondesComptees < ev.secondes ? ` pendant ${duree(ev.secondesComptees)} (maximum : ${ev.plafondHeures} h)` : ''}.</p>
      <ul>
        {#if ev.gains.habitants >= 1}<li>+{nombre(ev.gains.habitants)} habitants</li>{/if}
        <li>+{nombre(ev.gains.production)} production</li>
        <li>+{nombre(ev.gains.argent)} argent</li>
      </ul>
      <button onclick={fermer}>Au travail !</button>
    </Modale>
  {:else if ev.type === 'jalon_atteint'}
    {@const era = jeu.eras.get(ev.era)}
    <Modale titre="Jalon atteint : {era?.milestone.name}" fermer={fermer}>
      <p class="doux">{era?.milestone.year}</p>
      <p>{era?.milestone.eventText}</p>
      <button onclick={fermer}>Continuer</button>
    </Modale>
  {:else if ev.type === 'recensement'}
    {@const fait = jeu.eras.get(ev.era)?.recensementFacts.find((f) => f.id === ev.factId)}
    <Modale titre="Recensement" fermer={fermer}>
      <p>Tu as recensé <strong>{nombre(ev.habitantsComptes)} habitants</strong>. Ta production est maintenant multipliée par <strong>{multiplicateur(ev.multiplicateur)}</strong>.</p>
      {#if fait}
        <div class="fait"><strong>Le savais-tu ?</strong><p>{fait.text}</p></div>
      {/if}
      <button onclick={fermer}>Recommencer, en plus fort</button>
    </Modale>
  {:else if ev.type === 'passage'}
    {@const vers = jeu.eras.get(ev.vers)}
    <Modale titre={vers?.name ?? 'Nouvelle époque'} fermer={fermer}>
      <p class="doux">{vers?.programTitle}</p>
      <p>{vers?.intro}</p>
      <ul>
        <li>+{nombre(ev.heritage)} Héritage</li>
        {#if ev.paquetsGratuits}<li>+{ev.paquetsGratuits} paquet d'archives gratuit</li>{/if}
        {#if ev.monument}<li>Monument conservé : {jeu.buildings.get(ev.monument)?.name}</li>{/if}
      </ul>
      <button onclick={fermer}>Découvrir l'époque</button>
    </Modale>
  {:else if ev.type === 'crise_debut'}
    {@const c = jeu.crises.get(ev.crise)}
    <Modale titre="Crise : {c?.name}" fermer={fermer}>
      {#if c?.year}<p class="doux">{c.year}</p>{/if}
      <p>{c?.description}</p>
      <p class="petit-texte">Regarde le bandeau rouge du village pour savoir comment atténuer la crise.</p>
      <button onclick={fermer}>Compris</button>
    </Modale>
  {:else if ev.type === 'crise_fin'}
    {@const c = jeu.crises.get(ev.crise)}
    <Modale titre="Fin de la crise : {c?.name}" fermer={fermer}>
      <div class="fait"><strong>Ce qui s'est vraiment passé</strong><p>{c?.aftermath}</p></div>
      <button onclick={fermer}>Continuer</button>
    </Modale>
  {:else if ev.type === 'voix_recues'}
    <Modale titre="Tu as reçu des Voix !" fermer={fermer}>
      <p class="gros">+{nombre(ev.montant)} Voix</p>
      {#if ev.raison}<p>« {ev.raison} »</p>{/if}
      <p class="petit-texte doux">Les Voix servent à ouvrir des paquets d'archives.</p>
      <button onclick={fermer}>Merci !</button>
    </Modale>
  {:else if ev.type === 'carte_offerte'}
    {@const c = jeu.cards.get(ev.carte)}
    <Modale titre="Un premier conseiller" fermer={fermer}>
      {#if c}<CarteConseiller carte={c} />{/if}
      <p>{c?.bio}</p>
      <button onclick={fermer}>Le placer au conseil</button>
    </Modale>
  {/if}
{:else if aLire}
  {@const c = jeu.crises.get(aLire)}
  <Modale titre="Fin de la crise : {c?.name ?? aLire}" fermer={() => lireCrise(aLire)}>
    <div class="fait"><strong>Ce qui s'est vraiment passé</strong><p>{c?.aftermath}</p></div>
    <button onclick={() => lireCrise(aLire)}>Continuer</button>
  </Modale>
{/if}

<style>
  .fait { background: var(--accent-clair); border-left: 4px solid var(--accent); padding: 0.6rem 0.8rem; border-radius: 4px; margin: 0.6rem 0; }
  .fait p { margin: 0.3rem 0 0; }
  .gros { font-size: 1.6rem; font-weight: 800; color: var(--or); }
  ul { padding-left: 1.2rem; }
</style>
