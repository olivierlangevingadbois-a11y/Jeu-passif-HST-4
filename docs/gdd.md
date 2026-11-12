# De la paroisse à la ville : Game Design Document

Nov 11, 2026 · @Oli

## Vision and pillars

Each student grows a fictional Bas-Saint-Laurent parish into a city, era by era, following the Sec. 4 HQC program from 1840 to today. The game is entirely in French, runs in the browser (mobile first), and rewards both play and classroom effort.

**Audience.** Sec. 4 students (15-16 years old), in class and at home, with a beta for ministry exam review in May.

**Learning goal.** Students absorb the sequence of periods, key events, actors and social changes through repeated exposure, not lectures. Every building, card and event carries accurate content validated by the teacher.

**Pillars**

1. **Watch your town grow.** The core pleasure is visible growth: more people, more buildings, a skyline that changes with each era.
2. **History is the progression.** The game's structure mirrors the program's periods. Moving forward in the game means moving forward in time.
3. **Learning boosts, never blocks.** Quizzes and chronology challenges give bonuses. A student who skips them still progresses, just slower.
4. **Effort in class pays off in game.** Premium currency comes only from the teacher, for grades and behaviour. It cannot be bought or lost.
5. **Respectful history.** No figure or group is ranked by importance or virtue. Contested topics are presented neutrally and accurately.

**Tone.** Warm, a bit humorous, never mocking historical people or communities. Pixel art with a cozy village feel that becomes more urban over time.

**Working title:** *De la paroisse à la ville*.

## Core loop and resources

The player builds, produces, reaches the era's milestone, then moves to the next era carrying Héritage that makes the next run faster. Sessions are short: a few minutes, a few times a day.

&#91;embedded content: core loop · 4 steps, 2 boosts, 1 prestige return\]

Archives and the conseil both feed production; the passage d'époque loops back to building with permanent bonuses. Inside an era, a recensement is a smaller loop of the same kind (see Eras and prestige).

| Resource | Role | Reset at passage d'époque? |
| --- | --- | --- |
| Habitants | Unlock buildings and raise production | Yes |
| Production | Main output; counts toward milestones and Héritage | Yes |
| Argent | Spent on buildings and levels | Yes |
| Héritage | Prestige currency for permanent bonuses | No |
| Voix | Premium currency granted by the teacher | No |

**Offline progress.** The town keeps producing while the game is closed, up to 8 hours at first (extendable through the Héritage tree). Offline gains use the server's clock, so changing the phone's time does nothing.

**Onboarding.** The prologue introduces one mechanic at a time (building, leveling, Archives, conseil, passage d'époque) and should take about 10 minutes.

## Eras and prestige

The game has five chapters: a short tutorial prologue and the four Sec. 4 periods. Each chapter ends with a historical milestone that unlocks the **passage d'époque**, the game's prestige reset.

| Chapter | Town stage | Program focus | Milestone that unlocks the next era |
| --- | --- | --- | --- |
| Prologue (before 1840) | Seigneurie | Régime seigneurial, régime britannique, Rébellions (Sec. 3 review) | Acte d'Union (1840) |
| Époque 1 (1840-1896) | Paroisse rurale | Formation du régime fédéral: Union, gouvernement responsable, colonisation, Confédération, chemin de fer, émigration | Élection de Laurier (1896) |
| Époque 2 (1896-1945) | Ville industrielle | Nationalismes et autonomie du Canada: industrialisation, électricité, urbanisation, syndicats, droit de vote des femmes, guerres, crise | Fin de la Seconde Guerre mondiale (1945) |
| Époque 3 (1945-1980) | Ville moderne | Modernisation et Révolution tranquille: État-providence, éducation, Hydro-Québec, BAEQ, Opérations Dignité | Référendum de 1980 |
| Époque 4 (1980 to today) | Ville régionale | Choix de société: Constitution, référendum de 1995, mondialisation, environnement, relations avec les Premières Nations | None (endgame) |

**Reaching a milestone.** Each milestone needs resource thresholds (for example a population and a production total) plus a short milestone event explaining what happened. It is never gated by a quiz.

**Eras open as seasons.** Each new era stays locked until the teacher launches it for a group with a short opening event, usually when the class finishes that period. Once the season is open, each player passes when they reach the milestone; early finishers keep earning Héritage while they wait.

**Recensement (small reset).** Inside an era, once the town passes a population threshold, the player can call a recensement. It resets the era's buildings and resources and raises a production multiplier based on the population counted. Gains shrink each time (square-root curve), so an era becomes several short runs that speed up, then slow down. The multiplier ends with the era but adds to the Héritage earned at the passage d'époque. Each recensement shows a short fact drawn from real censuses of the period, validated by the teacher.

**What resets:** buildings, resources, upgrades of the finished era.

**What persists:**

- **Héritage**, the prestige currency, earned from total production in the era.
- Advisor cards, cosmetics and the town's name.
- **Monuments**: one landmark per era stays visible forever (the parish church, the train station, the polyvalente...). The town visibly keeps its past.

**Héritage tree.** Héritage is spent on permanent bonuses: faster production, longer offline time, better Archives rewards, extra advisor slots. Exact formulas go in the balancing spreadsheet, not this document.

**After Époque 4.** A player who finishes can found a **nouvelle paroisse**: a full restart from the prologue with a large permanent multiplier and a new town name. This gives fast players something to do without new content.

## Buildings and upgrades

Each era offers 5 to 7 buildings, each tied to a real feature of the period. These are first examples; the final list lives in the JSON content files and is validated by the teacher.

| Era | Building | Main effect | Historical hook |
| --- | --- | --- | --- |
| Prologue | Terre du censitaire | Habitants | Division en rangs, cens et rentes |
| Prologue | Moulin banal | Production | Obligation des censitaires envers le seigneur |
| Prologue | Église paroissiale (monument) | Habitants cap | Rôle central de la paroisse |
| Époque 1 | Lot de colonisation | Habitants | Mouvement de colonisation vers les régions |
| Époque 1 | Scierie et chantier forestier | Production | Commerce du bois, draveurs |
| Époque 1 | Gare (monument) | Argent multiplier | Arrivée du chemin de fer |
| Époque 1 | École de rang | Archives rewards | Institutrices de rang |
| Époque 2 | Centrale électrique | Production multiplier | Électrification |
| Époque 2 | Usine de pâtes et papiers | Production | Industrialisation des ressources |
| Époque 2 | Caisse populaire (monument) | Argent | Mouvement Desjardins |
| Époque 2 | Local syndical | Production stability during crises | Syndicalisme |
| Époque 3 | Polyvalente (monument) | Archives rewards | Réforme de l'éducation |
| Époque 3 | Hôpital public | Habitants cap | État-providence |
| Époque 3 | Poste d'Hydro-Québec | Production multiplier | Nationalisation de l'électricité |
| Époque 3 | Cégep | Héritage gain | Accès aux études supérieures |
| Époque 4 | Parc industriel | Production | Économie régionale |
| Époque 4 | Parc éolien | Production | Enjeux environnementaux |
| Époque 4 | Centre de recherche (monument) | Héritage gain | Économie du savoir |

**Levels and upgrades.** Every building can be leveled up with Argent (cost grows each level). Upgrades are named after period technologies or reforms (for example *Machine à vapeur*, *Électrification rurale*) and each shows a one-line historical note when bought.

**Content rule.** Every building and upgrade has a short French description (1 to 3 sentences) that is accurate and teacher-validated. This is where most of the passive learning happens.

## Advisor cards and packs

Players collect **conseillers**: cards of historical figures and social-history figures, placed in the town's **conseil** for bonuses. Cards are the main collection hook and a second channel for historical content.

**Card structure**

- Name, portrait (pixel art), era, type (*personnage historique* or *figure de la société*).
- Effect tied to what the person actually did or what the role represents.
- Short French bio (2 to 3 sentences), neutral and teacher-validated, with a source.
- Rarity: *Commune*, *Rare* or *Épique*.

**The conseil.** 3 slots at the start, up to 5 through the Héritage tree. A card is at full power in its own era and at half power afterwards (*son influence s'estompe*). This keeps every era's cards relevant without letting old cards dominate.

**Rarity rules**

- Rarity reflects gameplay strength, never historical importance or virtue.
- Every tier in every era mixes well-known figures and social-history figures. The *Épique* tier is never only premiers ministres.
- The collection deliberately includes women, workers, anglophones, immigrants and First Nations, notably the Wolastoqiyik (Malécites de Viger) for the region.
- Contested figures (for example Duplessis) are included with neutral bios and effects based on their actual policies.

**Example cards**

| Card | Era | Type | Effect idea |
| --- | --- | --- | --- |
| Louis-Hippolyte La Fontaine | Époque 1 | Personnage historique | Bonus to all Argent (gouvernement responsable) |
| Draveur | Époque 1 | Figure de la société | Bonus to scierie production |
| Institutrice de rang | Époque 1 | Figure de la société | Bonus to Archives rewards |
| Alphonse Desjardins | Époque 2 | Personnage historique | Bonus to caisse populaire |
| Ouvrière du textile | Époque 2 | Figure de la société | Bonus to usine production |
| Thérèse Casgrain | Époque 2 | Personnage historique | Bonus to Habitants growth |
| Jean Lesage | Époque 3 | Personnage historique | Bonus to public buildings |

**Packs (Paquets d'archives)**

- Bought with the premium currency, or earned rarely through play: one free pack at each passage d'époque and an occasional pack as an Archives reward. 3 cards per pack.
- **Visible odds** on the pack screen. Starting point: Commune 75%, Rare 20%, Épique 5%, at least one Rare per pack.
- **Pity counter**: an Épique is guaranteed after 10 packs without one; the counter is visible.
- **Duplicates** become **fragments**, used to level up a card (levels 1 to 5) or to buy a specific card of choice.
- Opening happens server-side so odds cannot be manipulated.

## Archives (mini-challenges)

Archives are optional challenges that give temporary boosts. They never block progress and a wrong answer costs nothing except the bonus.

**Challenge types (v1)**

- **Quiz**: one question, four choices.
- **Chronologie**: put 4 or 5 events in order.
- **Qui suis-je?**: identify a figure, event or concept from 2 or 3 clues.

Later candidates: reading a historical document or a map, cause and consequence matching.

**Access and rewards**

- The Archives hold up to 3 charges, recharging 1 per hour, so students come back regularly instead of farming.
- A correct answer gives a choice of reward: a production boost (for example x2 for 15 minutes), a small amount of Héritage, or card fragments.
- Every answer, right or wrong, shows a short explanation. A wrong answer is a learning moment, not a punishment.
- Questions are drawn mostly from the current era, with some from earlier eras for spaced review. A question answered correctly comes back less often.

**Content.** Each question is tagged with its era and program concept in the JSON files. Claude drafts, the teacher validates.

**For the teacher.** The dashboard shows success rates per question and per concept for each group, which doubles as diagnostic data before evaluations.

**Review mode.** Before the ministry exam, the teacher can switch on a *mode révision* that unlocks questions from all eras regardless of the student's progress.

## Premium currency and teacher dashboard

The premium currency, **Voix**, comes only from the teacher. It rewards grades and behaviour, cannot be bought with money, and is never taken away as a sanction.

**Granting Voix**

- To one student, a team, or a whole group, in one action.
- With an optional reason shown to the student (*Excellente évaluation*, *Belle collaboration*).
- Students get a small notification next time they open the game.

**What Voix buy**

| Item | Notes |
| --- | --- |
| Paquets d'archives | Advisor cards (see packs above) |
| Cosmetics | Town and building skins, banners, portrait frames, town crest |
| Time boosts | Instantly collect 1 hour of production; capped per day so Voix can't skip whole eras |

**Teacher dashboard**

- Class list by group: pseudonym, current era, last connection.
- Create class codes, add students, reset a forgotten PIN.
- Grant Voix (single, team, group) and launch the next era's season for a group.
- Archives statistics per question and concept.
- Switch *mode révision* on or off.
- **Admin edit** on any student's data to fix bug exploits. Every admin edit is written to a log with date and reason, so corrections stay transparent.

## Crises and future social features

Historical crises are solo events in v1 and become group and world bosses later, using the same data structure from day one.

**Crises in v1 (solo).** At set points in each era, a crisis hits the town with a temporary penalty. The player reduces it by spending resources, placing the right advisor, or succeeding at Archives challenges tied to the crisis. Each crisis ends with a short explanation of what really happened.

| Crisis | Era | Example penalty |
| --- | --- | --- |
| Grippe espagnole (1918) | Époque 2 | Habitants growth reduced |
| Grande Crise (1929) | Époque 2 | Argent income reduced |
| Crise de la conscription | Époque 2 | Habitants leave temporarily |
| Grand feu de Rimouski (1950) | Époque 3 | Some buildings disabled |
| Fermeture de villages (BAEQ) | Époque 3 | Town threatened; Opérations Dignité as the response |

**Later: group bosses.** A whole group faces one crisis for about a week. Each student contributes effort points through play and Archives, and the group shares the reward. The goal is cooperation, not competition between students.

**Later: world bosses.** All groups face the same crisis together, with a shared progress bar across classes.

**Built in from v1.** Every crisis in the JSON has a `scope` field (`solo`, `groupe`, `monde`), and the database already stores students by group. Turning on group bosses later means new data and screens, not a rewrite.

**No individual leaderboards in v1**, to avoid exposing weaker students. Group-level progress can be shown.

## Technical architecture

The game is a static web app on GitHub Pages; Supabase stores saves and handles everything that must be trusted: login, pack opening, offline gains and Voix.

&#91;embedded content: architecture · static app, Supabase backend, content in the repo\]

Historical content lives as JSON in the repo, so fixing a date or a bio is a commit, not a code change.

**Content files.** `eras.json`, `buildings.json`, `cards.json`, `questions.json`, `crises.json`. Each entry carries its era and a `validated` flag, so unvalidated drafts never reach students.

**Login and Loi 25.** Students sign in with a class code, a PIN and a pseudonym or first name. No email, no birth date. PINs are stored hashed. If the database is hosted outside Québec, Loi 25 may require a privacy impact assessment (EFVP); worth confirming with the centre de services scolaire before the beta.

**Trust model.** The app shows production live, but the server recomputes gains from timestamps on each sync. Packs and Voix go only through edge functions. Row Level Security lets a student read and write only their own data; the teacher role sees their groups.

**Sync.** Autosave every minute and when the app closes. A connection is needed to save; short drops are tolerated and sync when the connection returns.

**Free tier caveat.** Free Supabase projects can pause after a period of inactivity, so check the project before school resumes after the summer.

Implementation details (framework, exact schema, auth method) will be settled in Claude Code, starting from this document.

## Open questions and next steps

**Open questions**

- **Pacing.** How long should one era take for a regular player? This drives every balancing number.
- **Era locking.** Decided: the teacher is able to lock eras, which open as seasons with a short launch event (see Eras and prestige).
- **Free packs.** Decided: students also earn occasional packs through play, as rare free packs (see Packs).
- **Town names.** Decided: free text, moderated by the teacher through admin edit.
- **Currency name.** *Voix*, chosen for its link to suffrage, elections and référendums.

**Next steps**

1. Teacher reviews this document and settles the open questions.
2. Define the JSON schemas for eras, buildings, cards, questions and crises.
3. Draft the content for the prologue and Époque 1 (Claude drafts, teacher validates).
4. Set up the repo with this document and a `CLAUDE.md`, then move to Claude Code.
5. Build a vertical slice: prologue + Époque 1, login, sync, Archives, one pack type.
6. Playtest with a few students, adjust pacing, then build Époques 2 to 4 toward the May beta.
