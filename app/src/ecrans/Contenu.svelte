<script lang="ts">
  // Aperçu lisible du contenu historique, pour la relecture et la validation par l'enseignant.
  // La validation elle-même se fait dans content/*.json (champ validated).
  import { jeu } from '../lib/donnees.ts';
  import { ordreChronologique } from '@jeu/archives.ts';
  import { RARETES, TYPES_CARTE, TYPES_QUESTION } from '../lib/textes.ts';
  import type { Validable } from '@jeu/contenu.ts';

  type Section = 'questions' | 'buildings' | 'cards' | 'crises' | 'eras';
  let section = $state<Section>('questions');
  let brouillonsSeulement = $state(false);

  const c = jeu.contenu;
  const SECTIONS: [Section, string, Validable[]][] = [
    ['questions', 'Questions', c.questions],
    ['buildings', 'Bâtiments', c.buildings],
    ['cards', 'Cartes', c.cards],
    ['crises', 'Crises', c.crises],
    ['eras', 'Époques', c.eras],
  ];
  const nb = (l: Validable[]) => l.filter((e) => !e.validated).length;
  const filtrer = <T extends Validable>(l: T[]) =>
    [...l].filter((e) => !brouillonsSeulement || !e.validated).sort((a, b) => Number(a.validated) - Number(b.validated));
  const nomEra = (id: string) => jeu.eras.get(id as never)?.name ?? id;
</script>

<div class="page pile">
  <header class="ligne espace">
    <h1>Contenu historique</h1>
    <a href="#/enseignant">Espace enseignant</a>
  </header>
  <p class="petit-texte doux">
    {#if jeu.brouillons}
      Version d'essai : les brouillons (non validés) sont affichés en premier. Pour valider une entrée, mets <code>"validated": true</code> et <code>"teacherNote": null</code> dans le fichier <code>content/</code> correspondant.
    {:else}
      Version élèves : seul le contenu validé est inclus. Les brouillons sont visibles dans la version d'essai (/test/).
    {/if}
  </p>

  <nav class="ligne" aria-label="Sections du contenu">
    {#each SECTIONS as [id, nom, liste] (id)}
      <button class="petit" class:secondaire={section !== id} onclick={() => (section = id)}>
        {nom} ({liste.length}){#if nb(liste)} · {nb(liste)} brouillon{nb(liste) > 1 ? 's' : ''}{/if}
      </button>
    {/each}
    <label class="case"><input type="checkbox" bind:checked={brouillonsSeulement} /> Brouillons seulement</label>
  </nav>

  {#if section === 'questions'}
    {#each filtrer(c.questions) as q (q.id)}
      <article class="carte-ui entree" class:brouillon-entree={!q.validated}>
        <div class="ligne espace"><code>{q.id}</code><span class="petit-texte doux">{TYPES_QUESTION[q.type]} · {nomEra(q.era)} · {q.concept}</span></div>
        {#if q.teacherNote}<p class="note"><strong>À vérifier :</strong> {q.teacherNote}</p>{/if}
        {#if q.type === 'quisuisje'}
          <ol>{#each q.clues as indice, i (i)}<li>{indice}</li>{/each}</ol>
        {:else}
          <p><strong>{q.prompt}</strong></p>
        {/if}
        {#if q.type === 'chronologie'}
          <ol>{#each ordreChronologique(q) as i (i)}<li>{q.events[i].year} : {q.events[i].text}</li>{/each}</ol>
        {:else}
          <ul>{#each q.choices as choix, i (i)}<li class:bonne={i === q.answerIndex}>{i === q.answerIndex ? '✓ ' : ''}{choix}</li>{/each}</ul>
        {/if}
        <p class="petit-texte"><em>Explication :</em> {q.explanation}</p>
      </article>
    {/each}
  {:else if section === 'buildings'}
    {#each filtrer(c.buildings) as b (b.id)}
      <article class="carte-ui entree" class:brouillon-entree={!b.validated}>
        <div class="ligne espace"><strong>{b.name}{b.monument ? ' ★' : ''}</strong><span class="petit-texte doux">{nomEra(b.era)} · <code>{b.id}</code></span></div>
        {#if b.teacherNote}<p class="note"><strong>À vérifier :</strong> {b.teacherNote}</p>{/if}
        <p>{b.description}</p>
        {#each b.upgrades as u (u.id)}<p class="petit-texte"><strong>{u.name} :</strong> {u.note}</p>{/each}
      </article>
    {/each}
  {:else if section === 'cards'}
    {#each filtrer(c.cards) as k (k.id)}
      <article class="carte-ui entree" class:brouillon-entree={!k.validated}>
        <div class="ligne espace"><strong>{k.name}</strong><span class="petit-texte doux">{RARETES[k.rarity]} · {TYPES_CARTE[k.type]} · {nomEra(k.era)}</span></div>
        {#if k.teacherNote}<p class="note"><strong>À vérifier :</strong> {k.teacherNote}</p>{/if}
        <p>{k.bio}</p>
        <p class="petit-texte">Effet : {k.effectText}{k.synergy ? ` · Synergie : ${k.synergy.text}` : ''}</p>
        {#if k.source}<p class="petit-texte doux">Source : {k.source}</p>{/if}
      </article>
    {/each}
  {:else if section === 'crises'}
    {#each filtrer(c.crises) as k (k.id)}
      <article class="carte-ui entree" class:brouillon-entree={!k.validated}>
        <div class="ligne espace"><strong>{k.name}{k.year ? ` (${k.year})` : ''}</strong><span class="petit-texte doux">{nomEra(k.era)} · {k.scope}</span></div>
        {#if k.teacherNote}<p class="note"><strong>À vérifier :</strong> {k.teacherNote}</p>{/if}
        <p>{k.description}</p>
        <p class="petit-texte"><em>Ce qui s'est vraiment passé :</em> {k.aftermath}</p>
      </article>
    {/each}
  {:else}
    {#each filtrer(c.eras) as e (e.id)}
      <article class="carte-ui entree" class:brouillon-entree={!e.validated}>
        <div class="ligne espace"><strong>{e.name}</strong><span class="petit-texte doux">{e.programTitle}</span></div>
        {#if e.teacherNote}<p class="note"><strong>À vérifier :</strong> {e.teacherNote}</p>{/if}
        <p>{e.intro}</p>
        <p class="petit-texte"><strong>Jalon : {e.milestone.name} ({e.milestone.year}).</strong> {e.milestone.eventText}</p>
        <ul class="petit-texte">{#each e.recensementFacts as f (f.id)}<li>{f.text}</li>{/each}</ul>
      </article>
    {/each}
  {/if}
</div>

<style>
  .page { max-width: 900px; margin: 0 auto; padding: 1rem; }
  .entree { display: grid; gap: 0.3rem; }
  .entree p, .entree ul, .entree ol { margin: 0; }
  .brouillon-entree { border-color: var(--or); border-style: dashed; }
  .note { background: color-mix(in srgb, var(--or) 15%, transparent); padding: 0.4rem 0.6rem; border-radius: 4px; }
  .bonne { font-weight: 700; color: var(--accent); }
  ul, ol { padding-left: 1.2rem; }
  .case { display: inline-flex; gap: 0.3rem; align-items: center; font-weight: 400; margin: 0; }
  .case input { width: auto; min-height: 0; }
  a { color: var(--accent); font-weight: 600; }
</style>
