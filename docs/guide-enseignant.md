# Guide de l'enseignant

## Les deux versions du site

| Version | Adresse | Contenu | Données |
| --- | --- | --- | --- |
| Élèves | `.../Jeu-passif-HST-4/` | Contenu validé seulement | Projet Supabase `paroisse-prod` |
| Essai | `.../Jeu-passif-HST-4/test/` | Brouillons visibles (étiquette « Brouillon ») | Projet Supabase `paroisse-test` |

L'espace enseignant est à la même adresse, suivie de `#/enseignant`.

## Préparer un groupe

1. **Créer le groupe** : nom court (ex. : 401). Un code de classe de 6 caractères est créé.
2. **Ajouter les élèves** : un pseudonyme par ligne. Choisis des pseudonymes que tu reconnais, sans nom de famille.
3. **Imprimer les fiches** : chaque fiche contient l'adresse, le code de classe, le pseudonyme et le NIP. Les NIP ne s'affichent **qu'une seule fois**. En cas de perte, bouton **NIP** pour en créer un nouveau.
4. **Équipes** (facultatif) : pour donner des Voix à une équipe d'un coup.

## Pendant l'année

- **Donner des Voix** : à un élève, une équipe ou tout le groupe, avec une raison facultative qui s'affiche chez l'élève (« Excellente évaluation »). Un paquet coûte 10 Voix. Les Voix ne sont jamais retirées comme sanction.
- **Lancer une époque** : onglet **Époques**, quand la classe arrive à cette période. Les élèves qui ont déjà atteint le jalon peuvent alors passer. Une époque lancée ne peut pas être refermée.
- **Mode révision** : avant l'examen, les Archives proposent des questions de toutes les époques.
- **Archives** : taux de réussite par concept et par question, du plus faible au plus élevé. Utile pour savoir quoi revoir en classe.
- **Corriger** : pour un bogue, un exploit ou un nom de ville inapproprié. La raison est obligatoire et la correction est inscrite au **Journal**.

## Fin d'année

Onglet **Fin d'année** : efface le groupe et toutes les données de ses élèves. Il faut écrire le nom du groupe pour confirmer.

## Valider le contenu historique

Tout le texte historique est dans `content/*.json` (voir `content/SCHEMA.md`).

Pour relire confortablement, ouvre la page **Contenu historique** de la version d'essai (`.../test/#/contenu`) : les brouillons y sont affichés en premier, avec la note qui dit quoi vérifier et la bonne réponse de chaque question.

1. Une entrée nouvelle ou modifiée par Claude porte `"validated": false` et une note dans `teacherNote` qui dit quoi vérifier.
2. Elle apparaît dans la **version d'essai** avec l'étiquette « Brouillon », mais **pas** dans la version élèves.
3. Pour la valider : corrige le texte au besoin, mets `"validated": true` et `"teacherNote": null`, puis fusionne dans `main`.
4. Pour que les élèves la voient : onglet **Actions**, **Déploiement Supabase**, cible **prod**, puis **Publication GitHub Pages** (cette dernière se fait toute seule à chaque fusion).

## Régler le rythme

Tous les chiffres sont dans `balance.json` (guide : `balance.md`). Après une modification, `npm run simuler` estime la durée de chaque époque. Le levier principal pour allonger ou raccourcir l'Époque 1 est `eras.epoque_1.milestone.productionTotal`.

## Essayer sans Supabase

Sur la version d'essai, si Supabase n'est pas encore branché, le menu du jeu (☰) contient des **outils de test** : ouvrir l'Époque 1, recevoir des Voix, simuler une absence de 1, 8 ou 24 heures, recommencer la partie.
