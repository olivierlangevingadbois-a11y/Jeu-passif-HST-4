# Plan de la tranche jouable (prologue + Époque 1)

Plan approuvé le 12 novembre 2026. Ce document résume les décisions ; le détail technique est dans le code et dans `docs/installation-supabase.md`.

## Décisions de l'enseignant

| Sujet | Décision |
| --- | --- |
| Framework | Svelte 5 + Vite + TypeScript, routage par « # », tests avec Vitest |
| Rythme | Prologue : environ 10 minutes. Époque 1 : environ 3 semaines de jeu régulier ; les recensements, l'Héritage et les cartes accélèrent la progression. Le contenu ajouté plus tard pourra allonger le tout. |
| Comptes élèves | Créés par l'enseignant, avec un pseudonyme qu'il choisit (il sait qui est qui). NIP de 4 chiffres généré, verrouillage après 5 essais. Pas d'inscription libre. |
| Époque 1 au playtest | Verrouillée jusqu'à ce que l'enseignant la lance (test des saisons). |
| Projets Supabase | Deux : `paroisse-test` (essais, brouillons visibles) et `paroisse-prod` (élèves, contenu validé seulement). |
| Loi 25 | Reporté. Le jeu reste minimal en données ; `docs/loi-25.md` sera prêt pour la discussion avec le centre de services. |

## Architecture

- **Moteur de jeu partagé** (`supabase/functions/_shared/jeu/`) : formules, simulation du temps, actions. Le même code tourne dans le navigateur (affichage en direct) et dans les edge functions (calcul officiel).
- **Mode local** : sans Supabase, le jeu tourne entièrement dans le navigateur et sauvegarde sur l'appareil. Sert aux essais et au développement. Le menu contient des « outils de test » qui simulent le tableau de bord.
- **Mode en ligne** : Supabase (base de données avec RLS + edge functions). Le serveur recalcule tout à partir de son horloge.
- **GitHub Pages** publie deux versions : la version élèves à la racine, et une version d'essai sous `/test/` (brouillons visibles, projet Supabase de test).

## Étapes

| # | Étape | Comment tester |
| --- | --- | --- |
| 0 | Squelette, publication GitHub Pages, vérificateur de contenu | L'adresse s'ouvre sur un téléphone. Un tiret cadratin ajouté exprès fait échouer la vérification. |
| 1 | Économie du prologue, `balance.json`, tests, simulateur de rythme | Jouer le prologue jusqu'au jalon. |
| 2 | Recensement, passage d'époque, Héritage, monument, Époque 1, tutoriel | Deux recensements, puis passage en Époque 1. |
| 3 | Supabase : tables, RLS, compte enseignant, groupes, élèves, fiches de NIP | Créer un groupe test et imprimer les fiches. |
| 4 | Connexion élève, verrouillage, réinitialisation de NIP | Connexion sur deux appareils, 5 mauvais NIP. |
| 5 | Sauvegarde en ligne et calcul serveur, hors ligne plafonné | Fermer, attendre, revenir ; changer l'heure du téléphone. |
| 6 | Époques en saisons lancées par l'enseignant | Au jalon, l'élève attend l'ouverture et continue d'accumuler. |
| 7 | Archives : 3 types, charges, récompenses, explications, mode révision, statistiques | Répondre juste et faux. |
| 8 | Conseil et cartes : puissance par époque, synergies, niveaux | Placer et retirer des cartes. |
| 9 | Voix et paquets : dons, cotes visibles, pitié, fragments | Donner 100 Voix, ouvrir 10 paquets. |
| 10 | Crises : choléra et exode | Déclencher, atténuer, lire le dénouement. |
| 11 | Tableau de bord complet, journal des corrections | Corriger un élève et retrouver la correction au journal. |
| 12 | Préparation du playtest | Le playtest. |

Les étapes 1, 2, 7 à 10 sont d'abord livrées en mode local, puis branchées sur Supabase aux étapes 3 à 6.

## Écarts par rapport au plan initial

- Les Voix, fragments et paquets sont dans la même ligne que la sauvegarde (`game_states`), au lieu d'une table `wallets` séparée. Toutes les écritures passent par les edge functions avec un numéro de version, ce qui évite les conflits sans table supplémentaire.
- L'ouverture des paquets passe par la même edge function que la synchronisation (`game-sync`), pour que le tirage et la sauvegarde soient faits en une seule opération.
- Les Voix données par l'enseignant sont inscrites dans `voix_grants` ; elles sont ajoutées au joueur à sa prochaine synchronisation. L'enseignant n'écrit jamais directement dans la sauvegarde d'un élève, sauf par une correction journalisée.
