# De la paroisse à la ville

Educational idle game for Histoire du Québec et du Canada (Sec. 4), made by a history teacher for his own classes. Each student grows a fictional Bas-Saint-Laurent parish into a city, era by era, from before 1840 to today.

Full design: `docs/gdd.md`. Original brief: `docs/brief-projet.md`. Content format: `content/SCHEMA.md`.

## Non-negotiables

- **Everything students see is in French.** Code, keys and comments can be in English.
- **No em dashes (—) in any French text** shown to students or written for the teacher. Use a colon, a comma or a new sentence.
- **Historical content is never invented or changed silently.** All history lives in `content/*.json`. New or edited entries get `"validated": false` and a `teacherNote` explaining what to check; only the teacher sets `validated` to `true`. In production, the game ignores unvalidated entries.
- **Learning boosts, never blocks.** No quiz or challenge ever gates progress.
- **Minimal personal data (Loi 25).** Login is class code + PIN + pseudonym or first name. No email, no birth date. PINs are hashed.
- **No individual leaderboards.** Group-level progress only.

## Stack

- Static web app on GitHub Pages, mobile first, also works on laptop. Pixel art.
- Supabase (free tier): Postgres with Row Level Security, edge functions for anything that must be trusted.
- Framework and build tooling: not decided yet. Prefer something simple that deploys to GitHub Pages through GitHub Actions.
- The teacher is comfortable with GitHub and a database console, not a full-time developer: keep setup steps explicit and documented.

## Trust model

- The client shows production live, but the server recomputes gains from timestamps on each sync (server clock only).
- Pack opening, Voix grants and offline gains go only through edge functions.
- RLS: a student reads and writes only their own data; the teacher role sees their groups.
- Every teacher admin edit is written to a log with date and reason.

## Game systems (summary, details in the GDD)

- **Resources:** Habitants, Production, Argent (reset each era); Héritage (prestige, permanent); Voix (premium currency, from the teacher only).
- **Eras:** prologue (before 1840, tutorial), Époque 1 (1840-1896), Époque 2 (1896-1945), Époque 3 (1945-1980), Époque 4 (1980 to today).
- **Eras open as seasons:** each new era stays locked until the teacher launches it for a group. Once open, a player passes when they reach the era's milestone.
- **Recensement:** small reset inside an era, gives a production multiplier with diminishing returns (square root), shows a census fact.
- **Passage d'époque:** big reset, earns Héritage, keeps cards, cosmetics, town name and one monument per era.
- **Conseil:** 3 to 5 advisor card slots. Cards are full power in their era, half power afterwards. Some cards have synergies.
- **Packs:** 3 cards, visible odds (Commune 75%, Rare 20%, Épique 5%, at least one Rare), pity at 10 packs, duplicates become fragments. Bought with Voix; also one free pack per passage d'époque and rare Archives drops.
- **Archives:** quiz, chronologie, qui suis-je. 3 charges, 1 per hour. Every answer shows an explanation. Teacher can turn on a review mode with all eras.
- **Crises:** solo in v1, with a `scope` field (`solo`, `groupe`, `monde`) so group and world bosses can be added later.
- **Voix:** granted by the teacher to a student, team or group, with an optional reason. Never removed as a sanction.

## Content and balance

- `content/` holds history only: eras, buildings, cards, questions, crises. No numbers.
- Balancing numbers (rates, costs, thresholds, odds, offline cap) go in a separate `balance.json`. Pacing target is not set yet: make it easy to tune.

## First milestone: vertical slice

Prologue + Époque 1, class code + PIN login, cloud save and sync, Archives, conseil, one pack type, recensement and passage d'époque, a minimal teacher dashboard (grant Voix, launch an era, reset a PIN). Goal: a playtest with a few students, then Époques 2 to 4 toward a beta in May.
