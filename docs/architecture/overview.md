# Architecture Overview

**Status:** 🟡 outline

LifeGuide is one platform, multiple surfaces, one shared brain, on a real-time foundation.

```
Intake sources (paste · upload · url · audio · later: share/email/calendar)
        ↓
Intake & Distillation  → any input → text-meaning + metadata + embedding + routing
        ↓
Surfaces (thin plugins, each a SurfaceContextProvider):
   Whiteboard · Coach/Guide · (later) Vision Board · Journaling · Settings
        ↕  publish snapshots + tools / subscribe to assembled context
The Context Bus + The Mirror (shared global context — "text layer behind the human")
        ↓
Outputs: direction, reflections, the Guide, (later) the reflection loop's next move
        ↑__________________ feedback loop (act → did it work → revise) [post-v1]
```

**Principles:** AI-first (every call sees assembled context), real-time (Convex reactive), foundation-first (spine before surfaces), server-side AI (keys never client-side), multi-tenant from day one.

**Layers:** Next.js shell/routing → Convex (reactive DB, file storage, vector index, server actions) → OpenAI. See [`stack.md`](stack.md).

> To expand: sequence diagrams for a capture, a Coach turn, and a cross-surface action.
