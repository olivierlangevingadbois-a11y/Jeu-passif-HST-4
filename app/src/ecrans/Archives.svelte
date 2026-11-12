<script lang="ts">
  import type { Partie } from '../lib/partie.svelte.ts';
  import { jeu } from '../lib/donnees.ts';
  import { chargesDisponibles, choisirQuestion, melanger, ordreChronologique, prochaineCharge } from '@jeu/archives.ts';
  import type { Question } from '@jeu/contenu.ts';
  import { calculerModificateurs } from '@jeu/economie.ts';
  import { duree } from '../lib/format.ts';
  import { RECOMPENSES, TYPES_QUESTION } from '../lib/textes.ts';

  let { partie }: { partie: Partie } = $props();

  let etat = $derived(partie.affiche!);
  let charges = $derived(chargesDisponibles(etat, jeu, partie.maintenant));
  let prochaine = $derived(prochaineCharge(etat, jeu, partie.maintenant));
  let bonus = $derived(1 + calculerModificateurs(etat, jeu, partie.maintenant).archivesBonus);
  let max = jeu.balance.archives.maxCharges;
  const R = jeu.balance.archives.rewards;

  let question = $state<Question | null>(null);
  /** Choix mélangés : index dans le fichier. */
  let ordreChoix = $state<number[]>([]);
  let indices = $state(1);
  let choix = $state<number | null>(null);
  let sequence = $state<number[]>([]);
  let ordreEvenements = $state<number[]>([]);
  let envoi = $state(false);
  let resultat = $state<{ correct: boolean } | null>(null);
  let derniers: string[] = [];

  function ouvrir() {
    const q = choisirQuestion(etat, jeu, partie.contexte, Math.random, derniers);
    if (!q) return;
    derniers = [q.id, ...derniers].slice(0, 3);
    question = q;
    resultat = null;
    choix = null;
    sequence = [];
    indices = 1;
    if (q.type === 'chronologie') ordreEvenements = melanger(q.events.map((_, i) => i), Math.random);
    else ordreChoix = melanger(q.choices.map((_, i) => i), Math.random);
  }

  async function repondre() {
    if (!question) return;
    const reponse = question.type === 'chronologie' ? sequence : choix;
    if (reponse === null) return;
    envoi = true;
    const r = await partie.agirServeur({ type: 'archives_repondre', questionId: question.id, reponse });
    envoi = false;
    const ev = r?.evenements.find((e) => e.type === 'archives_resultat' && e.questionId === question!.id);
    if (ev && ev.type === 'archives_resultat') {
      resultat = { correct: ev.correct };
    }
  }

  async function recompense(c: 'boost' | 'heritage' | 'fragments') {
    envoi = true;
    const r = await partie.agirServeur({ type: 'archives_recompense', choix: c });
    envoi = false;
    const ev = r?.evenements.find((e) => e.type === 'archives_recompense');
    if (ev && ev.type === 'archives_recompense') {
      partie.message(
        `${RECOMPENSES[c].titre} obtenu${ev.paquetBonus ? ' et un paquet d\'archives en prime !' : ' !'}`,
      );
      question = null;
      resultat = null;
    }
  }

  function toucherEvenement(i: number) {
    if (resultat) return;
    if (sequence.includes(i)) sequence = sequence.filter((x) => x !== i);
    else sequence = [...sequence, i];
  }

  let pret = $derived(
    question ? (question.type === 'chronologie' ? sequence.length === question.events.length : choix !== null) : false,
  );
</script>

<section class="pile">
  <div class="carte-ui">
    <div class="ligne espace">
      <h2>Les Archives</h2>
      <span class="charges" aria-label="{charges} charges sur {max}">
        {#each Array(max) as _, i (i)}<span class:pleine={i < charges}>●</span>{/each}
      </span>
    </div>
    <p class="petit-texte doux">
      Réponds à des questions pour gagner un bonus. Une erreur ne fait rien perdre : chaque réponse vient avec une explication.
      {#if prochaine}Prochaine charge dans {duree((prochaine - partie.maintenant) / 1000)}.{/if}
    </p>
    {#if partie.contexte.modeRevision}<p class="petit-texte"><strong>Mode révision :</strong> questions de toutes les époques.</p>{/if}
  </div>

  {#if etat.archives.enAttente && !question}
    <div class="carte-ui">
      <h3>Choisis ta récompense</h3>
      <div class="pile">
        <button disabled={envoi} onclick={() => recompense('boost')}>{RECOMPENSES.boost.titre} : {RECOMPENSES.boost.description(Math.round(R.boost.minutes * bonus))}</button>
        <button disabled={envoi} onclick={() => recompense('heritage')}>{RECOMPENSES.heritage.titre} : {RECOMPENSES.heritage.description(Math.round(R.heritage * bonus * 10) / 10)}</button>
        <button disabled={envoi} onclick={() => recompense('fragments')}>{RECOMPENSES.fragments.titre} : {RECOMPENSES.fragments.description(Math.max(1, Math.round(R.fragments * bonus)))}</button>
      </div>
    </div>
  {:else if !question}
    <button class="grand" disabled={charges < 1} onclick={ouvrir}>
      {charges < 1 ? 'Plus de charges pour l\'instant' : 'Ouvrir un document'}
    </button>
  {/if}

  {#if question}
    {@const q = question}
    <article class="carte-ui pile">
      <div class="ligne espace">
        <span class="petit-texte doux">{TYPES_QUESTION[q.type]} · {jeu.eras.get(q.era)?.name ?? q.era}</span>
        {#if !q.validated}<span class="brouillon">Brouillon</span>{/if}
      </div>

      {#if q.type === 'quisuisje'}
        <ol class="indices">
          {#each q.clues.slice(0, indices) as indice, i (i)}<li>{indice}</li>{/each}
        </ol>
        {#if indices < q.clues.length && !resultat}
          <button class="secondaire petit" onclick={() => indices++}>Indice suivant</button>
        {/if}
      {:else}
        <p class="enonce">{q.prompt}</p>
      {/if}

      {#if q.type === 'chronologie'}
        <p class="petit-texte doux">Touche les événements du plus ancien au plus récent. Touche à nouveau pour retirer.</p>
        <div class="pile">
          {#each ordreEvenements as i (i)}
            {@const rang = sequence.indexOf(i)}
            <button class="choix" class:secondaire={rang < 0} onclick={() => toucherEvenement(i)} disabled={!!resultat}>
              <span class="rang">{rang >= 0 ? rang + 1 : ''}</span> {q.events[i].text}
            </button>
          {/each}
        </div>
      {:else}
        <div class="pile">
          {#each ordreChoix as i (i)}
            <button
              class="choix"
              class:secondaire={choix !== i}
              class:bon={resultat && i === q.answerIndex}
              class:mauvais={resultat && !resultat.correct && i === choix}
              onclick={() => (choix = i)}
              disabled={!!resultat}
            >{q.choices[i]}</button>
          {/each}
        </div>
      {/if}

      {#if !resultat}
        <button disabled={!pret || envoi} onclick={repondre}>{envoi ? 'Envoi…' : 'Valider'}</button>
      {:else}
        <div class="resultat" class:correct={resultat.correct}>
          <h3>{resultat.correct ? 'Bonne réponse !' : 'Pas tout à fait.'}</h3>
          {#if q.type === 'chronologie'}
            <ol>
              {#each ordreChronologique(q) as i (i)}<li>{q.events[i].year} : {q.events[i].text}</li>{/each}
            </ol>
          {/if}
          {#if q.type !== 'chronologie' && !resultat.correct}
            <p>La bonne réponse : <strong>{q.choices[q.answerIndex]}</strong></p>
          {/if}
          <p>{q.explanation}</p>
        </div>
        <button onclick={() => (question = null)}>{resultat.correct ? 'Choisir ma récompense' : 'Continuer'}</button>
      {/if}
    </article>
  {/if}
</section>

<style>
  .charges { font-size: 1.3rem; letter-spacing: 0.15rem; color: var(--bord); }
  .charges .pleine { color: var(--or); }
  .grand { width: 100%; min-height: 64px; font-size: 1.1rem; }
  .enonce { font-weight: 600; font-size: 1.05rem; }
  .indices { padding-left: 1.2rem; margin: 0; }
  .indices li { margin-bottom: 0.3rem; font-weight: 600; }
  .choix { width: 100%; text-align: left; font-weight: 500; }
  .choix.bon { background: var(--accent); color: var(--accent-texte); opacity: 1; }
  .choix.mauvais { background: var(--alerte); border-color: var(--alerte); color: #fff; opacity: 1; }
  .rang { display: inline-block; min-width: 1.4rem; font-weight: 800; }
  .resultat { border-left: 4px solid var(--alerte); padding-left: 0.7rem; }
  .resultat.correct { border-color: var(--accent); }
  .resultat ol { padding-left: 1.2rem; }
</style>
