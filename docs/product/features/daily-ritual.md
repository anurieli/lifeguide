# Daily Ritual

**Status:** built · **Element of:** the Sessions stream (the two calm bookends of the day) · **Owns:** `ritualItems`, `ritualDays`

> Two small user-editable checklists, one for the morning and one for the night, that turn the start and end of the day into a digital ritual: read the mantra, drink the water, plan the day; check out, prep tomorrow; seal it.

## 1. Purpose

The soul's promise is two calm bookends a day. The [Journal](journal.md) (adaptive prompts) is the reflective half of those bookends; the Daily Ritual is the **conduct** half: the small physical and mental steps a person decides his mornings and nights are made of, done on purpose, every day. It operationalizes the daily-conduct doctrine in [`../../research/blueprint-for-living.md`](../../research/blueprint-for-living.md) ("discipline over motivation, small actions compounding, keep promises to yourself"): not what to reflect on, but what to *do*. Checking every box and sealing the ritual is a kept promise to yourself, which is exactly the self-trust mechanism the doctrine names. No streaks, no guilt: an unfinished day simply passes; a finished one gets one quiet golden moment.

## 2. User-facing behavior

The person opens the Today surface. The Morning/Evening toggle already lands on the half of the day he is in (cutoffs in `lib/ritual.ts`), and the matching ritual card sits at the top of the beat: **Morning ritual** or **Night ritual**, an ordered list of small steps. Two kinds of step: a **do** (a plain checkbox task, "Drink a glass of water") and a **read** (a mantra or short text whose words are displayed right there to be read; tapping it marks it read). He taps steps off as he does them; a muted `2/3` count keeps quiet track.

When the last step is checked, the card turns gold and offers one action: **Seal the morning** (or **Close the day**). Confirming stamps the completion for that day and the card settles into a calm sealed state ("Morning sealed · 7:42 AM"). Tomorrow the checks are empty again; the sealed days persist as history.

Everything is his: **edit** (top-right, same affordance as the north star card) opens inline editing where he renames steps, rewrites the mantra text, deletes what he doesn't want, reorders with arrows, and adds new steps or readings. A brand-new user starts with a minimal default set derived from the Blueprint for Living doctrine (a mantra read, water, plan the day / check out, prep tomorrow) and prunes from there. If he deletes everything, the ritual stays empty; the defaults never force themselves back.

Both rituals are always reachable: the toggle switches between Morning and Evening regardless of the clock, so a night owl can prep his morning list at midnight. Only the *default* tab follows the time of day.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Present the matching ritual | Today loads | Default tab = `activeRitual(now)`: morning from 4:00 to 16:59, night from 17:00 through 3:59 (`lib/ritual.ts`) | System | reads clock only |
| Seed the defaults | First ever open with zero items | `rituals.seedDefaults`: inserts the 5 doctrine-derived items; one-shot per user via `settings.ritualsSeededAt` | System | writes `ritualItems`, `settings.ritualsSeededAt` |
| Check / uncheck a step | Tap a row | `rituals.setChecked`: adds/removes the item id in today's `ritualDays` row (created on first check) | Manual | writes `ritualDays.checkedIds` |
| Read a mantra | The `read` step renders its `content` inline | Same check toggle marks it read | Manual | writes `ritualDays.checkedIds` |
| Seal the ritual | All steps checked → confirm button | `rituals.complete`: verifies every current item is checked, stamps `completedAt`, publishes `ritual_completed` to the Bus | Manual | writes `ritualDays.completedAt`, `interactions` |
| Add a step / a reading | edit mode → "+ step" / "+ something to read" | `rituals.addItem` appends at the end of that ritual | Manual | writes `ritualItems` |
| Edit a step / the mantra text | edit mode → type, blur | `rituals.updateItem` (title, content) | Manual | writes `ritualItems` |
| Delete a step | edit mode → ✕ | `rituals.removeItem` (hard delete; stale ids in past `checkedIds` are ignored) | Manual | deletes `ritualItems` |
| Reorder | edit mode → ↑ / ↓ | `rituals.moveItem` swaps `order` with the neighbor | Manual | writes `ritualItems.order` |

No Coach path yet (see §9); the Coach can already *see* completions through the Bus.

## 4. Dynamics and interactions with other elements

- **Hosted by [Home (Today)](dashboard.md).** The ritual card renders inside the Today surface's Morning/Evening beat, above the one-move / tonight prompt. The Dashboard stays draw-only; the writes here belong to this element's own tables via its own functions.
- **Publishes to the Sessions stream:** sealing a ritual writes a `ritual_completed` interaction (`{ritual, day}` payload) to `interactions`, so the Mirror/Coach can fold conduct into context ("he has closed every day this week") without reading this element's tables.
- **Seeded by the doctrine:** the default items derive from [`../../research/blueprint-for-living.md`](../../research/blueprint-for-living.md) (the Daily Ritual seed role named there). The doctrine is content, not schema; only the five default rows encode it.
- **Sibling of the [Journal](journal.md):** the Journal's morning/night beats are adaptive prompts; the ritual is a fixed, user-authored checklist. They share the bookend moments but neither owns the other. A ritual step like "Check out: wins and lessons" points at the same moment the Journal's night beat will own once built.
- **Draws nothing** at act-time beyond its own tables and the clock.

## 5. States

- **Unseeded (first ever open):** zero items → defaults seed silently, card fills in.
- **Fresh day:** no `ritualDays` row yet; all boxes empty. The row is created on the first check.
- **In progress:** some checked; muted `x/y` count in the header.
- **All checked, unsealed:** gold border, "Every step done." + the single confirm (Seal the morning / Close the day). Unchecking a box returns to in-progress; nothing is recorded yet.
- **Sealed:** `completedAt` stamped; calm gold banner with the time; checks are read-only for that day.
- **Empty ritual:** user deleted every step → "This ritual is empty. Tap edit to add a step." An empty ritual is never completable.
- **Editing:** inline inputs, reorder arrows, delete, add buttons; check state untouched.

## 6. Edge cases

- **Past midnight:** the ritual day rolls over at **4:00 local**, not midnight (ADR [0009](../../decisions/0009-ritual-day-boundary.md)), so a night ritual finished at 12:30am still lands on the evening it closes, and check state does not vanish mid-ritual at midnight.
- **Item added after checks:** completion always verifies against the *current* item set, so a step added mid-day un-completes the moment until it too is checked. Items deleted after being checked leave stale ids in `checkedIds`; completion ignores them.
- **Delete-all is honored:** `seedDefaults` is one-shot per user (`settings.ritualsSeededAt`); an emptied ritual never re-seeds itself.
- **Double confirm / re-seal:** `complete` is idempotent (returns the existing `completedAt`).
- **Unchecking after sealing:** refused server-side; the day is closed. (Softening this is an open question.)
- **Clock skew / timezone travel:** the day key is computed from the device's local clock (client-side). Traveling across timezones can shorten or lengthen a ritual day; accepted for a personal, single-user-at-a-time surface (ADR 0009).
- **Two devices:** Convex reactivity keeps check state live everywhere; the day key is per-device local time, so devices in different timezones may disagree on "today" (same acceptance as above).
- **Signed out / loading:** card renders nothing until the items query resolves; queries return empty/null for signed-out users.

## 7. AI involvement

None at runtime today. The seed content was derived (offline) from the Blueprint for Living doctrine. Future AI involvement is deliberately parked: the Coach proposing ritual steps from the doctrine, and reading completion history for drift signals ("you haven't closed a day in a week"), both via the Bus event this element already publishes.

## 8. Data touched

Exact shapes in [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Owned:**
- `ritualItems`: `{ userId, ritual: "morning"|"night", kind: "do"|"read", title, content?, order, createdAt, updatedAt }`, indexed `by_user_ritual [userId, ritual, order]`. The user's editable checklist definitions; `content` is the mantra text for `read` items.
- `ritualDays`: `{ userId, ritual, day: "YYYY-MM-DD", checkedIds: Id<ritualItems>[], completedAt? }`, indexed `by_user_ritual_day [userId, ritual, day]`. One row per ritual per ritual day: live check state while open, completion history once `completedAt` is stamped. Daily reset is structural (a new day is a new, initially absent row).

**Writes elsewhere:** `settings.ritualsSeededAt` (the one-shot seed marker); `interactions` (`ritual_completed`, on seal).

**Drawn:** nothing.

**Code:** `convex/rituals.ts` (functions + `DEFAULT_RITUAL_ITEMS`), `lib/ritual.ts` (cutoffs, day key, completion logic), `components/today/RitualCard.tsx` (the card), wired in `components/today/Today.tsx`. Tests: `tests/ritual.test.ts`, `tests/convex/rituals.test.ts`.

## 9. Open questions

- **User-adjustable cutoffs:** `NIGHT_START_HOUR` (17:00) and `DAY_ROLLOVER_HOUR` (4:00) are centralized in `lib/ritual.ts` precisely so they can move into `settings` later. When?
- **Coach involvement:** should the Coach propose steps from the doctrine, or nudge on an unsealed evening? Must clear the earned-interruption bar.
- **History surface:** completions are recorded but nothing renders them yet. A quiet month view? Deliberately not a streak counter.
- **Un-seal:** is a sealed day truly immutable, or should unchecking reopen it?
- **Journal handoff:** when the Journal's beats ship, does a "Check out" ritual step open the night beat directly?
- **Drag reorder:** arrows work everywhere; drag-and-drop would be nicer on desktop but heavier on touch.
