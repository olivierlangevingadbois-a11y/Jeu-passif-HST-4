<script lang="ts">
  import { onMount } from 'svelte';
  import type { Backend } from '../lib/backend/types.ts';
  import { connexionEleve, creerBackendDistant, sessionExistante } from '../lib/backend/distant.ts';
  import { NOM_JEU } from '../lib/textes.ts';

  let { demarrer, erreur, sessionExpiree }: { demarrer: (b: Backend) => Promise<void>; erreur: string | null; sessionExpiree: boolean } = $props();

  const CLE_CODE = 'paroisse-dernier-code';
  let code = $state(lireCode());
  let pseudonyme = $state('');
  let nip = $state('');
  let envoi = $state(false);
  let message = $state<string | null>(null);
  let verification = $state(true);

  function lireCode(): string {
    try {
      return localStorage.getItem(CLE_CODE) ?? '';
    } catch {
      return '';
    }
  }

  onMount(async () => {
    if (!sessionExpiree && (await sessionExistante())) await demarrer(creerBackendDistant());
    verification = false;
  });

  async function connecter(e: SubmitEvent) {
    e.preventDefault();
    envoi = true;
    message = null;
    try {
      await connexionEleve(code, pseudonyme, nip);
      try {
        localStorage.setItem(CLE_CODE, code.trim().toUpperCase());
      } catch {
        // rien
      }
      nip = '';
      await demarrer(creerBackendDistant());
    } catch (err) {
      message = (err as Error).message;
    } finally {
      envoi = false;
    }
  }
</script>

<section class="connexion pile">
  <div class="logo pixel" aria-hidden="true">
    <svg viewBox="0 0 16 16"><rect width="16" height="16" fill="#2f4f3a" /><rect x="7" y="1" width="2" height="4" fill="#f4e9d0" /><rect x="6" y="2" width="4" height="1" fill="#f4e9d0" /><rect x="4" y="6" width="8" height="2" fill="#b5503c" /><rect x="5" y="8" width="6" height="6" fill="#f4e9d0" /><rect x="7" y="10" width="2" height="4" fill="#6b4a2f" /><rect x="0" y="14" width="16" height="2" fill="#3b6ea5" /></svg>
  </div>
  <h1>{NOM_JEU}</h1>

  {#if verification}
    <p class="doux">Chargement…</p>
  {:else}
    {#if sessionExpiree}<p class="avis">Ta session a expiré. Reconnecte-toi.</p>{/if}
    {#if erreur}<p class="avis">{erreur}</p>{/if}
    <form class="carte-ui" onsubmit={connecter}>
      <label for="code">Code de classe</label>
      <input id="code" bind:value={code} autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="10" required placeholder="Ex. : K7P4QM" />
      <label for="pseudo">Pseudonyme</label>
      <input id="pseudo" bind:value={pseudonyme} autocomplete="username" spellcheck="false" maxlength="30" required />
      <label for="nip">NIP</label>
      <input id="nip" bind:value={nip} type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="current-password" maxlength="6" required />
      {#if message}<p class="avis" role="alert">{message}</p>{/if}
      <button type="submit" disabled={envoi}>{envoi ? 'Connexion…' : 'Entrer dans ma paroisse'}</button>
    </form>
    <p class="petit-texte doux">NIP oublié ? Demande à ton enseignant de le réinitialiser.</p>
    <p class="petit-texte"><a href="#/confidentialite">Confidentialité</a> · <a href="#/enseignant">Espace enseignant</a></p>
  {/if}
</section>

<style>
  .connexion { max-width: 420px; margin: 6vh auto; padding: 1rem; text-align: center; }
  .connexion form { text-align: left; }
  .connexion form button { width: 100%; margin-top: 1rem; }
  .logo { width: 72px; margin: 0 auto; }
  .avis { color: var(--alerte); font-weight: 600; }
  a { color: var(--accent); }
</style>
