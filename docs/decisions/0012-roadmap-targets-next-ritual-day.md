# 0012. The roadmap targets the next ritual day

**Status:** accepted (live) · **Date:** 2026-07-12

## Context

The evening ritual's real job is building **tomorrow morning's roadmap**: before bed the person quickly sets down exactly what tomorrow starts with (what, where, any info needed to just execute), and the next morning opens with that list as its ordered spine — wake up executing, not deciding. Entries therefore belong to a *future* day, and the write moment straddles midnight: one person plans at 23:00, another at 1:30am. ADR 0009 already established the 4am ritual-day boundary and client-computed day keys.

## Decision

1. **Roadmap entries are keyed by their TARGET ritual day** (`roadmapEntries.day`, a "YYYY-MM-DD" key), not by when they were written.
2. **The evening builder targets `nextRitualDayKey(now)`** (`lib/ritual.ts`): the ritual day after the one the moment belongs to. Because 1:30am still belongs to yesterday's ritual day (ADR 0009), an entry at 23:00 and an entry at 1:30am compute the **same** target — the upcoming morning. Tested across the boundary, month, and year lines.
3. **The morning display reads `ritualDayKey(now)`** — today's own key — so the list written last night is simply today's list. Same-day additions from the morning side write to the same key.
4. The server validates key shape only; computing the key stays client-side, consistent with ADR 0009.

## Consequences

- One number line (`day` keys) carries the whole loop; "tonight's plan" and "this morning's spine" are the same rows, no hand-off step, no copy.
- Planning two nights ahead is possible by construction (any future key) — the UI just doesn't surface it yet.
- The same accepted trade-offs as ADR 0009 apply (client clock trust, timezone travel).
- Roadmap progress is separate from ritual check state: entries carry `doneAt`, while the ritual's `roadmap` component has its own check in `ritualDays` (auto-checked when the last entry is walked, still manually checkable — e.g. an empty roadmap morning).
