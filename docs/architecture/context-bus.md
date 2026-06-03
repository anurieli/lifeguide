# The Context Bus

**Status:** rebuilt 2026-06-03. The spine of LifeGuide. Source of truth for how context is held, published, and assembled. Built from [`elements-and-context.md`](elements-and-context.md).

The Context Bus is the one mechanism that lets a complex space stay simple: each element does one job and owns its own data, yet any element (above all the Coach) can act with the full picture. The Bus is how the picture is assembled, on demand, without any element holding another's data.

---

## The two streams

Shared context is held in two streams, different in kind:

- **The Core, who you are.** Enduring identity. Slow-changing. The Blueprint backbone, the values, the north star, the synthesized you. Owned by the Core (`mirror`).
- **The Sessions, your days.** Temporal. Daily self-sessions, recent state, momentum, drift. Owned by the Journal (`sessions`, `prompts`).

Assembling context for any moment draws from both, weighted by what the moment needs. A board edit leans on the Core; a morning prompt leans on the Sessions and the Goals; the Coach catching drift blends all of it.

---

## Two kinds of edge: owns vs draws-from

Keeping these separate is what makes the context management stark.

- **Ownership (stark, async).** A producer owns its tables and **publishes distilled text** into a stream by writing an `interactions` event. This builds the shared context over time. Publishing is text, always: the meaning behind an image, never the image.
- **Draw / consume (open, at act-time).** A consumer **reads** other elements through the Bus when it acts. The slice is rebuilt from source each time, budgeted by a character limit, and never a hard link. Drawing is reading, never holding.

Recurring draws (the standing wiring):

| Consumer | Draws | To do what |
|---|---|---|
| Future Self | Vision Board + Core | generate you placed inside the life you want |
| Journal | Core + Goals | shape today's prompts |
| Guide | Core | render you (north star, Mirror, pillars) |
| Coach | everything | blend only what the moment needs |

---

## The assembler

The assembler is a pure function: given the moment (which surface, which scope) and a character budget, it returns the text slice to send to the model.

```
assembleContext(fragments: ContextFragment[], charBudget: number): string

ContextFragment {
  surfaceId?,            // where it came from
  scope: "selection" | "viewport" | "surface" | "core" | "sessions",
  label: string,         // human-readable tag for the slice
  text: string,          // the distilled text (the currency)
  priority: number,      // higher wins when the budget is tight
}
```

Rules:
- **Priority + budget.** Fragments are sorted by priority and packed until the budget is hit. Nothing silently overflows; low-priority fragments are dropped, and the drop is knowable.
- **Tiered detail.** Full detail for where you are (selection/viewport/surface), awareness of everything else (core/sessions summaries). This is the "full context for here, awareness of everything" promise.
- **Rebuilt every call.** No assembled blob is cached as truth; the source tables are truth.

The four original scopes (`selection`, `viewport`, `surface`, plus global) are generalized here into surface-local scopes **plus the two streams** (`core`, `sessions`). The provider for each surface contributes its own fragments.

---

## Publishing: the interactions log

Every element publishes by appending to `interactions { userId, type, payload, at }`. Examples of `type`: `node.created`, `capture.distilled`, `session.completed`, `goal.set`, `futureSelf.added`, `coach.curation`. The payload is distilled text plus a small structured envelope.

Deltas roll forward into the Mirror: the Core periodically (and on meaningful events) re-synthesizes `mirror` from the accumulated interactions, bumping `version`. That re-synthesis is the Coach's **core-curation** pass (see [`../product/features/coach.md`](../product/features/coach.md) and [`../product/features/core.md`](../product/features/core.md)).

---

## Gap-awareness

The Bus knows what it does not yet know. Two kinds of hole are first-class:
- **Unanswered backbone questions** (Blueprint questions with no Core entry).
- **Themes that fit no current pillar.**

Holes are surfaced as the signal to grow: the Journal turns a hole into a prompt; the Coach proposes a new pillar (sometimes a whole new element). Gaps live on `mirror.structured.gaps` (see [`data-model.md`](data-model.md)).

---

## Why this matters
The product promise is "one Coach, every context, acts from far away." That promise is only deliverable if context is assembled, not stored in copies; budgeted, not dumped; and rebuilt from owned source, not from stale links. The Bus is that guarantee.
