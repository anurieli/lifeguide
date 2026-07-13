# Daily Ritual — the Morning Scroll and the Night Scroll

**Status:** built (v2, typed components) · **Element of:** the Sessions stream (the two calm bookends of the day) · **Owns:** `ritualItems`, `ritualDays`, `roadmapEntries`, `morningNotes`

> The morning is an ordered primer sequence, not a checklist: read the note last-night you left, read the doctrine, walk the roadmap set last night, answer the day's question. The evening's real job is setting tomorrow's morning up — the roadmap plus a note to morning-you. Permanent practices ride alongside on the rituals rail. Seal it, sleep, repeat.
>
> **Naming (Ariel, 2026-07-13):** the two bookends are branded the **Morning Scroll** and the **Night Scroll** — that is what the tabs and the sequence-card headers say. "Ritual" remains the internal/system term (tables, code, the rituals rail); "scroll" is the face the person sees.

## 1. The philosophy (governs every design choice here)

1. **The morning ritual is an ORDERED PRIMER SEQUENCE, not a checklist.** The person walks it top to bottom and it primes the mind for the day: the current step is quietly held, the walked steps settle. Plain practice-checking exists *alongside* (the **rituals rail**), never as the spine. They are called **rituals**, never to-dos (Ariel, 2026-07-12).
2. **The evening ritual's real job is building TOMORROW MORNING'S ROADMAP.** Before bed, the person quickly inputs exactly what tomorrow starts with — what to do, where, any info needed to just execute. Input is FAST: type, enter, next. The next morning opens with that roadmap as its ordered spine: wake up executing, not deciding. Entries target the NEXT ritual day across the 4am boundary ([ADR 0012](../../decisions/0012-roadmap-targets-next-ritual-day.md)): set at 23:00 or at 1:30am, both land on the upcoming morning.
   The whole night step is framed as **leaving something for morning-you** — and alongside the structured roadmap the person can leave one free-form **note to morning-you** (marked ✳): a reminder, a warning, a word. It rides the same target-day convention (`morningNotes`, one note per morning, rewritable all evening, empty tears it up), and the next morning's scroll **opens with it** — the last thing written at night is the first thing read in the morning.
3. **Ritual steps are TYPED SCHEMA COMPONENTS** ([ADR 0011](../../decisions/0011-typed-ritual-components.md)). One ritual = an ordered list of typed components. Kinds today: `do` (a permanent practice, on the rituals rail; assignable to morning, night, or **any** — indifferent to the time of day), `read` (a readout — inline words or the Blueprint), `question` (a reflection prompt, fixed or drawn from the rotating bank), `roadmap` (the evening builder / the morning display). Future kinds slot in by widening a union — no migration.
4. **The Core is the person (character, who you are); the Blueprint is the conduct doctrine (how the day is lived).** The Today page serves the doctrine layer. The two interlink (the read step resolves from [the Blueprint](the-blueprint.md)) but never merge.

No streaks, no scores, no guilt: an unfinished day simply passes; a finished one gets one quiet golden moment.

## 2. User-facing behavior

**Only the beat you are in is reachable** (Ariel, 2026-07-12). The Morning/Evening control is not a free toggle — it is **locked to the clock**. From 4:00 to 16:59 the morning is live and the evening tab is locked (a padlock, muted, unclickable, with the hint "The night ritual opens at 5:00 PM"); from 17:00 through 3:59 it flips — the morning locks with "opens at 4:00 AM". At 17:00 you can no longer open the morning; at 4:00 you can no longer reopen last night. You only ever act on the ritual you are actually in. The locked ritual's contents are not rendered at all — there is nothing to peek at or edit out of its window. (The cutoffs are the same `NIGHT_START_HOUR` / `DAY_ROLLOVER_HOUR` as everything else in `lib/ritual.ts`; the lock is computed once per mount, so crossing a cutoff with the page open just needs a revisit.) Every submission inside a beat — each question answer, each roadmap walk, each seal — is still recorded to `interactions` and reflected in the rituals rail's keeping-up strip, so the day's record is complete regardless of which beat is currently open.

**Morning.** Today lands on the Morning Scroll tab (cutoffs in `lib/ritual.ts`). If last-night you left a note, the scroll **opens with it**: a gold-washed "✳ From last-night you" card above the sequence, read-only. Below it, the sequence card walks its components in order — typically: **Read the Blueprint** (tap Read → the [immersive reader](#the-immersive-reader) fills the screen, reaching the end marks it read), **Walk today's roadmap** (the list set last night, each entry tapped done as it happens; walking the last one checks the step), **Today's one move** (a question answered in place, typed or spoken). The first unwalked step carries a faint gold wash — the sequence has a "you are here." Plain practices (drink the water) sit on the **rituals rail**: a right-hand panel on desktop, a card under the sequence on the phone. When every component AND every morning-assigned rail practice is done, the card turns gold and offers **Seal the morning**.

**The rituals rail** (reworked 2026-07-12 per Ariel's feedback — no morning/night sections, no double add box): ONE flat list of the person's permanent practices, each row carrying a **time marker** instead of a section — sun (morning), moon (night), sun-moon (**anytime**, indifferent to the time of day). Practices are permanent to the profile and checked fresh each day; morning/night ones count toward their bookend's seal, anytime ones belong to neither seal. Hovering a row reveals a **✕**; deleting always warns first — "Delete this ritual? It'll be removed from all rituals — every day, not just today." — because a delete removes the practice from the profile, not from one day. **One add affordance at the bottom**, closable: open it, type the practice, and pick morning / night / anytime on the segmented picker; enter adds and keeps the form open for the next one. Below the add sits the **keeping-up strip** (folded in 2026-07-13 from the retired "Today's log" card): a quiet last-7-days record — one column per day, a gold dot when that morning was sealed and a dark dot when that night was closed, open rings otherwise. It reads `rituals.history`; no score, no streak.

**Evening.** The Night Scroll tab centers on two components: **Check out** (a reflection question drawn from a rotating bank — a different honest question each night) and **Set tomorrow's roadmap** (the fast builder: type a line, enter, next; optional "+ where / info" per entry; reorder with arrows). A quiet count confirms "3 things set for tomorrow morning." Under the builder, behind a dashed rule, sits **"✳ A note for morning-you — it opens tomorrow's scroll"**: one free-form field, saved on blur, rewritable all evening; leaving it empty (or emptying it) means no note. After the seal it shows read-only as "✳ Left for the morning." **Close the day** seals it.

**Everything is his.** Edit (top-right) manages every component of that ritual in one place: rename, reorder, delete, rewrite inline mantra words or a fixed question, add any kind (+ ritual, + something to read, + question, + roadmap, + read from the Blueprint). A question left without fixed words rotates through the bank. A brand-new user is seeded the default set below; deleting everything leaves it deleted.

**Defaults (new accounts):** morning — Read the Blueprint (from [the Blueprint document](the-blueprint.md)), Drink a glass of water (rail), Walk today's roadmap, Today's one move (fixed question). Night — Check out (rotating question), Set tomorrow's roadmap.

**Existing accounts** are offered the new components exactly once (`rituals.upgradeToSeedVersion`, marked by `settings.ritualsSeedVersion`): appended after their existing items, only into rituals that still have items, deletable forever. The Blueprint read is adopted explicitly — the **read from the Blueprint** button in edit mode, or the Settings card's "Read it each morning" — both idempotent (`rituals.adoptBlueprintRead`).

### The immersive reader

Tapping a read step opens a full-screen, in-page overlay ([ADR 0013](../../decisions/0013-immersive-reader-overlay.md)): the page holds still, the words scroll inside — one measure, generous line height, the doctrine rendered pillar by pillar. Reaching the end marks the step read with a subtle "Read ✓" and releases. A visible close sits in the header at all times (never a scroll trap); closing early marks nothing. Short texts count as read after a considered pause. "Read again" is always offered.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Present (and lock to) the matching ritual | Today loads | The reachable beat = `activeRitual(now)`; morning 4:00–16:59, night 17:00–3:59 (`lib/ritual.ts`). The other beat is **locked** (padlock, unclickable) and its card is not rendered; the toggle shows when it opens (`ritualOpensAtLabel`) | System | reads clock only |
| Seed the defaults | First ever open, zero items | `rituals.seedDefaults`: the 6 typed defaults; one-shot via `settings.ritualsSeededAt`; stamps `ritualsSeedVersion` | System | writes `ritualItems`, `settings` |
| Offer v2 components | First open of an older account | `rituals.upgradeToSeedVersion`: appends missing question/roadmap kinds to non-empty rituals, once (ADR 0011) | System | writes `ritualItems`, `settings.ritualsSeedVersion` |
| Walk / check a component | Tap the circle | `rituals.setChecked` in today's `ritualDays` row | Manual | writes `ritualDays.checkedIds` |
| Read (immersive) | Tap Read on a `read` step | Opens the overlay; scroll-to-end auto-checks the step (ADR 0013) | Manual | writes `ritualDays.checkedIds` |
| Answer the question | Type/speak on a `question` step, then click out (auto-saves on blur — no Save button) | Publishes `ritual_question` `{ritual, day, itemId, question, answer}` to the Bus and checks the step; a non-empty, changed answer only. Answer shows in place and in the [Today log](dashboard.md) | Manual (voice via VoiceField) | writes `interactions`, `ritualDays.checkedIds` |
| Rotate the question | A `question` step with no fixed words | `questionForDay(bank, dayKey)` — deterministic per ritual day (`lib/questions.ts`) | System | none |
| Build tomorrow's roadmap | Evening `roadmap` step: type, enter | `roadmap.add` targeting `nextRitualDayKey(now)` (ADR 0012); `+ where / info` sets `note`; arrows reorder; ✕ removes | Manual | writes `roadmapEntries` |
| Leave a note for morning-you | Evening, the ✳ field under the builder; saves on blur | `morningNote.set` targeting `nextRitualDayKey(now)` — upsert, one note per morning; empty text deletes the note | Manual | writes `morningNotes` |
| Read the note | Morning Scroll renders | `morningNote.forDay(today)` — the "✳ From last-night you" card opens the scroll; absent note renders nothing | System | reads `morningNotes` |
| Walk today's roadmap | Morning `roadmap` step: tap an entry | `roadmap.setDone`; walking the last entry auto-checks the component | Manual | writes `roadmapEntries.doneAt`, `ritualDays.checkedIds` |
| Add to today late | Morning roadmap, any time | Same fast input writes to today's key | Manual | writes `roadmapEntries` |
| Check a practice | Tap in the rituals rail | Same `rituals.setChecked` — one check state per assignment (morning/night rows feed their seal; `any` rows feed none) | Manual | writes `ritualDays.checkedIds` |
| Add a practice | The rail's single bottom add (closable): type + pick morning/night/anytime | `rituals.addItem(kind "do", ritual: morning\|night\|any)`; `any` is rejected for non-`do` kinds | Manual | writes `ritualItems` |
| Delete a practice | Hover ✕ → confirm the warning | `rituals.removeItem` — removes it from the profile (every day); the warning is never skipped | Manual | deletes `ritualItems` |
| Seal the ritual | All components + that bookend's practices checked → confirm | `rituals.complete`: verifies against current items, stamps `completedAt`, publishes `ritual_completed` | Manual | writes `ritualDays`, `interactions` |
| Edit the ritual | edit → inline | `rituals.addItem` (any kind, `source` for reads) / `updateItem` (title, inline words, fixed question) / `removeItem` / `moveItem` | Manual | writes `ritualItems` |
| Adopt the Blueprint read | edit-mode button / Settings card | `rituals.adoptBlueprintRead`: ensures the [Blueprint document](the-blueprint.md) exists and prepends one blueprint-sourced read to the morning; idempotent | Manual | writes `blueprint?`, `ritualItems` |
| Read completion history | Rituals rail renders | `rituals.history(sinceDay)` feeds the keeping-up strip at the foot of the rail | System | reads `ritualDays` |

No Coach path yet (§9); the Coach sees completions and answers through the Bus.

## 4. Dynamics and interactions with other elements

- **Hosted by [Home (Today)](dashboard.md):** the sequence card renders inside the toggled beat; the rituals rail is the page's right-hand panel (desktop) or a card below (phone). The Dashboard stays draw-only.
- **Reads from [the Blueprint](the-blueprint.md):** a `read` step with `source: "blueprint"` resolves its words live from the person's Blueprint document — no duplicated text; a Settings edit tonight is tomorrow's read.
- **Publishes to the Sessions stream:** `ritual_completed` on seal and `ritual_question` on every answer land in `interactions`, so the Mirror/Coach fold conduct and reflection into context, and the [Today log](dashboard.md) renders the day's journal from them.
- **The roadmap loop is self-contained:** tonight's builder and tomorrow's spine are the same `roadmapEntries` rows under one target-day key (ADR 0012) — no handoff, no copy.
- **Sibling of the [Journal](journal.md):** the Journal's adaptive beats and this element share the bookend moments; neither owns the other. The question bank is the fixed-prompt cousin of the Journal's adaptive prompts.
- **Seeded by the doctrine** ([`../../research/blueprint-for-living.md`](../../research/blueprint-for-living.md)) — via the Blueprint document's seed and the default components.

## 5. States

- **Unseeded / fresh day / in progress / all-checked / sealed / empty ritual / editing:** as v1 (empty day rows are created on first check; gold at all-checked; `completedAt` locks checks; delete-all invites, never re-seeds).
- **Beat locked (the off-hours ritual):** the non-current tab is a padlock, muted and unclickable, with an "opens at HH:MM" hint; its card is not rendered. Morning locks at 17:00, night at 4:00.
- **Sequence position:** the first unchecked spine component carries the "current" wash; sealed or fully-walked rituals have none.
- **Question answered:** the field stays live, seeded with the saved answer; it auto-saves on blur (and after a voice take). Re-editing then clicking out logs a new event (history keeps both, the step shows the latest); an empty or unchanged blur logs nothing.
- **Roadmap, morning, nothing set:** "No roadmap was set last night. Set the first thing now:" — the fast input is right there.
- **Roadmap, evening:** the builder always shows the count set for tomorrow; entries reorder/remove inline.
- **Note, evening:** the ✳ field mirrors the saved note (another device's edit lands unless mid-edit); after the seal it is read-only ("Left for the morning") and hidden entirely if empty.
- **Note, morning:** present → the gold ✳ card leads the scroll, read-only; absent → nothing renders (no empty-state nag).
- **Reader open:** page scroll locked, close always visible; finish confirmation then release.
- **Rail with no practices:** a quiet invitation + the single add.
- **Deleting from the rail:** always behind the warning box; the confirm names the real consequence (gone from every day).

## 6. Edge cases

- **Past midnight (4am rollover), item added after checks, delete-all honored, double confirm, unchecking after seal refused, clock skew, two devices, signed out:** all as v1 / ADR 0009 — unchanged by the restructure.
- **Roadmap set at 1:30am** targets the same morning as one set at 23:00 (ADR 0012; tested on the boundary, month, and year lines). The note rides the same key, so the same holds for it.
- **Note emptied after being written:** `morningNote.set` with blank text deletes the row — the morning never opens on a blank note.
- **Roadmap entries done ≠ ritual sealed:** entries carry their own `doneAt`; the component's check is auto-set when the last entry is walked but stays manually checkable (an empty-roadmap morning can be checked through).
- **Blueprint read with no document yet:** opening the reader adopts the document first (idempotent); the step's preview says the words live in the Blueprint.
- **A question step with no fixed words** rotates deterministically per ritual day — the same question all day on every device, a new one after 4am.
- **Cutoff crossed with the page open:** the reachable beat is computed once per mount (like the day keys), so a tab left open across 17:00 or 4:00 still shows the old beat until the next visit/refresh. Accepted, consistent with the day-key handling.
- **An unfinished beat at its cutoff just passes:** if the morning was never sealed by 17:00 it simply becomes unreachable — no nag, no penalty; its partial state persists in the day's row as history, and every submission made in it stays in the Today log.
- **Deleting the roadmap/question components** is honored like any delete (one-shot upgrade never returns them); the "+ roadmap" edit button hides while one exists.
- **Legacy inline mantras** (v1 "read" items) keep their words and their inline editing forever; nothing was migrated ([ADR 0011](../../decisions/0011-typed-ritual-components.md): additive only).

## 7. AI involvement

None at runtime. The question bank is code-resident with deterministic rotation (deliberately: no AI generation in this pass). The VoiceField's transcription/shaping applies to question answers as everywhere else. Parked: the Coach proposing components, drift signals off completion history, adaptive question selection.

## 8. Data touched

Exact shapes in [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Owned:**
- `ritualItems`: `{ userId, ritual: morning|night|any, kind: do|read|question|roadmap, title, content?, source?, order, createdAt, updatedAt }` — the typed components (ADR 0011). `content` = inline read words or a fixed question; `source` (reads) = `inline` | `blueprint`; `ritual: "any"` is a time-indifferent practice (kind `do` only, enforced server-side).
- `ritualDays`: per-day check state + completion history, kind-blind (ADR 0009). Rows exist per assignment (`morning`, `night`, `any`); `any` rows carry daily checks but are never sealed (`rituals.complete` only accepts morning/night).
- `roadmapEntries`: `{ userId, day, text, note?, order, doneAt?, createdAt }`, indexed `by_user_day [userId, day, order]` — the roadmap loop's rows, keyed by TARGET day (ADR 0012).
- `morningNotes`: `{ userId, day, text, createdAt, updatedAt }`, indexed `by_user_day [userId, day]` — the note to morning-you, one per TARGET morning (same key convention as the roadmap); upsert on write, deleted when emptied.

**Writes elsewhere:** `settings.ritualsSeededAt` / `settings.ritualsSeedVersion` (seed + upgrade markers); `interactions` (`ritual_completed`, `ritual_question`); `blueprint` (only via the idempotent adopt).

**Drawn:** `blueprint.content` (blueprint-sourced reads), the clock.

**Code:** `convex/rituals.ts`, `convex/roadmap.ts`, `convex/morningNote.ts`, `convex/blueprintDoc.ts`, `lib/ritual.ts` (cutoffs, day keys, spans, `nextRitualDayKey`), `lib/questions.ts` (the bank), `components/today/RitualSequence.tsx` (the spine + edit + the note's two faces), `components/today/RitualsRail.tsx` (the rituals rail), `components/today/ImmersiveReader.tsx` (the reader), wired in `components/today/Today.tsx`. Tests: `tests/ritual.test.ts`, `tests/questions.test.ts`, `tests/convex/rituals.test.ts`, `tests/convex/roadmap.test.ts`, `tests/convex/morning-note.test.ts`, `tests/convex/day-log.test.ts`.

## 9. Open questions

- **User-adjustable cutoffs** (`NIGHT_START_HOUR`, `DAY_ROLLOVER_HOUR` → `settings`). When?
- **Coach involvement:** proposing components, nudging an unsealed evening, adaptive questions — all must clear the earned-interruption bar.
- **History surface:** the 7-day strip lives at the foot of the rituals rail (moved there 2026-07-13 when the standalone Today's log was removed); a quiet month view remains open. Still not a streak counter.
- **Un-seal:** is a sealed day truly immutable?
- **Roadmap carry-over:** should an unwalked entry offer itself to tomorrow's builder ("still on it?"), or is a dropped entry allowed to just pass?
- **Question bank growth:** user-authored questions in the bank? Answers feeding the Mirror more directly?
- **Drag reorder** on desktop.
- **The flowing scroll:** a one-step-at-a-time, auto-advancing reading flow for the scrolls (beyond the current stacked card) — directions explored in [`../../design/scroll-flow.md`](../../design/scroll-flow.md); unbuilt, needs the gate before any build.
