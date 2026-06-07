# Research: The living person-model (components as editable data + Admin person-map)

> **Type:** research / investigation note (not spec, not committed design).
> **Tracked in:** [ARI-15](https://linear.app/cuttheedge/issue/ARI-15) · **Item issue:** [ARI-17](https://linear.app/cuttheedge/issue/ARI-17)
> Parked from the commitment gate, brainstorm 2026-06-04.

---

## 0. The question, stated plainly

In an AI-first app the **data model is the product**: LifeGuide "builds and steers one thing — a person's true self and the plan for their life." The Coach can only ever be as wise as the representation lets it be. Today the parts of a person are **frozen in code** (the 18 Blueprint questions in `lib/blueprint.ts`).

> **Should "the parts that make up a person" become editable data managed at runtime — an ever-growing, self-describing set of components — instead of a fixed list in code?** (Ariel's working answer across the session: yes.)

---

## 1. The concept

A person is a **living set of components**, not a fixed form. You can add, remove, and edit them anytime. Each component is a thing the system *knows it holds*, and it self-describes its own lifecycle:

- **`timeConstant`** — enduring (values, slow to change) vs seasonal vs live (this week's state, stale in days).
- **`refreshCadence`** — how often it should be revisited; drives staleness.
- **`freshness`** (derived) — fresh / stale / missing. **Gap-awareness generalized** from "missing" to "missing *or aging*." This powers reminders ([ARI-9](https://linear.app/cuttheedge/issue/ARI-9)).
- **`ownerAgentId`** — the agent responsible for tending that pillar. One agent per component; ties into the Hermes agent system.

**The Admin person-map** renders the whole thing: Ariel, looking at a person from above — every component, what feeds it, what's fresh, what's rotting, what's empty.

## 2. Where this lives in the architecture (no duplication)

- **`pillars`** is already "the domains of a life" — cross-cutting tags with `weight` + `source: default|preset|custom` (`convex/schema.ts`, `data-model.md:46`). The component registry is most likely an **evolution of `pillars`**, not a new table. (DRY rule.)
- This is **the substrate beneath** the pillar *visualization* ([ARI-11](https://linear.app/cuttheedge/issue/ARI-11)) and the first-class self-elements ([ARI-13](https://linear.app/cuttheedge/issue/ARI-13)) — which is why this is filed as its own foundational issue, not a child of either.
- It is the base the **current-state/gap engine** ([ARI-16](https://linear.app/cuttheedge/issue/ARI-16)) hangs readings off, and what the **brain-dump valve** ([ARI-18](https://linear.app/cuttheedge/issue/ARI-18)) writes into.

## 3. Naming caution (from the ARI-14 research note)

Two reserved words already collide: **"pillars"** (life-domain tags) and **"elements"** (the big subsystems: Vision Board, Future Self, Journal, Core, Coach). "Component" is the working term here; settle naming before schema. See [`core-backbone-ai-treatment.md`](core-backbone-ai-treatment.md) §1 and [`pillars-data-model.md`](pillars-data-model.md).

## 4. Open questions

- Evolve `pillars` in place, or introduce a `components` table and migrate? (Leaning: evolve.)
- Is "component" the same granularity as a "pillar," or are pillars *groups of* components? (Relationship to ARI-13 self-elements unresolved.)
- What's the minimum lifecycle metadata for v1? `freshness` + `timeConstant` are the load-bearing two; `ownerAgentId` can come later.
- Admin map: read-only overview first, or editable from the map on day one?

## 5. Where it lands when committed

`docs/architecture/data-model.md` (component registry + lifecycle fields), `docs/product/features/*` (pillars / a new Admin person-map feature doc), and an **ADR for the pillars→components evolution.**
