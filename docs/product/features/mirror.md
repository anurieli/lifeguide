# Feature: The Mirror (global context / text layer)

**Summary:** The evolving "text layer behind the human" — the shared global context every surface writes to and every AI call reads from. What the app knows about who you are and what you want.
**Status:** 🟡 outline
**Phase:** v1 · Plan 1 (skeleton) → Plan 2+ (compaction, structure)
**Surfaces:** Global (surfaced as part of The Guide)
**Related:** [`guide.md`](guide.md) · [`coach.md`](coach.md) · [`../../architecture/context-bus.md`](../../architecture/context-bus.md)

---

## 1. Purpose
The compounding core: every capture, edit, and reflection makes the app know the user a little better, so its guidance sharpens. "We don't know what we want today, but every day we add a little and it grows." Being *known* is the value, not storage.

## 2. User-facing behavior
Mostly invisible; surfaced through the Guide as "what I've noticed about you" (themes, values) and "who you're becoming." Editable — the user can correct it (it's a draft, not a verdict).

## 3. Functions & actions
- Accumulate deltas from any surface (themes, values, recurring nouns/verbs, identity claims, fears, north-star candidates).
- Compact into a rolling natural-language summary (async).
- Snapshot/version over time (see your past selves).
- Serve a budgeted slice to every AI call.
- Be edited/corrected by the user (via the Guide or Coach).

## 4. Dynamics & interactions
- **Writes:** every surface emits deltas on significant events (place node, journal entry, goal change).
- **Reads:** the Context Assembler includes a budgeted Mirror fragment in every AI call.
- **Structure:** typed records (values, themes, pillars, people, goals, north-star candidates) + a compacted summary string.

## 5. States
Empty (still learning) · accumulating · compacting · snapshotting · user-edited.

## 6. Edge cases & failure modes
Contradictions (hold both, surface the tension); runaway growth (compaction + structure, never a single blob — the PillarOS mistake); privacy (most intimate data — see `../../architecture/security-privacy.md`); bad inference (user can correct).

## 7. AI involvement
Delta extraction (cheap, batched); monthly/triggered compaction (higher tier). Semantic index for retrieval of off-screen relevance.

## 8. Data touched
`mirror` (structured + summary + version), `interactions` (source events), `themes`, `pillars`, `goals`. Schema: `../../architecture/data-model.md`.

## 9. Reuse & build notes
From PillarOS: the memory *concept* only. **Rebuild** structured + indexed (its growing-text-blob memory won't scale and is re-sent whole every call).

## 10. Open questions
Snapshot cadence; structured-vs-summary balance; how aggressively to surface inferences; user-facing "edit the Mirror" UX.
