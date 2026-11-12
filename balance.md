# balance.json : guide des réglages

Tous les chiffres du jeu sont dans `balance.json`. Le contenu historique (textes) est dans `content/`. Après une modification :

```bash
npm run verifier
```

```bash
npm run simuler
```

Le simulateur affiche le temps estimé pour finir chaque époque avec quelques profils de joueurs. Avec les valeurs actuelles (novembre 2026) :

| Profil | Prologue | Époque 1 |
| --- | --- | --- |
| Découverte (une séance d'une heure) | environ 10 min | |
| Assidu (4 × 10 min par jour) | | environ 13 jours |
| Régulier (2 × 10 min par jour) | | environ 21 jours |
| Occasionnel (1 × 10 min par jour) | | environ 42 jours |

Pour allonger ou raccourcir l'Époque 1, change surtout `eras.epoque_1.milestone.productionTotal` : la production totale grandit à peu près en ligne droite après la première semaine, donc doubler ce chiffre ajoute environ deux semaines. Option `--detail` : affiche la progression jour par jour du profil Régulier.

## Temps et synchronisation

| Clé | Rôle |
| --- | --- |
| `simulation.stepSeconds` | Précision du calcul (10 s suffit). |
| `sync.intervalSeconds` | Fréquence de sauvegarde quand le jeu est ouvert. |
| `offline.capHours` | Heures de production comptées pendant une absence (8 au départ, plus avec l'Héritage). |
| `offline.efficiency` | Part de la production gardée hors ligne (1 = 100 %). |
| `offline.thresholdSeconds` | Au-delà de cet écart, la fenêtre « Pendant ton absence » s'affiche. |

## Ressources

| Clé | Rôle |
| --- | --- |
| `habitants.baseCap` | Plafond d'habitants sans église. |
| `habitants.productionBonusPerHabitant` | Chaque habitant ajoute ce pourcentage à la production (0.01 = 1 %). |
| `habitants.argentPerHabitant` | Argent par seconde rapporté par chaque habitant (cens et rentes). |
| `productionToArgent` | Part de la production vendue en argent chaque seconde. |

## Époques (`eras`)

| Clé | Rôle |
| --- | --- |
| `startingArgent`, `startingHabitants`, `startingBuildings` | Départ de chaque partie (aussi après un recensement). |
| `milestone.habitants`, `milestone.productionTotal` | Jalon à atteindre pour passer à l'époque suivante. La production compte pour toute l'époque, recensements compris. |
| `recensement.minHabitants` | Habitants nécessaires pour faire un recensement. |

## Bâtiments (`buildings`) et améliorations (`upgrades`)

| Clé | Rôle |
| --- | --- |
| `unlockHabitants` | Habitants nécessaires pour débloquer le bâtiment. |
| `baseCost`, `costGrowth` | Coût du niveau n : `baseCost × costGrowth^n`. |
| `ratePerLevel` | Bâtiment qui produit : quantité par seconde, par niveau. |
| `capPerLevel` | Bâtiment qui hausse un plafond (église). |
| `multiplierPerLevel` | Bâtiment-multiplicateur (gare) : 0.15 = +15 % par niveau. |
| `archivesBonusPerLevel` | École de rang : bonus des récompenses des Archives. |
| `upgrades.*.cost`, `requiresLevel`, `multiplier` | Prix, niveau requis et effet d'une amélioration. |
| `paliers.niveaux`, `paliers.multiplicateur` | À chacun de ces niveaux (25, 50, 75...), la production d'un bâtiment producteur double. Donne des objectifs tout au long de l'époque. |

## Recensement et Héritage

- Multiplicateur de recensement : `1 + coefficient × √(habitants recensés / divisor)`.
- Héritage au passage : `max(minimum, coefficient × √(production de l'époque / divisor))`, puis augmenté de `recensementWeight × (multiplicateur de recensement - 1)` et des bonus d'Héritage.
- `heritageTree` : bonus permanents. `requires` indique le bonus à acheter avant.

## Cartes, conseil et paquets

| Clé | Rôle |
| --- | --- |
| `conseil.baseSlots`, `maxSlots` | Places au conseil (3 au départ, 5 au maximum). |
| `cards.rarityPower` | Bonus d'une carte de niveau 1 dans son époque (0.3 = +30 %). |
| `cards.outOfEraFactor` | Puissance dans les époques suivantes (0.5 = moitié). |
| `cards.levelBonus` | Bonus par niveau de carte (0.25 = +25 % de la puissance de base). |
| `cards.synergyFactor` | Multiplicateur quand les deux cartes d'une synergie siègent. |
| `cards.overrides` | Puissance propre à une carte : `{ "louis_riel": 0.8 }`. |
| `packs.odds` | Cotes par carte (doivent totaliser 1). |
| `packs.pityPacks` | Le n-ième paquet d'affilée sans Épique en contient une. |
| `packs.duplicateFragments`, `levelUpFragments`, `buyCardFragments` | Économie des fragments. |

## Archives et crises

| Clé | Rôle |
| --- | --- |
| `archives.maxCharges`, `rechargeMinutes` | 3 charges, 1 par heure. |
| `archives.rewards` | Élan (×2 production pendant n minutes), Héritage, fragments. |
| `archives.pastEraShare` | Part des questions tirées des époques passées. |
| `archives.correctRepeatWeight` | Une question réussie revient moins souvent (0.25 = 4 fois moins par réussite). |
| `crises.*.triggerHabitants` | Seuil d'habitants qui déclenche la crise (une fois par époque). |
| `crises.*.strength` | Force de la pénalité (0.3 = -30 %). |
| `crises.*.mitigationStrength` | Chaque mesure réduit la pénalité de cette fraction. |
