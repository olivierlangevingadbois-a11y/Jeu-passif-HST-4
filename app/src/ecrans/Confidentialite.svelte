<script lang="ts">
  let { retour }: { retour: () => void } = $props();
</script>

<section class="page pile">
  <h1>Confidentialité</h1>
  <p>Ce jeu a été créé par ton enseignant d'histoire pour ses cours. Il garde le moins de renseignements possible.</p>
  <h2>Ce qui est gardé</h2>
  <ul>
    <li>Ton pseudonyme, choisi par ton enseignant, et ton groupe.</li>
    <li>Ton NIP, sous une forme chiffrée (personne ne peut le relire, même pas ton enseignant).</li>
    <li>Ta progression dans le jeu : époque, bâtiments, cartes, Héritage, Voix, nom de ta ville.</li>
    <li>Tes réponses aux Archives, pour que les questions réussies reviennent moins souvent et pour que ton enseignant voie les notions à revoir en classe.</li>
    <li>La date de ta dernière connexion.</li>
  </ul>
  <h2>Ce qui n'est pas gardé</h2>
  <ul>
    <li>Aucun courriel, aucune date de naissance, aucun nom de famille.</li>
    <li>Aucune publicité, aucun outil de suivi, aucune police ou aucun script chargé depuis un autre site.</li>
  </ul>
  <h2>Qui voit tes données ?</h2>
  <p>Toi et ton enseignant seulement. Les autres élèves ne voient ni ton pseudonyme ni ta progression : il n'y a pas de classement individuel.</p>
  <h2>Où sont-elles ?</h2>
  <p>Sur un serveur Supabase situé au Canada (Montréal). Les données d'un groupe sont effacées à la fin de l'année scolaire.</p>
  <p>Pour toute question, adresse-toi à ton enseignant.</p>
  <button onclick={retour}>Retour au jeu</button>
</section>

<style>
  .page { max-width: 720px; margin: 0 auto; padding: 1rem; }
  ul { padding-left: 1.2rem; }
  li { margin-bottom: 0.3rem; }
</style>
