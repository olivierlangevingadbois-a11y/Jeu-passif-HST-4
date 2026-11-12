# Idle game HQC Sec. 4 : brief and decisions

Status: discovery done (2026-11-09). Next: pick core concept, then write game design document.

## Decisions
- Language: everything in French.
- Content span: Sec. 4 program (1840-1896, 1896-1945, 1945-1980, 1980 to today), with a short Sec. 3 prologue (before 1840) as tutorial.
- Learning: middle ground. Accurate content, optional mini-challenges (quiz, chronology) giving bonuses, never blocking progress.
- Social: mostly solo for v1. Architecture must leave room for guild (class/group) bosses and world (all groups) bosses later.
- Premium currency: given by teacher via a teacher dashboard (grades, good behaviour).
  - Buys: gacha packs, cosmetics, small time boosts.
  - Only positive (no removal for behaviour), BUT teacher has full admin edit on any student's data (to fix bug exploits).
  - Random packs accepted by teacher (currency is earned, not bought). Suggested safeguards: visible odds, pity counter, duplicates converted to something useful.
- Login: class code + PIN, pseudonym or first name, no email (Loi 25: minimal personal data).
- Platform: browser, mobile-first but works on laptop. Progress synced online.
- Class time: no play restrictions.
- Hosting: GitHub Pages (like Hst4-website) + free backend (Supabase or similar).
- Art: pixel art.
- Content: Claude drafts historical content, teacher validates. Content should live in editable data files (JSON).
- Teacher is comfortable with GitHub and a DB console.
- Timeline: no deadline. Beta possibly usable in May (review before ministry exam), full version for next school year (2027-2028).

## Open
- Core fantasy/theme (teacher said "your call"). Proposed: fictional Bas-Saint-Laurent town growing from parish to city across the eras, era transitions as prestige resets, historical figures as gacha advisor cards.
