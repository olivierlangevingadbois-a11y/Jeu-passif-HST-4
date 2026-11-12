// Textes de l'interface (non historiques). Tout le contenu historique est dans content/*.json.
// Règle : pas de tiret cadratin. Vérifié par « npm run verifier ».

import type { HeritageEffect } from '@jeu/balance.ts';
import type { Rarity, Resource } from '@jeu/contenu.ts';

export const NOM_JEU = 'De la paroisse à la ville';

export const RESSOURCES: Record<Resource, string> = {
  habitants: 'Habitants',
  production: 'Production',
  argent: 'Argent',
};

export const RARETES: Record<Rarity, string> = {
  commune: 'Commune',
  rare: 'Rare',
  epique: 'Épique',
};

export const TYPES_CARTE = {
  personnage: 'Personnage historique',
  figure: 'Figure de la société',
};

export const TYPES_QUESTION = {
  quiz: 'Quiz',
  chronologie: 'Chronologie',
  quisuisje: 'Qui suis-je ?',
};

/** Noms des bonus de l'arbre d'Héritage (textes de jeu, à valider par l'enseignant au besoin). */
export const NOEUDS_HERITAGE: Record<string, string> = {
  production_1: 'Savoir-faire des anciens',
  habitants_1: 'Entraide au village',
  argent_1: 'Économies familiales',
  absence_1: 'Village vaillant',
  archives_1: 'Mémoire vivante',
  production_2: 'Ouvrage bien fait',
  habitants_2: 'Accueil des nouveaux venus',
  conseil_4: 'Conseil élargi',
  absence_2: 'Longues veillées',
  heritage_1: 'Fierté locale',
  conseil_5: 'Grand conseil',
};

export function descriptionEffetHeritage(e: HeritageEffect): string {
  switch (e.kind) {
    case 'multiplier':
      return `+${Math.round(e.value * 100)} % ${e.target === 'habitants' ? 'de croissance des habitants' : e.target === 'production' ? 'de production' : "d'argent"}`;
    case 'offline_hours':
      return `+${e.value} h de production pendant ton absence`;
    case 'archives_bonus':
      return `+${Math.round(e.value * 100)} % aux récompenses des Archives`;
    case 'conseil_slot':
      return `+${e.value} place au conseil`;
    case 'starting_argent':
      return `+${e.value} d'argent au début de chaque partie`;
    case 'heritage_gain':
      return `+${Math.round(e.value * 100)} % d'Héritage au passage d'époque`;
  }
}

export const RECOMPENSES = {
  boost: { titre: 'Élan', description: (min: number) => `Production ×2 pendant ${min} min` },
  heritage: { titre: 'Héritage', description: (n: number) => `+${n} Héritage` },
  fragments: { titre: 'Fragments', description: (n: number) => `+${n} fragments de carte` },
};

export const MESURES_CRISE: Record<string, string> = {
  building: 'Bâtiment',
  card: 'Conseiller',
  resources: 'Dépense',
  archives: 'Archives',
};

/** Étapes du tutoriel du prologue. */
export interface EtapeTutoriel {
  titre: string;
  texte: string;
  onglet?: 'village' | 'conseil' | 'archives' | 'paquets' | 'heritage';
}

export const TUTORIEL: EtapeTutoriel[] = [
  {
    titre: 'Bienvenue !',
    texte: 'Ta paroisse commence ici, le long du fleuve. Commence par lui donner un nom dans le menu (☰), ou passe à la suite.',
  },
  {
    titre: 'Défricher',
    texte: 'Achète un niveau de « Terre du censitaire ». Chaque terre attire de nouveaux habitants.',
    onglet: 'village',
  },
  {
    titre: 'Moudre le grain',
    texte: 'Quand tu as assez d\'habitants, construis le « Moulin banal ». Il produit la Production, qui rapporte aussi de l\'argent.',
    onglet: 'village',
  },
  {
    titre: 'Faire de la place',
    texte: 'Le nombre d\'habitants a un plafond. Construis l\'« Église paroissiale » pour le hausser.',
    onglet: 'village',
  },
  {
    titre: 'Les Archives',
    texte: 'Ouvre l\'onglet Archives et réponds à une question. Une bonne réponse donne un bonus, une erreur ne fait rien perdre.',
    onglet: 'archives',
  },
  {
    titre: 'Le conseil',
    texte: 'Voici ta première carte de conseiller. Place-la au conseil pour profiter de son bonus.',
    onglet: 'conseil',
  },
  {
    titre: 'Le recensement',
    texte: 'Quand ta paroisse est assez peuplée, tu peux faire un recensement : le village repart à zéro, mais produit plus vite ensuite.',
    onglet: 'village',
  },
  {
    titre: 'Vers une nouvelle époque',
    texte: 'Atteins le jalon de l\'époque (barre en haut). Quand ton enseignant ouvre la prochaine époque, tu pourras y passer et gagner de l\'Héritage.',
    onglet: 'village',
  },
];
