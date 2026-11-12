# Protection des renseignements personnels (Loi 25)

Document de travail pour la discussion avec la personne responsable de la protection des renseignements personnels du centre de services scolaire. Ce n'est pas un avis juridique.

## Principe

Le jeu recueille le moins de renseignements possible. Les pseudonymes sont choisis par l'enseignant ; seul l'enseignant peut relier un pseudonyme à un élève. Au sens de la loi, ces données sont **dépersonnalisées** (et non anonymisées) : elles restent des renseignements personnels et doivent être protégées comme tels.

## Inventaire des données

| Donnée | Où | Pourquoi | Qui la voit |
| --- | --- | --- | --- |
| Pseudonyme, groupe, équipe | `students`, `teams` | Connexion, suivi par l'enseignant | L'élève (le sien), l'enseignant |
| NIP | `student_secrets` | Connexion | Personne : haché avec bcrypt, illisible |
| Identifiant technique du compte | Supabase Auth | Ouvrir une session | Personne (ne contient aucune donnée personnelle) |
| Progression dans le jeu | `game_states` | Sauvegarde | L'élève, l'enseignant |
| Réponses aux Archives | `archives_attempts` | Répétition espacée, statistiques de groupe | L'élève, l'enseignant |
| Paquets ouverts | `pack_openings` | Transparence du tirage | L'élève, l'enseignant |
| Dernière connexion | `students.last_seen_at` | Suivi par l'enseignant | L'enseignant |
| Journal des actions de l'enseignant | `admin_log` | Transparence des corrections | L'enseignant |
| Courriel de l'enseignant | Supabase Auth | Connexion de l'enseignant | L'enseignant |

**Non recueilli** : courriel des élèves, nom de famille, date de naissance, photo, position, contacts. Aucun outil de statistiques, aucune publicité, aucune police ni aucun script chargé depuis un site tiers.

## Hébergement

- Site : GitHub Pages (fichiers statiques, aucune donnée d'élève).
- Données : Supabase, région Canada (Central), à Montréal. Supabase est une entreprise américaine : à mentionner dans l'évaluation des facteurs relatifs à la vie privée (EFVP).
- Les journaux techniques de Supabase contiennent des adresses IP, conservées peu de temps (quelques jours sur le forfait gratuit).

## Mesures de sécurité

- Règles RLS : un élève ne lit que ses propres données ; l'enseignant ne lit que ses groupes ; personne ne lit les NIP.
- Toutes les écritures passent par des fonctions serveur qui vérifient chaque action.
- Verrouillage du compte après 5 NIP erronés (15 minutes).
- Inscription publique désactivée : seuls l'enseignant et les élèves qu'il crée peuvent se connecter.
- Journal des corrections de l'enseignant, sans possibilité d'effacement par l'interface.
- Tests automatiques des règles d'accès (`supabase/tests/rls.test.sql`).

## Conservation et destruction

- Fin d'année : l'enseignant efface chaque groupe (onglet **Fin d'année**). Les comptes, parties, réponses et paquets des élèves sont supprimés.
- Un élève qui quitte le groupe : bouton **Supprimer**.

## Droits des personnes

- Accès : l'enseignant peut montrer la sauvegarde complète d'un élève (bouton **Corriger**, puis « Voir la sauvegarde complète »).
- Rectification : correction journalisée.
- Retrait : suppression de l'élève.

## Points à confirmer avec le centre de services

1. Une EFVP est-elle requise pour ce projet (hébergement par une entreprise américaine, au Canada) ?
2. Faut-il informer les parents (lettre) ? Les élèves ont 15 ou 16 ans.
3. Durée de conservation souhaitée (proposition : jusqu'à la fin de l'année scolaire).
4. Procédure en cas d'incident de confidentialité (qui aviser, et dans quel délai).
5. Utilisation d'un compte Supabase personnel de l'enseignant ou d'un compte du centre de services.
