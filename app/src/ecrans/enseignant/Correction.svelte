<script lang="ts">
  // Correction de la partie d'un élève (bogue, exploit, nom de ville). Chaque correction est journalisée avec sa raison.
  import { admin, partieComplete, type Eleve } from '../../lib/enseignant.ts';
  import type { EtatJeu } from '@jeu/etat.ts';
  import { onMount } from 'svelte';

  let { eleve, fini }: { eleve: Eleve; fini: (message: string) => void } = $props();

  let etat = $state<EtatJeu | null>(null);
  let valeurs = $state({ townName: '', heritage: 0, voix: 0, fragments: 0, paquetsGratuits: 0 });
  let raison = $state('');
  let erreur = $state<string | null>(null);
  let envoi = $state(false);
  let voirTout = $state(false);

  onMount(async () => {
    etat = (await partieComplete(eleve.id)) as EtatJeu | null;
    if (etat) {
      valeurs = {
        townName: etat.townName ?? '',
        heritage: Math.floor(etat.heritage),
        voix: etat.portefeuille.voix,
        fragments: etat.portefeuille.fragments,
        paquetsGratuits: etat.portefeuille.paquetsGratuits,
      };
    }
  });

  function modifications(): Record<string, unknown> {
    if (!etat) return {};
    const m: Record<string, unknown> = {};
    if ((etat.townName ?? '') !== valeurs.townName) m.townName = valeurs.townName || null;
    if (Math.floor(etat.heritage) !== valeurs.heritage) m.heritage = valeurs.heritage;
    if (etat.portefeuille.voix !== valeurs.voix) m.voix = valeurs.voix;
    if (etat.portefeuille.fragments !== valeurs.fragments) m.fragments = valeurs.fragments;
    if (etat.portefeuille.paquetsGratuits !== valeurs.paquetsGratuits) m.paquetsGratuits = valeurs.paquetsGratuits;
    return m;
  }

  async function enregistrer(e: SubmitEvent) {
    e.preventDefault();
    const m = modifications();
    if (!Object.keys(m).length) {
      erreur = 'Aucune modification.';
      return;
    }
    envoi = true;
    erreur = null;
    try {
      await admin('corriger', { eleveId: eleve.id, modifications: m, raison });
      fini('Correction enregistrée au journal.');
    } catch (err) {
      erreur = (err as Error).message;
    } finally {
      envoi = false;
    }
  }

  async function reinitialiser() {
    if (!raison.trim()) {
      erreur = 'Indique d\'abord la raison.';
      return;
    }
    if (!confirm(`Remettre la partie de ${eleve.pseudonym} au tout début ? Le nom de la ville est gardé.`)) return;
    envoi = true;
    try {
      await admin('reinitialiser_partie', { eleveId: eleve.id, raison });
      fini('Partie réinitialisée.');
    } catch (err) {
      erreur = (err as Error).message;
    } finally {
      envoi = false;
    }
  }
</script>

{#if !etat}
  <p>Cet élève n'a pas encore joué.</p>
{:else}
  <form class="pile" onsubmit={enregistrer}>
    <p class="petit-texte doux">À utiliser pour corriger un bogue, un exploit ou un nom de ville inapproprié. Les Voix ne sont jamais retirées comme sanction.</p>
    <label for="c-ville">Nom de la ville</label>
    <input id="c-ville" bind:value={valeurs.townName} maxlength="30" />
    <div class="grille">
      <div><label for="c-her">Héritage</label><input id="c-her" type="number" min="0" bind:value={valeurs.heritage} /></div>
      <div><label for="c-voix">Voix</label><input id="c-voix" type="number" min="0" bind:value={valeurs.voix} /></div>
      <div><label for="c-frag">Fragments</label><input id="c-frag" type="number" min="0" bind:value={valeurs.fragments} /></div>
      <div><label for="c-paq">Paquets gratuits</label><input id="c-paq" type="number" min="0" bind:value={valeurs.paquetsGratuits} /></div>
    </div>
    <label for="c-raison">Raison (obligatoire, inscrite au journal)</label>
    <input id="c-raison" bind:value={raison} maxlength="120" required placeholder="Ex. : bogue d'affichage corrigé" />
    {#if erreur}<p class="avis">{erreur}</p>{/if}
    <div class="ligne">
      <button type="submit" disabled={envoi || !raison.trim()}>Enregistrer la correction</button>
      <button type="button" class="danger" disabled={envoi} onclick={reinitialiser}>Recommencer sa partie</button>
    </div>
    <button type="button" class="secondaire petit" onclick={() => (voirTout = !voirTout)}>{voirTout ? 'Masquer' : 'Voir'} la sauvegarde complète</button>
    {#if voirTout}<pre>{JSON.stringify(etat, null, 2)}</pre>{/if}
  </form>
{/if}

<style>
  .grille { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  pre { max-height: 300px; overflow: auto; font-size: 0.75rem; background: var(--fond); padding: 0.5rem; }
  .avis { color: var(--alerte); font-weight: 600; }
</style>
