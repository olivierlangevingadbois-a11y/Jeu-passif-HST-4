// Manifeste des visuels provisoires. Pour passer au pixel art, remplacer « image » par le chemin
// d'un fichier dans app/public/sprites/ (ex. 'sprites/moulin_banal.png') : le reste ne change pas.

export interface Visuel {
  couleur: string;
  toit: string;
  sigle: string;
  image?: string;
}

const PAR_DEFAUT: Visuel = { couleur: '#c9b48a', toit: '#7a5a3a', sigle: '?' };

export const VISUELS: Record<string, Visuel> = {
  terre_censitaire: { couleur: '#9bbf6a', toit: '#6b8f3a', sigle: 'Te' },
  moulin_banal: { couleur: '#e8d7b0', toit: '#8a5a33', sigle: 'Mo' },
  manoir_seigneurial: { couleur: '#efe3c8', toit: '#5c3b6e', sigle: 'Ma' },
  eglise_paroissiale: { couleur: '#f4f0e6', toit: '#b5503c', sigle: 'Ég' },
  lot_colonisation: { couleur: '#8fb36a', toit: '#4f6f2f', sigle: 'Lo' },
  scierie_chantier: { couleur: '#d9b98c', toit: '#6b4a2f', sigle: 'Sc' },
  beurrerie_fromagerie: { couleur: '#f6e9a8', toit: '#a0832a', sigle: 'Be' },
  magasin_general: { couleur: '#e9c9a0', toit: '#2f5f6e', sigle: 'Mg' },
  gare: { couleur: '#d0c4b4', toit: '#3a3a4a', sigle: 'Ga' },
  ecole_rang: { couleur: '#f1d6c0', toit: '#a3402a', sigle: 'Éc' },
};

export function visuel(id: string): Visuel {
  return VISUELS[id] ?? PAR_DEFAUT;
}

export const COULEURS_EPOQUE: Record<string, { ciel: string; sol: string }> = {
  prologue: { ciel: '#cfe3ec', sol: '#a9c48a' },
  epoque_1: { ciel: '#d7e2e8', sol: '#9fbb80' },
  epoque_2: { ciel: '#c9cfd4', sol: '#8fa677' },
  epoque_3: { ciel: '#cfe0f0', sol: '#93b07d' },
  epoque_4: { ciel: '#d6e8f5', sol: '#8fb37f' },
};
