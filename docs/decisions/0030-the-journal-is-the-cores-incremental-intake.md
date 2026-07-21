# 0030. The journal is the Core's incremental intake

**Status:** accepted (product direction, not implemented) · **Date:** 2026-07-21

> **The one-line rule:** every day the journal asks one thing the Core still doesn't know, and the answer lands in the Core. The Core is *built by living*, one entry at a time, not by sitting down to fill in eighteen questions.

## Context

The Core is the app's foundation: the fixed 18-question Life Blueprint plus the Living Core artifacts beneath it ([ADR 0028](0028-core-is-the-fixed-life-blueprint-plus-living-containers.md)). Everything else — the Coach's context, the Mirror, the daily quote, the horizons — draws on it.

Three ways to fill it exist today ([`../product/features/core.md`](../product/features/core.md)): the **grid** (all 18 at once), **Zen** (one at a time, deliberately), and **Conversational** (a voice call, synthesized onto the keys afterward). All three are *sit-down* modes: the person must decide to go to the Core and work on it. `core.md` §2 already promises the opposite — "the person rarely touches the Core directly; he lives in the surfaces; the Core fills behind them," and "over weeks the backbone fills itself" — but the only named mechanism for that is **ambient distillation** (the Coach curating signal from captures and sessions into the Mirror). Nothing deliberately closes an *unanswered Blueprint slot* as a by-product of ordinary daily use.

The consequence is the one visible on Today: the red "Finish the Core — it takes about an hour" nudge, and a `bpCount/18` that stalls. An hour-long form is exactly the kind of thing a person who feels lost will not do, and the app's own soul says it should not have to be done that way.

Two nearby facts sharpen this:

- The **day's journal was removed** on 2026-07-13 (`DayLog.tsx`, "a redundant second ritual list"). The morning journal *question* survived inside the scroll, but there is no journal surface that accumulates into anything.
- **ARI-120** was filed on 2026-07-20 as a scroll feature: "a daily-rotating unanswered Core question in the Morning Scroll." That ticket is the mechanism. What was missing was the recognition that it is not a small feature on one surface — it is *how the Core is meant to get built*.

## Decision

**The journal entry is the Core's primary incremental intake.** Promote it from a scroll feature to a main concept of the product.

Concretely:

1. Each day, the journal surfaces **one** thing the Core still doesn't know — an unanswered Blueprint slot, or (once the 18 are filled) a slot whose malleability invites revisiting.
2. Answering it is **journaling, not form-filling**: it reads as an honest question about the person's life, in the flow of the scroll he already walks. He is not told he is on "field 12 of 18."
3. The answer **writes to the Core** — the same `coreResponses` keys the grid, Zen, and Conversational modes write. `bpCount/18` moves because he journaled.
4. Over weeks, **the Core builds itself out of his days.** The hour-long sit-down becomes optional, not the price of entry.

This makes the journal the **fourth mode** of filling the Core, and the default long-run one:

| Mode | Shape | When it's right |
|---|---|---|
| Grid | All 18 at once | He wants to see and edit the whole frame |
| Zen | One at a time, deliberate | He's chosen to sit with it |
| Conversational | A spoken call, synthesized after | He'd rather talk than type |
| **Journal (this ADR)** | **One a day, in the ritual he already does** | **Always — the background default** |
| Ambient distillation | Passive, Coach-curated into the Mirror | Never asks anything; runs underneath all of the above |

## Rules for any agent building the Core

These are binding on any implementation of this concept:

- **One per day.** A drip, never a queue, a backlog, or a "you have 12 unanswered" counter. The app is calm and never bombards ([`../design/interaction-principles.md`](../design/interaction-principles.md)).
- **Never re-ask a settled question.** Selection is over *unanswered* keys only (`lib/levels.ts`'s `ALL_KEYS` minus what `core.get` already holds). This matches how `mintRealtimeSession` already personalizes the Core voice call so it never interrogates a filled checklist.
- **Deterministic per day, rotating.** The same day shows the same question; a different day shows a different one. Derive it from the ritual day key and the current unanswered set — no persisted queue state.
- **One store, no parallel Core.** The answer writes to `coreResponses` through `core.save`, not to `interactions` and not to a journal-local field. ADR 0028's rule holds: things may *link* to Core, but nothing becomes a second Core store.
- **His words win.** Never silently overwrite an authored answer; a conflicting later answer is surfaced, not applied (the rule ADR 0024 already set for voice synthesis).
- **Always skippable.** It never hard-blocks sealing the day. A question he doesn't want today simply comes back another day.
- **It disappears when it's done.** With the Blueprint complete, the step is absent rather than showing an empty nag — or, as a follow-on, shifts to revisiting the *malleable* answers (the Blueprint's green/yellow/red malleability tags are the natural dial: green invites revisiting, red rarely).

## Consequences

- The red "finish the Core, it takes about an hour" nudge on Today becomes a fallback for people who want the sit-down, not the primary path to a filled Core. It should soften once this ships.
- `bpCount/18` becomes a **living** number that moves on ordinary days, which makes it a much better signal of engagement than it is today.
- The Coach gets a richer Core sooner, which improves everything downstream that reads it (Mirror, daily quote, horizons, coaching itself).
- The journal gains a reason to exist as a *surface* again, after `DayLog` was removed — this time accumulating into something rather than replaying the day back.
- A likely follow-on, deliberately not decided here: a journal entry is also a natural **Living Core artifact** (source-linked evidence beneath a Blueprint answer, per ADR 0028). Wiring the same entry into both layers is a second step, not part of this decision.

## Open questions

- **Rendering:** a new `core` kind on the `ritualItems.kind` union (ADR 0011 says a new kind is union-widening, no migration) versus reusing the existing `question` kind. Lean: a dedicated kind, so it can write to the Core, carry its section label, and be styled as "one brick for your foundation."
- **Morning, night, or both.** Lean: morning only to start — the night scroll's job is closing the day, not building the frame.
- **Does it count toward the seal?** Lean: yes, like the morning journal question, but skippable so it can never trap the day.
- **Revisiting cadence** once the 18 are full — how often a green-malleability answer should come back around.

## Tracked by

[ARI-120](https://linear.app/cuttheedge/issue/ARI-120) — the implementation. This ADR is the concept it implements; the ticket's definition of done should be read against these rules.
