# Vision Board

**Status:** partial (built spatial board; co-build and generated-image blocks proposed) · **Element of:** Core · **Owns:** `surfaces` (the board), `nodes`, `edges`, `captures`

> The Vision Board is the life and world you want, laid out spatially. You write text, import links and video, drop images, and connect ideas with labeled edges. It publishes the themes and the images-as-text of that wanted life into the Core, and draws nothing it is required to hold.

See [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md) for the element model and the "I want to run a triathlon" worked example; this doc is the full expansion of the Vision Board element noted there.

## 1. Purpose

A lost person rarely lacks energy; he lacks a destination he actually chose. The Vision Board is where the destination becomes visible and concrete: not a goal list, but the texture of the life and world he wants (places, people, aesthetics, ideas, references that pull him). It is one of the two anchors of the Core (the enduring "who you are"), the slow-changing picture of where the person is going. Where the Journal supplies the daily pulse and the Future Self supplies the visual of *you*, the Vision Board supplies the *world* you are aiming at. Its distinct contribution: it turns scattered inspiration into a connected, legible map of a wanted life, and feeds that map's meaning into the Core so the Coach can later ask whether today still points at it.

## 2. User-facing behavior

The board is an infinite spatial surface of cards. The person works two ways, both first-class.

**Manual (built today).** He opens the board and adds anything: a blank card starts as text, and morphs into an image, link, or quote when he pastes into it. He can paste text, paste or upload an image, paste a URL (including a video link), or drop a quote with an attribution. Each add becomes a **capture**, an immutable event of inspiration. Captures distill asynchronously (a short title, an essence line, suggested pillar tags) and then drop onto the board, placed automatically along an outward spiral so nothing overlaps. Unplaced captures wait in an **inbox tray** until placed. The tray is a quiet dropdown docked top-right: collapsed by default to a pill reading "Inbox · N ideas to place", hovering it peeks a read-only popup of what's inside (up to five titles, then "+N more"), and clicking it expands the full tray where each capture can be placed on the board or dismissed; moving the mouse off the tray (or clicking the header, the touch path) collapses it again. The tray disappears entirely when empty. He drags cards around, resizes them, edits their text, retags their pillars, draws labeled directional edges between cards to show how ideas relate ("leads to", "because of"), and dismisses cards he no longer wants. Dismissed cards and captures soft-delete (the row stays so the Mirror can still learn from what was let go).

**Adding directly + AI image generation (built).** Beyond the "Add anything" toolbar button and paste, the board has two direct entry points onto empty canvas. **Double-click** empty space drops a blank text card where the cursor is, focused to type. **Right-click** empty space opens a small **add menu** at the cursor with three actions, each placed at that spot: *Add text* (a blank card), *Generate image with AI* (a card that opens straight into AI-prompt mode), and *Upload image* (a file picker that drops an image card). AI image generation also works **inside any card**: in an empty text card, typing `/` then a space drops the card into **AI mode** (a purple "Generate with AI" header and a prompt field); describe an image and press Enter (Esc or Cancel backs out). On submit the same card **morphs in place** to a `generated_image` node flagged generating, showing a spinner with the prompt; a background action (OpenAI image model, pinned openai-direct since OpenRouter has no images endpoint) generates the picture, stores it in Convex file storage, and fills the card asynchronously. A failed generation flags the card with an error and a **Try again** that retries the same prompt. This is the manual counterpart to the proposed Coach co-build below; both write the same `generated_image` nodes.

**Selection and direct manipulation (built).** The board behaves like a spatial editor. Dragging on empty canvas draws a **marquee** (a bright "laser" blue border with a faint translucent fill, drawn in screen space); every card **fully swallowed** by the box joins the selection as it drags, live. A plain click on a card selects just that card; **Shift-click** adds a card to the selection; **⌘-Shift-click** toggles a card in or out (the "select a few, then deselect" gesture); a plain click on empty canvas clears the selection. A selected card drags by its whole body, and dragging any card in a multi-selection **moves the entire group together** (relative spacing preserved, committed optimistically so nothing snaps back while the move persists); an unselected card is selected-then-moved in one gesture. A click (no drag) on a selected text card drops into editing. When the selection is non-empty, a floating action bar shows the count and a **Delete** that removes every selected card at once; **⌫/Delete** does the same from the keyboard, **⌘-A** selects all, and **Esc** clears. Selection is ephemeral per-session UI state (a set of node ids); it is never persisted and touches no schema. A dismissable **legend** (bottom-left "?") lists every gesture. Input is routed so the gestures never collide: a card pointer-down never starts a marquee or pan, and modifier-clicks never start a drag.

**Pan and zoom (built).** On empty canvas, **Shift-drag** pans the board; on a trackpad, a **two-finger** swipe (a plain wheel event) pans and **⌘-scroll** or pinch (a `ctrlKey`/`metaKey` wheel event) zooms toward the cursor. Plain drag is reserved for the marquee, so panning is always an explicit modifier or trackpad gesture. All zoom clamps to the `useViewport` scale bounds. The **dot-grid background is screen-space**: dots keep a constant size and spacing (24px) at every zoom level — only panning shifts the pattern — so zooming changes the cards, never the paper. A card's **hover controls stay screen-constant too**: the delete ×, the connect handle, and the add-image button each counter-scale by `1/scale` (anchored to their card corner), so they never shrink to un-tappable specks when zoomed out or balloon when zoomed in — only the card content itself scales.

**Navigation and overview (built).** As a board grows, the person is never lost in it. A **minimap** anchored to the bottom-right renders every node at scale with a live dashed indicator of the current viewport; clicking anywhere on it animates the viewport to that region. A **Gather** control (toolbar, layers icon) repacks every card into a compact, no-overlap grid — sorted by creation time, wrapping at roughly four standard cards wide, using the same `rectsOverlap` geometry as the server spiral placement — then animates to the new layout's center. A **Center on nearest** control (toolbar, crosshair icon) animates the viewport to the node whose center is closest to the current view center. All viewport animation shares one `panTo` primitive (260ms cubic ease-out) in `useViewport`.

**Brain dump (built).** A **brain-dump** control (toolbar, mic icon) opens a voice-first modal: the person speaks freely and their stream of thought becomes multiple cards. The transcript is segmented by an AI split pass into distinct thoughts, each becoming a capture that distills and spiral-places onto the board as it finishes. See [`voice-field.md`](voice-field.md) §Brain dump.

**Document preview (built).** A document (`type: file`) node renders a rich preview rather than a bare download button: PDFs embed inline via `<embed>` (scrollable, native viewer); HTML renders in a **sandboxed** `<iframe>` (`sandbox="allow-forms"`, no scripts, no same-origin) and scrolls internally; anything else falls back to an icon plus a download link. Every document card keeps a header with filename and download. PDF and HTML previews are **resizable** via a bottom-right drag handle (in board coordinates, accounting for zoom), persisting to `node.dimensions` via the existing `nodes.resize` mutation, debounced. Dropped files default to a preview-friendly size.

**Coach co-build (proposed, the signature move).** Instead of building alone, he talks. A chat scoped to this board lets him describe the life he wants in plain language, and the Coach crafts the board *with* him: laying down nodes, wiring edges, and filling image blocks. Because image generation is slow, the Coach places `generated_image` nodes immediately with pre-written prompts, and the pictures populate asynchronously as they render. He watches the board assemble itself from the conversation, then takes over manually at any point. The board is the same data either way; the Coach is a power tool over it, never a gate (see [`coach.md`](coach.md)).

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Capture (paste/upload/url/quote) | Person adds to the board | Inserts an immutable `captures` row; schedules async distillation | Manual | `captures` (create) |
| Capture on behalf | Coach adds while co-building | Same, with `source: "agent"` | Coach | `captures` (create, `source: "agent"`) |
| Distill capture | Auto, after capture create | Async action writes `{title, essence, pillars}` onto the capture | AI | `captures.distilled` |
| Place capture | Auto on distill, or person from inbox | Spiral-places a non-overlapping node from the capture; marks capture placed | Manual / auto | `nodes` (create), `captures.placedAt/nodeId` |
| Add node directly | Blank card, or Coach lays one down | Creates a `node` (text by default) | Manual / Coach | `nodes` (create) |
| Add card by double-click | Double-click empty canvas | Drops a blank text card at the cursor, focused | Manual | `nodes` (create) |
| Open add menu | Right-click empty canvas | Add text / Generate image with AI / Upload image, placed at the cursor | Manual | `nodes` (create) |
| Generate image (manual) | "/"+space in a card, menu "Generate", or Try again | Morphs the card to `generated_image` (generating), then an action stores the image and fills it; failure flags an error to retry | Manual + AI | `nodes` (morph), `imageGen.generateInto`, file storage |
| Morph card | Paste into a blank card | Changes a card's type and content in place (text → image/link/quote) | Manual | `nodes` (patch) |
| Move / resize | Drag / drag handle | Updates `position` / `dimensions` | Manual / Coach | `nodes` (patch) |
| Marquee select | Drag on empty canvas | Selects every card fully swallowed by the box (live) | Manual | none (UI state) |
| Click / Shift / ⌘-Shift select | Click a card | Replace / add / toggle the card in the selection | Manual | none (UI state) |
| Group move | Drag any selected card | Moves the whole selection by one delta; commits optimistically | Manual | `nodes.position` (one `move` per selected node) |
| Mass delete | Action-bar Delete or ⌫/Delete | Soft-deletes every selected node | Manual | `nodes.isActive` (per node) |
| Select all / clear | ⌘-A / Esc or click empty | Selects all nodes / clears the selection | Manual | none (UI state) |
| Gather | Toolbar (layers) | Repacks all nodes into a compact no-overlap grid; animates to center | Manual | `nodes.position` (one `move` per node) |
| Center on nearest | Toolbar (crosshair) | Animates viewport to the node nearest the view center | Manual | none (viewport only) |
| Minimap pan | Click the minimap | Animates viewport so the clicked world point is centered | Manual | none (viewport only) |
| Brain dump | Toolbar (mic) | Opens the voice modal; spoken thoughts become captures that distill and place | Manual + AI | `captures` (create), `nodes` (create) |
| Preview document | A `file` node renders | Inline PDF embed / sandboxed HTML iframe / icon fallback by mime type | Manual | reads `files.getUrl` |
| Resize document preview | Drag handle on a `file` node | Resizes PDF/HTML preview; persists to dimensions (debounced) | Manual | `nodes.resize` |
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
- **Capture in inbox.** Distilled (or not) but `placedAt` unset: waiting in the tray to be placed. The tray itself has three ephemeral UI states — collapsed (the count pill; the default), peeking (hover: read-only title list), and expanded (click: place/dismiss per capture; collapses on mouse-leave or header click) — none persisted.
- **Node placed / active.** On the board, `isActive: true`, movable and connectable.
- **Node generating (built).** A `generated_image` node with `attribution: "generating"`, its prompt in `text`, and no `fileId` yet; the card shows a spinner with the prompt until the image stores and fills.
- **Node generation failed (built).** A `generated_image` node flagged `attribution: "error"` (the failure note in `title`, the prompt kept in `text`); the card offers **Try again** to retry the same prompt.
- **Card in AI mode (built, ephemeral).** A text card the person is dictating an image prompt into (entered by `/`+space or the right-click "Generate" action). Purely client UI; nothing persists until they submit and the card morphs.
- **Selected.** One or more nodes in the ephemeral selection set: each shows a blue ring, the action bar shows the count, and a drag on any of them moves the group. Cleared on Esc, on a plain click of empty canvas, or on a marquee that swallows nothing.
- **Marqueeing.** A drag is open on empty canvas: the laser box is drawn and the selection updates live to whatever it fully contains.
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
- **Empty / single-node navigation.** Minimap is hidden on an empty board; Gather and Center-on-nearest are no-ops with zero nodes and trivially correct with one.
- **Partial-overlap marquee.** A card the box only clips (not fully swallowed) is deliberately excluded — selection requires whole containment, so a sweep never grabs cards the person only grazed.
- **Click vs drag on a card.** A pointer-down that travels under a small screen-space threshold is a click (selection sticks; a selected text card focuses for editing); past it, the gesture becomes a move. This is what lets one card be both selectable and editable without a separate handle.
- **Delete while editing.** ⌫/Delete and ⌘-A are ignored while a text field is focused, so editing card text never deletes the selection; Esc still clears.
- **Group move mid-persist.** Committed positions are held optimistically until the reactive query confirms them, so a grouped move never flickers back to the pre-move layout; a deleted node's override is dropped when it disappears.
- **Gesture collisions.** Shift-drag pans (never marquees); plain wheel pans while ⌘/pinch wheel zooms; a card pointer-down stops propagation so it never also starts a background pan or marquee; modifier-clicks select without dragging.
- **Untrusted document HTML.** HTML previews never execute scripts or touch the parent origin (sandboxed); a malformed or huge HTML file renders best-effort and may stutter on slow devices.
- **PDF without a browser viewer.** Browsers lacking a built-in PDF viewer render the embed blank; the always-present download link in the card header is the fallback.
- **Brain dump with no/garbled speech.** An empty or unusable transcript returns the modal to idle without creating captures; a single-thought dump yields exactly one node; if the AI split pass fails, the whole transcript becomes one capture; if distillation stalls, captures place with raw text after a timeout.
- **Generated image fails (built).** A `generated_image` action that errors (no provider key, model rejection, transport failure) flags the node `attribution: "error"` rather than throwing into the UI; the card shows the error and a **Try again** that re-runs the same prompt. The board never blocks on image generation — the rest of the surface stays fully interactive while a card generates.
- **AI mode on a non-empty card.** The `/`+space shortcut only fires when the card's whole text is exactly `/`, so typing a slash mid-sentence never hijacks editing; the menu "Generate" action always opens a fresh card in AI mode.
- **Co-build conflict (proposed).** The Coach does not silently overwrite the person's board; when its suggestion conflicts with what is there, it proposes and the person decides, consistent with the Coach's core-curation rule (see [`coach.md`](coach.md)).

## 7. AI involvement

See [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) for provider routing, model classes, and the dual-provider client.

**Built: capture distillation.** On every capture, a background action distills the raw input into `{ title, essence, pillars }` via the dual-provider chat client (OpenRouter preferred, OpenAI fallback) in JSON mode, with a fixed distill system prompt and low temperature. It runs internally on the server (the key never reaches the client), reads only the single capture, and writes back the `distilled` object. This is what turns raw inspiration into the title/essence/pillar text that the spiral placement and the Core consume. Embeddings are deferred (the field stays optional and unused).

**Built: manual image generation.** The `imageGen` AI node (see [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) and `convex/ai/config.ts`) turns a person's prompt into a picture on the board. It is pinned to the **openai** provider — OpenRouter has no `/images/generations` endpoint — so it uses the person's saved OpenAI key, else the deployment's `OPENAI_API_KEY`; the model is a single config dial (`gpt-image-1`, OpenAI's current image model — newer accounts no longer expose the `dall-e-*` ids at all). The flow (`convex/ai/imageGen.ts`): the client creates the `generated_image` node already in a generating state so the spinner is instant, then calls the `generateInto` action, which checks ownership, calls the image model, stores the bytes in Convex file storage (handling both base64 and url responses), and patches the node with the `fileId` (clearing the generating flag). On failure it flags the node `attribution: "error"` instead of throwing. The key never reaches the client.

**Proposed: Coach co-build.** A board-scoped Coach thread that converts conversation into board mutations. It draws the Core (and optionally Goals) through the Bus, proposes nodes and labeled edges, and writes image-generation prompts onto `generated_image` nodes — reusing the same `imageGen` node and `generated_image` flow the manual path already uses. The prompts are pre-generated so blocks can be placed instantly and filled asynchronously by the image model. The Coach writes through the same node/edge/capture mutations a person uses; it surfaces conflicts rather than overwriting.

## 8. Data touched

Per [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Owned.**
- `surfaces` (the board is a `type: "whiteboard"` surface today; the `type` union widens toward `vision`).
- `nodes` (`type: text | quote | image | link | file | generated_image`, `title`, `text`, `imageUrl`, `fileId`, `attribution`, `position{x,y,z}`, `dimensions`, `pillars[]`, `captureId?`, `isActive`). `generated_image` is the type the manual generate flow, co-build, and Future-Self-derived nodes use; on a `generated_image` the `attribution` field doubles as a status flag (`"generating"` / `"error"`, absent once filled), `text` holds the prompt, and `title` holds any failure note.
- `edges` (`fromNode`, `toNode`, `label?`, `note?`): labeled, directed, cycle-checked.
- `captures` (`source: paste|upload|url|audio|agent`, `rawType: text|image|link|video_link|quote`, `rawText?`, `rawUrl?`, `rawFileId?`, `distilled?{title,essence,pillars}`, `placedAt?`, `nodeId?`, `isActive`). `source: "agent"` is the Coach capturing on the person's behalf.

**Published (to the Core, as text).** `interactions` events (for example node placed, capture distilled), carrying distilled text and pillar themes; these roll into `mirror` via the Coach's curation pass. Images are never published; only their distilled text.

**Drawn (at act-time, never held).** During Coach co-build only: the **Core** (`mirror`) and optionally **Goals**, read through the Context Bus.

## 9. Open questions

- Is the board's build-chat the docked Coach scoped to the board, or a board-local chat surface? (Leaning: the same Coach, scoped to the board, per the element notes.)
- The manual path settles the image model as a config dial (`imageGen`, `gpt-image-1`). Still open for co-build: how prompts are pre-generated and revised mid-conversation, and whether to use a cheaper image model for drafts (settle in [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) when co-build is built).
- When the `surfaces.type` union moves from `whiteboard` to `vision`, and whether any migration is needed.
- Whether distilled captures should auto-place or always pass through the inbox tray first.
- How `edges.note` (defined but unused today) is surfaced in the UI.
