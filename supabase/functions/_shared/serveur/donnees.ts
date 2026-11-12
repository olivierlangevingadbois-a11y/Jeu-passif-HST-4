// Contenu et balance pour le serveur. donnees.json est généré par scripts/generer-donnees.ts
// au moment du déploiement (contenu validé seulement pour le projet de production).
import brut from '../donnees/donnees.json' with { type: 'json' };
import { preparerJeu, type DonneesBrutes } from '../jeu/donnees.ts';

export const jeu = preparerJeu(brut as unknown as DonneesBrutes);
