# Blending the vision board, the horizons, and goals into one alignment spine

**Status:** raw (parked 2026-07-15, mid-session) · **Tracks:** _Linear issue TBD — the MCP was down when this was parked; mirror to the LifeGuide project when reachable._

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
