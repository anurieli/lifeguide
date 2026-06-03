# 03, Foundation & Stack: The AI-First Component Library for LifeGuide

**Date**: 2026-06-02
**Author**: Foundation architect (synthesis pass)
**Status**: Proposal for a net-new build
**Reconciles with**: `01-braindump.md`, `02-pillaros.md` (deep extractions, written by sibling agents)
**Design lineage**: `Northbound/docs/specs/2026-05-17-northbound-design.md`, `lifeguide-architecture-roadmap.html`, `northbound-design-roadmap.html`

---

## 0. Premise & the one decision that drives everything

LifeGuide is **not** "a vision board with AI bolted on." It is an **intelligence layer with surfaces bolted on**. The design lineage says it three different ways:

- Northbound design: *"The AI is the operating layer, not a feature. The UI is the AI's hands."*
- LifeGuide roadmap: *"One context layer both surfaces read and write... context awareness to the max."*
- The user's brief: *"every surface publishes its state to a shared context layer, and every AI call sees the full picture."*

That single sentence, **every surface publishes state to one bus; every AI call reads the whole bus**, is the architectural invariant. Everything below is in service of it. If a primitive does not either (a) publish to the bus, (b) read from the bus, or (c) move an item between surfaces, it does not belong in the foundation.

This reframes the two existing apps. They are not "the thing we ship", they are **two working proofs of two halves of the same machine**:

| Half | Proven by | What it proves |
|---|---|---|
| **The substrate** (canvas, node/edge graph, media→node, auth, pgvector, deploy, git history) | **BrainDump** (Next.js · Supabase · OpenAI) | You can dump anything onto a spatial graph, persist it, embed it, and ship it on a real platform. |
| **The intelligence** (board-as-context, tool-use agent, memory compaction, intake analysis, live audio) | **PillarOS** (Convex · Gemini) | An agent can see the whole board every call, act on it through tools, remember across sessions, and ingest pasted/dropped/spoken input. |

The roadmap's key realization holds: *the two codebases are almost perfectly complementary.* The foundation library below is the **union of the two halves, generalized so a surface is a plugin** rather than the whole app. Neither existing app generalized this way, PillarOS hardcodes "Pillar," BrainDump hardcodes "brain dump." LifeGuide's foundation must make **surface** the pluggable unit so Board, Vision, Journal, Guide, and Inbox are all the same shape.

---

## 1. The Reusable AI-First Component Taxonomy

Nine primitives. Each has a **responsibility**, an **interface sketch**, the **existing app that proves it**, and the **gap to close** for the generalized version. They are ordered by dependency: 1.1 → 1.4 are the spine (nothing ships without them), 1.5 → 1.9 plug into the spine.

### 1.1 Context Bus / Mirror: *the core primitive*

**Responsibility.** A single in-memory + persisted representation of "the full picture" that (a) every surface writes its live state into, and (b) every AI call reads from. Two layers in one primitive:

- **The Bus (ephemeral, per-request):** the assembled snapshot handed to a model on each call, active surface, focused/selected items, recent items across *all* surfaces, current pillars in view, and the relevant slice of the Mirror.
- **The Mirror (durable, compounding):** the long-term profile that survives sessions, values, aspirational verbs/nouns, fears, identity claims, themes, north-star candidates. (Northbound design §3.3, §8.1 `mirror_snapshots`.)

The Bus is "what's true right now." The Mirror is "who you are over time." Every AI call gets `Bus + relevant(Mirror)`.

**Why this is THE primitive.** In PillarOS, `generateBoardContext()` already does exactly this for one surface, it serializes pillar + items + zones + long-term memory to JSON and feeds it to the model *every single call* (`PillarOS/convex/ai/agent.ts:21-65`, injected at `agent.ts:97-107`). LifeGuide's leap is to make this **multi-surface and subscription-based**: instead of one function that reads one pillar's board, a registry of surfaces each contributing a `getContextSlice()`, merged into one snapshot.

**Interface sketch.**

```ts
// Each surface registers once at boot. This is how a surface "publishes its live state."
interface SurfaceContextProvider {
  surfaceId: 'board' | 'vision' | 'journal' | 'guide' | 'inbox';
  // Pulled on every AI call. Cheap, serializable, already-filtered. Mirrors generateBoardContext().
  getContextSlice(ctx: RequestCtx, opts: {
    focusItemIds?: Id[];      // what the user is looking at / selected
    budgetTokens: number;     // the bus enforces a token budget per surface
  }): Promise<SurfaceSlice>;
}

interface SurfaceSlice {
  surfaceId: string;
  summary: string;            // 1-3 sentence "state of this surface right now"
  items: ContextItem[];       // node/items relevant to this call (see 1.4)
  focusedItemIds: Id[];
  meta: Record<string, unknown>; // surface-specific: northStar, journalStreak, visionThemes...
}

// The bus. One call assembles the whole picture.
interface ContextBus {
  register(provider: SurfaceContextProvider): void;
  // THE call every AI invocation makes first.
  assemble(ctx: RequestCtx, opts: {
    activeSurface: string;
    focusItemIds?: Id[];
    includeMirror?: boolean;  // default true
    tokenBudget: number;      // total; bus divides across surfaces + mirror
  }): Promise<ContextSnapshot>;
}

interface ContextSnapshot {
  activeSurface: string;
  slices: SurfaceSlice[];     // every registered surface's current state
  mirror: MirrorView;         // see 1.7
  pillars: PillarTag[];       // the cross-cutting facets currently in scope
  assembledAt: number;
  tokenCost: number;
}
```

**The subscription model.** "Every AI call sees the full picture" is enforced structurally: an AI call cannot be issued except through the agent runner (1.3), and the runner's first step is always `bus.assemble()`. There is no path to call the model without the snapshot. Surfaces don't *push* on every keystroke (too chatty); they expose a `getContextSlice()` the bus *pulls* at call time. This is the cheap, correct version of "publish your state", pull-based, lazy, token-budgeted.

**Proven by:** PillarOS `generateBoardContext()` + system-prompt injection. **Gap to close:** generalize one hardcoded serializer into a registry of N surface providers + a Mirror merge + a token budgeter.

---

### 1.2 Universal Intake & Distillation Pipeline

**Responsibility.** One pipeline, many sources. Any input, text, image, video, URL, audio, email, social, agent-push, becomes a uniform record: **distilled text + metadata + embedding + a routing decision** (which surface/inbox it belongs to). This is the "Intake Agent" of the brief and the "capture & distillation" of the Northbound design (§5), unified with PillarOS's `analyzeIntakeItem`.

**The shape (one pipeline, source adapters at the front).**

```
                       ┌─────────────── source adapters (pluggable) ───────────────┐
 text · paste · drop   │ email(Gmail MCP) · calendar · social · url · voice/audio   │
 image · screenshot    │ agent-push (MCP/REST) · share-sheet                        │
                       └────────────────────────────┬──────────────────────────────┘
                                                     ▼
                                   normalize → RawCapture { sourceType, rawType, payload }
                                                     ▼
                        ┌──────────── extract (per rawType, modality-aware) ─────────┐
                        │ image→vision OCR · video→transcript+frames · url→scrape    │
                        │ audio→transcribe · article→TL;DR · text→passthrough        │
                        └────────────────────────────┬───────────────────────────────┘
                                                     ▼
                       distill (ONE AI pass, Mirror-aware): essence · title · themes ·
                                inferredResonance · suggestedSurface + placement hint
                                                     ▼
                              embed (semantic index) ── 1.6
                                                     ▼
                       ┌──── three writes (Northbound §5.2, generalized) ────┐
                       │ 1. Capture record (immutable, full provenance)       │
                       │ 2. Node draft → routed to target surface's inbox     │
                       │ 3. Mirror delta (theme weights, identity signals)    │
                       └──────────────────────────────────────────────────────┘
```

**Interface sketch.**

```ts
interface SourceAdapter {
  sourceType: 'paste'|'upload'|'url'|'voice'|'email'|'calendar'|'social'|'agent'|'share';
  normalize(input: unknown): Promise<RawCapture>;
}

interface IntakePipeline {
  registerSource(a: SourceAdapter): void;
  registerExtractor(rawType: RawType, e: Extractor): void;
  // The single entry point. Everything that enters LifeGuide goes through here.
  ingest(ctx: RequestCtx, raw: RawCapture): Promise<Capture>;
}

interface Capture {
  id: Id; userId: Id; createdAt: number;
  source: { type: string; app?: string; url?: string; agentId?: string };
  rawType: RawType;
  raw: { text?: string; fileId?: Id; url?: string; transcript?: string };
  distilled: {
    essence: string; title: string;
    themes: Id[]; pillars: PillarTag[];
    inferredResonance: string;                 // "why this hit you", Mirror-aware
    routing: { surface: string; confidence: number; placementHint?: string };
  };
  embedding: number[];                         // 1.6
  routedTo: { surface: string; nodeId?: Id; placedAt?: number } | null;
  isActive: boolean;                           // soft delete; raw is append-only
}
```

**The routing decision is the Intake Agent.** The distill step doesn't just summarize, it decides *where this belongs*: a half-formed dream → Vision inbox; a task-shaped thought → Board; a reflective sentence → Journal feed; an actionable email → the cross-surface Inbox for triage. Routing is a field on the distilled output, graded against the Mirror and active pillars. Confidence below a threshold → it lands in the neutral Inbox for the user to place.

**Proven by:** PillarOS `analyzeIntakeItem` (`convex/ai/analyze.ts:21-90`, structured JSON: title/content/analysis/comments) for the distill step; BrainDump `vision-extraction.ts` (GPT-4 Vision OCR with structured output) + `link-preview` route + URL scrape for the extract step. **Gap to close:** (a) add source adapters for email/calendar/social/audio; (b) add the **routing** field to distillation; (c) make "three writes" explicit (capture + node + Mirror delta), today PillarOS writes only the item, BrainDump writes only the idea+embedding. Neither writes a Mirror delta yet.

---

### 1.3 Agent / Tool Framework

**Responsibility.** A tool registry where **each surface contributes tools that mutate its own state**. The agent sees the whole Context Bus snapshot and can act across surfaces in a single turn (move a Board node into the Vision board; turn a Journal insight into a Board node; update the Guide from a Mirror shift).

**This is PillarOS's single best asset.** PillarOS has a working tool-use agent with 11–12 tools wired to real mutations, a dispatcher, and a registry:

- Tool declarations as data: `createItemTool`, `arrangeItemsTool`, `searchItemsTool`, `updateNorthStarTool`, `checkAlignmentTool`… (`PillarOS/convex/ai/tools.ts`)
- A central dispatcher `executeToolCall(ctx, {toolName, toolArgs, pillarId, userId})` (giant `if`-ladder, `tools.ts:717-909`)
- A registry getter `getAvailableTools()` returning the declaration array (`tools.ts:915`)
- The agent loop assembles context → calls model with tools → executes returned function calls → returns results (`agent.ts:109-153`)

LifeGuide generalizes this from "one pillar's 12 tools" to "a federation of per-surface tool packs."

**Interface sketch.**

```ts
interface Tool {
  name: string;                  // namespaced: 'board.create_node', 'vision.add_item', 'mirror.note'
  surfaceId: string;             // which surface owns (and mutates) state
  declaration: FunctionDeclaration;        // OpenAI function-calling schema
  scopes: ToolScope[];           // 'read' | 'write' | 'destructive', for MCP/agent gating
  execute(ctx: RequestCtx, args: unknown): Promise<ToolResult>;
}

interface ToolRegistry {
  contribute(surfaceId: string, tools: Tool[]): void;   // each surface registers its pack at boot
  toolsFor(opts: { surfaces?: string[]; maxScope?: ToolScope }): FunctionDeclaration[];
  dispatch(ctx: RequestCtx, call: { name: string; args: unknown }): Promise<ToolResult>;
}

// The single AI entry point. Guarantees bus.assemble() runs first, this is the structural
// enforcement of "every AI call sees the full picture."
interface AgentRunner {
  run(ctx: RequestCtx, opts: {
    messages: Message[];
    activeSurface: string;
    focusItemIds?: Id[];
    allowSurfaces?: string[];    // default: all (cross-surface action is the point)
    playbookId?: Id;             // Coach behavior-as-data (Northbound §4.4)
  }): Promise<{ text: string; toolCalls: ToolResult[]; snapshot: ContextSnapshot }>;
}
```

**Cross-surface action is the headline.** The reason tools carry a `surfaceId` and the runner sees *all* slices is so a single user turn, "this journal entry is really about freedom, put it on my vision board and connect it to the ocean cluster", fans out into `vision.add_item` + `board.create_edge` + `mirror.note`, all in one agent loop, all grounded in one snapshot. Neither existing app can act across surfaces because neither *has* more than one surface.

**Playbook pluggability** (Northbound §4.4) rides here: the runner reads an `activePlaybookId` and folds the Playbook (identity, voice, question library, move-sizing, hand-off rules) into prompt assembly. Behavior is data, not code, the runner never knows which Playbook it's running. This is what later unlocks "My Coach Knows Me" and the Playbook marketplace from one codebase.

**Proven by:** PillarOS tool registry + dispatcher + agent loop. **Gap to close:** namespace tools by surface; replace the `if`-ladder dispatcher with a `Map<name, Tool>`; add scope tags (for MCP gating, Northbound §9.1); add the Playbook read.

---

### 1.4 Node / Item Model: *the atomic content unit*

**Responsibility.** ONE atomic content unit shared across every surface. A Board card, a Vision item, a Journal entry, and a Guide/roadmap node are **the same row** with a `surface` discriminator and a flexible `content` blob, not four parallel tables. This is what makes cross-surface movement (1.3) a metadata change, not a copy.

**Both apps converge on this shape already**, which is the strongest signal it's right:

- BrainDump `ideas`: `{ id, text, summary, position, type, state, session_id, embedding, metadata }` + a separate first-class `edges` table with **labeled, multi-target, cycle-checked** relationships (`braindump/docs/database_schema.sql:41-114`). The edge model is excellent and rare, keep it verbatim.
- PillarOS `items`: `{ type, title, content, analysis, position{x,y,z}, dimensions, tags, pillarId, zoneId, isActive }` (`PillarOS/convex/schema.ts:47-100`). Richer per-item metadata; spatial; soft-delete.

LifeGuide's Node is the **superset**.

**Interface sketch.**

```ts
interface Node {                              // the atom. lives on exactly one surface at a time.
  id: Id; userId: Id;
  surface: 'board'|'vision'|'journal'|'guide'|'inbox';
  captureId: Id | null;                       // provenance: which Capture became this (1.2)
  kind: 'text'|'image'|'quote'|'link'|'file'|'scene'|'journal_entry'|'roadmap_node'|'north_star';
  content: {                                  // flexible per kind
    text?: string; title?: string; summary?: string;
    fileId?: Id; url?: string; attribution?: string; generationPrompt?: string;
  };
  pillars: PillarTag[];                        // cross-cutting facet tags (work/health/...)
  themes: Id[];                                // semantic clusters (1.6)
  embedding: number[];                         // every node is recallable (1.6)
  spatial: { x: number; y: number; z: number; w?: number; h?: number; rotation?: number } | null;
                                               // null for non-spatial surfaces (Journal/Guide)
  state: 'generating'|'ready'|'error';
  isHero?: boolean;                            // vision-board hero zone
  createdAt: number; updatedAt: number; isActive: boolean;
}

interface Edge {                              // BrainDump's model, kept verbatim. Many-to-many, labeled.
  id: Id; userId: Id;
  sourceId: Id; targetId: Id;
  type: string;                                // 'depends_on'|'blocks'|'inspired_by'|'related_to'|...
  note?: string;                               // the "reason" for the connection
  createdAt: number;
}
```

**Capture vs. Node is preserved** (Northbound §8.2): a `Capture` is *the event of inspiration* (immutable, append-only, full provenance); a `Node` is *its visual/structural presence on a surface* (mutable, movable, deletable). Dismissed captures still feed the Mirror; a Node can be re-derived if distillation improves. This separation is non-negotiable and neither app has it cleanly today (both collapse capture into the item).

**Proven by:** BrainDump nodes+edges (the labeled multi-target graph) + PillarOS items (rich metadata, spatial, soft-delete). **Gap to close:** add the `surface` discriminator, the `captureId` provenance link, the `pillars` tags, and make `spatial` nullable so non-canvas surfaces share the table.

---

### 1.5 Canvas Primitive

**Responsibility.** A reusable spatial board, infinite pan/zoom/drag, multi-select, box-select, edge rendering, that renders any `Node[]` with non-null `spatial`. Reused across Brain-Dump board **and** Vision board (and any future spatial surface). The canvas is "dumb": it reads nodes, emits position/selection events, and never knows whether it's showing brain-dump cards or vision scenes.

**BrainDump owns this outright.** The roadmap audit confirms a working custom Konva canvas (~883 lines): trackpad + touch + box-select, optimistic node create→persist, labeled edge rendering, viewport culling. Component set: `Canvas`/`IdeaNode`/`Edge`/`EdgeRenderer`/`ConnectionLine`/`Grid`, state in a Zustand store with slices (`canvas-store.ts` 659 lines; `ideasSlice` 1142, `edgesSlice` 396, `uiSlice` 714). PillarOS also has a working canvas (`components/Canvas.tsx`, zone snapping, smart positioning `findSmartPosition` in `tools.ts:10-42`), useful as a second reference, but BrainDump's is git-tracked and more battle-tested.

**Interface sketch.**

```ts
interface CanvasProps {
  nodes: Node[];                               // only nodes where spatial != null
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  selection: Id[];
  onMoveNodes(updates: { id: Id; x: number; y: number }[]): void;   // debounced → 1.8
  onSelect(ids: Id[]): void;
  onViewportChange(v: Viewport): void;
  onCreateEdge(sourceId: Id, targetId: Id, type: string): void;
  render?: (node: Node) => ReactNode;          // surface supplies card chrome; canvas owns layout
}
```

**Proven by:** BrainDump Konva canvas + Zustand store (primary); PillarOS canvas with zones (secondary). **Gap to close:** lift the canvas out of `brain_dump`-specific store wiring into a surface-agnostic component that takes `Node[]`/`Edge[]` props.

---

### 1.6 Semantic Layer

**Responsibility.** Embeddings, clustering into themes, and resurfacing/recall. This is what powers "group common ideas," "what's connected to this," theme discovery, and Mirror evidence-gathering.

**The sunk cost to activate.** BrainDump *already computes and stores* `text-embedding-3-small` (1536-dim) in pgvector on every idea (`database_schema.sql:65, 226-229` IVFFlat index), but per the roadmap audit, **nothing reads them yet**. There's even a working similarity endpoint scaffold (`api/ideas/[id]/similar/route.ts`, pulls the source embedding, ready for cosine search). PillarOS embeds via Gemini. LifeGuide turns embeddings from dead weight into the engine.

**Interface sketch.**

```ts
interface SemanticLayer {
  embed(text: string): Promise<number[]>;                 // single model, app-wide (1536-dim)
  search(opts: { vector?: number[]; query?: string; surfaces?: string[];
                 limit: number; threshold?: number }): Promise<ScoredNode[]>;
  cluster(opts: { surfaces?: string[]; minClusterSize?: number }): Promise<ThemeCluster[]>;
  classify(node: Node): Promise<{ themeId: Id; score: number }[]>; // cosine vs theme centroids
  resurface(ctx: RequestCtx, opts: { against: MirrorView; limit: number }): Promise<Node[]>;
}

interface Theme {                              // first-class, with a semantic centroid (Northbound §8.1)
  id: Id; userId: Id; name: string; description: string;
  centroid: number[]; weight: number;
  firstSeenAt: number; lastReinforcedAt: number;
}
```

**Proven by:** BrainDump pgvector embeddings + IVFFlat index + `/similar` route scaffold (computed, ready, unused). **Gap to close:** wire search/cluster on top (the roadmap's Brick E); make themes first-class with centroids; add resurfacing.

---

### 1.7 Memory / Mirror Persistence

**Responsibility.** The durable half of 1.1: compaction (rolling conversation → long-term memory string), snapshots (versioned "who you were in March"), and retrieval (the relevant Mirror slice per call). Distinct from the Bus: the Bus is *now*, the Mirror is *accumulated*.

**PillarOS proves the hard part, compaction.** `compactMemory()` (`PillarOS/convex/ai/memory.ts:20-58`) takes current memory + new transcript and folds them into an updated long-term memory string, auto-triggered, stored on `agentStates.context` and re-injected into every agent call (`agent.ts:93-94`). Northbound §8.1 specifies the richer structure (values, verbs, nouns, fears, identity claims, themes, versioned `mirror_snapshots`).

**Interface sketch.**

```ts
interface MirrorStore {
  // PillarOS compactMemory(), generalized to structured deltas instead of one string.
  applyDelta(ctx: RequestCtx, delta: MirrorDelta): Promise<void>;   // from intake + interactions
  view(ctx: RequestCtx, opts?: { at?: number; budgetTokens?: number }): Promise<MirrorView>;
  snapshot(ctx: RequestCtx, reason: 'monthly'|'manual'|'pre_north_star'): Promise<MirrorSnapshot>;
  compactConversation(ctx: RequestCtx, threadId: Id): Promise<void>; // rolling window → memory
}

interface MirrorView {
  values: { name: string; strength: number; evidence: Id[] }[];
  aspirationalVerbs: { verb: string; weight: number }[];
  aspirationalNouns: { noun: string; weight: number }[];
  fears: { statement: string; evidence: Id[] }[];
  identityClaims: { claim: string; source: Id; at: number }[];
  topThemes: Id[];
  northStarCandidates: { statement: string; confidence: number }[];
  summary: string;                             // 1-paragraph "who you are right now"
}
```

**The interactions log feeds it.** Northbound §8.1 `interactions` table: every meaningful action (capture, place, dismiss, move, mark-move-done, coach message) logs a row with a `derivedSignal`. The Mirror is *computed from* this log + captures + nodes, then snapshotted. This is the "the system gets to know you over time" mechanic, and the reason dismissed captures still matter.

**Proven by:** PillarOS `compactMemory` + `agentStates.context` injection. **Gap to close:** move from a single opaque memory *string* to the *structured* MirrorView; add snapshots/versioning; add the interactions log as the input stream.

---

### 1.8 Auth, Storage, Real-Time Sync

**Responsibility.** The boring-but-load-bearing platform layer: who the user is, where bytes live, and how a write on one surface instantly reflects on every open client and in the next AI call.

**Both apps have working, but different, versions:**

| Concern | BrainDump | PillarOS |
|---|---|---|
| Auth | Supabase Auth (Google OAuth + email), middleware (`src/lib/middleware.ts` 383 lines, `auth-helpers.ts`) | Google OAuth + guest email, JWT |
| Storage | Supabase Storage + base64 fallback (`file-upload.ts` 593 lines) | Convex file storage (CDN URLs, `_storage`) |
| Real-time | **None**, REST routes + Zustand optimistic UI; manual refetch | **Reactive by default**, `useQuery` re-renders on any DB change; this is Convex's core feature |
| Vector | pgvector (IVFFlat) | Convex vector index |
| API surface | Full REST (19 route files, `src/app/api/**`) | Convex functions; no public REST yet |

The decisive line is **real-time**: the brief's "reflects context at all times" is a real-time requirement. PillarOS gets it for free from Convex (`useQuery` is reactive, *"Changes to DB auto-trigger component re-renders,"* per its CLAUDE.md). BrainDump simulates it with optimistic Zustand + REST and would need a socket layer or polling to truly reflect cross-surface/cross-client state live.

**Interface sketch.**

```ts
interface Platform {
  auth: { currentUser(ctx): Promise<User | null>; requireUser(ctx): Promise<User> };
  storage: { put(file: Blob, meta): Promise<{ id: Id; url: string }>; url(id: Id): Promise<string> };
  // The real-time contract: a reactive read. Any surface or AI snapshot subscribes; writes
  // anywhere re-push to all subscribers. This is what makes the Context Bus "live."
  live<T>(query: ReactiveQuery<T>): Subscription<T>;
}
```

**Proven by:** BrainDump Supabase auth/storage/pgvector + full REST; PillarOS Convex reactive sync + file storage + vector index. **Gap to close:** pick the real-time substrate (see §2) and standardize the API surface (REST + MCP per Northbound §9) on top of it.

---

### 1.9 (cross-cutting) Pillars / Facets

**Responsibility.** Not a surface, a **tagging dimension** that crosses everything. Work, health, relationships, money, growth, etc. tag Captures, Nodes, Themes, and Moves. Every AI call can filter the Bus by pillar ("show me only health-related context").

**Proven by:** PillarOS, but as a *container* (`pillars` table owns zones/items; CLAUDE.md: "All data is user-isolated; pillars cascade soft-delete"). **Gap to close, important:** in LifeGuide a pillar must be a **tag, not a container**. The roadmap explicitly rejects PillarOS's "Pillar-rigid" structure. A single Node is "work AND money"; a vision item spans "growth AND relationships." So `pillars: PillarTag[]` is a field on the Node (1.4), not a parent foreign key. This is the one place we deliberately *invert* PillarOS's design.

---

### Taxonomy at a glance

| # | Primitive | One-line responsibility | Proven by | Spine? |
|---|---|---|---|---|
| 1.1 | **Context Bus / Mirror** | Every surface publishes state; every AI call reads the whole picture | PillarOS `generateBoardContext()` | ✅ |
| 1.2 | **Intake & Distillation** | Any source → distilled text + meta + embedding + routing | PillarOS `analyzeIntakeItem` + BrainDump vision/URL | ✅ |
| 1.3 | **Agent / Tool Framework** | Per-surface tool packs; agent acts across surfaces on the full snapshot | PillarOS tool registry + dispatcher + loop | ✅ |
| 1.4 | **Node / Item Model** | One atomic unit for all surfaces + labeled multi-edge graph | BrainDump nodes+edges + PillarOS items | ✅ |
| 1.5 | **Canvas** | Surface-agnostic spatial board over `Node[]` | BrainDump Konva canvas + store | plug-in |
| 1.6 | **Semantic Layer** | Embed, cluster, classify, resurface | BrainDump pgvector (computed, unused) | plug-in |
| 1.7 | **Memory / Mirror persistence** | Compaction + structured snapshots + retrieval | PillarOS `compactMemory` | plug-in |
| 1.8 | **Auth / Storage / Real-time** | Identity, bytes, live reflection | Both (Supabase vs Convex) | ✅ |
| 1.9 | **Pillars / Facets** | Cross-cutting tags on everything | PillarOS (invert: tag not container) | plug-in |

---

## 2. Stack Recommendation

**Recommendation: Convex as the single backend + Next.js as the frontend shell. A deliberate hybrid, Next.js for the web shell/routing/marketing/SSR, Convex for ALL state, reactivity, file storage, vector index, server-side AI actions, and the REST/MCP surface.**

> **One-sentence why:** LifeGuide's defining requirement, *"reflects context at all times,"* every surface live-publishing to one bus every other surface and every AI call reads, is a real-time reactivity problem, and Convex makes real-time the default (`useQuery` re-renders on any write) while bundling the exact four things this app needs in one place (reactive DB + file storage + vector index + secure server-side AI actions), so it removes more moving parts than it adds.

### The three options, evaluated honestly

**Option A, Convex-centric (PillarOS lineage).**
*For:* Real-time is free and pervasive, the single biggest fit with "reflects context at all times." Vector index, file storage, and server-side actions (keys stay server-only) are built in, so 1.1/1.6/1.7/1.8 share one runtime. PillarOS already proves the *entire* AI half on Convex (agent, tools, memory, intake, live audio). Convex HTTP actions give the REST + MCP surface (Northbound §9) with no separate server. Schema-as-code with branded `Id` types is a clean fit for the Node model.
*Against:* The *substrate* half (canvas, node/edge graph, media pipeline, auth) lives in BrainDump on Supabase, porting is real work. Convex vector search is younger than pgvector. SQL-style recursive queries (BrainDump's `get_descendants`/cycle-check, `database_schema.sql:262-314`) must be re-expressed as Convex functions. Smaller ecosystem than Postgres.

**Option B, Next.js + Supabase (BrainDump lineage).**
*For:* The substrate is *already built and git-tracked* here, canvas, labeled-edge graph, media→node, auth, pgvector, Vercel deploy, 19 REST routes. pgvector is mature; Postgres recursive CTEs already implement the graph traversal. Broadest ecosystem, full SSR, one Next.js endpoint hosts everything (the roadmap's "one endpoint" point).
*Against:* **No real-time.** This is the disqualifier for the *foundation*. "Reflects context at all times" across surfaces and clients would require bolting on Supabase Realtime channels or a socket layer and hand-managing subscription→re-render→re-snapshot. That is precisely the wiring Convex gives for free, and it's the core invariant of the product. You'd be hand-building the Context Bus's live backbone.

**Option C, Hybrid: Next.js shell + Convex backend (recommended).**
*For:* Takes the win from each. **Next.js** owns what it's best at: the web shell, file-based routing for the multi-surface app (`/board`, `/vision`, `/journal`, `/guide`, `/inbox`), SSR/marketing pages, auth UI, deployment on Vercel, and lets BrainDump's React/Konva canvas (1.5) port in as components. **Convex** owns what it's best at and what this product lives or dies on: reactive state (1.1/1.8), vector index (1.6), file storage, secure server-side AI actions (1.2/1.3/1.7), and HTTP actions for the REST+MCP surface (Northbound §9). Convex's React client drops into Next.js cleanly. This is also the lowest-rework path: PillarOS's *entire AI layer* lands almost verbatim (translate Gemini→OpenAI, §2 below), and BrainDump's *UI layer* ports as the canvas component.
*Against:* Two systems to learn and deploy (Vercel + Convex cloud), but they're designed to coexist, and PillarOS already runs Next-style React on Convex. Auth needs one decision (Convex Auth, or Clerk/Auth.js bridged to Convex) rather than reusing Supabase Auth as-is.

### Why C beats A and B specifically

- **vs B (the roadmap's current pick):** The LifeGuide roadmap chose BrainDump/Supabase as the spine when the product was *two* surfaces (Board + Guide) with a *seeded* Mirror. The brief in front of me is bigger: **five-plus surfaces** all live-publishing to **one shared context layer** that **every AI call** reads, plus an Intake Agent fanning email/calendar/social/voice across surfaces. At that scope, real-time stops being a nicety and becomes the substrate. Supabase *can* do realtime, but you'd be hand-assembling exactly what Convex ships as its primitive. Choosing B means building the Context Bus's nervous system by hand.
- **vs A (pure Convex):** Pure Convex throws away BrainDump's best, hardest-won asset, a polished, git-tracked infinite canvas with a labeled multi-target edge graph and a working media pipeline. That's months of UI work. The hybrid keeps it.
- **The AI is OpenAI** (the brief's constraint, BrainDump's existing stack). Convex is model-agnostic, server-side actions call any SDK. PillarOS's AI architecture is Gemini-shaped but the *patterns* (one `AI_PROCESSES` config hub in `models.ts`; structured-JSON responses; server-side keys; tool declarations as data) translate 1:1 to OpenAI. BrainDump already proves the OpenAI side: a clean `runChatTask`/`runEmbeddingTask` runner with per-task model config and cost logging (`braindump/src/lib/ai/runner.ts`, `models.ts`). **Port BrainDump's OpenAI runner into Convex actions**, best of both: PillarOS's agent/tool architecture, BrainDump's OpenAI plumbing, running inside Convex's secure server runtime.

### Decision summary

| Requirement | Winner | Note |
|---|---|---|
| Real-time reflection of context | **Convex** | Reactive `useQuery` is the core fit; decisive |
| Vector search | Tie → Convex | pgvector more mature, but Convex's is built-in and co-located |
| File / media | Tie | Convex storage (CDN) vs Supabase storage; both fine |
| Auth | Slight Supabase | But Convex Auth / Clerk bridge is a clean one-time decision |
| Multi-surface routing | **Next.js** | File-based routes for `/board`, `/vision`, `/journal`, `/guide` |
| Deployment | Tie | Vercel (frontend) + Convex cloud (backend); both already in use |
| AI = OpenAI | Neutral | Convex actions call OpenAI; port BrainDump's runner |
| Canvas / UI reuse | **Next.js+React** | Keep BrainDump's Konva canvas |
| Reuse of existing AI work | **Convex** | PillarOS's agent/tools/memory land nearly verbatim |

**Net:** the hybrid maximizes reuse of *both* proven halves and the one requirement that's non-negotiable (real-time) is satisfied at the substrate level, not bolted on.

### Concrete stack

| Layer | Choice |
|---|---|
| Frontend shell / routing / SSR | **Next.js** (App Router) on **Vercel** |
| Canvas | **React + Konva**, ported from BrainDump as a surface-agnostic component |
| Styling / motion | Tailwind + Framer Motion (atmospheric UX needs animation) |
| Backend / state / real-time | **Convex** (reactive DB, schema-as-code) |
| File / media storage | Convex file storage (CDN URLs) |
| Vector index | Convex vector index (embed via OpenAI `text-embedding-3-small`, 1536-dim, matches BrainDump) |
| AI (text, vision, embeddings, tools) | **OpenAI** via a ported runner inside Convex server actions; one `AI_PROCESSES`-style config hub |
| Auth | Convex Auth (Google OAuth + guest email), or Clerk bridged to Convex |
| REST + MCP surface | Convex HTTP actions (Northbound §9) |
| State (client UI only) | Zustand for transient canvas interaction; Convex `useQuery` for all persisted state |

---

## 3. Layered Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          INTAKE SOURCES  (pluggable adapters, 1.2)                  │
│  paste · drop · upload · URL · voice/audio · screenshot · share-sheet                │
│  email (Gmail) · calendar · social · agent-push (MCP / REST)                         │
└───────────────────────────────────────────────┬─────────────────────────────────────┘
                                                 │  RawCapture (normalized)
                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│              UNIVERSAL INTAKE & DISTILLATION PIPELINE  ·  the Intake Agent (1.2)     │
│   extract (modality-aware)  →  distill (ONE AI pass, Mirror-aware)  →  embed (1.6)   │
│                                          │                                            │
│            ROUTING DECISION:  which surface / inbox does this belong to?             │
│   ┌──────────────────────── three writes ────────────────────────┐                  │
│   │  ① Capture (immutable)   ② Node draft → target inbox   ③ Mirror delta │          │
│   └───────────────────────────────────────────────────────────────┘                 │
└───────────┬───────────────────────────────────────────────────┬─────────────────────┘
            │ routed Node drafts                                 │ Mirror delta
            ▼                                                    │
┌─────────────────────────────────────────────────────────┐     │
│                       SURFACES  (each = a plugin)          │     │
│  ┌────────┐  ┌────────┐  ┌─────────┐  ┌───────┐  ┌──────┐ │     │
│  │ Board  │  │ Vision │  │ Journal │  │ Guide │  │Inbox │ │     │
│  │(canvas)│  │(canvas)│  │ (feed)  │  │(doc)  │  │(triage)│     │
│  └───┬────┘  └───┬────┘  └────┬────┘  └───┬───┘  └──┬───┘ │     │
│      │ each surface: getContextSlice() + contributes a Tool pack │     │
│      └──────────────┬──────────────┬───────────┬───────┘ │     │
│   Canvas (1.5) renders any Node[] w/ spatial · Node/Edge model (1.4) underneath all │
└──────────────────────┬──────────────────────────────────┘     │
       publishes state  │ (pull-based getContextSlice)            │
                        ▼                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                  SHARED CONTEXT BUS  +  MIRROR   ·  THE CORE  (1.1 / 1.7)            │
│                                                                                       │
│   BUS (ephemeral, per-call):  assemble() → snapshot of ALL surface slices +          │
│                               focused items + pillars-in-scope + Mirror view         │
│   MIRROR (durable, compounding):  values · verbs · nouns · fears · identity ·        │
│                               themes · north-star candidates · monthly snapshots     │
│   fed by:  interactions log  +  intake Mirror-deltas  +  conversation compaction     │
└───────────────────────────────────────────────┬─────────────────────────────────────┘
                                                 │  ContextSnapshot (the full picture)
                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│            AGENT RUNNER + TOOL REGISTRY  (1.3)   ·   reads Playbook (behavior=data)  │
│   step 1: bus.assemble()  ← STRUCTURAL GUARANTEE every AI call sees the whole picture│
│   step 2: model call w/ federated tool packs (board.* vision.* journal.* mirror.*)   │
│   step 3: dispatch tool calls → mutate the OWNING surface's state (cross-surface OK)  │
└───────────────────────────────────────────────┬─────────────────────────────────────┘
                                                 │ tool mutations
                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                     OUTPUTS                                           │
│  Coach replies · Strategist "today's moves" · auto-clustering / suggested edges      │
│  surface mutations (create/move/connect/highlight) · Mirror updates · north-star     │
└───────────────────────────────────────────────┬─────────────────────────────────────┘
                                                 │
                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│   PLATFORM  ·  Convex (reactive DB · vector index · file storage · server AI actions │
│              · HTTP actions for REST+MCP)   +   Next.js shell on Vercel  (1.8)        │
│   real-time: ANY write re-pushes to ALL open clients AND the next ContextSnapshot    │
└───────────────────────────────────────────────────────────────────────────────────┘

  ╔═══════════════════════════════════ THE FEEDBACK LOOP ═══════════════════════════════════╗
  ║  user acts on a surface ──▶ write logged to `interactions` ──▶ Mirror delta computed     ║
  ║       ▲                                                                    │              ║
  ║       │                                                                    ▼              ║
  ║  surface state changes ◀── agent tools mutate surfaces ◀── richer ContextSnapshot         ║
  ║       │                                                                    ▲              ║
  ║       └──────────────▶ real-time re-render (Convex) ──────────────────────┘              ║
  ║                                                                                           ║
  ║  Outside-in (Board/Intake catches what inspires you) + Inside-out (Journal/Guide          ║
  ║  captures what you believe) BOTH point at the Mirror. The Mirror gets denser every        ║
  ║  loop → every future AI call is sharper → "context awareness to the max."                 ║
  ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 4. Build Sequence

**Principle: build the spine before any surface, so every surface is a thin plugin.** The mistake to avoid is building "the Board" first (as both prior apps did) and discovering the intelligence layer is welded to it. Build the bus, the pipeline, the node model, and the agent framework *first*; then surfaces snap in. The roadmap's brick lettering (A–F) is preserved where it maps.

### Phase 0: Platform foundation (the substrate)
*Goal: a deployed, authed, real-time Next.js + Convex app with the Node model live. No surfaces yet.*
1. **Scaffold** Next.js (App Router) on Vercel + Convex backend; wire OpenAI keys server-side. *(Roadmap Brick A.)*
2. **Auth + storage + real-time** (1.8): Convex Auth (Google + guest), Convex file storage, confirm `useQuery` reactivity end-to-end.
3. **Node / Edge model** (1.4) as Convex schema: the superset Node (with `surface` discriminator, `captureId`, `pillars`, nullable `spatial`) + BrainDump's labeled multi-target Edge + cycle-check (port `would_create_cycle` as a Convex function). **Plus** the `Capture` and `interactions` tables.
   *Test: insert nodes across two fake surfaces, connect with a labeled edge, refresh, persists; a write in one browser tab reflects live in another.*

### Phase 1: The Context Bus (the core)
*Goal: the one thing every later piece depends on. Build it before any AI call exists.*
4. **Context Bus** (1.1): the `ContextBus.assemble()` registry + `SurfaceContextProvider` interface + token budgeter. Port PillarOS's `generateBoardContext()` as the *first* provider implementation, generalized to the registry shape.
5. **Mirror store skeleton** (1.7): `MirrorView` schema + `view()` + a stub `applyDelta()` writing to the interactions log. (Compaction comes in Phase 4; the *shape* must exist now so the Bus can include it.)
   *Test: `bus.assemble()` returns a snapshot merging N registered providers + an (empty) Mirror within a token budget.*

### Phase 2: Agent / Tool framework
*Goal: an agent that reads the whole bus and can act, even before there's a rich surface to act on.*
6. **Agent Runner + Tool Registry** (1.3): the `AgentRunner.run()` that *always* calls `bus.assemble()` first (structural guarantee), federated tool packs, `Map`-based dispatcher. Port PillarOS's agent loop + registry; swap Gemini→OpenAI using BrainDump's `runChatTask` runner moved into a Convex action. *(Roadmap Bricks B + D, merged and generalized.)*
7. **Playbook read** (Northbound §4.4): `playbooks` table + `activePlaybookId` on user + fold into prompt assembly. Ship one default Playbook as a versioned file.
   *Test: a read-only chat answers questions grounded in the bus snapshot; a write tool (`generic.create_node`) creates a node via the agent.*

### Phase 3: Intake & Distillation + Semantic layer
*Goal: the universal front door + the recall engine. Surface-independent.*
8. **Intake pipeline** (1.2): the `ingest()` entry + source adapters (start with paste/upload/URL/text, port BrainDump vision-extraction + link-preview + PillarOS `analyzeIntakeItem`), the **routing** field, and the explicit three-writes (capture + node + Mirror delta).
9. **Semantic layer** (1.6): activate embeddings on every node (the sunk-cost win), wire `search()` + `cluster()` + `classify()` on Convex vector index. *(Roadmap Brick E.)*
   *Test: paste a URL → distilled node lands in an inbox with themes + embedding; dump 30 mixed notes → 4–5 theme clusters + suggested cross-links surface.*

### Phase 4: Mirror persistence (compounding)
*Goal: the system that "gets to know you over time."*
10. **Compaction + snapshots** (1.7): port PillarOS `compactMemory()`, upgrade from opaque string → structured `MirrorView`; monthly + event snapshots; feed from the interactions log + intake deltas. *(Roadmap Brick F, "seed of the brain.")*
    *Test: act for a week, close, reopen, ask "what do you know about what I want?", answered from accumulated signal, not just today.*

### Phase 5: Surfaces snap in (now thin plugins)
*Goal: each surface is just (a) a context provider + (b) a tool pack + (c) a view. The hard parts are already done.*
11. **Canvas primitive** (1.5): port BrainDump's Konva canvas as the surface-agnostic `<Canvas nodes edges .../>`.
12. **Board surface**, first canvas consumer: register provider + tool pack (`board.*`) + canvas view. *(This is the roadmap's near-complete state, now riding the foundation.)*
13. **Vision surface**, second canvas consumer (reuses 1.5): hero zone, generative image tools.
14. **Journal surface**, non-spatial (nullable `spatial`): daily prompts → `journal_entry` nodes feeding the Mirror.
15. **Guide surface**, the living roadmap doc; `roadmap_node` nodes; reads the densest Mirror.
16. **Inbox surface**, the triage destination for low-confidence routing + agent-push captures.
17. **Strategist / "today's moves"** + **North-Star ceremony** as agent capabilities over the now-rich bus. *(Roadmap "after F" + Northbound §6–7.)*

### Phase 6: External surface (the substrate play)
18. **REST + MCP** (Northbound §9) via Convex HTTP actions: read tools (`get_mirror`, `get_board`, `search`) + scope-gated write tools (`capture`, `log_move`). This is what lets the Hermes fleet and other agents read/write LifeGuide, turning it into the canonical "who is this person" layer.

**Dependency invariant:** Phases 0→1→2→3→4 are strictly sequential (each consumes the prior). Phase 5 surfaces are mutually independent and parallelizable once Phase 4 lands, *that* is the payoff of building the spine first: surfaces become cheap, parallel, plugin work instead of bespoke apps.

---

## Appendix: Proof-point file map

| Primitive | Strongest proof in code |
|---|---|
| Context Bus | `PillarOS/convex/ai/agent.ts:21-65` (`generateBoardContext`), injected `agent.ts:97-107` |
| Intake / Distillation | `PillarOS/convex/ai/analyze.ts:21-90`; `braindump/src/lib/ai/tools/vision-extraction.ts`; `braindump/src/app/api/link-preview/route.ts` |
| Agent / Tools | `PillarOS/convex/ai/tools.ts` (declarations + dispatcher `:717-909` + registry `:915`); loop `agent.ts:109-153` |
| Node / Edge model | `braindump/docs/database_schema.sql:41-114` (ideas + labeled edges + cycle-check `:262-314`); `PillarOS/convex/schema.ts:47-100` (items) |
| Canvas | `braindump/src/store/canvas-store.ts` + `ideasSlice`/`edgesSlice`/`uiSlice`; `PillarOS/components/Canvas.tsx` + `findSmartPosition` (`tools.ts:10-42`) |
| Semantic layer | `braindump/docs/database_schema.sql:65,226-229` (pgvector + IVFFlat); `braindump/src/app/api/ideas/[id]/similar/route.ts` |
| Memory / Mirror | `PillarOS/convex/ai/memory.ts:20-58` (`compactMemory`); `agentStates.context` injection `agent.ts:93-94`; Northbound §8.1 `mirror_snapshots` |
| Auth / Storage / Real-time | `braindump/src/lib/middleware.ts`, `file-upload.ts`, Supabase + pgvector + REST (19 routes); PillarOS Convex reactive `useQuery` + `_storage` + vector index |
| AI runner (OpenAI) | `braindump/src/lib/ai/runner.ts` + `models.ts` (per-task config + cost logging); PillarOS `convex/ai/models.ts` `AI_PROCESSES` config-hub pattern |
| Pillars / Facets | `PillarOS/convex/schema.ts:13-29` (as container, **invert to tag** for LifeGuide) |
