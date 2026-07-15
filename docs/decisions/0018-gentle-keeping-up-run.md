# 0018. A gentle keeping-up run (the one carve-out from "no streaks")

**Status:** accepted (live) · **Date:** 2026-07-15

## Context

LifeGuide's soul rejects streaks, loudly and on purpose. The rejection is
research-backed, not stylistic: the reference reading found ritual bookends
**out-retain** streak mechanics, and that streak guilt corrodes the intrinsic
motivation the product is built to protect (see
[`../research/wiki/habits-stabilization-and-consistency.md`](../research/wiki/habits-stabilization-and-consistency.md),
[`../research/wiki/raw/sources/lally-habit-formation.md`](../research/wiki/raw/sources/lally-habit-formation.md):
*"Do not build habit UX around brittle streak worship"*, and
[`../research/wiki/raw/sources/ryan-deci-self-determination-theory.md`](../research/wiki/raw/sources/ryan-deci-self-determination-theory.md):
*"Avoid streak guilt as the main engine"*). The stance is written into the
source of truth ([`concept-and-soul.md`](../product/concept-and-soul.md)), the
[PRD](../product/prd.md) non-goals, the
[interaction principles](../design/interaction-principles.md), and the app's own
mockup (the Coach promises *"I'll never guilt you with streaks"*; the evening
screen reads *"No score. No streak."*).

The owner (Ariel, 2026-07-15) nonetheless wants the keeping-up strip to **keep a
streak**: the daily ritual should reset each day, and a run of complete days
should be counted and shown. The two positions are only reconcilable if we are
precise about *what* the research condemns — **streaks as the engine**: a meter
you serve, a red/broken state that shames a miss, a longest-ever high score that
turns a good practice into a thing to protect. That is the failure mode. A quiet,
penalty-free acknowledgment that you have shown up N days running is not that.

## Decision

Add **one** narrow, deliberate carve-out to the no-streaks principle: a **gentle
keeping-up run**, and nothing more.

1. **What it counts.** Consecutive **kept** days, where a kept day is one whose
   **both bookends were sealed** (the Morning Scroll *and* the Night Scroll). The
   run therefore counts nothing new — it counts the ritual's own completion,
   which is exactly the behavior the bookend design already rewards.
2. **Gentle by construction (the guardrails that keep this from becoming a streak
   mechanic):**
   - **No penalty, no shame.** A missed day does not produce a broken/red state,
     a warning, or a notification. The run simply resets and starts again at the
     next kept day.
   - **Today is never held against you.** A day still in progress does not break
     the run; the count reflects the completed history behind it
     (`currentStreak` skips an unfinished final day).
   - **No high score.** We track the *current* run only — no "longest ever,"
     nothing to protect or beat.
   - **Zero is silent.** When the run is 0 the count is not rendered at all — no
     "0 days," no nudge. It appears only to quietly affirm an existing run.
3. **Where it lives.** A small text count beside the existing "Keeping up" label
   on the rituals rail (*"5 in a row"*), in the calm gold of the morning dot. The
   7-day dot strip is unchanged; the run is derived from the same sealed-day
   history, over a 120-day window (`STREAK_WINDOW`); a run past the window reads
   as "N+" rather than under-reporting.
4. **Derivation, not new state.** No schema change. The run is computed from the
   existing `ritualDays` completion rows via `rituals.history`; the pure counting
   logic is `currentStreak` in `lib/ritual.ts`. The daily reset itself is not new
   — it has always been structural (ADR 0009): a new day has no `ritualDays` row,
   so it starts fresh.

## Consequences

- **This is the boundary, and it is defended.** The carve-out is the current run
  and only the current run. Longest-ever streaks, streak-freeze mechanics, streak
  notifications, streak-loss states, points, or badges remain out of scope and
  still violate the principle — a future proposal for any of them goes through the
  commitment gate against *this* ADR, not a blank slate.
- **The no-streaks language elsewhere is narrowed, not deleted.** The source of
  truth, the PRD, and the interaction principles keep rejecting streaks *as an
  engine* and point here for the one exception. The evening screen's "No score.
  No streak." copy and the Coach's "never guilt you with streaks" promise stay
  true: nothing here scores or guilts.
- **Both-bookends is a deliberately honest bar.** It means a day you only did the
  morning does not extend the run. That is the point — the run tracks full days
  kept — and it is softened by the no-penalty design. The threshold is a single
  derivation in `RitualsRail` (both `morning:` and `night:` sealed), trivially
  changed to "either bookend" if the honest bar proves too steep in practice.
- **Reversible.** Because it is pure derivation with no stored state, dialing the
  run back to the plain dot strip is a component-only change; nothing to migrate.
