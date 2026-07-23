# Daily tidbit — the morning quote agent

**Status:** built · **Element of:** the Sessions stream (a step in the Morning Scroll) · **Owns:** `dailyTidbits`

> A real inspirational quote, surfaced fresh each day for the morning scroll, chosen for who this person is (their Core) by a cheap, dedicated agent. One of the "things to read over" the daily scroll offers.

## 1. Purpose

The morning scroll should give something to *take in*, not only things to do. The daily tidbit is that: a genuine, well-attributed inspirational quote — chosen against the person's values, themes, North Star, and standing horizons so it lands as earned rather than generic, and varied day to day. It is deliberately a **separate, cheap AI process** (Ariel, 2026-07-15) — a small model whose only job is to find the day's quote — so every AI process in the app stays visible and individually tuned in the [AI hub](../../architecture/ai-layer.md).

## 2. User-facing behavior

Inside the Morning Scroll, a **`tidbit` component** (a typed ritual step, so it is editable / reorderable / removable like any other) labeled **Today's quote**. It shows the day's quote inline — *"…" — Author* — with a small **↻** to ask for another. The person can also type their **own** fixed line in edit mode, which pins it and turns the agent off for that step (exactly like a mantra's fixed words).

Generation is **lazy and cached**: the first time the scroll renders on a new day, it kicks the agent and shows *"Finding today's words…"*; the quote streams in the moment the agent lands (usually a second or two — it's Haiku). It is generated **at most once per person per day**; the ↻ is the only thing that spends another call. If generation fails, the step shows a gentle *"Couldn't find one just now."* with a **Try again**.

Generation is **fail-safe** (hardened 2026-07-20): the whole handler — including the server-side context read — runs inside one try/catch, so *any* failure lands the row as `error` (with its Try again) rather than aborting the action and stranding the row on `pending`. Previously the context read sat outside the catch: if it threw, the row stayed `pending` forever and — because `ensureForDay` is a no-op whenever a row already exists — the scroll showed *"Finding today's words…"* with no way back. As a second belt: if a row somehow sits in `pending` for more than ~20s (a dropped scheduler run, a very slow agent), the step reveals a **Try again** beside the spinner so the person is never trapped watching it think.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Ensure today's tidbit | The `tidbit` step renders (no fixed content) | `dailyTidbits.ensureForDay({day, kind})` — if today has no row, writes a `pending` row and schedules the agent; idempotent (runs at most once/day) | System | writes `dailyTidbits`, schedules the agent |
| Generate the quote | The scheduled agent | `internal.ai.dailyQuote.generate`: reads Core context, calls the `dailyQuote` node (Haiku), parses the reply with `parseDailyQuote` (tolerant of fenced / prose-wrapped JSON), and on a valid quote+author writes `{status: done, text, attribution, model}`; anything unusable writes `{status: error}`. Logged to `aiLogs` | AI (agent) | reads context, writes `dailyTidbits`, `aiLogs` |
| Show the quote | Row streams to the client | `dailyTidbits.forDay({day, kind})` — reactive; shows pending / done+quote / error | System | reads `dailyTidbits` |
| Find another | Tap ↻ | `dailyTidbits.refresh` — resets today's row to `pending` and re-runs the agent | Manual | writes `dailyTidbits`, schedules the agent |
| Pin my own line | Type text on the tidbit step in edit | `rituals.updateItem({content})` — a non-empty `content` overrides the agent for that step | Manual | writes `ritualItems` |

## 4. Dynamics and interactions with other elements

- **A step of the [Daily Ritual](daily-ritual.md):** the tidbit is a `tidbit`-kind `ritualItems` row, seeded into the morning defaults (v5) and offered to existing accounts once via the ritual upgrade; it lives, reorders, and deletes like every other component. `content` (a fixed line the person typed) overrides the agent.
- **Draws the person's Core:** `dailyTidbits.contextForInternal` assembles `settings.northStar`, the latest **Mirror** (values / themes / summary), and the **standing [Horizons](horizons.md)** rungs, plus the last ~8 shown quotes (so the agent doesn't repeat itself).
- **A node in the [AI layer](../../architecture/ai-layer.md):** the `dailyQuote` task in `convex/ai/config.ts` (Haiku) — visible and re-pointable in the Settings AI hub, and every call is logged to `aiLogs` (ADR 0017) like the rest.

## 5. States

- **pending:** row exists, no text yet → "Finding today's words…". After ~20s in this state (a dropped schedule / slow agent) a **Try again** appears beside the spinner so it is never a dead end.
- **done:** `text` (+ `attribution`, `model`, `generatedAt`) set → the quote with its author and the ↻.
- **error:** generation failed → gentle fallback + Try again; never auto-retried in a render loop (only `ensureForDay` on a fresh day, or an explicit refresh).
- **Overridden:** the person pinned their own `content` on the step → the agent is not called at all; their line shows.
- **New day:** a fresh `day` key means a fresh row and a fresh quote at the 4am rollover.

## 6. Edge cases

- **Idempotent ensure:** re-renders never double-fire — an existing row (any status) makes `ensureForDay` a no-op, so the agent runs at most once per person per day.
- **Stuck error:** an `error` row is left as-is by `ensureForDay` (never auto-retried); only the explicit ↻ / Try again re-runs it, so a failing key can't loop the agent.
- **Stuck pending:** the agent handler is fully wrapped (context read included), so a failure always writes `error` instead of leaving the row `pending`. Should a row still sit `pending` (e.g. the scheduled action never ran), the ~20s **Try again** on the pending state is the escape hatch — it calls `refresh`, which resets the row and re-runs the agent.
- **Malformed/absent context:** with little Core signal the agent is told to choose a broadly resonant quote; a thin profile still gets a real quote.
- **Bad model output (hardened 2026-07-23, ARI-134):** the action parses the reply through a narrow, tolerant extractor (`parseDailyQuote` in `convex/ai/parse.ts`). It is tolerant of the *wrapper* (bare JSON, a Markdown ```` ```json ```` fence, or JSON sitting inside a line of prose all parse) and strict on the *content*: a usable quote needs **both** a non-empty `quote` and a non-empty `author`. Any missing, non-string, or blank value for either (or JSON that won't parse) is rejected and the row lands `error` with its Try again. It no longer stamps a missing author as "Unknown"; an unattributed line is a rejection, not a half-quote. (A model that itself chooses to return `"Unknown"` as the author is a real value and still accepted.)
- **Deleted mid-flight:** if the tidbit's row is deleted while the agent runs, `writeInternal` no-ops.
- **Malformed day key:** `ensureForDay` / `forDay` reject non-`YYYY-MM-DD` keys.

## 7. AI involvement

The one AI node: **`dailyQuote`** (`convex/ai/config.ts`), on **`anthropic/claude-haiku-4.5`** via OpenRouter — a cheap, fast model, right for a once-a-day retrieval/curation task (Ariel's pick, 2026-07-15). System prompt: surface ONE **real, existing** inspirational quote (never invented), matched to the person's Core, varied from the recent list, as JSON `{"quote","author"}`. Context is assembled server-side in `dailyTidbits.contextForInternal`. Every call is logged to `aiLogs` via `chatComplete` (ADR 0017) — tokens, cost, latency, ok/error — so the agent appears in the AI usage hub with the others. `kind` is a union so a future tidbit kind (a fact, an image) can add a node without reshaping the table.

## 8. Data touched

Exact shape in [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Owned:**
- `dailyTidbits`: `{ userId, day, kind: "quote", status: pending|done|error, text?, attribution?, model?, error?, generatedAt?, createdAt }`, indexed `by_user_day_kind`. One row per (user, day, kind), cached.

**Drawn (read-only, for context):** `settings.northStar`, `mirror` (values/themes/summary), `horizons` (standing rungs), recent `dailyTidbits`.

**Writes elsewhere:** `aiLogs` (every agent call).

**Code:** `convex/ai/config.ts` (the `dailyQuote` node), `convex/ai/dailyQuote.ts` (the agent), `convex/ai/parse.ts` (`parseDailyQuote`, the tolerant/strict output parser), `convex/dailyTidbits.ts` (ensure/refresh/forDay + context + write), `components/today/DailyTidbit.tsx` (the inline step), wired as a `tidbit` kind in `components/today/RitualSequence.tsx`. Tests: `tests/convex/daily-tidbit.test.ts` (covers the parser plus the refresh/write-back recovery path), `tests/daily-quote-parse.test.ts` (the parser).

## 9. Open questions

- **When to generate:** lazy-on-render (as built) vs. a nightly pre-warm so the morning quote is already there.
- **More tidbit kinds:** a daily fact, a passage, or the **inspirational image** (the heavier idea from the same brainstorm) — each a new `kind` + AI node; the image needs the gate for cost/caching.
- **De-dupe depth:** the last ~8 quotes are excluded; should it be a longer memory, or a "seen" set?
- **Author accuracy:** the model is told to prefer "Unknown" over a wrong attribution, and the parser now requires *some* non-empty author (rejecting a blank one rather than inventing a name). Do we ever verify the attribution itself?
- **Cost ceiling:** one Haiku call per active person per day; revisit if the active base grows.
