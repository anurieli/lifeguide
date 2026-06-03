# Extraction Report 01 — `braindump`

> Source: `/Users/arielnurieli/Desktop/Life Board/braindump`
> Stack: Next.js 14 (App Router) + Supabase (Postgres + pgvector + Storage + Auth) + OpenAI + Zustand 5. Tailwind + Radix + lucide.
> Purpose: catalog every reusable feature/pattern for the **net-new AI-first LifeGuide build** (likely Convex + Next.js + OpenAI). Each item is classified **REUSE / ADAPT / REBUILD / DROP** with an "AI-first" recommendation: should this component publish state to a shared context layer every AI call can see?

---

## TL;DR for the orchestrator

- **The canvas is NOT Konva.** Despite `konva`/`react-konva` being in `package.json`, the live canvas (`Canvas.tsx`, `IdeaNode.tsx`, `EdgeRenderer.tsx`) is **plain absolutely-positioned DOM divs + CSS transforms + an SVG edge layer**. Konva only appears in two dead components (`Edge.tsx`, `Grid.tsx`) and a dev-page label. Do not port Konva. The DOM/SVG approach is the actual reusable asset, and its coordinate math + interaction model are excellent.
- **Best assets to take:** the coordinate system (`screenToCanvas`/`canvasToScreen` + zoom-toward-cursor), the **persistent-input → instant-node flow** with length-gated AI (`<60 chars = no AI`), the **atomic create-idea-with-edge** + rollback pattern, the **labeled-edge model with app-level cycle detection**, the **media → distilled-text-node** pipeline (image/PDF/URL/Vision OCR), and the **clean `src/lib/ai` model/prompt/runner/cost abstraction**.
- **Biggest opportunity:** embeddings are generated and stored on every idea but **never read** (the `/similar` route calls a `match_ideas` RPC that does not exist in the schema and nothing in the UI calls it). LifeGuide should activate them as the backbone of the shared context/intelligence layer.
- **Biggest traps:** undo/redo is a fragile bespoke `JSON.stringify`-diffing singleton outside the store; there is **no per-user data ownership** (`brain_dumps` has no `user_id`, no RLS); and there are **two divergent AI pipelines** (the active client one does NOT log cost; the unused server one does).

---

## 0. Architecture at a glance

```
src/
  app/
    page.tsx                 # bootstrap: auth gate → load brain dumps → edge types → ideas/edges
    login/page.tsx
    api/
      ideas/, edges/, edge-types/, brain-dumps/, attachments/
      link-preview/route.ts  # server-side OG/meta scraper
      ai/generate-summary/route.ts
      ai/generate-embedding/route.ts
      ideas/[id]/similar/route.ts   # pgvector similarity (DEAD: RPC missing, no callers)
      jobs/status/route.ts
  components/
    Canvas.tsx               # the real canvas (DOM + CSS transform + SVG), pan/zoom/box-select
    IdeaNode.tsx             # node render + multi-drag + collision/auto-edge/merge
    EdgeRenderer.tsx         # SVG edge layer (straight lines + labels + arrowheads)
    InputBox.tsx             # persistent bottom input; URL extraction; auto-relate
    QuickIdeaInput.tsx       # double-click / drag-from-node inline editor
    AttachmentNode.tsx, FileDropModal.tsx, ContextMenu.tsx, ...
  store/
    index.ts                 # zustand create() + undo/redo singleton + batch helpers
    slices/{brainDumps,ideas,edges,ui,scanner}Slice.ts
  lib/
    geometry.ts              # screenToCanvas, rect/line intersection, collision, edge paths
    ai/{models,prompts,runner,clients,types,index}.ts  + tools/{vision-extraction,image-tools}
    file-upload.ts           # validate/thumbnail/PDF/text-extract + Storage(base64 fallback)
    debounce.ts              # PositionDebouncer (300ms) + generic debounce
    idea-positioning.ts      # non-overlapping spiral placement
    supabase/{client,server}.ts, supabase.ts (service-role server client)
    background-jobs.ts        # server-side AI queue + ai_operations cost logging (UNUSED by UI)
    openai.ts                # client fetch wrappers to /api/ai/*
  types/index.ts             # Idea/Edge/BrainDump/Attachment shapes (UI + DB variants)
docs/database_schema.sql      # full Postgres schema (source of truth)
```

Data flow for a typical idea: **InputBox** → `addIdea()` (ideasSlice) → optimistic insert into `ideas` Record + Supabase insert → if `text.length >= 60`, fire-and-forget `processIdeaAI()` → client calls `/api/ai/generate-summary` + `/api/ai/generate-embedding` → writes `summary` + `embedding` back to row → node re-renders with summary.

---

## 1. Canvas

### 1a. Rendering model (DOM + CSS transform + SVG) — NOT Konva
**What it does:** Renders an infinite pannable/zoomable canvas of idea nodes and edges.
**How it works:**
- `Canvas.tsx:802-816` — a single transform container applies **pan only** via `transform: translate(viewport.x, viewport.y)`. Inside it, `<EdgeRenderer/>` (SVG) renders first (so edges sit behind), then `ideas.map(idea => <IdeaNode/>)`.
- **Zoom is applied at the page level, not the canvas.** `app/page.tsx:118` sets `style={{ zoom: viewport.zoom }}` on the outer flex container. The grid uses a constant 40px size (`Canvas.tsx:93-100`) because page-level CSS `zoom` scales it visually.
- Each node is `position: absolute; left/top = position_x/position_y; transform: translate(-50%,-50%)` (`IdeaNode.tsx:683-696`) — **so `position_x/position_y` are node CENTERS**, which simplifies edge endpoint math.
- `IdeaNode` is a heavy component (≈850 lines) handling render, drag, hover, inline edit, connection handle, collision, merge.

**Evidence:** `src/components/Canvas.tsx:783-883`, `src/app/page.tsx:114-120`, `src/components/IdeaNode.tsx:678-701`.
**Classification: ADAPT.** The DOM/SVG approach is sound and far simpler than Konva, but the using-`zoom`-CSS-at-page-level trick is fragile (it scales *everything* including fixed UI, and breaks `getBoundingClientRect` reasoning; see Gotchas). Rebuild with a proper single transform `translate(x,y) scale(zoom)` on one stage container, or adopt a mature lib (React Flow / tldraw) if the spatial board is core. Keep the center-anchored node convention.
**AI-first:** The canvas viewport + which nodes are on-screen + selection should be **published to the shared context layer** so any AI call ("summarize what I'm looking at", "what's near this idea") can see the current spatial focus.

### 1b. Coordinate system (`screenToCanvas` / `canvasToScreen`)
**What it does:** Converts pointer/screen coords ↔ world/canvas coords.
**How it works:** Pure functions: `screenToCanvas = (s - pan) / zoom`; `canvasToScreen = c*zoom + pan` (`geometry.ts:196-221`). Used everywhere: mouse-down box select (`Canvas.tsx:165`), drag-over drop position (`Canvas.tsx:304`), double-click new-node (`QuickIdeaInput` submit `:138`), connection end (`Canvas.tsx:679`).
**Evidence:** `src/lib/geometry.ts:195-221`.
**Classification: REUSE.** Textbook-correct, framework-agnostic, zero dependencies. Copy verbatim.
**AI-first:** N/A (pure util) — but it's the primitive that lets the context layer translate "where is the user looking" into world coords.

### 1c. Pan / zoom / pinch
**What it does:** Pan via middle-mouse / Alt+drag / Space+drag; scroll-to-pan; Cmd/Shift/pinch to zoom toward cursor; Safari `gesture*` + multi-touch pinch.
**How it works:**
- Pan detection: `Canvas.tsx:149-160` (`button===1 || (button===0 && (altKey||metaKey||space)))`).
- Wheel handler distinguishes pan vs zoom by modifier/pinch (`Canvas.tsx:449-501`); **zoom-toward-cursor** keeps the world point under the mouse fixed by computing `screenToCanvas` before & after the zoom and adjusting pan by the delta (`:486-499`). This same block is duplicated for `gesture*` (`:519-549`) and touch (`:583-621`).
- Listeners attached natively with `{ passive: false }` so `preventDefault` works (`Canvas.tsx:631-658`).
**Evidence:** `src/components/Canvas.tsx:433-658`.
**Classification: ADAPT.** The zoom-toward-cursor math is the keeper; the three near-identical implementations (wheel/gesture/touch) should be unified into one `applyZoom(centerX, centerY, newZoom)` helper. Note: this works because the node layer is NOT page-zoomed — when you switch to a true `scale()` transform the same math applies.
**AI-first:** Publish `{viewport, zoom}` to context on settle (debounced) so AI knows the user's zoom level / focus region.

### 1d. Box-select (real-time, nodes + edges)
**What it does:** Drag on empty canvas to rubber-band select nodes and edges live.
**How it works:** On mouse-down (no modifier) start a `selectionBox` in canvas coords (`Canvas.tsx:162-183`). On move, recompute selection each frame: nodes via `rectsIntersect` (accounting for center-anchor: `x - w/2`, `Canvas.tsx:226-238`), edges via `lineIntersectsRect` against the source/target centers (`:240-268`). Shift/Cmd appends. The visual box is drawn in screen space (`box + viewport`, `Canvas.tsx:818-829`).
**Evidence:** `src/components/Canvas.tsx:187-274`, intersection helpers `geometry.ts:26-33,224-294`.
**Classification: REUSE (logic) / ADAPT (wiring).** The intersection helpers are clean pure functions — reuse. The per-frame full-scan select is fine at small scale; gate by viewport-culled set at large scale.
**AI-first:** Selection set is prime context — see §9.

### 1e. Viewport persistence
**What it does:** Each brain dump stores its own pan+zoom; restored on open.
**How it works:** `brain_dumps.viewport_x/y/zoom` columns (`database_schema.sql:30-32`, with `CHECK zoom 0.1–3.0`). `switchBrainDump` saves the *outgoing* viewport then restores the incoming one (`brainDumpsSlice.ts:120-143`). `saveViewport()` writes all three (`:383-415`). **Note: there is no debounce/throttle on viewport save during pan** — it's only persisted on brain-dump switch, so rapid panning is not continuously saved (a gap, not a bug).
**Evidence:** `src/store/slices/brainDumpsSlice.ts:120-143,379-415`.
**Classification: REUSE (concept) / ADAPT (impl).** Per-board viewport is the right model. In Convex this becomes a field on the board doc; add a debounced save on pan-end.
**AI-first:** Viewport state belongs in the shared context (see §1a/1c).

### 1f. Rendering performance / viewport culling
**What it does:** Intends to render only on-screen nodes (+500px buffer).
**How it works:** `getVisibleIdeas(viewport, canvasSize)` computes world bounds with a 500px buffer and filters (`ideasSlice.ts:1096-1137`). **BUT `Canvas.tsx` does NOT call it** — it renders `ideas.map(...)` over the full set (`Canvas.tsx:813`). So culling exists but is unused; the perf comes from React + cheap divs. Position writes are debounced 300ms (`debounce.ts:63`); node size is measured with `ResizeObserver` and synced back to store/db only on >0.5px change (`IdeaNode.tsx:165-199`).
**Evidence:** `src/store/slices/ideasSlice.ts:1096-1137` (defined), `src/components/Canvas.tsx:78-83,813` (not used).
**Classification: ADAPT.** Keep the culling helper and *actually wire it in* for large boards; keep the 300ms position debounce and ResizeObserver-measure pattern (both good). CLAUDE.md targets 60fps pan / <100ms create.
**AI-first:** The visible-set computation is exactly what you'd feed the context layer as "currently in view."

### 1g. Multi-node drag (group move)
**What it does:** Drag one selected node and all selected nodes move together; 5px threshold before drag starts.
**How it works:** On node mouse-down, record start (`IdeaNode.tsx:306-311`) but don't drag yet. Document-level `mousemove` starts dragging only past `DRAG_THRESHOLD=5px` (`:355-394`), snapshots all selected nodes' start positions into a ref Map (`:373-393`), then on each move applies the same `dx/dy` to every selected node via `updateIdeaPosition` (`:403-418`). Uses document listeners (not React) for reliable drag-outside-element.
**Evidence:** `src/components/IdeaNode.tsx:285-551`.
**Classification: ADAPT.** Group-drag + threshold + start-position-snapshot is the correct pattern; reuse it. But it's entangled in an 850-line component with collision/merge/connection logic — extract drag into a focused hook (`useNodeDrag`) on rebuild.

---

## 2. Node / Idea model

### 2a. Data shape
**What it does:** A node = a positioned thought (text or attachment) on a board.
**DB row (`ideas`, `database_schema.sql:41-79`):** `id, brain_dump_id (FK CASCADE), text NOT NULL, summary, position_x/y, width/height (default 200/100), type ('text'|'attachment'), state ('generating'|'ready'|'error'), session_id (temporal grouping), embedding vector(1536), metadata JSONB, created_at/updated_at`. Constraints: text non-empty, type/state enums, positive dims.
**TS:** `IdeaDB` (`types/index.ts:161-186`) extends with rich preview fields (`url, nodeTitle, nodeDescription, previewImageUrl, fileType, currentPage, totalPages`) and widens `type` to also allow `'document'|'web'` (a divergence from the DB CHECK constraint — see Gotchas).
**Evidence:** `docs/database_schema.sql:41-79`, `src/types/index.ts:161-186`.
**Classification: REUSE (shape) / ADAPT (cleanup).** Great schema. Drop the duplicate UI `Idea` vs DB `IdeaDB` types (the store actually uses `IdeaDB` everywhere and aliases it to `Idea`); pick one. Reconsider `width/height` persistence (it's measured client-side anyway).
**AI-first:** Add a first-class `context`/`tags`/`source` field. Every node should be embeddable + summarizable + linkable into the shared context layer by default.

### 2b. Create flow + length-gated AI
**What it does:** Creating a node is instant; AI summary/embedding only run for longer text.
**How it works:** `addIdea(text, position)` (`ideasSlice.ts:80-147`): computes `needsAI = text.length >= 60`; initial `state = needsAI ? 'generating' : 'ready'`; inserts row, pushes into store immediately, saves undo snapshot, then **fire-and-forget** `processIdeaAI(id)` only if `needsAI`. The 60-char gate is mirrored in the UI (`InputBox.tsx:649-656` shows "n/60" and "Idea will be summarized with AI").
**Evidence:** `src/store/slices/ideasSlice.ts:80-147`, `src/components/InputBox.tsx:644-657`.
**Classification: REUSE.** The length gate is a smart cost/latency optimization and a clean UX signal. Keep it (maybe make the threshold configurable).
**AI-first:** On rebuild, *every* node (short or long) should still be embedded for recall — short ideas are exactly the ones semantic grouping helps. Gate the *summary* on length, not the *embedding*.

### 2c. Persistent-input → instant-node flow
**What it does:** A fixed bottom "Capture your thoughts…" box; Enter creates a node at viewport center, finds a non-overlapping spot, and recenters the viewport on it.
**How it works:** `InputBox.tsx:236-395`. On submit: extracts URLs from text into attachment chips and strips them from the body (`:242-281`), computes an anchor (parent position in auto-relate mode, else viewport center `:288-302`), calls `findNonOverlappingPosition(...)` (`:305`), creates the idea (or `addIdeaWithEdge` in auto-relate), fires URL attachments to `/api/attachments` in background (`:357-373`), then `updateViewport` to center on the new node (`:375-385`). Also: typing any alphanumeric anywhere on the canvas auto-focuses this box and seeds the char (`Canvas.tsx:721-732` via `inputBoxRef.focusAndSetValue`).
**Evidence:** `src/components/InputBox.tsx:236-395`, `src/components/Canvas.tsx:713-732`.
**Classification: REUSE (UX) / ADAPT (impl).** This frictionless capture loop is the soul of a brain-dump tool — keep it. The "type-anywhere captures" behavior is delightful. The non-overlap placement (`idea-positioning.ts`) is a nice touch.
**AI-first:** The input box is the obvious place to surface AI: live "related ideas" as you type (use embeddings), auto-suggested edges to existing nodes, auto-tagging. The box's draft text should stream into the context layer.

### 2d. Inline / quick editors
**What it does:** Two creation surfaces beyond the bottom box: double-click empty canvas → inline `QuickIdeaInput`; drag from a node's connection handle and release on empty canvas → same editor pre-wired to create an edge.
**How it works:** `QuickIdeaInput.tsx` reads `quickEditor` UI state (`uiSlice.ts:473-487`). On submit it detects URLs (→ `addUrlAttachmentIdea`) vs text (→ `addIdea`), then if a `pendingConnection` exists creates the edge (`QuickIdeaInput.tsx:122-176`). Releasing a connection drag on empty space opens it with `pendingConnection` (`Canvas.tsx:662-711`). Double-click-to-edit existing node text lives in `IdeaNode.tsx:260-277` (saves with `skipAI:true`).
**Evidence:** `src/components/QuickIdeaInput.tsx:122-176`, `src/components/Canvas.tsx:662-711`, `src/store/slices/uiSlice.ts:473-496`.
**Classification: REUSE (UX patterns) / REBUILD (code).** Multiple low-friction creation entry points are great; rebuild cleanly on the new state layer.

### 2e. Optimistic UI + rollback
**What it does:** Mutations show instantly; DB syncs in background; failures revert.
**How it works:** Temp-id pattern for attachments/URLs/edges (`temp-${Date.now()}`), replaced with the real row on success, deleted on error (`ideasSlice.ts:376-489`, `edgesSlice.ts:89-163`). `addIdeaWithEdge` implements a manual transaction with **explicit rollback**: if the edge insert fails it deletes the just-created idea (`ideasSlice.ts:338-360`). Position updates are optimistic + debounced (`ideasSlice.ts:678-704`).
**Evidence:** `src/store/slices/ideasSlice.ts:80-489`, `src/store/slices/edgesSlice.ts:82-234`.
**Classification: ADAPT.** Optimistic UI is essential; the manual temp-id/rollback dance is exactly the boilerplate **Convex eliminates** (built-in optimistic updates + real transactional mutations). On Convex, REBUILD this away — keep the UX, delete the plumbing.
**AI-first:** Mutations should also enqueue a context-layer update (re-embed, re-summarize) as part of the same transaction.

### 2f. Idea merging (drag-to-merge)
**What it does:** Drag a node ≥40% over another to merge them (combine text, transfer edges + attachments, re-run AI).
**How it works:** Collision detection during drag (`IdeaNode.tsx:420-476`, throttled 60fps `CollisionDetector` in `geometry.ts:374-397`); on drop with `dropTargetIdeaId` set, calls `mergeIdeas(source, target)` (`ideasSlice.ts:912-1085`): concatenates text, keeps target position, merges metadata, rewires edges (dropping self-refs & dupes), moves attachments, deletes source, marks target `generating` and re-runs `processIdeaAI`.
**Evidence:** `src/store/slices/ideasSlice.ts:912-1085`, `src/lib/geometry.ts:305-397`.
**Classification: ADAPT (powerful, AI-relevant).** Merge is conceptually great for LifeGuide ("consolidate these thoughts"). The implementation is complex and edge-rewiring is hairy. Rebuild on a cleaner data layer and consider an **AI-assisted merge** (LLM synthesizes the combined text rather than naive concat).
**AI-first:** Merge is a natural AI action — the context layer + an LLM should produce the merged node.

---

## 3. Edges

### 3a. Model + labeled types + multi-target
**What it does:** Directed parent→child relationships with a typed label; one node can have many children and many parents.
**How it works:** `edges` table (`database_schema.sql:83-102`): `parent_id, child_id (both FK CASCADE), type VARCHAR(50) default 'related_to', note`. `UNIQUE(parent_id, child_id)` + `CHECK(parent_id != child_id)`. `edge_types` table (`:106-114`) is user-extensible; seeded with `related_to, prerequisite_for, inspired_by, blocks, similar_to, depends_on` (`:359-366`). Multi-target is inherent (no cardinality limit). The TS `EdgeType` declares `allows_bidirectional` / `prevents_cycles` flags (`types/index.ts:76-84`) that the validator reads, **but those columns are NOT in the schema** — a divergence (see Gotchas).
**Evidence:** `docs/database_schema.sql:83-114,359-366`, `src/types/index.ts:76-84`.
**Classification: REUSE (model).** Clean, expressive relationship model. Keep labeled, typed, user-extensible edges. Reconcile the `allows_bidirectional`/`prevents_cycles` flags into the actual schema.
**AI-first:** Edge types + notes are rich context. The shared layer should expose the graph neighborhood of any node so AI can reason over relationships ("what does this depend on?").

### 3b. Cycle detection (`would_create_cycle` — DB + app)
**What it does:** Prevents circular dependencies before creating an edge.
**How it works:** **Two implementations.**
- **DB:** SQL `would_create_cycle(new_parent, new_child)` = "is parent a descendant of child?" using recursive `get_descendants` (max depth 10) (`database_schema.sql:262-314`). Plus `get_ancestors`, `get_parent_count`, `get_child_count`.
- **App (the one actually used):** `wouldCreateCycle()` in `edgesSlice.ts:329-396` does an in-memory DFS with a recursion stack + path reconstruction (logs the cycle path), scoped to same-type edges, skipped entirely for `allows_bidirectional` types. Called by `validateEdge` (`:259-310`) before every insert.
**Evidence:** `docs/database_schema.sql:261-314`, `src/store/slices/edgesSlice.ts:259-396`.
**Classification: REUSE (both).** The app-side DFS gives instant client feedback; the DB functions are the authoritative guard. Port both. The recursive ancestor/descendant SQL is genuinely useful for graph queries and for feeding hierarchy into the context layer.
**AI-first:** `get_ancestors`/`get_descendants` are exactly how you'd assemble "the full lineage of this idea" for an AI prompt. Wire them into the context layer.

### 3c. Rendering (`EdgeRenderer`)
**What it does:** Draws edges as straight SVG lines between node-edge intersection points, with a labeled pill and an arrowhead; selectable/deletable.
**How it works:** `EdgeRenderer.tsx` filters edges by current board (`:22-27`), renders one `<svg>` overlay (`:63-72`) with three arrowhead markers (default/selected/remove). For each edge it computes endpoints via `nearestPointOnRect` from each node's center to the other's center (`:158-166`), draws a `<line>`, a label `<rect>+<text>` at the midpoint, and a transparent 20px-wide line on top for easy clicking (`:219-230`). Selection highlights blue; hovering a connected node during a connection drag highlights red ("will be removed"). `memo`-wrapped.
**Note:** `geometry.ts` also has `generateEdgePath` (quadratic bezier curves) but `EdgeRenderer` uses straight lines; the bezier path is unused.
**Evidence:** `src/components/EdgeRenderer.tsx:1-238`, `src/lib/geometry.ts:51-127`.
**Classification: REUSE (approach) / ADAPT (code).** SVG edge layer with edge-intersection endpoints + clickable fat invisible line + label pills is the right pattern and performant. Keep `nearestPointOnRect`. Decide straight vs bezier (bezier helper already exists if you want curves).
**AI-first:** N/A (presentation).

### 3d. Persistence + auto-relate + drag-to-connect
**What it does:** Three ways to create edges: (1) "train-of-thought" auto-relate mode, (2) drag from a node's center handle onto another (Cmd) or empty space, (3) drag-overlap auto-edge.
**How it works:**
- **Auto-relate ("train-of-thought"):** toggle in `InputBox` (`:744-817`). When ON and exactly one node selected, that node is the "pending parent"; each new idea is created via atomic `addIdeaWithEdge(...)` and **becomes the next pending parent**, building a chain. `←` navigates up the hierarchy; `ESC` clears the parent but keeps mode on (`InputBox.tsx:146-153,291-355,397-417`). Preference persisted to `users.metadata.preferences.ui.autoRelateMode`. Documented in `docs/feature_docs/AUTO_RELATE_MODE_FEATURE_DOCUMENTATION.md`.
- **Connection-handle drag:** hover a node → center handle appears (`IdeaNode.tsx:716-725`); mouse-down starts a connection (`startConnection`, `:553-569`); hovering another node **while holding Cmd** toggles an edge (`:201-239`); releasing on empty space opens `QuickIdeaInput` pre-wired to connect.
- **Drag-overlap auto-edge:** while dragging, ≥10% overlap auto-creates a `related_to` edge to the touched node (`IdeaNode.tsx:446-462`).
- All persist through `addEdge()` (optimistic temp-id → Supabase insert, `edgesSlice.ts:82-164`).
**Evidence:** `src/components/InputBox.tsx:744-817`, `src/components/IdeaNode.tsx:201-239,446-512,553-569`, `src/store/slices/edgesSlice.ts:82-164`.
**Classification: REUSE (auto-relate UX) / ADAPT (the rest).** Auto-relate / train-of-thought is a standout feature for a "living roadmap" — chaining thoughts into a hierarchy with one toggle. Definitely take. The three overlapping edge-creation modes are powerful but confusing together; pick the best two and rebuild.
**AI-first:** Instead of (or alongside) manual edges, the **embedding layer should propose edges** ("these two ideas look related — connect them as `inspired_by`?"). Auto-relate + AI-suggested edges = the intelligence layer made visible.

---

## 4. Media intake → distilled text node

### 4a. The pipeline (any file/URL → node)
**What it does:** Drop a file or paste a URL anywhere → it becomes a node with extracted metadata/preview.
**How it works:**
- **Drop:** `Canvas.tsx:289-388` computes drop position, validates, opens `FileDropModal` for a description, then `addAttachmentIdea(file, pos, desc)`.
- **`addAttachmentIdea`** (`ideasSlice.ts:368-490`): optimistic temp node (square 200×200), `uploadFile(file)`, insert `ideas` row (`type:'attachment'`) + `attachments` row, swap temp→real.
- **`uploadFile`** (`file-upload.ts:349-544`): files <1MB are stored as **base64 data URLs** (no Storage round-trip); larger files try Supabase Storage with a **base64 fallback** if Storage policies fail. Per-type metadata is generated client-side.
**Evidence:** `src/components/Canvas.tsx:289-388`, `src/store/slices/ideasSlice.ts:368-490`, `src/lib/file-upload.ts:349-544`.
**Classification: ADAPT.** The "any media becomes a node" intake is core and worth keeping. The base64-in-DB fallback is a pragmatic hack that bloats rows and the `ideas`/`attachments` records — on rebuild use Convex file storage / proper object storage and store only references.
**AI-first:** Every intake should run through the AI distiller (OCR/transcription/summarize) and emit both the raw artifact AND a distilled text node that gets embedded into the context layer.

### 4b. Image metadata + thumbnails
**How it works:** `getImageDimensions` (`file-upload.ts:147-172`) and `generateThumbnail` (canvas `toDataURL`, max 200px, `:89-142`) run for images >100KB; dims + thumbnail go into `attachment.metadata`.
**Classification: REUSE (utils).** Clean, browser-native, no deps.

### 4c. PDF handling
**How it works:** `generatePDFThumbnail` + page-count extraction via **`pdf-lib`** (`file-upload.ts:189-298,394-399`). Note: it does NOT render the real first page — it draws a *stylized representation* (gradient + fake text lines + "PDF" + page count) because `pdf-lib` can't rasterize. `pageCount`/`currentPage` stored; `setIdeaCurrentPage` supports page navigation (`ideasSlice.ts:753-815`).
**Classification: ADAPT.** Page-count + nav model is fine; the fake-thumbnail is a placeholder. For real PDF previews use `pdf.js` (rasterize page 1) or a server render. And **PDFs are never sent to OCR/Vision** in the current code — a gap.
**AI-first:** PDFs should be text-extracted (pdf.js text layer or server parse) and the extracted text embedded — that's the "distilled text node."

### 4d. URL / link-preview
**What it does:** Paste/drop a URL → fetch OG/Twitter/meta → node shows title/description/image/favicon.
**How it works:** Server route `api/link-preview/route.ts` validates the URL (http(s), real TLD, not localhost — basic SSRF guard), fetches HTML with a bot UA, regex-extracts `og:*`/`twitter:*`/`<title>`/`<link rel=icon>`, normalizes relative URLs to absolute, returns `{title, description, image, favicon}` (`:44-119`). `addUrlAttachmentIdea` (`ideasSlice.ts:492-616`) calls it and stores `metadata.linkPreview`. `InputBox` extracts URLs from typed/pasted text live (`InputBox.tsx:99-117,475-540,575-628`).
**Evidence:** `src/app/api/link-preview/route.ts:1-119`, `src/store/slices/ideasSlice.ts:492-616`, `src/components/InputBox.tsx:99-540`.
**Classification: REUSE.** Solid, dependency-free OG scraper with reasonable SSRF hardening. Port it (tighten SSRF: block private IP ranges/redirect-to-internal).
**AI-first:** Fetch the page body too (not just OG tags), summarize it, and embed the summary so URLs become first-class recall-able context.

### 4e. GPT-4 Vision OCR (handwriting/diagrams)
**What it does:** Extracts all text + diagrams/tables/formulas from an image, returns structured JSON with confidence.
**How it works:** `lib/ai/tools/vision-extraction.ts` — `analyzeHandwriting(base64)` POSTs directly to OpenAI `gpt-4-vision-preview` with a detailed extraction prompt, parses JSON (graceful fallback to raw text), returns `{extractedText, detectedElements, confidence, detectedLanguage}` + usage/cost (`:65-161`). `extractDocumentContent` wraps it with a confidence gate + TODO for fallback providers (`:164-197`). There's also a `ScannerPanel` (camera capture) and `scannerSlice` for scanning physical notes.
**Evidence:** `src/lib/ai/tools/vision-extraction.ts:1-253`, `src/components/ScannerPanel/`, `src/store/slices/scannerSlice.ts`.
**Classification: ADAPT.** The "photo of a notebook → structured text" capability is gold for LifeGuide (journaling, brain-dump from paper). But: it bypasses the clean `runner.ts`/`models.ts` abstraction (raw fetch, hardcoded model), uses the **deprecated `gpt-4-vision-preview`**, and is **not wired into the attachment-create flow** (it's a standalone tool). Rebuild on the current vision API (`gpt-4o`) through the AI runner, and connect it so dropping an image auto-OCRs → distilled text node.
**AI-first:** This IS an intake path into the context layer — OCR'd text should be embedded + summarized like any node.

---

## 5. AI layer (`src/lib/ai`)

### 5a. Model/prompt/runner/clients abstraction
**What it does:** Central registry of AI models, prompts, and typed run helpers with cost calc.
**How it works:**
- `models.ts` — `MODEL_CONFIGS` map keyed by task (`summarization → gpt-4`, `embedding → text-embedding-3-small/1536`, plus `image-generation/dall-e-3`, `image-search/unsplash`, `vision-extraction/gpt-4-vision-preview`), each with `pricing.{input,output}` and `defaultParams`. `getModelConfig(task)` throws if missing (`:75-83`).
- `prompts.ts` — single `SUMMARIZE_IDEA_PROMPT` ("≤60 chars, keep core meaning, output only summary").
- `runner.ts` — `runChatTask` / `runEmbeddingTask`: build params from model defaults + overrides, call OpenAI, return `{data, model, usage:{inputTokens,outputTokens,cost}}` with `calculateCost` per the model's pricing (`:20-88`).
- `clients.ts` — lazy singleton `getOpenAIClient()` (`:5-18`).
- `index.ts` — high-level `summarizeText(text)` / `createEmbedding(text)` (`:10-25`).
- `types.ts` — `AIModelConfig`, `AIRunResult<T>`, `AITask`.
**Evidence:** `src/lib/ai/{models,prompts,runner,clients,index,types}.ts`.
**Classification: REUSE.** This is the **cleanest, most portable module in the codebase** and matches the CLAUDE.md mandate ("centralize every AI node under `src/lib/ai`, define models in models.ts, prompts in prompts.ts, reuse summarize/embedding patterns, always log usage"). Copy the whole pattern into LifeGuide and extend it (chat, structured output, tools). Models are stale (`gpt-4`, `gpt-4-vision-preview`, `dall-e-3`) — bump to `gpt-4o`/`gpt-4o-mini`/`text-embedding-3-large` and correct pricing.
**AI-first:** This abstraction should be the single chokepoint where **every AI call receives the shared context** (inject a `contextBlock` into system prompts) and where **all usage is logged**. Make "context-aware" a parameter of the runner.

### 5b. Summary + embedding routes
**What it does:** `POST /api/ai/generate-summary` and `/generate-embedding` wrap the lib helpers.
**How it works:** Thin: validate `text`, call `summarizeText`/`createEmbedding`, return `{summary|embedding, model, usage}` (`generate-summary/route.ts`, `generate-embedding/route.ts`). The client wrappers in `lib/openai.ts` `fetch` these (keeps the API key server-side). **Neither route logs to `ai_operations`** — only the unused `background-jobs.ts` queue does.
**Evidence:** `src/app/api/ai/generate-summary/route.ts`, `.../generate-embedding/route.ts`, `src/lib/openai.ts`.
**Classification: ADAPT.** Keeping the key server-side is right. But the active path has **no cost logging** and runs summary+embedding as two separate round-trips fired from the client per idea (`processIdeaAI`, `ideasSlice.ts:864-910`). Rebuild as a single server action that does both + logs usage + writes the row (and on Convex, as a scheduled action).

### 5c. Cost logging (`ai_operations`)
**What it does:** Intended audit/cost table for all AI ops.
**How it works:** `ai_operations` table (`database_schema.sql:173-199`): `type ('summarization'|'embedding'), idea_id, model, duration, success, error, input_tokens, output_tokens, cost DECIMAL(10,6), user_id`. **Only `background-jobs.ts:192-224` writes it**, via `logAiOperation()`. That queue (`BackgroundJobQueue`, retries, worker tracking) is **not used by the live app** — the active client `processIdeaAI` path writes summary+embedding directly and logs nothing.
**Evidence:** `docs/database_schema.sql:173-199`, `src/lib/background-jobs.ts:91-243`.
**Classification: ADAPT (table) / DROP (the orphan queue).** The `ai_operations` schema is exactly right for cost governance — keep it and **actually log to it from the single AI chokepoint** (§5a). Drop the in-memory `BackgroundJobQueue` (Convex scheduled functions / a real queue replace it). Note the `type` CHECK only allows two values; widen for chat/vision.
**AI-first:** Cost + latency per context-aware call is essential telemetry for an always-on intelligence layer.

---

## 6. Embeddings / pgvector — the dormant intelligence layer

**What it does (intended):** Semantic similarity over ideas.
**How it works:**
- **Schema:** `ideas.embedding vector(1536)` (`database_schema.sql:65`); **IVFFlat** index `idx_ideas_embedding USING ivfflat (embedding vector_cosine_ops) WITH (lists=100) WHERE embedding IS NOT NULL` (`:226-229`), with notes on scaling `lists` ~ sqrt(rows).
- **Write path (works):** `processIdeaAI` generates and stores embeddings for every idea with text ≥0 chars (`ideasSlice.ts:877-880`) (note: embedding runs unconditionally; only the summary is length-gated). The server queue also writes `JSON.stringify(embedding)` (`background-jobs.ts:166`).
- **Read path (DEAD):** `GET /api/ideas/[id]/similar` calls `supabase.rpc('match_ideas', {...})` (`similar/route.ts:65`) — **but `match_ideas` is not defined in `database_schema.sql`** (it only appears in `docs/todo/Graph-RAG-*` planning docs), and **no component fetches `/similar`**. So embeddings are computed and stored on every idea and then never used.
**Evidence:** `docs/database_schema.sql:65,223-229`; write `src/store/slices/ideasSlice.ts:864-910`; dead read `src/app/api/ideas/[id]/similar/route.ts`; missing RPC confirmed by grep (`match_ideas` only in `/api/ideas/[id]/similar` + `docs/todo/`).
**Classification: ADAPT — this is THE opportunity.** The expensive half (generating + storing embeddings) is already done and paid for; the cheap half (reading them) was never built. For LifeGuide this is the foundation of the **shared intelligence layer**: semantic recall, auto-grouping/clustering, AI-suggested edges, "ideas related to what you're journaling about," cross-surface context (brain-dump ↔ vision board ↔ roadmap). The `docs/todo/Graph-RAG-*` folder already specs `match_ideas` + `match_ideas_with_context` (graph-aware vector search) — mine it.
**AI-first (central recommendation):** Make embeddings the spine of the context layer. On every node create/edit: embed → store. The context layer answers "what's relevant to X" via vector search (Convex vector search, or pgvector if Postgres). Every AI call retrieves top-k relevant nodes + their graph neighborhood and injects them as context. **Activate the dormant embeddings — do not re-derive this from scratch.**

---

## 7. Supabase schema (full)

**Tables (`database_schema.sql`):**
- `brain_dumps` (workspaces): `id, name, created_at, updated_at, archived_at (soft delete), viewport_x/y/zoom`. **No `user_id`.**
- `ideas`: see §2a.
- `edges`: see §3a.
- `edge_types`: user-extensible labels (seeded 6).
- `attachments`: `id, idea_id (FK CASCADE), type ('image'|'pdf'|'url'|'file'|'text'), url (public URL or base64), filename, metadata JSONB`.
- `users`: `id (=auth.users.id), email, full_name, metadata JSONB` (preferences live in `metadata.preferences.{theme,gridSettings,ui}`).
- `ai_operations`: see §5c.

**Functions:** `update_updated_at_column` (trigger fn), `get_descendants`/`get_ancestors` (recursive, depth≤10), `would_create_cycle`, `get_parent_count`/`get_child_count` (`:252-330`).
**Indexes:** per-FK btree indexes; **GiST spatial** index `idx_ideas_spatial USING gist(point(position_x,position_y))` for proximity (`:221`); IVFFlat vector index (§6). **Note: the spatial GiST index appears unused by the app** (no proximity SQL queries found).
**Triggers:** auto-`updated_at` on brain_dumps/ideas/edges.
**Views:** `ideas_with_counts`, `brain_dumps_with_counts` (parent/child/idea counts) — convenient but the app recomputes counts in JS (`brainDumpsSlice.refreshBrainDumpCounts`) instead.
**Constraints/RLS:** rich CHECK constraints; **RLS is NOT enabled** — the GRANT/auth section is entirely commented out (`:437-445`), and the schema comment says "assuming single-user or service role access."
**Evidence:** `docs/database_schema.sql:1-497`.
**Classification: REUSE (design) / ADAPT (multi-tenancy).** Excellent relational modeling, constraints, and graph functions. **Two must-fixes for LifeGuide:** (1) add real ownership (`user_id` on `brain_dumps`, cascade to ideas/edges) + RLS or Convex auth rules — today any authed user could read all data; (2) the recursive graph functions + vector index are the assets to carry into the context layer. If moving to Convex, this becomes the Convex schema with indexes + relationship helpers; the recursive ancestor/descendant logic becomes recursive Convex queries.

---

## 8. Auth flow

**What it does:** Email/password + Google OAuth via Supabase Auth; client-side route guard.
**How it works:** `lib/auth-helpers.ts` wraps `supabase.auth.signUp/signInWithPassword/signInWithOAuth(google)/signOut/getSession/refreshSession`. The browser client persists the session (`supabase/client.ts:12-17`). `app/page.tsx:37-68` is the guard: on mount `getCurrentSession()`; no session → `router.push('/login')`; else load data + preferences. Server client variants: `supabase/server.ts` (anon + forwarded cookies, `persistSession:false`) and `supabase.ts` `createServerClient()` (**service-role key**, used by API routes — bypasses RLS).
**Evidence:** `src/lib/auth-helpers.ts:1-135`, `src/app/page.tsx:37-68`, `src/lib/supabase/{client,server}.ts`, `src/lib/supabase.ts`.
**Classification: ADAPT / REBUILD.** The auth *surface* (email + Google) is fine. But: the guard is **client-side only** (no middleware — there's a `lib/middleware.ts` but no Next `middleware.ts` enforcing routes), and API routes use the **service-role key** so they're only as safe as their hand-rolled validation. For LifeGuide, rebuild on the new stack's first-class auth (Convex Auth / Clerk / Supabase SSR with middleware) and enforce ownership at the data layer.
**AI-first:** The authed user id is the partition key for the context layer — every embedding/query/AI call must be user-scoped.

---

## 9. State management (Zustand) + undo/redo

### 9a. Slice architecture
**What it does:** One store composed of 5 slices.
**How it works:** `store/index.ts:11-24` — `create<StoreState>()(subscribeWithSelector((...a) => ({...brainDumps, ...ideas, ...edges, ...ui, ...scanner})))`. `StoreState = BrainDumpsSlice & IdeasSlice & EdgesSlice & UiSlice & ScannerSlice`. Each slice is a `StateCreator` exposing state + actions + selectors. Cross-slice calls via `get()` (e.g. `addIdeaWithEdge` touches ideas + edges + brainDumps). Ideas/edges stored as `Record<id, T>` (O(1) lookup) and filtered to the current board in components with `useMemo`. Selection uses `Set<string>`. Components subscribe with fine-grained selectors (`useStore(s => s.x)`) to limit re-renders.
**Evidence:** `src/store/index.ts`, `src/store/slices/*.ts`.
**Classification: REUSE (pattern) / ADAPT (boundaries).** The slice composition + `Record` storage + selector subscriptions is a clean, scalable Zustand setup — keep it for LifeGuide's *client/UI* state (viewport, selection, modals, drafts). **But** in a Convex world, server data (ideas/edges/boards) should come from **live Convex queries**, not be hand-loaded into Zustand + manually synced. Split: Zustand = ephemeral UI state; Convex = source of truth. That deletes most of the optimistic/temp-id/rollback code.
**AI-first:** Zustand is the natural home for the **client side of the shared context** (current board, viewport, selection, active draft, recently-touched nodes). A small `contextSlice` could aggregate these and expose a `getContextSnapshot()` that every AI call reads.

### 9b. Undo/redo (KNOWN FRAGILITY — confirmed)
**What it does:** ≤10-step undo/redo of ideas+edges, synced to DB.
**How it works:** A bespoke `UndoRedoManager` **singleton outside the store** (`store/index.ts:112-241`) holding full deep-copied snapshots of `{ideas, edges}`. A `subscribeWithSelector` subscription auto-saves on change, debounced ~150ms, **comparing state via `JSON.stringify`** (`:63-104`), with an "immediate save" path used by mutations and a 200ms guard to avoid double-saves. `startBatch`/`endBatch` (`:33-60`) group multi-ops (e.g. multi-delete) into one snapshot. `undo()`/`redo()` (`:252-505`) diff prev vs current snapshots to compute restored/deleted ideas+edges, `setState(snapshot)`, then **manually replay against Supabase** (re-`upsert` restored rows, `delete` removed rows — ideas before edges to satisfy FKs).
**Why it's fragile (evidence in-code):** repeated full-tree `JSON.stringify` on every change (perf + correctness risk on large boards); `maxHistory=10` (silent loss); snapshots only cover ideas+edges (not attachments/board/viewport); a `validateState` + dedicated debug module (`undo-debug.ts`, `undo-redo-test.ts`, `undo-debug.ts`) exist precisely because this has been buggy; DB replay can partially fail (FK ordering, network) leaving store and DB divergent; timing heuristics (150ms/200ms/50ms) are brittle.
**Evidence:** `src/store/index.ts:26-505`, plus `src/lib/undo-debug.ts`, `src/lib/undo-redo-test.ts`.
**Classification: DROP / REBUILD.** Do not port this. For LifeGuide use either (a) a command/event-sourced undo (store inverse operations, not full snapshots), or (b) Convex's transactional mutations with an explicit undo-mutation per action. Keep only the *concept* of `startBatch/endBatch` grouping.
**AI-first:** An event/command log of user actions is also the perfect feed for the context layer ("what did the user just do") — rebuilding undo as a command log gives you AI context for free.

### 9c. User preferences
**What it does:** Theme, grid, sidebar/panel, render quality, auto-relate persisted per user.
**How it works:** `uiSlice` `loadUserPreferences`/`savePreferencesToDB` read/write `users.metadata.preferences` via `lib/userPreferences.ts` (`uiSlice.ts:654-714`). Loaded non-blocking after bootstrap (`page.tsx:56-60`).
**Classification: REUSE (concept).** Fine pattern; trivial to reimplement.

---

## 10. Other reusable utilities

- **`idea-positioning.ts` — non-overlapping placement.** Prefers placing a new node 150px below the last one, else spirals outward (15°/40px steps) checking AABB overlap with margin (`:42-133`). **REUSE** — clean, no deps; great for auto-layout.
- **`geometry.ts` collision toolkit.** `rectsIntersect`, `pointInRect`, `lineIntersectsRect`, `calculateOverlapPercentage`, `detectCollision` (touch/merge thresholds), throttled `CollisionDetector`, `nearestPointOnRect`, `getRectCenter`. **REUSE** — the most reusable file after `src/lib/ai`.
- **`debounce.ts` — `PositionDebouncer` (300ms, coalesces by id) + generic `debounce`.** **REUSE** (in Convex, debounce the mutation call).
- **`demo-data.ts` + `createDemoBrainDump`** — seeds a starter board (`brainDumpsSlice.ts:188-266`). **ADAPT** — good onboarding pattern.
- **`file-upload.ts` type detection** — MIME + extension allowlists, `getFileTypeCategory`, text-content extraction. **REUSE (logic).**
- **`themes.ts` + glass styling** — theme-aware "liquid glass" styles repeated in `InputBox`/`QuickIdeaInput`. **DROP/REBUILD** — extract to a design-system token set rather than duplicated inline style fns.
- **`useAppHotkeys` / `useGlobalKeyboardShortcuts` / `config/shortcuts.ts`** — centralized keyboard shortcut registry (react-hotkeys-hook). **ADAPT** — good structure; the Canvas also has ad-hoc key handlers (`Canvas.tsx:102-143,713-778`) that should be consolidated.
- **`ErrorBoundary` + per-section boundaries** — CLAUDE.md mandates not bypassing them. **REUSE (concept).**
- **`docs/todo/Graph-RAG-*`** — existing PRD/tasks/architecture for vector + graph-aware retrieval (`match_ideas`, `match_ideas_with_context`). **MINE THIS** — it's a head-start spec for the LifeGuide intelligence layer.

---

## 11. Should each component publish to a shared context layer?

The LifeGuide thesis is "one intelligence layer reflecting the user's full context at all times." Mapping the braindump pieces:

| Component | Publish to context layer? | What it contributes |
|---|---|---|
| Viewport / zoom (`brainDumpsSlice`) | **Yes** | What region/board the user is focused on |
| Selection set (`uiSlice`) | **Yes (high value)** | The exact ideas the user is acting on right now |
| Visible ideas (`getVisibleIdeas`) | **Yes** | On-screen working set for "summarize what I see" |
| Idea text + summary + embedding | **Yes (core)** | The semantic substance; embeddings = recall spine |
| Edges + edge types + notes (`get_ancestors/descendants`) | **Yes (core)** | Relationship graph for reasoning over structure |
| Active input draft (`InputBox`/`QuickIdeaInput`) | **Yes** | Live intent before it's even a node (suggest as-you-type) |
| Attachments / OCR / link summaries | **Yes** | External knowledge folded into context |
| Recently-touched / command log (rebuilt undo) | **Yes** | Short-term "what the user just did" |
| AI usage (`ai_operations`) | No (telemetry) | Cost/latency governance, not prompt context |
| Theme/grid/preferences | No | Pure presentation |

**Concrete recommendation:** add a `contextSlice` (client) + a server "context service" backed by embeddings. Client publishes `{currentBoardId, viewport, selectedIds, visibleIds, inputDraft, recentActions}`. The AI runner (§5a) becomes the single place that, for every call, assembles `clientSnapshot + vectorSearch(topK) + graphNeighborhood(selected) → contextBlock` and injects it. This makes every surface (brain-dump board, vision board, journaling, roadmap doc) automatically context-aware through one chokepoint.

---

## 12. Verdicts

### Top 5 to DEFINITELY take
1. **`src/lib/ai` model/prompt/runner/cost abstraction** (§5a) — cleanest module; the right shape for a centralized, context-aware, cost-logged AI chokepoint. REUSE.
2. **Coordinate system + zoom-toward-cursor + collision/geometry toolkit** (`geometry.ts`, §1b/1c/10) — correct, dependency-free spatial primitives. REUSE.
3. **Persistent-input → instant-node flow with length-gated AI + non-overlap placement** (§2b/2c, `idea-positioning.ts`) — the frictionless capture loop that defines the product; "type-anywhere captures" is delightful. REUSE/ADAPT.
4. **Labeled-edge model + dual cycle detection + recursive ancestor/descendant SQL + auto-relate "train-of-thought"** (§3) — expressive graph with instant validation and a standout chaining UX; the graph functions feed the context layer. REUSE.
5. **Media → distilled-text-node pipeline (image/PDF/URL OG + GPT Vision OCR)** (§4) — "any input becomes embeddable context," exactly LifeGuide's intake story. ADAPT (modernize models, wire OCR into the flow, drop base64-in-DB).

### Top 3 to LEAVE BEHIND
1. **The bespoke undo/redo singleton** (§9b) — `JSON.stringify`-diffing snapshots + manual DB replay; demonstrably fragile (has its own debug/test harness). Rebuild as a command log or use transactional mutations. DROP.
2. **Konva dependency + dead canvas components** (`Edge.tsx`, `Grid.tsx`, dev page) (§1a) — never used by the live canvas. DROP; the DOM/SVG approach is the real asset (and the page-level CSS `zoom` trick should be replaced with a proper transform).
3. **The orphan `BackgroundJobQueue` + the manual temp-id/optimistic/rollback plumbing** (§5c/2e) — in-memory queue the app never uses, plus boilerplate that Convex's reactivity + transactional mutations eliminate. DROP the queue; ADAPT the optimistic UX onto the new data layer.

### Key gotchas (carry into the rebuild)
- **No Konva at runtime** — don't let the dependency mislead the rebuild stack decision (§1a).
- **`position_x/position_y` are node CENTERS** (`translate(-50%,-50%)`); all edge/box-select math assumes this (§1a, §3c). Preserve or you'll break endpoints.
- **Zoom is page-level CSS `zoom`, not a canvas transform** (`page.tsx:118`) — pollutes `getBoundingClientRect`, scales fixed UI, and is the kind of thing that silently breaks. Replace with one `translate(x,y) scale(zoom)` stage (§1a/1c).
- **Embeddings are written but never read** — the read path (`/similar` → `match_ideas`) is dead and the RPC isn't in the schema (§6). Free, already-paid-for asset to activate.
- **Two divergent AI pipelines** — the *active* client `processIdeaAI` does NOT log cost; the *unused* server queue does (§5b/5c). Pick one server-side chokepoint that logs.
- **No multi-tenancy / RLS** — `brain_dumps` has no `user_id`, RLS is commented out, API routes use the service-role key (§7/§8). Add ownership + enforce at the data layer before any real users.
- **Type/schema drift** — TS allows idea `type: 'document'|'web'` and edge-type flags `allows_bidirectional`/`prevents_cycles` that the DB CHECK/columns don't have (§2a/§3a). Reconcile types↔schema.
- **base64-in-DB for files <1MB** (and as a Storage fallback) bloats `ideas`/`attachments` rows (§4a). Use real object storage with references.
- **Viewport not continuously persisted** during pan (only on board switch) (§1e); **viewport culling exists but isn't wired in** (§1f); **GiST spatial index + `*_with_counts` views are unused** (§7) — minor, but don't assume they're load-bearing.
- **`IdeaNode.tsx` is ~850 lines** mixing render/drag/collision/merge/connection (§1g/§2f) — decompose into hooks on rebuild.
