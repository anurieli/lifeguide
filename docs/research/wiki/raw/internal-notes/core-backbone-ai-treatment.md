# Research: The Core Backbone & per-item AI-treatment metadata

> **Type:** research / investigation note (not spec, not committed design). Companion to
> the disposable build-tracker at [`../../WIP/self-elements-registry.md`](../../WIP/self-elements-registry.md).
> Purpose: pin down **where in the architecture** Ariel's "pillars" idea lives, **what we
> are actually researching**, and **whether a parallel effort already owns this data model**
> (so we build no redundancy).

---

## 0. The question, stated plainly

Ariel wants the building blocks of selfhood (mantra, affirmations, values, role models,
north star, the "why"s) to be **first-class, organized, editable, and self-describing** —
each carrying a note about **how the AI should treat it**. He calls these "pillars."

The research question is therefore narrow and answerable:

> **Where does this live in the existing architecture, what is already designed for it,
> and what is the smallest genuinely-new addition that delivers the idea?**

---

## 1. Naming: two reserved words to avoid

Before anything else, because both will cause real collisions:

- **"pillars"** is already a table = **life domains** (Physical, Professional, Social),
  cross-cutting tags (`convex/schema.ts`, `data-model.md:46`). Ariel does NOT mean this.
- **"elements"** is already the architecture's word for the **big subsystems** — Vision
  Board, Future Self, Journal/Sessions, Pillars & Goals, the Core, the Coach
  (`architecture/elements-and-context.md:33-45`). Ariel does NOT mean this either.

What Ariel means are the **constituents of the Core's backbone** — the Blueprint's
per-question records and their synthesized form. Working term for this doc:
**backbone items** (open naming question; see §5).

---

## 2. Where this lives in the architecture (the map)

This is entirely inside **one** architecture element: **The Core.** It does not span
multiple elements. The relevant pieces, end to end:

| Layer | Artifact | Role in this idea | Source |
|---|---|---|---|
| **Skeleton** | `lib/blueprint.ts` ← `docs/product/blueprint/blueprint.json` | Defines the 18 backbone items + their `malleability` (green/yellow/red). Mantra = `s1q5`, Flash Reminders (≈ affirmations) = `s3q3`. | `data-model.md:111` |
| **Raw answers** | `coreResponses { userId, questionKey, content, updatedAt }` | The person's own words per backbone item. **Live.** | `data-model.md:110-111` |
| **Synthesized** | `mirror.structured` (`{ values[], themes[] }` live; **`backbone{}` + `gaps[]` proposed**) | The Coach's distillation per backbone item: `text`, `malleability`, `confidence`, `sources[]`. **Proposed.** | `data-model.md:193-209` |
| **Curation** | The Coach curation loop | Rolls signals into the Core through a hard filter; surfaces conflicts instead of overwriting. **This is where a treatment note would be *honored*.** | `elements-and-context.md:31`, `features/coach.md` |
| **Consumption** | Mirror / Context Bus assembler | Every other surface *draws* the Core at act-time (Journal prompts, Guide render, Coach blend). A treatment note shapes how. | `architecture/context-bus.md`, `elements-and-context.md:54-58` |
| **Editing surfaces** | `components/core/ZenCore.tsx`, Grid mode, `ConversationalCore.tsx` | Where a human edits backbone items today (calm, one-at-a-time). Any treatment-note affordance belongs here. | feature: `features/core.md` |
| **Render surface** | The Guide (read-only) | Renders the Core back (north star, Mirror, pillars). Not a data owner. | `elements-and-context.md:45` |

**Flow:** `blueprint skeleton` → person fills `coreResponses` (and signals arrive
ambiently) → **Coach curates** into `mirror.structured.backbone` → **Context Bus** serves
that slice to every surface that draws the Core.

The idea touches the **start** (a new field on backbone items) and the **middle** (the
Coach reads it during curation/assembly). It does not create a new element or a new
top-level surface.

---

## 3. What already exists vs. what is genuinely new (the redundancy check)

This is the answer to "is there another chat working on this data model?" — effectively
**yes**: the 2026-06-03 docs rebuild already designed the backbone data model. Mapping it:

| Piece of Ariel's idea | Already designed / built? | Where |
|---|---|---|
| Affirmations as a thing | **Exists** as `s3q3` Flash Reminders | `lib/blueprint.ts`, `blueprint.json` |
| Mantra as a thing | **Exists** as `s1q5` My Mantra (RED) | same |
| Backbone items as structured per-question records | **Already designed (proposed)** as `mirror.structured.backbone` | `data-model.md:193-209` |
| Per-item metadata about stability | **Exists** as `malleability` (also on proposed `goals`) | `data-model.md:188`, blueprint |
| Per-item provenance / confidence | **Already designed** as `confidence` + `sources[]` | `data-model.md:201-204` |
| **User-authored "how the AI should treat this" note** | **NOT designed anywhere** | — (the new piece) |
| Affirmations/mantra feeling **first-class** (own home, not buried) | **Not done** | — (UX gap) |
| User-facing JSON editor | Intentionally **cut** (dev/admin only at most) | WIP note §2 |

**Conclusion:** the data model for "structured, self-describing backbone items" is already
on the books. The only non-redundant additions are:
1. a **treatment note** field (user-authored AI directive) on each backbone item, and
2. **promoting mantra + affirmations** to first-class in the editing/render surfaces.

Everything else would be re-inventing what `data-model.md` already proposes.

---

## 4. Parallel-work scan (branches + docs, as of 2026-06-04)

Checked so we coordinate instead of collide:

- **Branches touching the Core surfaces:** `zen-core`, `ari-2-conversational-core`
  (Core editors), `onboarding-rebuild` (seeds the backbone). None of them builds the
  **backbone synthesis** (`mirror.structured.backbone`) yet — it is still "proposed."
- **No branch** is building a treatment-note or a backbone registry. This area is open.
- **The "other chat":** the design itself, in `docs/architecture/data-model.md` and
  `docs/architecture/elements-and-context.md` (the 2026-06-03 rebuild). That is the
  effort this idea must align to, and it leaves room for the treatment note cleanly.
- **Coordinate with:** whoever lands the **Coach curation loop** (`features/coach.md`) —
  that is the consumer that must learn to read treatment notes.

---

## 5. What to research / decide before designing

1. **Name** for a backbone item (not "pillar", not "element"). Candidates: *backbone item*,
   *Core facet*, *self-attribute*.
2. **Where the treatment note attaches:** on the raw side (`coreResponses` gets a metadata
   sibling) or the synthesized side (`mirror.structured.backbone[key].treatment`)? The
   note is user-authored, so it likely wants to live with the raw answer and be *read*
   during synthesis — investigate.
3. **Treatment note shape:** free-text directive only, or a few structured toggles
   (surface-daily, protect-from-drift, aspirational) + free text? Compare against the
   existing global dials (`settings.coachTone`, `settings.reachingOut`) and define
   **precedence** (does a per-item note override the global tone?).
4. **Scope of first slice:** mantra + affirmations only, or all 18 backbone items?
5. Whether the **proposed `mirror.structured.backbone`** should be built first (since the
   treatment note rides on it) or whether the note can ship on `coreResponses` ahead of it.

---

## 6. Recommendation

The idea is real and **non-redundant once scoped to the treatment note + first-class
mantra/affirmations**. Before any code, run **`lifeguide-gate`** to size the first slice
and either commit it or park it as a Linear issue. Then `superpowers:writing-plans`.

Durable outcomes of this research (the naming rules in §1, the placement map in §2, the
treatment-note addition to the backbone model) should be folded into
`docs/architecture/data-model.md` and `docs/product/features/core.md` when the work lands;
this note and the WIP tracker are then deleted.
