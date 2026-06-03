# 0002. Future Self as its own element

**Status:** accepted (2026-06-03)

## Context

The old docs carried a Whiteboard-vs-Vision-Board ambiguity and treated Future Self as out of scope. That left two questions unresolved: what the board actually is, and where "you as aspiration" (the visual you) lives. Without a clean answer, image-bearing surfaces would overlap and duplicate each other's context, breaking the stark ownership rule in [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md).

## Decision

Future Self is its own element, with its own data model (`futureSelf`) and its own image generation, separate from the Vision Board.

- **The board IS the Vision Board:** the life and world you want (`nodes, edges, captures`).
- **Future Self owns the visual you:** images, attires, and scenes of who you want to be. It does not duplicate the board.
- Future Self **draws** the Vision Board (the world, the aesthetic) and the Core (who you are) at act-time to generate you placed inside that life. It draws; it does not hold a copy.
- Both elements publish only the distilled text behind their visuals into the shared context. The image is never the context; the meaning is.

## Consequences

- Ownership stays stark: two image-bearing elements with distinct jobs and no shared data.
- Future Self is core, not a non-goal; the old framing that listed it out of scope is retired.
- Two open questions are deferred to build time: whether the board's build-chat is the docked Coach scoped to the board, and whether Future Self uses one-off image edits or a trained personal likeness for consistent generation of you. See [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md).
