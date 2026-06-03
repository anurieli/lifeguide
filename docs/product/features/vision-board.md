# Vision Board

**Status:** partial (built spatial board; co-build and generated-image blocks proposed) · **Element of:** Core · **Owns:** `surfaces` (the board), `nodes`, `edges`, `captures`

> The Vision Board is the life and world you want, laid out spatially. You write text, import links and video, drop images, and connect ideas with labeled edges. It publishes the themes and the images-as-text of that wanted life into the Core, and draws nothing it is required to hold.

See [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md) for the element model and the "I want to run a triathlon" worked example; this doc is the full expansion of the Vision Board element noted there.

## 1. Purpose

A lost person rarely lacks energy; he lacks a destination he actually chose. The Vision Board is where the destination becomes visible and concrete: not a goal list, but the texture of the life and world he wants (places, people, aesthetics, ideas, references that pull him). It is one of the two anchors of the Core (the enduring "who you are"), the slow-changing picture of where the person is going. Where the Journal supplies the daily pulse and the Future Self supplies the visual of *you*, the Vision Board supplies the *world* you are aiming at. Its distinct contribution: it turns scattered inspiration into a connected, legible map of a wanted life, and feeds that map's meaning into the Core so the Coach can later ask whether today still points at it.

## 2. User-facing behavior

The board is an infinite spatial surface of cards. The person works two ways, both first-class.

**Manual (built today).** He opens the board and adds anything: a blank card starts as text, and morphs into an image, link, or quote when he pastes into it. He can paste text, paste or upload an image, paste a URL (including a video link), or drop a quote with an attribution. Each add becomes a **capture**, an immutable event of inspiration. Captures distill asynchronously (a short title, an essence line, suggested pillar tags) and then drop onto the board, placed automatically along an outward spiral so nothing overlaps. Unplaced captures wait in an **inbox tray** until placed. He drags cards around, resizes them, edits their text, retags their pillars, draws labeled directional edges between cards to show how ideas relate ("leads to", "because of"), and dismisses cards he no longer wants. Dismissed cards and captures soft-delete (the row stays so the Mirror can still learn from what was let go).

**Coach co-build (proposed, the signature move).** Instead of building alone, he talks. A chat scoped to this board lets him describe the life he wants in plain language, and the Coach crafts the board *with* him: laying down nodes, wiring edges, and filling image blocks. Because image generation is slow, the Coach places `generated_image` nodes immediately with pre-written prompts, and the pictures populate asynchronously as they render. He watches the board assemble itself from the conversation, then takes over manually at any point. The board is the same data either way; the Coach is a power tool over it, never a gate (see [`coach.md`](coach.md)).

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Capture (paste/upload/url/quote) | Person adds to the board | Inserts an immutable `captures` row; schedules async distillation | Manual | `captures` (create) |
| Capture on behalf | Coach adds while co-building | Same, with `source: "agent"` | Coach | `captures` (create, `source: "agent"`) |
| Distill capture | Auto, after capture create | Async action writes `{title, essence, pillars}` onto the capture | AI | `captures.distilled` |
| Place capture | Auto on distill, or person from inbox | Spiral-places a non-overlapping node from the capture; marks capture placed | Manual / auto | `nodes` (create), `captures.placedAt/nodeId` |
| Add node directly | Blank card, or Coach lays one down | Creates a `node` (text by default) | Manual / Coach | `nodes` (create) |
| Morph card | Paste into a blank card | Changes a card's type and content in place (text → image/link/quote) | Manual | `nodes` (patch) |
| Move / resize | Drag / drag handle | Updates `position` / `dimensions` | Manual / Coach | `nodes` (patch) |
| Edit text | Inline edit | Sets a node's text | Manual / Coach | `nodes.text` |
| Retag pillars | Pillar control on card | Sets a node's pillar tags | Manual / Coach | `nodes.pillars` |
| Connect | Drag edge between cards | Creates a labeled directed edge; rejects cycles and self-edges; dedupes | Manual / Coach | `edges` (create) |
| Relabel edge | Edit edge label | Sets an edge's label | Manual / Coach | `edges.label` |
| Disconnect | Remove edge | Deletes the edge | Manual / Coach | `edges` (delete) |
| Dismiss card | Delete card | Soft-deletes the node (`isActive: false`); still feeds the Mirror | Manual / Coach | `nodes.isActive` |
| Dismiss capture | Delete from inbox | Soft-deletes the capture; still feeds the Mirror | Manual | `captures.isActive` |
| Place generated-image block (proposed) | Coach co-build | Lays a `generated_image` node with a pending prompt; image fills async | Coach + AI | `nodes` (create, `type: generated_image`) |
| Publish surface context | On read, for the assembler | Emits the board as a text fragment (nodes + connections) | System | reads `nodes`, `edges` |

## 4. Dynamics and interactions with other elements

Per [`../../architecture/context-bus.md`](../../architecture/context-bus.md), the Vision Board is mostly a **producer**.

**Owns and publishes (to the Core stream).** The board owns its `surfaces`/`nodes`/`edges`/`captures` and publishes the *distilled text* of the wanted life: the essence lines of cards, the pillar themes they cluster into, and the meaning behind any image (its caption/essence), never the image bytes. Images live in the element; text is the shared currency. Events such as a placed node or a distilled capture append to `interactions`, and the Coach's curation pass rolls them into the Core (`mirror`). The board feeds **the Core**; it does not feed the Sessions stream.

**Draws (at act-time, nothing required).** The board holds no copy of any other element. The capture distiller works from the raw capture alone, so the baseline board needs no draw. The optional draws happen only inside Coach co-build, and only at act-time: the Coach reading the board to co-build draws the **Core** (who you are, so suggestions fit the person) and may reference the person's **Goals** for coherence; the proposed `generated_image` prompts are written against the board's own emerging content plus the Core. These are reads through the Bus, budgeted and rebuilt each time, never stored on the board.

**Consumed by others.** The **Future Self** element draws this board (the world, the aesthetic) plus the Core to generate you placed inside that life (see [`future-self.md`](future-self.md)). The **Guide** renders the Core that this board helped shape. The **Coach** blends the board with everything when it has something true to say.

## 5. States

- **Empty board.** No nodes, empty inbox. The invitation to add the first thing (or to start talking to the Coach).
- **Capture undistilled.** A capture exists; `distilled` is absent. It can still be placed as-is (raw text/image), and distillation backfills the title/essence/pillars when it lands.
- **Capture in inbox.** Distilled (or not) but `placedAt` unset: waiting in the tray to be placed.
- **Node placed / active.** On the board, `isActive: true`, movable and connectable.
- **Node generating (proposed).** A `generated_image` node with a pending prompt and no image yet; shows a placeholder until the picture fills.
- **Dismissed.** Node or capture `isActive: false`: off the board but retained so the Mirror still learns from the rejection.
- **Co-build in progress (proposed).** The board mutating live from a scoped Coach thread: nodes and edges appear, image blocks fill asynchronously.

## 6. Edge cases

- **Distillation unavailable** (no provider key, or a bare image with no text). The capture still lands and is still placeable; it simply carries no `title`/`essence`/`pillars` until distillation can run. The board never blocks on AI.
- **Bare image / non-textual capture.** `buildInput` returns nothing to distill, so the node is placed as-is with no essence; its meaning enters the Core only once a caption or context exists.
- **Spiral collision / dense board.** Placement walks outward spiral slots until it finds one that does not overlap an existing node; a full region simply pushes new cards further out.
- **Cycle or self-connection.** Edge creation runs a pure cycle check and rejects any edge that would form a loop or connect a node to itself; duplicate edges are deduped (the existing edge id is returned).
- **Cross-surface edge.** Connecting nodes that belong to different surfaces is rejected; edges are within one board only.
- **Already-placed capture.** Re-placing a placed capture is a no-op and returns the existing node.
- **Ownership gate.** Every query and mutation gates on `getAuthUserId`; a surface, node, capture, or edge owned by another user is invisible and unwritable.
- **Generated image fails (proposed).** A `generated_image` node whose render fails stays as a placeholder the person can retry or convert to text; co-build continues regardless, since image fills are asynchronous and non-blocking.
- **Co-build conflict (proposed).** The Coach does not silently overwrite the person's board; when its suggestion conflicts with what is there, it proposes and the person decides, consistent with the Coach's core-curation rule (see [`coach.md`](coach.md)).

## 7. AI involvement

See [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) for provider routing, model classes, and the dual-provider client.

**Built: capture distillation.** On every capture, a background action distills the raw input into `{ title, essence, pillars }` via the dual-provider chat client (OpenRouter preferred, OpenAI fallback) in JSON mode, with a fixed distill system prompt and low temperature. It runs internally on the server (the key never reaches the client), reads only the single capture, and writes back the `distilled` object. This is what turns raw inspiration into the title/essence/pillar text that the spiral placement and the Core consume. Embeddings are deferred (the field stays optional and unused).

**Proposed: Coach co-build.** A board-scoped Coach thread that converts conversation into board mutations. It draws the Core (and optionally Goals) through the Bus, proposes nodes and labeled edges, and writes image-generation prompts onto `generated_image` nodes. The prompts are pre-generated so blocks can be placed instantly and filled asynchronously by an image model. The Coach writes through the same node/edge/capture mutations a person uses; it surfaces conflicts rather than overwriting.

## 8. Data touched

Per [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Owned.**
- `surfaces` (the board is a `type: "whiteboard"` surface today; the `type` union widens toward `vision`).
- `nodes` (`type: text | quote | image | link | generated_image`, `title`, `text`, `imageUrl`, `fileId`, `attribution`, `position{x,y,z}`, `dimensions`, `pillars[]`, `captureId?`, `isActive`). `generated_image` is the type co-build and Future-Self-derived nodes use.
- `edges` (`fromNode`, `toNode`, `label?`, `note?`): labeled, directed, cycle-checked.
- `captures` (`source: paste|upload|url|audio|agent`, `rawType: text|image|link|video_link|quote`, `rawText?`, `rawUrl?`, `rawFileId?`, `distilled?{title,essence,pillars}`, `placedAt?`, `nodeId?`, `isActive`). `source: "agent"` is the Coach capturing on the person's behalf.

**Published (to the Core, as text).** `interactions` events (for example node placed, capture distilled), carrying distilled text and pillar themes; these roll into `mirror` via the Coach's curation pass. Images are never published; only their distilled text.

**Drawn (at act-time, never held).** During Coach co-build only: the **Core** (`mirror`) and optionally **Goals**, read through the Context Bus.

## 9. Open questions

- Is the board's build-chat the docked Coach scoped to the board, or a board-local chat surface? (Leaning: the same Coach, scoped to the board, per the element notes.)
- Which image model class fills `generated_image` blocks, and how prompts are pre-generated and revised mid-co-build (settle in [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) when co-build is built).
- When the `surfaces.type` union moves from `whiteboard` to `vision`, and whether any migration is needed.
- Whether distilled captures should auto-place or always pass through the inbox tray first.
- How `edges.note` (defined but unused today) is surfaced in the UI.
