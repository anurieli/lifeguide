# Glossary

**Status:** 🟡 living. Define each term once, here. Link to this from other docs instead of redefining.

- **LifeGuide** — the platform. "The space for the individual." The whole app.
- **The Guide** — the surfaced text-layer document ("who you're becoming") inside LifeGuide. Backed by the Mirror.
- **Coach** — the single AI presence/agent available on every surface; context-aware; acts across surfaces; on- and (later) off-platform.
- **The Mirror** — the evolving global context / "text layer behind the human." What the app knows about who you are and what you want. Read by every AI call.
- **Surface** — a distinct experience within the app (Whiteboard, Guide, later Vision Board / Journaling). Each implements a `SurfaceContextProvider`.
- **Whiteboard** — the spatial canvas surface (nodes + edges).
- **Node** — an atomic content unit on a surface (text, quote, image, link, generated image, north star).
- **Edge** — a labeled, directional connection between nodes; multi-target; cycle-checked.
- **Capture** — the immutable record of an inspiration/input event, before/independent of becoming a node.
- **Distillation** — turning a capture into text-meaning + title + pillar tags + embedding.
- **Context Bus** — the system that lets every surface publish state and every AI call read assembled context. Four scopes: selection / viewport / surface / global(Mirror).
- **Context Assembler** — the pure function that stitches in-view + global context to a token budget for an AI call.
- **Pillar** — a facet of a life (Lifestyle, Health, etc.) as a cross-cutting typed tag. v1 default: "Lifestyle."
- **Daily ritual** — the two check-ins (morning direction, evening reflection).
- **Daily exercise** — the configurable prompt the daily ritual runs.
- **North star** — the user's single named direction; co-written with the Coach; grades future captures/moves.
- **Reflection loop** (post-v1) — act → did it work → revise the vision. The wedge no competitor has.
- **Alignment engine** (post-v1) — reconciles calendar/to-dos against goals (drift/scatter/next move).
- **Pillar of reuse — braindump / PillarOS** — the two prior apps we extracted patterns from (`../research/extraction/`).
