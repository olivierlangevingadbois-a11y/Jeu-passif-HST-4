# De la paroisse à la ville

Jeu idle éducatif pour Histoire du Québec et du Canada (4e secondaire). Chaque élève fait grandir une paroisse fictive du Bas-Saint-Laurent, époque par époque.

- Conception : `docs/gdd.md`
- Plan de la tranche jouable : `docs/plan-tranche-jouable.md`
- Contenu historique : `content/` (format : `content/SCHEMA.md`)
- Chiffres d'équilibrage : `balance.json` (guide : `balance.md`)
- Installation de Supabase : `docs/installation-supabase.md`

## Adresses

- Version élèves : `https://<compte>.github.io/Jeu-passif-HST-4/`
- Version d'essai (brouillons visibles) : `https://<compte>.github.io/Jeu-passif-HST-4/test/`
- Espace enseignant : ajouter `#/enseignant` à l'adresse.

Tant que Supabase n'est pas configuré, le jeu fonctionne en **mode local** : la partie est gardée sur l'appareil et le menu (☰) contient des outils de test (ouvrir une époque, recevoir des Voix, simuler une absence).

## Travailler sur le projet

Il faut Node.js 22 ou plus récent.

```bash
npm install
```

```bash
npm run dev
```

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Lance le jeu sur l'ordinateur (brouillons visibles). |
| `npm run verifier` | Vérifie `content/` et `balance.json` (références, tirets cadratins, valeurs manquantes). |
| `npm test` | Tests du moteur de jeu. |
| `npm run simuler` | Estime le temps pour finir chaque époque. |
| `npm run build` | Construit la version élèves (contenu validé seulement). |
| `npm run test:sql` | Teste les règles de sécurité de la base sur un Postgres local. |
| `npm run test:integration` | Test de bout en bout contre un Supabase local ou de test (jamais la production). |

## Organisation du code

```
app/                           le jeu (Svelte)
supabase/functions/_shared/jeu le moteur de jeu, partagé entre le navigateur et le serveur
supabase/functions/            edge functions (connexion, synchronisation, enseignant)
supabase/migrations/           tables et règles de sécurité (SQL)
scripts/                       vérification du contenu, génération des données, simulateur
tests/                         tests automatiques
```
