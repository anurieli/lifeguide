# Blending the vision board, the horizons, and goals into one alignment spine

**Status:** raw (parked 2026-07-15, mid-session) · **Tracks:** [ARI-103](https://linear.app/cuttheedge/issue/ARI-103)

> Parked by Ariel while building a "Profile" surface: "this is a thought exercise as much as a build." The Profile idea surfaced a much bigger concept that needs design before code. A working Profile prototype was built this session and **reverted** (see §Prototype).

## The question

Should the **vision board**, the **horizons ladder** (5yr → today), and **goals** be one blended system — where the far future is *seen* on the board, goals are *measurable with deadlines*, and today shows only a *calm glimpse* of whether you're aligned — rather than three separate surfaces?

## The concept (Ariel's words, synthesized)

- **The vision board is where you lock in the far future.** "Where you want to be in 5 years+" and "the kind of life you want in ~1 year (the near future)" are *felt / visual*, not text lines. They belong on the board (imagery, aspirations — which already holds captures tagged to pillars). The far horizon rungs should be **anchored in / expressed through the board**, not duplicated as plain text in a ladder.
- **Goals are measurable.** A goal has a **measurable outcome AND a deadline** — not just a sentence. Data-model implication: goals need `measurableOutcome` + `deadline`. This should **unify with the Goals board (Orbit)**; today there's overlap/confusion between Orbit "Big Things" and the new `horizons` rungs — they want to be the same object seen through different lenses.
- **Alignment is the through-line.** The system's question: *are your goals aligned to the 1-year life you want, and does today point at it?* The near horizon should **hint** into the goal section and the daily.
- **Today / tonight must not bombard.** Just a **glimpse** — what you're doing, what you're aiming for, whether it lines up — never the full ladder (calm principle: `docs/design/interaction-principles.md`).

## A candidate reframe (to pressure-test, not commit)

Make **`goal` a first-class object**: `{ outcome (measurable), deadline, laddersTo (a horizon), anchor (a vision-board node/region) }`. Then each surface is a **lens on the same objects**:

- **Vision board** = the felt far future (5yr / 1yr life) + the anchors goals point at.
- **Goals** = the measurable, deadlined ladder, each rung laddering up to the vision.
- **Today / tonight** = a calm glimpse of the nearest rung + today's move + whether they align.

This would subsume the current `horizons` table and the Orbit `goals` table into one model — a big architectural change, hence the park.

## Open questions

- Where does "the 1yr / 5yr life you want" live — board regions/imagery, text rungs, or both (board = felt, ladder = named)?
- The `goal` object shape: `measurableOutcome` + `deadline` + `laddersTo` + `anchor` — confirm, then migrate/merge `horizons` + Orbit `goals`.
- How the daily "glimpse" shows alignment without bombarding — one quiet line under today's move? An "aiming at: <near horizon>" hint?
- Does the vision board become the **primary** home of the far horizons, with Today / Goals as calmer lenses?
- Relationship to Todoist sync (Orbit already syncs) once goals gain measurable outcomes + deadlines.

## The Profile surface (the smaller piece inside this)

Reachable from the account dropdown (Settings + Account) → add **Profile**: one place showing **everything that makes up the person** — Identity (the Mirror), North Star, the horizons/goal ladder, the Core, the Blueprint, the pillars — mostly read with some inline edit, each card tagged with **where it's editable** (also Ariel's live map of what's built + editable). Rebuild once the blended model is decided, so the Profile reflects the real object shapes.

## Prototype (built + reverted this session)

A working Profile was implemented and then reverted to keep `main` clean while the model is rethought. To resurrect: `components/profile/Profile.tsx` (aggregation cards + an "Editable here / Edit in <surface>" tag per artifact), an account-menu "Profile" entry + a `"profile"` `View` in `components/shell/{Rail,AppShell}.tsx` (+ the `CoachDock` `CTX` map), reusing the existing `HorizonsCard` and the `mirror` / `settings` / `core` / `blueprint` / `pillars` queries. ~1–2 hours to rebuild.

## Already shipped — do NOT redo

The plain `horizons` ladder (5yr → today, editable rungs) + the daily-quote tidbit agent already merged (PR #57). This note is about **evolving** that into the blended, measurable, board-anchored model — not rebuilding it.

## Related notes

- [`current-state-gap-engine.md`](current-state-gap-engine.md) (ARI-16) — "where you are now" vs "where you want to be" + the gap over time; directly adjacent to the alignment through-line here.
- [`living-person-model.md`](living-person-model.md) (ARI-17) — the parts of a person as editable data; the Profile is a surface over that.

---

## Pressure-test findings — 2026-07-18

**Scope of this pass:** analysis only, per direction on ARI-103 ("this is a thought exercise as much as a build" — reserved for Ariel to decide). No code, no schema, no UI touched. Grounded against what is actually built today, read directly from `convex/schema.ts`, `convex/horizons.ts`, `convex/goals.ts`, `components/today/HorizonsCard.tsx`, and the current feature docs (`horizons.md`, `goals.md`, `vision-board.md`, `pillars-and-goals.md`).

### A third proposal already sits in the docs, unreconciled

Before the two forks: **`docs/product/features/pillars-and-goals.md` already describes a *third* `goals` shape**, proposed but unbuilt, that overlaps heavily with this note's "candidate reframe":

```
goals (proposed, pillars-and-goals.md): {
  userId, pillarId?,
  horizon: life | five_year | yearly | monthly | daily | north_star,
  title, why?, deadline?,
  status: active | done | dropped,
  parentGoalId?,
  malleability: green | yellow | red,
}
```

This is a *different table* from the Orbit `goals` table that is actually built in `convex/schema.ts` (name, parentId, kind, status, area, why, sortOrder, todoistProjectId) — same table name, two irreconcilable shapes, one built and one only in a doc. `docs/architecture/elements-and-context.md` treats "Pillars & Goals" (this proposed shape) as the canonical owner of `goals` in its element map, which as written today is simply inaccurate — Orbit is what is live. This means the app already has **three independent goal concepts on paper**: Orbit `goals` (built), `horizons` weekly/daily rows (built, not really "goals" as rows — just up-to-3 checkable strings), and the pillars-linked `goals` (proposed, unbuilt, closest in shape to this note's candidate reframe: `horizon`≈`laddersTo`, `deadline` already present, `parentGoalId`≈nesting). **Whatever Ariel decides on the two forks below should also retire or fold in the pillars-and-goals proposal explicitly** — three unreconciled "goal" shapes is worse than any one of the three individually. This should be flagged as a standing doc inconsistency regardless of which fork wins.

### Fork 1 — force `measurableOutcome` + `deadline` on every goal, or soft nudge?

**What's built today, concretely:**
- Orbit `goals`: `status` is a union of `active | planning | ongoing`. **`ongoing` is a first-class, deadline-less state** — the doc's own example area chips are business/personal/people, and the seed spec (`_source-apps/goal-manager/Orbit-PRD.md`) frames Big Things as "the few projects/goals that actually matter," which in practice includes things like an ongoing side income stream, a standing family commitment, a "keep learning guitar" — none of which have a natural single deadline. There is no `deadline` field on `goals` at all today (only `goalTasks.dueDate`, per-task).
- `horizons` weekly/daily rows: the "deadline" *is* the period key (`this week`, `today`) — implicit, not a stored field. Standing rungs (5yr/1yr/1mo) are single free-text lines with no measurable-outcome structure; `settings.northStar` is a single sentence.

**Tradeoff, concretely against what's built:** forcing `measurableOutcome` + `deadline` on every goal breaks the `ongoing` status outright — there is no way to make "keep the friendship with X alive" or "grow the freelance pipeline" measurable-with-a-deadline without either lying (inventing a fake date) or demoting it out of the goal system entirely, which contradicts Orbit's own PRD-backed design (`ongoing` exists specifically for this). A soft nudge preserves `ongoing` as-is and only asks for structure when the person is willing to commit it.

**Recommendation: soft nudge, not a hard requirement — but split the ask.** Require an **outcome** (a one-line "done looks like ___," which is cheap to ask and rarely refused) far more insistently than a **deadline** (which should stay optional, with `ongoing` remaining a real, deadline-less status). This matches what's already live (Orbit's `ongoing` status is not a bug to design away, it is signal that not everything in a person's life ends) and avoids the failure mode the note itself worries about — bombarding/forcing structure the person doesn't have yet. Concretely: keep `status: active|planning|ongoing`, add `measurableOutcome?: string` encouraged at creation (inline prompt, skippable), add `deadline?: string` genuinely optional and hidden by default unless `status !== "ongoing"`.

### Fork 2 — does Orbit *become* the laddered goal system, or stay a separate wide/someday space?

**Rework cost, concretely:**
- Orbit is not a thin table. `convex/goals.ts` (303 lines) + `convex/todoist.ts` implement a **two-way Todoist sync keyed on `goals` = Todoist projects** (`todoistProjectId`, push/pull reconciliation, `saveToken` connect-test). A `goals` row is not just a plan node, it is a **sync anchor**: each one can be a live mirror of an external project. `goalTasks` (another 178+ lines worth of logic inline in `goals.ts`) carries its own inbox/today/waiting triage model with aging, priority, and per-task Todoist links — none of which the `horizons` model has any equivalent of (horizons rows have no sub-tasks, no due dates, no external sync).
- `components/goals/Goals.tsx` is a 500+ line board+queue UI (card grid, area filters, drill-in modal, triage tabs) — a materially different interaction model from `HorizonsCard.tsx`'s compact ladder-of-lines-under-Today-and-North-Star card.
- Folding Orbit fully into the horizons ladder means either (a) every Orbit Big Thing becomes a horizon rung, which breaks because horizon rungs are single lines capped at 3-per-period with no sub-tasks and no Todoist project mapping, or (b) the ladder grows task lists and Todoist sync, which is really "rebuild horizons as Orbit," not a merge.

**Recommendation: do not merge the tables.** The **lean framing already in this note is right** and matches the actual code shapes far better than the "candidate reframe" full-fusion version: **Orbit stays the wide, someday, task-bearing space (and keeps owning Todoist sync); the horizons ladder stays the measurable, time-nested near-term.** Instead of one fused object, add a **thin link**: a `laddersTo?: Id<"goals">` (or the reverse, a goal-side `horizonRung?`) so a horizon rung can point at an Orbit Big Thing it's in service of, without either table absorbing the other's fields. This is a small, additive schema change (one optional field on `horizons`, no migration of existing rows, Todoist sync untouched) versus the full-fusion reframe, which would require redesigning Todoist sync's unit of work. It also resolves this note's own stated confusion ("today it overlaps/confuses with the new horizons rungs") without the larger risk: the confusion is about *presentation* (two goal-ish surfaces with no visible relationship), which a link field fixes, not about the underlying *data* needing to be one table.

**On the anchor to the vision board:** the same pattern applies — `anchor?: Id<"nodes">` (optional) on a horizon rung or an Orbit goal, not a new required field, matching how `nodes.pillars` already works as a soft cross-reference rather than a hard foreign-key relationship elsewhere in the schema.

### Sketch: what the "lens" model looks like if adopted (this note's lean version, not the full reframe)

Prose, not code — for evaluation only:

- **`horizons` rows** (existing table, additive change only): gains two optional fields, `laddersTo?: Id<"goals">` (which Orbit Big Thing this rung is in service of, if any) and `anchor?: Id<"nodes">` (which board card is the felt picture of this rung, if any). Standing rungs (5yr/1yr) are the ones most likely to carry an `anchor` (the felt far future lives on the board); weekly/daily rungs are the ones most likely to carry `laddersTo` (today's move is in service of a Big Thing).
- **`goals` (Orbit) rows**: unchanged shape, plus the soft-nudge `measurableOutcome?` from Fork 1. No new required fields, `ongoing` survives.
- **Vision board `nodes`**: unchanged. A node already can be referenced by id from elsewhere (that's how `captureId` links a node back to its capture) — a horizon rung's `anchor` follows the same pattern, not a new mechanism.
- **Each surface becomes a lens that reads across these three tables via the optional links, rather than a lens over one fused object:**
  - *Vision board* = `nodes`/`edges` as today, no change — still "the felt far future," now additionally the thing horizon rungs can point at.
  - *Goals (Orbit)* = `goals`/`goalTasks` as today, no change to its board/queue UI — gains a small "laddered from: <horizon rung>" backlink chip on a card if any rung points at it, so the "overlap/confusion" the note flags becomes a visible, useful relationship instead of two silent parallel systems.
  - *Today / Horizons card* = unchanged UI, each rung optionally shows a quiet "→ toward: <goal name>" or a small thumbnail of its `anchor` node — this is the "calm glimpse" the note asks for, and it is additive to the existing card, not a rebuild.
- This sketch deliberately stops short of the note's "candidate reframe" (`{ outcome, deadline, laddersTo, anchor }` as one new first-class object subsuming both tables) — given the Todoist-sync coupling found above, fusion is the more expensive and more fragile path for a benefit (one object instead of two linked ones) that a pair of optional reference fields already delivers.

### The Profile surface — separable, ship independently

Confirmed genuinely separable, for two reasons found in the code, not just asserted from the note:
1. The prototype's reuse list (`HorizonsCard`, `mirror`/`settings`/`core`/`blueprint`/`pillars` queries, per the note's own §Prototype) reads existing data as-is; nothing about an aggregation/read surface requires the underlying `horizons`/`goals` schema to change first.
2. The additive links sketched above (`laddersTo?`, `anchor?`, `measurableOutcome?`) are optional fields on tables that already exist — a Profile card built today against current `horizons`/`goals` shapes would keep rendering correctly after either fork lands; it would only need a small visual addition (a backlink chip, an anchor thumbnail), not a rewrite. The note's own "~1-2h to resurrect" estimate for the reverted prototype stands independent of this decision.

**Recommendation:** resurrect the Profile prototype now if a quick, low-risk win is wanted; it does not need to wait on Fork 1 or Fork 2 being decided.

### Summary of recommendations

| Fork | Recommendation | Why (grounded in code) |
|---|---|---|
| 1. Force measurable outcome + deadline? | Soft nudge; require outcome more than deadline; keep `ongoing` deadline-less | Orbit's `ongoing` status is load-bearing today; forcing a deadline breaks a real, used state |
| 2. Orbit becomes the ladder, or stays separate? | Stays separate; add optional `laddersTo`/`anchor` link fields | Orbit's Todoist sync is keyed on `goals` = projects; full fusion would force a redesign of that sync, not just a data-model tidy-up |
| Third proposal (`pillars-and-goals.md`'s unbuilt `goals`) | Retire or explicitly fold in, whichever fork wins | Currently a second unreconciled "goals" shape sits in the docs alongside the built Orbit table and this note's reframe — three total, on paper |
| Profile surface | Ship independently, now | Reads existing shapes as-is; additive fields from either fork don't force a rewrite |
