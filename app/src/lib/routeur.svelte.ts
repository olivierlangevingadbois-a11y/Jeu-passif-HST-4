// Routage très simple par « # » dans l'adresse (compatible avec GitHub Pages).
export type Route = 'jeu' | 'enseignant' | 'confidentialite' | 'contenu';

function lireRoute(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('enseignant')) return 'enseignant';
  if (h.startsWith('confidentialite')) return 'confidentialite';
  if (h.startsWith('contenu')) return 'contenu';
  return 'jeu';
}

class Routeur {
  route = $state<Route>(lireRoute());
  constructor() {
    window.addEventListener('hashchange', () => (this.route = lireRoute()));
  }
  aller(r: Route) {
    location.hash = r === 'jeu' ? '#/' : `#/${r}`;
  }
}

export const routeur = new Routeur();
