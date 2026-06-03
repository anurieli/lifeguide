# 0001. Evolved vision and docs reset

**Status:** accepted (2026-06-03)

## Context

The earlier docs described a Whiteboard plus Coach build, with Journaling and a Vision Board marked out of scope. In conversation the product evolved past that framing into a fuller, coherent system. Two problems followed:

1. The vision moved. LifeGuide is now understood as two context streams (the Core, who you are; the Sessions, your days), the Journal as adaptive prompts rather than a diary, the Coach as the curator of the Core, pillars that make a person solid, and a Future Self. See [`../product/concept-and-soul.md`](../product/concept-and-soul.md), the "evolved system" section.
2. The old spec set actively conflicted with that vision. It listed Journaling and the Vision Board as non-goals and carried a Whiteboard-vs-Vision-Board ambiguity. Patching it in place would have left contradictions buried across many files.

## Decision

Two moves, together:

- **Adopt the evolved system as the product.** Two streams (Core and Sessions), the Journal as adaptive prompts, the Coach as core-curator, pillars, and Future Self. The "evolved system" section of [`../product/concept-and-soul.md`](../product/concept-and-soul.md) is the source of truth.
- **Reset the docs to a clean slate, then rebuild deliberately.** The old `docs/` spec set was removed (recoverable from git) rather than restored, so it stops conflicting. We rebuild from two seeds: this repo's [`../product/concept-and-soul.md`](../product/concept-and-soul.md) and the original Life Blueprint app at `~/lifeguide` (the working model for the Journal and the Core). The first rebuilt foundation is [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md).

## Consequences

- Docs are rebuilt deliberately, not restored. Each rebuilt doc is written fresh to the current direction; nothing is assumed valid because it once existed.
- The live code stays. The Convex foundation, the board, and the app shell continue to run and are reframed under the evolved vision (the board IS the Vision Board), not rewritten to match old docs.
- The old spec is recoverable from git if any piece is ever needed.
- Until a doc is rebuilt, treat nothing as spec unless it lives in one of the two seeds or was rebuilt from them. See [`../README.md`](../README.md).
