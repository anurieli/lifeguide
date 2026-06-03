# Feature: The Whiteboard

**Summary:** An infinite spatial canvas where the user externalizes their mind — ideas, notes, inspiration, captures — as nodes connected by labeled, multi-reason edges, operated by hand or by the Coach.
**Status:** ✅ specified (🟢 building in Plan 1)
**Phase:** v1 · Plan 1 (+ audio in Plan 3)
**Surfaces:** The Whiteboard (a surface; the first one built)
**Related:** [`coach.md`](coach.md) · [`intake-distillation.md`](intake-distillation.md) · [`mirror.md`](mirror.md) · [`../../architecture/context-bus.md`](../../architecture/context-bus.md) · [`../../architecture/data-model.md`](../../architecture/data-model.md)

---

## 1. Purpose — why it exists
A lost person's thoughts are scattered and invisible. The Whiteboard makes them visible and movable, so patterns can emerge spatially rather than being forced into lists. It is the lowest-friction way to get what's in your head *out* — and the raw material from which the Mirror learns who you are. It's the "throw my brain onto a board" surface.

## 2. User-facing behavior
- Opens as a calm, near-infinite paper canvas with a soft dot grid. No chrome demanding attention.
- A bottom toolbar (Text · Quote · Image · 🎙 Talk) and a top-right Inbox tray (only when there's something to place).
- The user pans by dragging empty space, zooms toward the cursor, and drags cards anywhere.
- Cards (nodes) hold a thought, a quote, an image, or a link. Hovering reveals a connect handle and a delete control.
- Dragging from one card's handle to another draws a connection. Connections are labeled (e.g., *funds*, *serves*, *leads to*) and one card can connect to many, for different reasons.
- Anything pasted, dropped, or spoken becomes a node (via Intake & Distillation).

## 3. Functions & actions (exhaustive)

| Action | Manual | Via Coach | What it does | Data effect |
|---|---|---|---|---|
| Create text node | ✓ (toolbar / type-anywhere) | ✓ | New text card near viewport center | insert `nodes` (type=text) |
| Create quote node | ✓ | ✓ | New quote card (italic, optional attribution) | insert `nodes` (type=quote) |
| Create image node | ✓ (toolbar/upload/paste) | ✓ (generate) | Image card from upload/paste/generation | insert `nodes` (type=image) + `_storage` |
| Create link node | ✓ (paste URL) | ✓ | Link card with distilled preview | insert `nodes` (type=link) |
| Edit node text | ✓ (inline) | ✓ | Updates card content | patch `nodes.text` |
| Move node | ✓ (drag) | ✓ (arrange) | Repositions card | patch `nodes.position` |
| Delete node | ✓ (× control) | ✓ | Soft-deletes card + its edges | `nodes.isActive=false` |
| Connect nodes | ✓ (handle drag) | ✓ | Labeled edge, cycle-checked | insert `edges` |
| Label/relabel edge | ✓ | ✓ | Sets/changes edge label | patch `edges.label` |
| Remove edge | ✓ | ✓ | Deletes connection | delete `edges` |
| Pan / zoom | ✓ | n/a | Viewport navigation | client-only viewport state |
| Select (single/multi/box) | ✓ | n/a | Marks nodes as the focus | client state → selection context |
| Group / arrange by theme | ✓ (drag) | ✓ | Repositions a set into clusters | patch many `nodes.position` |
| Hide / show by filter | ✓ | ✓ | Visually filters nodes (e.g., by pillar) | client state |
| Place from Inbox | ✓ (Place) | ✓ | Turns a capture into a node (spiral, non-overlapping) | insert `nodes`, patch `captures.placedAt` |
| Capture by voice (🎙 Talk) | ✓ | n/a | Records → transcribes → segments into nodes | see `audio-capture.md` |

## 4. Dynamics & interactions
- **Context Bus:** publishes three local scopes — `selection` (highest priority), `viewport` (visible nodes), and `surface` (whole board: nodes + edges serialized). Contributes the board tools above to the Coach's registry. See `../../architecture/context-bus.md`.
- **The Mirror:** every node placed and every theme tagged writes a delta (themes, recurring nouns/verbs). Dismissed captures still inform the Mirror even if never placed.
- **Intake & Distillation:** all capture sources funnel through it before becoming nodes; nodes carry `pillars` tags and an embedding for semantic recall.
- **The Coach:** reads the assembled board context and can perform any "Via Coach" action above through its tool registry, including acting on this board while the user is on another surface ("from far away").
- **The Guide:** node content and themes feed what the Guide/Mirror reflects back; the north star (a special node type) can be pinned here.

## 5. States
- **Empty (first use):** a single gentle prompt invites the first capture; onboarding may pre-seed nodes from the user's first inputs.
- **Populated:** nodes + edges render inside the transformed world; edges redraw live as nodes move.
- **Placing:** Inbox tray visible with distilled captures awaiting placement.
- **Distilling:** a capture shows "distilling…" until AI returns.
- **Syncing:** Convex reactive updates apply optimistically; real-time across devices.
- **Error:** failed upload/distill surfaces inline; the node still exists with raw content.

## 6. Edge cases & failure modes
- **Cycle prevention:** connecting two nodes that would form a cycle is blocked with a gentle message (DFS + persisted check).
- **Self-edge / duplicate edge:** disallowed (no-op / dedup).
- **Large boards:** viewport culling for >~500 nodes (later); edges redraw throttled.
- **Distillation failure:** node falls back to raw text/URL; never blocks placement.
- **Paste into a textarea:** ignored by the global paste handler (won't create a stray node).
- **Multi-device drag race:** last-write-wins on `position`; Convex reconciles.
- **Huge transcript (audio):** segmented into a bounded number of nodes; overflow folded into one summary node.

## 7. AI involvement
- **Distillation** (gpt-4o-mini): essence + title + pillar tags for captured content.
- **Embeddings** (text-embedding-3-small): every node/capture, for grouping + semantic recall.
- **Coach tools** (agent): all "Via Coach" actions; runs the multi-turn loop with the assembled board context.
- **Degradation:** if AI is down, manual manipulation is fully functional; distillation retries; the board never hard-depends on the model.
- Config + cost: `../../architecture/ai-layer.md`.

## 8. Data touched
`nodes`, `edges`, `captures`, `_storage`, `interactions` (place/move events), `mirror` (deltas), `pillars` (tag reinforcement). Schema: `../../architecture/data-model.md`.

## 9. Reuse & build notes
- **From `braindump` (reuse/adapt):** coordinate system + `geometry.ts`, the labeled multi-target edge graph with cycle detection, the type-anywhere capture loop, spiral non-overlap placement, the media→text-node pipeline.
- **Build clean (don't port):** the canvas is **DOM + CSS transform + SVG**, *not* Konva (Konva is a dead dependency in braindump). Drop braindump's undo singleton and optimistic plumbing — Convex handles sync.
- Plan: `../../plans/2026-05-20-lifeguide-v1-plan1-foundation-whiteboard.md` (Tasks 2–8).

## 10. Open questions
- Multi-select + group-by-Coach interaction details (selection context granularity).
- Edge label UX: free text vs a small preset vocabulary (depends_on / serves / blocks / inspired_by …).
- When does the board auto-suggest connections from embeddings vs wait to be asked? (resurfacing/grouping — see `resurfacing.md`, post-v1).
