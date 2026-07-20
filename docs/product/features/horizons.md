# Horizons — the nested goal ladder

**Status:** built · **Element of:** the spine (the plan layer of Today) · **Owns:** `horizons`

> The object-oriented backbone of a person's plan: one nested ladder from the far North Star down to today, every rung a small editable object. The far rungs give direction; the near rungs (this week, today) are crafted each morning and reviewed each night.

## 1. Purpose

Lostness is partly not knowing how today connects to the life you want. Horizons makes that ladder explicit and always-present: **North Star → 5-year → 1-year → 1-month → this week → today**. It sits low in the day's spine — **after the ritual scroll and just before the seal** (moved there 2026-07-20, Ariel: the scroll leads, then you set your horizons, then you close the day) — so setting the near rungs is the last thing the person shapes before sealing. The person can always see the through-line from "the most important thing today" up to who they're becoming, and edit any rung in place. It is the planner's spine the rest of the day hangs off (the morning crafts the near rungs; the night reviews them; the daily-quote agent and the Coach draw on the standing rungs for context).

The ladder is deliberately distinct from the [Goals board (Orbit)](goals.md): Orbit is the wide space of *Big Things* with a why and a triage inbox; Horizons is the *time-nested* through-line — one line per horizon, up to three goals for the near periods. They complement (a Big Thing can inform this month's rung) but neither owns the other.

## 2. User-facing behavior

A card low in Today — below the ritual scroll, above the seal — titled **Horizons** (with a layered icon). It leads with the **near** rungs because those are what the day acts on:

- **Today** (a target icon, gold-emphasized): up to three goals — *"What's the most important thing today? Add up to two more."* Each is a checkable line; type a goal and hit enter, click a line to edit, hover to remove. In the **night scroll** the label reframes to **"Today — what got done?"** so the same three lines become the review.
- **This week** (a calendar icon): up to three goals for the week. On **Sundays** the label nudges **"This week — Sunday, set it."** The week's goals persist all week (Mon–Sun), whichever day you set them.
- **The whole ladder** (a toggle): expands the **standing** rungs — **5-year vision**, **1-year goal**, **This month** — each a single evolving line you click to edit. Folded away by default so the card stays calm; opened when you want to set direction or feel the through-line.

The **North Star** stays its own card near the top of Today (already `settings.northStar`), the ladder's crown; Horizons renders its rungs lower down, after the scroll. Nothing here nags: an empty rung shows its crafting prompt in muted italics and waits.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Show the ladder | Today loads | `horizons.ladder({week, day})` returns every rung's rows for the standing bucket, this week, and today (keys from `lib/horizons.ts`) | System | reads `horizons` |
| Set a standing rung | Click a 5yr/1yr/1mo line, edit, blur | `horizons.setStanding({scope, text})` — upserts the one row; empty text clears it | Manual | writes `horizons` |
| Add a goal | Type in the Today / This-week add row, enter | `horizons.addGoal({scope, period, text})` — appends; capped at 3 per period server-side | Manual | writes `horizons` |
| Edit a goal | Click a goal line, edit, blur | `horizons.update({id, text})` — empty text deletes it | Manual | writes `horizons` |
| Check a goal done | Tap the circle (either beat; the night review is the natural moment) | `horizons.setDone({id, done})` — sets/clears `doneAt`; standing rungs are not checkable | Manual | writes `horizons.doneAt` |
| Remove a goal | Hover a goal → ✕ | `horizons.remove({id})` | Manual | deletes `horizons` |

No Coach path yet (§9) — but the standing rungs are already read as context by the [daily-quote agent](daily-tidbit.md) and are available to the Coach through the same server-side reads.

## 4. Dynamics and interactions with other elements

- **Hosted by [Home (Today)](dashboard.md):** the card renders below the ritual scroll and above the seal (`RitualSeal`); beat-aware via the `mode` (`am`/`pm`) Today already computes.
- **Crowns from `settings.northStar`:** the North Star is not a `horizons` row — it stays in settings (referenced across the app) and is the ladder's crown, shown by the North Star card near the top of Today.
- **Drawn by the [daily tidbit agent](daily-tidbit.md):** `dailyTidbits.contextForInternal` reads the standing rungs (`period: "std"`) so the daily quote is chosen against the person's actual direction, not just the Mirror.
- **Sibling of [Goals / Orbit](goals.md):** the time-nested ladder vs. the wide board of Big Things; complementary, neither nested in the other.
- **Feeds the night review:** the daily goals set in the morning are the exact lines the night scroll reviews ("what got done?") — same rows, no copy.

## 5. States

- **Empty rung:** shows its crafting prompt (muted italic); the standing rungs, once the ladder is opened, invite a first line.
- **Time-boxed, in progress:** up to three goals; the add row hides at three (the cap is enforced server-side too).
- **Checked:** a goal with `doneAt` shows struck-through with a gold check; un-checkable back.
- **New period:** a new ritual day gets a fresh empty **Today**; a new week (Monday) gets a fresh empty **This week**. Past periods' rows persist as history (addressable by their old key) but are simply not shown.
- **Ladder folded / open:** the far rungs are hidden by default; "the whole ladder" reveals them.

## 6. Edge cases

- **Period boundaries (4am / Monday):** the day key uses the ritual 4am rollover (`ritualDayKey`); the week key is the Monday of that day's ISO week (`weekKeyFor`), computed with UTC math on the key so it is timezone-stable. A goal set at 1:30am belongs to the same ritual day it was the evening of.
- **Sunday planning:** Sunday only changes the *label* nudge; the week still belongs to its Monday, so goals set Sunday for "this week" land on the current Mon–Sun bucket. (Whether Sunday should target the *upcoming* week is an open question, §9.)
- **The fourth goal:** refused server-side (`horizons.addGoal` throws "At most three goals") and the add row is hidden client-side at three.
- **Standing rung checked:** `setDone` refuses standing scopes; only weekly/daily goals are checkable.
- **Empty edit:** editing any rung/goal to blank deletes that row (a cleared rung), never leaves a blank line.
- **Two devices / signed out:** reactive like everything else; unauthenticated `ladder` returns null and the card renders nothing.

## 7. AI involvement

None in the ladder itself — it is pure person-authored data. The standing rungs are *read as context* by the [daily-quote agent](daily-tidbit.md) (and are available to the Coach). Parked (§9): the Coach proposing or pressure-testing rungs, and deriving this-week/today suggestions from the longer horizons + Goals.

## 8. Data touched

Exact shape in [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Owned:**
- `horizons`: `{ userId, scope: five_year|one_year|one_month|weekly|daily, period, text, order, doneAt?, createdAt, updatedAt }`, indexed `by_user_scope_period`. `period` = `"std"` for standing rungs, the week's Monday key for weekly, the ritual day key for daily (`lib/horizons.ts periodKeyFor`). Standing rungs hold one row (order 0); weekly/daily hold up to `MAX_PER_PERIOD` (3) ordered, checkable rows.

**Drawn:** `settings.northStar` (the crown, shown by the North Star card, not stored here).

**Code:** `lib/horizons.ts` (scopes, cadence, `periodKeyFor` / `weekKeyFor` / `isWeekPlanningDay`), `convex/horizons.ts` (ladder + rung mutations), `components/today/HorizonsCard.tsx` (the card, wired in `components/today/Today.tsx`). Tests: `tests/horizons.test.ts`, `tests/convex/horizons.test.ts`.

## 9. Open questions

- **Sunday targets which week?** Nudge for the *current* week (as built) or pre-fill the *upcoming* one?
- **Carry-over:** should an unchecked daily/weekly goal offer itself to the next period ("still on it?"), or just pass?
- **Coach involvement:** proposing rungs, deriving today's top-3 from the month + Goals, drift signals when the daily goals stop laddering up to the North Star.
- **Reorder** of the three goals (drag), and whether "the most important thing" should be pinned first.
- **History surface:** a quiet review of past weeks/days' goals (kept in the table, not yet shown).
- **Relationship to the roadmap:** the morning roadmap (execution list) vs. today's Horizons goals (priorities) — keep distinct, or let one seed the other?
