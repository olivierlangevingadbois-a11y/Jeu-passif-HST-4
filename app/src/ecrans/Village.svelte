<script lang="ts">
  import type { Partie } from '../lib/partie.svelte.ts';
  import { jeu } from '../lib/donnees.ts';
  import { eraSuivante } from '@jeu/donnees.ts';
  import { eraOuverte } from '@jeu/actions.ts';
  import {
    batimentsDisponibles,
    calculerModificateurs,
    calculerTaux,
    coutNiveau,
    estDebloque,
    heritageAuPassage,
    multiplicateurRecensement,
    prochainPalier,
  } from '@jeu/economie.ts';
  import type { Building } from '@jeu/contenu.ts';
  import { nombre, parSeconde, pourcentage, multiplicateur } from '../lib/format.ts';
  import SceneVillage from '../composants/SceneVillage.svelte';
  import Crise from '../composants/Crise.svelte';
  import Modale from '../composants/Modale.svelte';

  let { partie }: { partie: Partie } = $props();

  let etat = $derived(partie.affiche!);
  let mods = $derived(calculerModificateurs(etat, jeu, partie.maintenant));
  let taux = $derived(calculerTaux(etat, jeu, mods));
  let batiments = $derived(batimentsDisponibles(etat, jeu));
  let eb = $derived(jeu.balance.eras[etat.era]!);
  let era = $derived(jeu.eras.get(etat.era)!);
  let suivante = $derived(eraSuivante(jeu, etat.era));

  let quantite = $state<1 | 10 | 'max'>(1);
  let ouvert = $state<string | null>(null);
  let confirmer = $state<'recensement' | 'passage' | null>(null);

  function combien(b: Building): { n: number; cout: number } {
    const niv = etat.partie.buildings[b.id] ?? 0;
    let total = 0;
    if (quantite !== 'max') {
      for (let i = 0; i < quantite; i++) total += coutNiveau(jeu, b.id, niv + i);
      return { n: quantite, cout: total };
    }
    let n = 0;
    while (n < 100) {
      const c = coutNiveau(jeu, b.id, niv + n);
      if (total + c > etat.partie.argent) break;
      total += c;
      n++;
    }
    if (n === 0) return { n: 1, cout: coutNiveau(jeu, b.id, niv) };
    return { n, cout: total };
  }

  function effet(b: Building): string {
    const bb = jeu.balance.buildings[b.id];
    const niv = etat.partie.buildings[b.id] ?? 0;
    const m = mods.batiment[b.id] ?? 1;
    switch (b.effect.kind) {
      case 'produce': {
        const actuel = taux.parBatiment[b.id] ?? 0;
        const unite = b.effect.target === 'habitants' ? 'habitants' : b.effect.target === 'production' ? 'production' : 'argent';
        return niv > 0 ? `${parSeconde(actuel)} ${unite}` : `Produit : ${unite}`;
      }
      case 'cap':
        return `+${nombre(niv * (bb.capPerLevel ?? 0) * m)} places pour les habitants`;
      case 'multiplier':
        return `+${pourcentage(niv * (bb.multiplierPerLevel ?? 0) * m)} ${b.effect.target === 'argent' ? "d'argent" : b.effect.target === 'production' ? 'de production' : ''}`;
      case 'archives_bonus':
        return `+${pourcentage(niv * (bb.archivesBonusPerLevel ?? 0) * m)} aux récompenses des Archives`;
      case 'heritage_gain':
        return `+${pourcentage(niv * (bb.heritageBonusPerLevel ?? 0) * m)} d'Héritage`;
      default:
        return '';
    }
  }

  function construire(b: Building) {
    const { n } = combien(b);
    partie.agir({ type: 'construire', batiment: b.id, quantite: n });
  }

  let progresH = $derived(Math.min(1, etat.partie.habitants / eb.milestone.habitants));
  let progresP = $derived(Math.min(1, etat.epoque.productionTotal / eb.milestone.productionTotal));
  let jalon = $derived(etat.epoque.jalonAtteintLe !== null);
  let peutRecenser = $derived(etat.partie.habitants >= eb.recensement.minHabitants);
  let multApres = $derived(multiplicateurRecensement(jeu, etat.epoque.habitantsRecenses + Math.floor(etat.partie.habitants)));
  let heritage = $derived(heritageAuPassage(etat, jeu, mods));
  let ouverte = $derived(suivante ? eraOuverte(partie.contexte, suivante) : false);
</script>

<section class="pile">
  <div class="carte-ui">
    <div class="ligne espace">
      <h2>{era.name}</h2>
      {#if !era.validated}<span class="brouillon">Brouillon</span>{/if}
    </div>
    <p class="petit-texte doux">Jalon : {era.milestone.name} ({era.milestone.year})</p>
    <div class="jalon">
      <span class="petit-texte">Habitants {nombre(etat.partie.habitants)} / {nombre(eb.milestone.habitants)}</span>
      <div class="barre" role="progressbar" aria-valuenow={Math.round(progresH * 100)} aria-valuemin="0" aria-valuemax="100" aria-label="Habitants pour le jalon"><span style="width: {progresH * 100}%"></span></div>
      <span class="petit-texte">Production de l'époque {nombre(etat.epoque.productionTotal)} / {nombre(eb.milestone.productionTotal)}</span>
      <div class="barre" role="progressbar" aria-valuenow={Math.round(progresP * 100)} aria-valuemin="0" aria-valuemax="100" aria-label="Production pour le jalon"><span style="width: {progresP * 100}%"></span></div>
    </div>
    {#if etat.epoque.recensements > 0}
      <p class="petit-texte doux">Recensements : {etat.epoque.recensements} · production {multiplicateur(mods.recensement)}</p>
    {/if}
    {#if mods.boost > 1}
      <p class="petit-texte"><strong>Élan des Archives : production {multiplicateur(mods.boost)}</strong></p>
    {/if}
  </div>

  {#if jalon}
    <div class="carte-ui jalon-atteint">
      <h3>Jalon atteint : {era.milestone.name}</h3>
      {#if !suivante}
        <p>Bravo ! La prochaine époque arrive bientôt dans le jeu. Ta paroisse continue de produire en attendant.</p>
      {:else if !ouverte}
        <p>Ton enseignant ouvrira bientôt la prochaine époque. En attendant, ta production continue d'augmenter ton Héritage.</p>
        <p class="petit-texte doux">Héritage prévu : {nombre(heritage)}</p>
      {:else}
        <p>Tu peux passer à la prochaine époque et gagner <strong>{nombre(heritage)} Héritage</strong>.</p>
        <button onclick={() => (confirmer = 'passage')}>Passer à l'époque suivante</button>
      {/if}
    </div>
  {/if}

  <Crise {partie} />

  <SceneVillage {etat} />

  <div class="ligne espace">
    <h2>Bâtiments</h2>
    <div class="ligne quantite" role="group" aria-label="Quantité à acheter">
      {#each [1, 10, 'max'] as q (q)}
        <button class="petit" class:secondaire={quantite !== q} onclick={() => (quantite = q as 1 | 10 | 'max')}>
          {q === 'max' ? 'Max' : `×${q}`}
        </button>
      {/each}
    </div>
  </div>

  {#each batiments as b (b.id)}
    {@const niv = etat.partie.buildings[b.id] ?? 0}
    {@const debloque = estDebloque(etat, jeu, b.id)}
    {@const achat = combien(b)}
    <article class="carte-ui batiment" class:verrouille={!debloque}>
      <div class="ligne espace">
        <button class="nom secondaire petit" onclick={() => (ouvert = ouvert === b.id ? null : b.id)} aria-expanded={ouvert === b.id}>
          {b.name}{#if b.monument} ★{/if}
        </button>
        <span class="doux">Niv. {niv}</span>
      </div>
      {#if !b.validated}<span class="brouillon">Brouillon</span>{/if}
      {#if debloque}
        <p class="petit-texte">{effet(b)}</p>
        {#if b.effect.kind === 'produce' && prochainPalier(jeu, niv) !== null}
          <p class="petit-texte doux">Prochain palier : niveau {prochainPalier(jeu, niv)} (production ×{jeu.balance.paliers.multiplicateur})</p>
        {/if}
        <button disabled={etat.partie.argent < achat.cout} onclick={() => construire(b)}>
          {niv === 0 ? 'Construire' : 'Agrandir'}{achat.n > 1 ? ` ×${achat.n}` : ''} : {nombre(achat.cout)} argent
        </button>
      {:else}
        <p class="petit-texte doux">Débloqué à {nombre(jeu.balance.buildings[b.id].unlockHabitants)} habitants</p>
      {/if}
      {#if ouvert === b.id}
        <div class="details">
          <p>{b.description}</p>
          {#each b.upgrades as u (u.id)}
            {@const ub = jeu.balance.upgrades[u.id]}
            {@const achete = etat.partie.upgrades.includes(u.id)}
            <div class="amelioration">
              <strong>{u.name}</strong>
              {#if achete}
                <p class="petit-texte">✓ {u.note}</p>
              {:else if ub}
                <p class="petit-texte doux">Effet ×{ub.multiplier}. Demande le niveau {ub.requiresLevel}.</p>
                <button class="petit" disabled={niv < ub.requiresLevel || etat.partie.argent < ub.cost} onclick={() => partie.agir({ type: 'ameliorer', amelioration: u.id })}>
                  Acheter : {nombre(ub.cost)} argent
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </article>
  {/each}

  <div class="carte-ui">
    <h3>Recensement</h3>
    <p class="petit-texte">
      Remet le village à zéro, mais ta production sera multipliée par {multiplicateur(multApres)} (au lieu de {multiplicateur(mods.recensement)}).
      La production de l'époque, tes cartes et ton Héritage sont conservés.
    </p>
    <button class="secondaire" disabled={!peutRecenser} onclick={() => (confirmer = 'recensement')}>
      {peutRecenser ? 'Faire un recensement' : `Il faut ${nombre(eb.recensement.minHabitants)} habitants`}
    </button>
  </div>
</section>

{#if confirmer === 'recensement'}
  <Modale titre="Faire un recensement ?" fermer={() => (confirmer = null)}>
    <p>Tes {nombre(Math.floor(etat.partie.habitants))} habitants seront comptés. Tes bâtiments et ton argent repartent à zéro, mais ta production passe à {multiplicateur(multApres)}.</p>
    <div class="ligne">
      <button onclick={() => { partie.agir({ type: 'recensement' }); confirmer = null; }}>Recenser</button>
      <button class="secondaire" onclick={() => (confirmer = null)}>Annuler</button>
    </div>
  </Modale>
{/if}

{#if confirmer === 'passage' && suivante}
  <Modale titre="Passer à l'époque suivante ?" fermer={() => (confirmer = null)}>
    <p>Tu gagneras {nombre(heritage)} Héritage et un paquet d'archives gratuit. Ton monument, tes cartes et le nom de ta ville sont conservés. Le reste repart à zéro dans la nouvelle époque.</p>
    <div class="ligne">
      <button onclick={() => { partie.agir({ type: 'passage' }); confirmer = null; }}>C'est parti !</button>
      <button class="secondaire" onclick={() => (confirmer = null)}>Plus tard</button>
    </div>
  </Modale>
{/if}

<style>
  .jalon { display: grid; gap: 0.25rem; margin-bottom: 0.4rem; }
  .jalon-atteint { border-color: var(--or); }
  .batiment.verrouille { opacity: 0.7; }
  .batiment .nom { border: none; box-shadow: none; padding: 0; min-height: 0; font-size: 1.05rem; text-align: left; text-decoration: underline dotted; }
  .batiment > button:last-of-type { width: 100%; }
  .details { margin-top: 0.6rem; border-top: 1px dashed var(--bord); padding-top: 0.6rem; }
  .amelioration { margin-top: 0.5rem; }
  .quantite button { min-width: 3rem; }
</style>
