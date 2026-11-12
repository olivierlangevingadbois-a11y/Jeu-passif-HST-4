<script lang="ts">
  import type { Partie } from '../lib/partie.svelte.ts';
  import { jeu } from '../lib/donnees.ts';
  import { calculerModificateurs, calculerTaux } from '@jeu/economie.ts';
  import { nombre, parSeconde } from '../lib/format.ts';
  import Village from './Village.svelte';
  import Conseil from './Conseil.svelte';
  import Archives from './Archives.svelte';
  import Paquets from './Paquets.svelte';
  import Heritage from './Heritage.svelte';
  import Evenements from '../composants/Evenements.svelte';
  import Tutoriel from '../composants/Tutoriel.svelte';
  import Menu from '../composants/Menu.svelte';
  import { chargesDisponibles } from '@jeu/archives.ts';

  type Onglet = 'village' | 'conseil' | 'archives' | 'paquets' | 'heritage';
  let { partie, deconnecter }: { partie: Partie; deconnecter: () => void } = $props();

  let onglet = $state<Onglet>('village');
  let menu = $state(false);

  let etat = $derived(partie.affiche!);
  let taux = $derived(calculerTaux(etat, jeu, calculerModificateurs(etat, jeu, partie.maintenant)));
  let charges = $derived(chargesDisponibles(etat, jeu, partie.maintenant));
  let paquets = $derived(etat.portefeuille.paquetsGratuits + Math.floor(etat.portefeuille.voix / jeu.balance.packs.costVoix));

  const ONGLETS: { id: Onglet; nom: string; icone: string }[] = [
    { id: 'village', nom: 'Village', icone: '⌂' },
    { id: 'conseil', nom: 'Conseil', icone: '♜' },
    { id: 'archives', nom: 'Archives', icone: '✎' },
    { id: 'paquets', nom: 'Paquets', icone: '✉' },
    { id: 'heritage', nom: 'Héritage', icone: '❦' },
  ];

  function aller(o: Onglet) {
    onglet = o;
    window.scrollTo({ top: 0 });
  }
</script>

<div class="jeu">
  <header class="entete">
    <div class="ligne espace titre">
      <div>
        <h1>{etat.townName ?? 'Ta paroisse'}</h1>
        <span class="petit-texte doux">{jeu.eras.get(etat.era)?.townStage}</span>
      </div>
      <button class="secondaire petit" onclick={() => (menu = true)} aria-label="Menu">☰</button>
    </div>
    <dl class="ressources">
      <div>
        <dt>Habitants</dt>
        <dd>{nombre(etat.partie.habitants)}<span class="doux"> / {nombre(taux.plafondHabitants)}</span></dd>
        <dd class="taux">{etat.partie.habitants >= taux.plafondHabitants ? 'plafond atteint' : `+${parSeconde(taux.habitants)}`}</dd>
      </div>
      <div>
        <dt>Production</dt>
        <dd>{parSeconde(taux.production)}</dd>
        <dd class="taux">total {nombre(etat.epoque.productionTotal)}</dd>
      </div>
      <div>
        <dt>Argent</dt>
        <dd>{nombre(etat.partie.argent)}</dd>
        <dd class="taux">+{parSeconde(taux.argent)}</dd>
      </div>
    </dl>
    <div class="ligne petit-texte secondaires">
      <span>{nombre(etat.heritage)} Héritage</span>
      <span>{nombre(etat.portefeuille.voix)} Voix</span>
      {#if partie.horsLigne}<span class="alerte">Hors ligne : la sauvegarde reprendra au retour du réseau</span>{/if}
      {#if partie.backend.mode === 'local'}<span class="local">Mode local</span>{/if}
    </div>
  </header>

  <main>
    <Tutoriel {partie} {aller} />
    {#if onglet === 'village'}<Village {partie} />
    {:else if onglet === 'conseil'}<Conseil {partie} />
    {:else if onglet === 'archives'}<Archives {partie} />
    {:else if onglet === 'paquets'}<Paquets {partie} />
    {:else}<Heritage {partie} />{/if}
  </main>

  <nav class="onglets" aria-label="Sections du jeu">
    {#each ONGLETS as o (o.id)}
      <button class:actif={onglet === o.id} aria-current={onglet === o.id ? 'page' : undefined} onclick={() => aller(o.id)}>
        <span class="icone" aria-hidden="true">{o.icone}</span>
        <span>{o.nom}</span>
        {#if o.id === 'archives' && charges > 0}<span class="pastille">{charges}</span>{/if}
        {#if o.id === 'paquets' && paquets > 0}<span class="pastille">{paquets}</span>{/if}
      </button>
    {/each}
  </nav>
</div>

<Evenements {partie} />

{#if menu}
  <Menu {partie} fermer={() => (menu = false)} {deconnecter} />
{/if}

<div class="messages" aria-live="polite">
  {#each partie.messages as m (m.id)}
    <div class="message" class:erreur={m.type === 'erreur'}>{m.texte}</div>
  {/each}
</div>

<style>
  .jeu { max-width: 720px; margin: 0 auto; padding-bottom: 5.5rem; }
  .entete {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--fond);
    padding: 0.6rem 0.75rem 0.4rem;
    border-bottom: 2px solid var(--bord);
  }
  .titre h1 { margin: 0; }
  .ressources { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; margin: 0.5rem 0 0.3rem; }
  .ressources div { background: var(--fond-2); border: 2px solid var(--bord); border-radius: var(--rayon); padding: 0.3rem 0.45rem; }
  dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--encre-douce); }
  dd { margin: 0; font-weight: 700; font-variant-numeric: tabular-nums; }
  dd.taux { font-weight: 400; font-size: 0.75rem; color: var(--encre-douce); }
  .secondaires { gap: 0.9rem; }
  .alerte { color: var(--alerte); font-weight: 600; }
  .local { background: var(--or); color: #fff; padding: 0 0.4rem; border-radius: 3px; }
  main { padding: 0.75rem; }
  .onglets {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    background: var(--fond-2);
    border-top: 2px solid var(--bord);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 20;
  }
  .onglets button {
    position: relative;
    background: transparent;
    color: var(--encre-douce);
    border: none;
    border-radius: 0;
    box-shadow: none;
    display: grid;
    justify-items: center;
    gap: 0.05rem;
    padding: 0.35rem 0.1rem;
    font-size: 0.75rem;
    min-height: 56px;
  }
  .onglets button.actif { color: var(--accent); background: var(--accent-clair); }
  .icone { font-size: 1.25rem; line-height: 1; }
  .pastille {
    position: absolute;
    top: 4px;
    right: calc(50% - 1.4rem);
    background: var(--alerte);
    color: #fff;
    border-radius: 999px;
    font-size: 0.7rem;
    min-width: 1.1rem;
    padding: 0 0.25rem;
  }
  .messages { position: fixed; bottom: 4.8rem; left: 0; right: 0; display: grid; justify-items: center; gap: 0.3rem; z-index: 60; pointer-events: none; }
  .message { background: var(--encre); color: var(--fond); padding: 0.5rem 0.9rem; border-radius: var(--rayon); max-width: 90vw; }
  .message.erreur { background: var(--alerte); color: #fff; }
  @media (min-width: 720px) {
    .onglets { max-width: 720px; margin: 0 auto; border-left: 2px solid var(--bord); border-right: 2px solid var(--bord); }
  }
</style>
