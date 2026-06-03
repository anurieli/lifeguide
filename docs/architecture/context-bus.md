# The Context Bus

**Status:** ✅ specified
The heart of LifeGuide: "one shared global context, separated amongst the surfaces." Every surface publishes its state; a single assembler stitches in-view + global context for every AI call. This is what "reflects context at all times" means in code, and what lets the Coach act anywhere.

## The four scopes (priority high → low)
| Scope | What | Locality |
|---|---|---|
| **Selection** | What's selected/highlighted now | local to active surface |
| **Viewport / in-view** | What's currently visible | local |
| **Surface** | The whole active surface's state | local |
| **Global (Mirror)** | The evolving text layer about the person | shared |

The first three are "in view"; the fourth is global and shared. Each surface owns its local context; all share the Mirror.

## The provider interface
Every surface implements:
```ts
interface SurfaceContextProvider {
  surfaceId: string;
  snapshot(scope: "selection" | "viewport" | "surface"): ContextFragment;
  tools(): ToolDef[];                 // contributed to the Coach's registry
  resolve(query: ContextQuery): ContextFragment;  // on-demand full state for "from far away"
}
type ContextFragment = { surfaceId: string; scope: string; label: string; text: string; priority: number };
```

## The Assembler (pure, testable)
Before any AI call:
```
assembleContext(activeSurface, intent) =
   activeSurface.snapshot("selection")      // full detail, top priority
 + activeSurface.snapshot("viewport")       // full detail
 + activeSurface.snapshot("surface")        // summarized if large
 + otherSurfaces.map(s => s.summary())      // compact awareness
 + Mirror.assemble(intent)                  // global, budgeted
 → fit to token budget (keep selection/viewport whole, summarize surface, compact Mirror)
```
Implemented in Plan 1 as a pure `assembleContext(fragments, budget)` (unit-tested) plus per-surface provider queries.

## Principles (baked from extraction)
- **Server-side, rebuilt-from-source every call** — never trust client-passed context (PillarOS got this right).
- **Tiered by token budget** — full where the user is, summaries elsewhere. Generalizes PillarOS `generateBoardContext()` from one board to all surfaces.
- **Semantic retrieval for the long tail** — pull off-screen relevance by embedding similarity, not by dumping everything (activates braindump's unused embeddings).
- **Reactive** — Convex keeps context current the instant anything changes.

## Cross-surface action ("from far away")
The Coach calls a target surface's `resolve()` for full state, runs a registered tool → Convex mutation → reactive sync to wherever that surface renders. User on the Whiteboard can tell the Coach to add a goal to the Guide; it just happens.

Related: [`../product/features/coach.md`](../product/features/coach.md) · [`../product/features/mirror.md`](../product/features/mirror.md) · PRD §4.
