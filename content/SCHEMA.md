# Content files: schema and validation

All historical content for *De la paroisse à la ville* lives in these JSON files. Text shown to students is in French; keys are in English for the code.

Balancing numbers (production rates, costs, thresholds, odds) are **not** in these files. They will live in a separate `balance.json`, so content can be validated without touching the numbers and vice versa.

## Validation workflow

- Every entry has `"validated": false` until the teacher checks it.
- The teacher reads the text, fixes it if needed, then sets `"validated": true`.
- `teacherNote` holds anything Claude flagged for checking (a date, a figure, a framing choice). Clear it (`null`) once resolved.
- In production, the game ignores entries with `"validated": false`. In development, they show with a "brouillon" marker.

## Common fields

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Unique, lowercase, `snake_case`, never changed once used in saves |
| `era` | string | `prologue`, `epoque_1`, `epoque_2`, `epoque_3`, `epoque_4` |
| `validated` | boolean | Teacher approval |
| `teacherNote` | string or null | Points to verify |

## Effect kinds

Used by buildings and cards: `{ "kind": "...", "target": "..." }`.

| kind | target | Meaning |
| --- | --- | --- |
| `produce` | resource | Generates a resource over time |
| `multiplier` | resource or building id | Boosts a resource everywhere, or one building type |
| `cap` | resource | Raises the maximum of a resource |
| `archives_bonus` | null | Better Archives rewards |
| `heritage_gain` | null | More Héritage at the passage d'époque |
| `crisis_mitigation` | crisis id | Reduces a crisis penalty |

Resources: `habitants`, `production`, `argent`.

## eras.json

`id`, `order`, `name`, `period` (`start`, `end`), `programTitle`, `townStage`, `intro`, `monumentBuildingId`, `milestone` (`id`, `name`, `year`, `eventText`), `recensementFacts` (list of `id` + `text`, one shown at each recensement).

## buildings.json

`id`, `era`, `name`, `monument` (stays visible forever), `effect`, `description` (1 to 3 sentences), `upgrades` (list of `id`, `name`, `note`).

## cards.json

`id`, `era`, `name`, `type` (`personnage` or `figure`), `rarity` (`commune`, `rare`, `epique`), `effect`, `effectText` (short French label), `synergy` (null or `with` + `text`), `bio` (2 to 3 sentences, neutral), `source`.

Rarity reflects gameplay strength only. Every tier of every era mixes `personnage` and `figure` cards (the short tutorial prologue is the exception).

## questions.json

Common: `id`, `era`, `concept` (tag used for dashboard stats and crisis links), `type`, `explanation`.

| type | Extra fields |
| --- | --- |
| `quiz` | `prompt`, `choices` (4), `answerIndex` |
| `chronologie` | `prompt`, `events` (list of `text` + `year`; the game shuffles them, the years give the answer) |
| `quisuisje` | `clues` (2 or 3, revealed one by one), `choices` (4), `answerIndex` |

The game shuffles `choices`; `answerIndex` refers to the order in the file.

## crises.json

`id`, `era`, `scope` (`solo`, `groupe`, `monde`), `name`, `year` (or null for a long phenomenon), `description`, `penalty` (`kind` + `target`), `mitigations` (list of `kind` + `ref`), `aftermath` (what really happened, shown at the end).

Mitigation kinds: `building` (building id), `card` (card id), `resources` (resource spent), `archives` (concept tag, or null for any question of the era).

Penalty kinds: `growth_reduction`, `habitants_loss`, `income_reduction`, `buildings_disabled`.
