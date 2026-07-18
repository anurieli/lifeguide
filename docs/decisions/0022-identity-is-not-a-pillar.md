# 0022 — Identity is not a pillar

**Status:** accepted (live) · **Date:** 2026-07-18

## Context

ARI-11 asked for a first-class visualization of a person's **pillars** — the large life domains that make them — starting with the **Life Wheel** (a radar/balance-at-a-glance view; Temple, Orbit, and Tree were the other three brainstormed concepts, recommended as soulful-hero pairings for later, not required here). The brief framed it plainly: *"Identity isn't a pillar — it's what the pillars hold up,"* and proposed a canonical five-domain set (Body, Craft, Bonds, Tribe, Mind) as the model to visualize.

Two things were already live and had to be reconciled, not ignored:

1. **ADR 0007** ("the file system on the human") already made `pillars` a real table — folders holding `coreFiles`, seeded with a canonical **8-pillar skeleton** (`DEFAULT_PILLARS` in `convex/pillars.ts`): Identity & Values, Body & Health, Work & Money, Relationships, Mind & Growth, Meaning & Spirit, Fears & Shadows, Dreams & Aspirations. The Listener and the Center (also ADR 0007) file voice-call content into these folders by name, and a manual test item in `TO-CHECK.md` already exercises the exact 8-pillar seed and its idempotent top-up for older accounts.
2. That skeleton's first entry, **"Identity & Values,"** is exactly the mistake this ticket names: identity sitting inside the pillar list as if it were one domain among equals, instead of the thing the domains hold up.

The question this ADR answers: given both of those, what do we actually ship — replace the skeleton with the brainstormed five, or something else?

## Decision

**Extend the existing `pillars` table (ADR 0007), do not create a second entity, and do not replace the 8-pillar skeleton with the five-name brainstorm.** Instead:

1. **Domain set stays the current 8, editable.** `pillars` remains user-editable exactly as ADR 0007 left it (canonical 8-skeleton + preset library + custom). Collapsing to a fixed five (Body/Craft/Bonds/Tribe/Mind) would mean renaming/merging folders that the Listener and Center already file into by name — real behavior other in-flight work (this ticket runs alongside five sibling agents in this repo) depends on. That risk bought nothing the current 8 domains don't already cover; they are simply a finer-grained cut of the same five life areas. If a tighter, opinionated five-domain canon is wanted later, it is a deliberate follow-on migration, not a side effect of shipping a chart.
2. **Identity is real, but it is not a domain.** A new optional `pillars.role` field (`"domain" | "identity"`, absent = `"domain"` for back-compat) marks exactly the one pillar — "Identity & Values" — that IS the person's identity. It keeps working precisely as before for filing (Listener/Center write to it the same way); what changes is that **it is excluded from strength scoring and from the Life Wheel** (`pillars.wheel` and `pillars.assembleContext` both filter `role !== "identity"`). This is the concrete, testable form of "identity is not a pillar": it doesn't get a strength number and it doesn't sit on the wheel next to the domains it holds up.
3. **Strength is manual only, v1.** Each domain pillar gets an optional `strength` (0-100) and `strengthUpdatedAt`. Nothing infers it from activity yet — no session/coreFiles signal, no decay, no gap detection. That is explicitly ARI-16's job (the current-state/gap engine); `strength`/`strengthUpdatedAt` are the seam it plugs into, not a placeholder implementation of it. An unset `strength` reads as a neutral 50, not 0, so a fresh account's wheel reads as "not yet known," not "failing."
4. **No snapshot/history table yet.** `strengthUpdatedAt` gives a single "last changed" timestamp; a proper over-time view (sparkline per pillar, etc.) needs a real snapshots table and is deferred rather than guessed at now. Also ARI-16 territory.
5. **`goals` gets a `pillarId?` relation, unused by any UI yet.** So a goal can eventually say which domain it strengthens (the Life Wheel or the Coach could one day read it), matching what the ticket's touch-list asked for ("relations to Core and goals") without building goal-pillar UI that wasn't in scope here.

## Alternatives considered

- **Adopt the five-name brainstorm (Body, Craft, Bonds, Tribe, Mind) as the new canonical seed.** Rejected for now: real, tested, cross-agent-depended-on behavior (Listener/Center filing, the `TO-CHECK.md` 8-pillar smoke test) is keyed on the current 8 names. A rename/collapse is a legitimate future move but is its own migration, not something to fold silently into a visualization ticket.
- **A second table (`domains` or similar) purpose-built for the Life Wheel, separate from `pillars`.** Rejected per the issue's own instruction and ADR 0007's DRY intent: two tables both meaning "the regions of a person" is exactly the duplication `pillars`/`coreFiles` was built to avoid. One entity, read by many surfaces.
- **Drop "Identity & Values" from the skeleton entirely, folding its content into `mirror`/the Core.** Rejected for this ticket: it's a bigger data-migration + Center-prompt change than a visualization ticket should carry, and ARI-17 (Core living person-model) is the named owner of that deeper question. `role: "identity"` gets the conceptual fix shipped now without touching what already works.
- **Infer strength from activity (coreFiles count/recency per pillar) instead of manual input.** Rejected for v1: no current-state/gap engine exists yet (ARI-16, explicitly out of scope here); a manual dial is honest about that and still fully exercises the read/write path and the visualization.

## Consequences

- `pillars` gains three optional fields (`role`, `strength`, `strengthUpdatedAt`); `goals` gains one (`pillarId?`). All additive, non-breaking, no data migration needed — existing rows read fine with the new fields absent.
- The Life Wheel (`components/core/PillarWheel.tsx`) is the one shipped visualization; Temple/Orbit/Tree remain unbuilt design concepts (no code, no docs beyond this ADR's mention) for a later "soulful hero" pairing, per the ticket's own recommendation.
- The tension this ADR does NOT resolve: "Identity & Values" still literally has that name and still gets filed into like any other pillar folder — only its `role` and its exclusion from the wheel encode "not a domain." A future pass (plausibly ARI-17) may want to rename it, move its content fully into the Core/Mirror, or otherwise give identity a home that isn't a `pillars` row at all. That is out of scope here and flagged, not silently punted.
- **Explicitly not built** (named as out of scope by the ticket, and confirmed here as the boundary this ADR respects): ARI-17 (Core living person-model), ARI-16 (current-state/gap engine — the automatic strength derivation and any history view), ARI-13 (self-elements), ARI-2 (Zen/Conversational Core). The `role`/`strength`/`strengthUpdatedAt` fields and the `goals.pillarId?` relation are deliberately shaped as a foundation those can plug into: `role` gives ARI-17 a place to eventually split identity out cleanly; `strength`/`strengthUpdatedAt` are exactly the fields ARI-16's inference would write to instead of a person's slider; `pillarId?` is inert until a goals-board UI (or the Coach) starts setting it.

## See also

[`../product/features/pillars.md`](../product/features/pillars.md) · [`0007-file-system-on-the-human-and-the-center.md`](0007-file-system-on-the-human-and-the-center.md) · [`../architecture/data-model.md`](../architecture/data-model.md) · [`../product/features/pillars-and-goals.md`](../product/features/pillars-and-goals.md) (superseded on the pillars half)
