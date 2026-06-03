# Feature: <Name>

> Copy this file to `<feature>.md` and fill every section. The bar is **all** possible uses, functions, and dynamics. If a behavior exists, it is written here. Keep it DRY — link to the glossary and other docs instead of redefining.

**Summary:** <one sentence>
**Status:** ⬜ planned · 🟡 outline · ✅ specified · 🟢 built
**Phase:** v1 (Plan N) · v1.5 · v2
**Surfaces:** <which surface(s) this lives in>
**Related:** <links to other feature/architecture/design docs>

---

## 1. Purpose — why it exists
What problem this solves for the user, and how it serves the mission (the lost-young-man, the "text layer behind the human"). Tie to `../concept-and-soul.md`.

## 2. User-facing behavior
What the user sees and experiences. The calm, one-thing-per-screen view. Entry points. The happy path, narrated.

## 3. Functions & actions (exhaustive)
Every action possible here — **manual** and **via the Coach**. A table:

| Action | Manual | Via Coach | What it does | Data effect |
|---|---|---|---|---|
| e.g. Create node | ✓ | ✓ | … | inserts `nodes` row |

## 4. Dynamics & interactions
How this feature connects to the rest of the system:
- **Context Bus:** what it publishes (selection / viewport / surface snapshots) and what tools it contributes. See `../../architecture/context-bus.md`.
- **The Mirror:** what deltas it writes (themes, values, signals).
- **Other features/surfaces:** what it reads from / writes to / triggers.
- **The Coach:** how the Coach reads and acts on this feature "from far away."

## 5. States
Empty · first-use · populated · loading · syncing · error · offline. What each looks/behaves like.

## 6. Edge cases & failure modes
Conflicts, limits, race conditions, bad input, AI failure/degradation, large datasets, multi-device. What we do in each.

## 7. AI involvement
Which AI processes run here (distill, embed, agent, etc.), models, prompts location, cost profile, and graceful degradation when AI fails. See `../../architecture/ai-layer.md`.

## 8. Data touched
Tables and fields read/written. Link to `../../architecture/data-model.md`.

## 9. Reuse & build notes
What we pull from `braindump` / `PillarOS` (reuse/adapt/rebuild/drop) and key implementation gotchas. See `../../research/extraction/`.

## 10. Open questions
Unresolved decisions. Promote resolved ones to an ADR in `../../decisions/`.
