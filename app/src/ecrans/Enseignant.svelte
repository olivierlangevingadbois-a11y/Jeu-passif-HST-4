<script lang="ts">
  import { onMount } from 'svelte';
  import { MODE_LOCAL } from '../lib/config.ts';
  import { admin, connexionEnseignant, deconnexion, estEnseignant, groupes, type Groupe } from '../lib/enseignant.ts';
  import GroupeVue from './enseignant/GroupeVue.svelte';

  let etat = $state<'chargement' | 'connexion' | 'pas-enseignant' | 'pret'>('chargement');
  let courriel = $state('');
  let motDePasse = $state('');
  let message = $state<string | null>(null);
  let liste = $state<Groupe[]>([]);
  let choisi = $state<string | null>(null);
  let nouveauNom = $state('');
  let envoi = $state(false);

  onMount(async () => {
    if (MODE_LOCAL) return;
    await verifier();
  });

  async function verifier() {
    try {
      if (await estEnseignant()) {
        etat = 'pret';
        await recharger();
      } else etat = 'connexion';
    } catch {
      etat = 'connexion';
    }
  }

  async function recharger() {
    liste = await groupes();
    if (!choisi && liste.length) choisi = liste[0].id;
  }

  async function connecter(e: SubmitEvent) {
    e.preventDefault();
    message = null;
    envoi = true;
    try {
      await connexionEnseignant(courriel, motDePasse);
      motDePasse = '';
      if (await estEnseignant()) {
        etat = 'pret';
        await recharger();
      } else etat = 'pas-enseignant';
    } catch (err) {
      message = (err as Error).message;
    } finally {
      envoi = false;
    }
  }

  async function creerGroupe(e: SubmitEvent) {
    e.preventDefault();
    if (!nouveauNom.trim()) return;
    envoi = true;
    message = null;
    try {
      const g = await admin<Groupe>('creer_groupe', { nom: nouveauNom });
      nouveauNom = '';
      await recharger();
      choisi = g.id;
    } catch (err) {
      message = (err as Error).message;
    } finally {
      envoi = false;
    }
  }

  async function quitter() {
    await deconnexion();
    etat = 'connexion';
    liste = [];
    choisi = null;
  }
</script>

<div class="page">
  <header class="ligne espace">
    <h1>Espace enseignant</h1>
    <div class="ligne">
      <a href="#/contenu">Contenu historique</a>
      <a href="#/">Retour au jeu</a>
      {#if etat === 'pret'}<button class="secondaire petit" onclick={quitter}>Se déconnecter</button>{/if}
    </div>
  </header>

  {#if MODE_LOCAL}
    <div class="carte-ui">
      <p>Le tableau de bord a besoin de Supabase, qui n'est pas encore branché sur cette version du site.</p>
      <p>En attendant, le menu du jeu (☰) contient des outils de test qui simulent le tableau de bord : ouvrir une époque, donner des Voix, activer le mode révision.</p>
      <p class="petit-texte doux">Pour brancher Supabase, suis le guide <code>docs/installation-supabase.md</code> du dépôt.</p>
    </div>
  {:else if etat === 'chargement'}
    <p>Chargement…</p>
  {:else if etat === 'connexion' || etat === 'pas-enseignant'}
    <form class="carte-ui connexion" onsubmit={connecter}>
      {#if etat === 'pas-enseignant'}
        <p class="avis">Ce compte n'est pas enregistré comme enseignant. Voir l'étape « Déclarer ton compte enseignant » du guide d'installation.</p>
      {/if}
      <label for="courriel">Courriel</label>
      <input id="courriel" type="email" bind:value={courriel} autocomplete="username" required />
      <label for="mdp">Mot de passe</label>
      <input id="mdp" type="password" bind:value={motDePasse} autocomplete="current-password" required />
      {#if message}<p class="avis" role="alert">{message}</p>{/if}
      <button type="submit" disabled={envoi}>Se connecter</button>
    </form>
  {:else}
    <nav class="ligne groupes" aria-label="Groupes">
      {#each liste as g (g.id)}
        <button class="petit" class:secondaire={choisi !== g.id} onclick={() => (choisi = g.id)}>{g.name}</button>
      {/each}
      <form class="ligne" onsubmit={creerGroupe}>
        <input class="court" bind:value={nouveauNom} placeholder="Nouveau groupe (ex. : 401)" maxlength="60" aria-label="Nom du nouveau groupe" />
        <button class="petit" type="submit" disabled={envoi || !nouveauNom.trim()}>Créer</button>
      </form>
    </nav>
    {#if message}<p class="avis" role="alert">{message}</p>{/if}
    {#if liste.length === 0}
      <p>Crée ton premier groupe pour commencer.</p>
    {/if}
    {#each liste.filter((g) => g.id === choisi) as g (g.id)}
      <GroupeVue groupe={g} {recharger} />
    {/each}
  {/if}
</div>

<style>
  .page { max-width: 1000px; margin: 0 auto; padding: 1rem; }
  header { margin-bottom: 1rem; }
  .connexion { max-width: 420px; }
  .connexion button { margin-top: 1rem; width: 100%; }
  .groupes { margin-bottom: 1rem; }
  .court { width: 14rem; }
  .avis { color: var(--alerte); font-weight: 600; }
  a { color: var(--accent); font-weight: 600; }
</style>
