# Installation : GitHub Pages et Supabase

Ce guide se fait une seule fois. Compte environ 45 minutes. Tu n'as rien à installer sur ton ordinateur : GitHub Actions s'occupe de publier le site et de préparer la base de données.

Tant que Supabase n'est pas branché, le jeu fonctionne en **mode local** (partie gardée sur l'appareil). Tu peux donc faire la partie A seulement et essayer le jeu tout de suite.

## A. Publier le site (5 minutes)

1. Sur GitHub, ouvre le dépôt **Jeu-passif-HST-4**.
2. **Settings**, puis **Pages** (menu de gauche).
3. Sous **Build and deployment**, **Source** : choisis **GitHub Actions**.
4. Fusionne la demande de fusion (pull request) dans `main`, ou va dans l'onglet **Actions**, choisis **Publication GitHub Pages**, puis **Run workflow**.
5. Après 2 ou 3 minutes, le site est en ligne :
   - version élèves : `https://olivierlangevingadbois-a11y.github.io/Jeu-passif-HST-4/`
   - version d'essai (brouillons visibles) : `https://olivierlangevingadbois-a11y.github.io/Jeu-passif-HST-4/test/`

## B. Créer les deux projets Supabase (15 minutes)

On crée deux projets : **test** pour tes essais, **prod** pour les élèves. Le forfait gratuit permet exactement deux projets actifs.

Pour chacun des deux projets :

1. Va sur [supabase.com](https://supabase.com), connecte-toi, puis **New project**.
2. **Name** : `paroisse-test` (puis `paroisse-prod` pour le deuxième).
3. **Database password** : clique sur **Generate a password**, puis **copie-le dans ton gestionnaire de mots de passe**. Tu en auras besoin à l'étape C.
4. **Region** : **Canada (Central)**. C'est Montréal ; les données restent au Canada.
5. **Create new project**. Attends 1 ou 2 minutes.
6. Menu de gauche : **Authentication**, puis **Sign In / Providers**. Désactive **Allow new users to sign up**, puis **Save**. Ainsi, personne ne peut se créer un compte : seuls toi (étape D) et les élèves que tu crées peuvent se connecter. Laisse le fournisseur **Email** activé.
7. Note trois valeurs (menu **Project Settings**) :
   - **General**, **Project ID** : une suite de lettres, par exemple `abcdefghijklmnop`.
   - **Data API** (ou **API**), **Project URL** : `https://abcdefghijklmnop.supabase.co`.
   - **API Keys**, **Publishable key** : commence par `sb_publishable_`. Cette clé est publique : elle peut être dans le site. Ne copie **jamais** la **Secret key** nulle part.

Ensuite, une seule fois pour ton compte :

8. Clique sur ton avatar (en haut à droite), **Account preferences**, puis **Access Tokens**, puis **Generate new token**. Nom : `GitHub déploiement`. Copie le jeton (il ne s'affiche qu'une fois).

## C. Donner les accès à GitHub (10 minutes)

Dans le dépôt GitHub : **Settings**, **Secrets and variables**, **Actions**.

Onglet **Secrets** (valeurs cachées), bouton **New repository secret** :

| Nom | Valeur |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | le jeton de l'étape B.8 |
| `TEST_SUPABASE_DB_PASSWORD` | mot de passe de la base `paroisse-test` |
| `PROD_SUPABASE_DB_PASSWORD` | mot de passe de la base `paroisse-prod` |

Onglet **Variables** (valeurs visibles), bouton **New repository variable** :

| Nom | Valeur |
| --- | --- |
| `TEST_SUPABASE_PROJECT_REF` | Project ID de `paroisse-test` |
| `TEST_SUPABASE_URL` | Project URL de `paroisse-test` |
| `TEST_SUPABASE_PUBLISHABLE_KEY` | Publishable key de `paroisse-test` |
| `PROD_SUPABASE_PROJECT_REF` | Project ID de `paroisse-prod` |
| `PROD_SUPABASE_URL` | Project URL de `paroisse-prod` |
| `PROD_SUPABASE_PUBLISHABLE_KEY` | Publishable key de `paroisse-prod` |

Puis, onglet **Actions** du dépôt :

1. **Déploiement Supabase**, **Run workflow**, cible **test**. Attends la coche verte (2 à 4 minutes). La base de données et les fonctions sont prêtes.
2. Recommence avec la cible **prod**.
3. **Publication GitHub Pages**, **Run workflow** : le site se reconstruit avec Supabase branché.

À partir de maintenant, chaque fusion dans `main` met à jour le projet **test** automatiquement. Le projet **prod** n'est mis à jour que lorsque tu lances le déploiement toi-même : tu gardes le contrôle sur ce que voient les élèves.

## D. Déclarer ton compte enseignant (5 minutes)

À faire dans chacun des deux projets.

1. **Authentication**, **Users**, **Add user**, **Create new user**.
2. Ton courriel et un mot de passe solide. Coche **Auto Confirm User**. **Create user**.
3. Menu de gauche : **SQL Editor**. Colle ce texte en remplaçant le courriel, puis **Run** :

```sql
insert into public.teachers (id, display_name)
select id, 'Olivier' from auth.users where email = 'ton.courriel@exemple.com';
```

Le résultat doit indiquer « 1 row ». Va ensuite sur la version d'essai, ajoute `#/enseignant` à l'adresse et connecte-toi.

## E. Premier essai

1. Dans l'espace enseignant de la version d'essai : crée un groupe (ex. : « Essai »), puis ajoute deux pseudonymes.
2. Imprime ou note les fiches.
3. Sur ton téléphone, ouvre la version d'essai et connecte-toi avec une fiche.
4. Donne des Voix au groupe : l'élève les reçoit à sa prochaine synchronisation (au plus une minute, ou en rechargeant la page).

## Entretien

- **Avant chaque rentrée et après les longs congés** : un projet gratuit se met en pause après une semaine sans activité. Ouvre le projet sur supabase.com et clique sur **Restore** s'il est en pause.
- **Limites du forfait gratuit** : 500 Mo de base de données (largement assez), 500 000 appels de fonctions par mois (environ 150 élèves qui jouent 30 minutes par jour en utilisent à peu près 150 000).
- **Sauvegardes** : le forfait gratuit n'en fait pas. Une fois par mois, tu peux exporter les tables utiles depuis **Table Editor** (bouton **Export to CSV**) et garder le fichier sur ton ordinateur de l'école.
- **Classe entière qui se connecte en même temps** : si des élèves reçoivent une erreur de connexion, va dans **Authentication**, **Rate Limits**, et augmente la limite de vérifications par heure.

## En cas de problème

- **Une coche rouge dans Actions** : clique dessus pour voir l'étape qui a échoué. Une erreur dans « Contenu et balance » indique un fichier de `content/` ou `balance.json` à corriger (le message dit lequel).
- **« Ce compte n'est pas enregistré comme enseignant »** : refais l'étape D dans le bon projet (test ou prod).
- **Un élève est verrouillé** : espace enseignant, bouton **NIP** à côté de son pseudonyme.
