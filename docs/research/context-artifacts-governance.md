# Research: Context artifacts as first-class, governed, categorizable components

> **Type:** research / decision-memo (not spec, not committed design). Brainstorm captured 2026-07-20.
> **Status:** open. This memo establishes a **data-structure + governance model** for the
> textual context that makes up a person's operating context. It records leans on the forks
> Ariel named; it does **not** decide them and it builds **no** agent-editing behavior.
> **Scope relation:** [ADR 0028](../decisions/0028-core-is-the-fixed-life-blueprint-plus-living-containers.md)
> already governs this idea **within the Core**. This memo is the **platform-wide generalization**
> of that same governance instinct outward to the artifacts ADR 0028 left as their own owners
> (the conduct Blueprint / Personal Code, Horizons, the daily briefs, rituals, mantras, capture).

---

## 0. The idea, in Ariel's framing

LifeGuide is built around a person's **Core** (who you are) and their **days**. Beyond that, a
handful of **context artifacts** together make up the human's operating context: the **Blueprint**
(conduct doctrine — how a day is lived), **Goals / Horizons**, a future **Character** document
(the person you aspire to become, and what they want), the **morning / nightly briefs**,
**reminders**, **mantras**, and the **capture / brain-dump** intake.

Today the Blueprint is being surfaced and used *in place of* the morning/nightly brief. But
conceptually it is just one of **many** such artifacts. The ask:

> Make these artifacts **first-class, recognizable, categorizable, manageable components** of the
> platform — not scattered. So that each can be recognized as a component, edited and tweaked;
> organized as a clean **data structure** that can be **managed and governed**; carry per-artifact
> rules for **what an agent can and cannot do** with it; and be **merged or split** later without a
> rewrite.

The Blueprint work shipping in parallel (branch `feat/coach-orb-live-panel`) — turning the Blueprint
from one markdown blob into a **structured, unit-editable document** — is the first concrete instance
of an artifact becoming a managed component. This memo asks what the *substrate* under that should be.

**Out of scope (explicit):** building the agent-editing behavior. "I don't know how this is going to
interact yet." This is the **data structure + governance model** first, so context can be managed
better later.

---

## 1. What a "context artifact" is

A **context artifact** is a durable, named, textual (or text-distillable) unit of a person's
operating context that the app **surfaces**, the person can **own and edit**, and agents **read**
(and, under governance, may **propose changes to**). It is content, not plumbing.

It is deliberately distinct from three neighbours already named in the architecture (do not collide
with these reserved words):

- **Elements** — the big subsystems that own tables and surfaces (Vision Board, Future Self, Journal,
  Core, Coach, Context Bus). See [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md).
  An artifact is a *piece of content an element owns*, not a subsystem.
- **Pillars** — cross-cutting **life domains** (Body & Health, Work & Money, …). A domain **lens**,
  not an artifact. Per [ADR 0028](../decisions/0028-core-is-the-fixed-life-blueprint-plus-living-containers.md)
  pillars stop being folders entirely.
- **Raw source / substrate** — captures, sessions, the `interactions` log. These *feed* artifacts
  across a review membrane; whether capture is itself "an artifact" is an open boundary (see §4).

The Context Bus already treats the two big *streams* (Core / Sessions) as first-class and assembles
them per call ([`../architecture/context-bus.md`](../architecture/context-bus.md)). What is missing
is that the individual **artifacts inside those streams** — and the ones that sit outside Core
entirely (the conduct Blueprint, Horizons, the briefs) — are not modelled as **one recognizable,
uniformly-governed kind of thing**. They are seven scattered tables that happen to be context.

---

## 2. Current inventory (mapped to schema)

Everything below already exists (or is decided) in the repo. The point is that they are **not**
currently recognized as instances of one manageable kind. Table names are from
[`../../convex/schema.ts`](../../convex/schema.ts); canonical ownership is per
[ADR 0028](../decisions/0028-core-is-the-fixed-life-blueprint-plus-living-containers.md).

| Artifact | What it is | Owner of truth | Schema today | Structure today |
|---|---|---|---|---|
| **Life Blueprint (fixed 18)** | deliberate identity declarations | person-authored | `coreResponses` (frame in `lib/blueprint.ts`) | fixed-slot form |
| **Living Core artifacts** | growing units of personal meaning | person (manual) / AI-proposed | `coreFiles` today → Living Core store (ADR 0028) | structured units |
| **Core containers** | the 6 semantic homes (Who I Am, Who I'm Becoming, …) | system + person (custom) | proposed (ADR 0028) | container set |
| **Personal Code** (the conduct **Blueprint**) | how a day is lived | person-authored (seeded) | `blueprint` | markdown doc → **structuring now** |
| **North Star** | the crown direction | person → `coreResponses.s2q5` (ADR 0028) | `settings.northStar` (compat) | single line |
| **Horizons ladder** | nested goals 5yr → daily | person; standing rungs → Blueprint/Goal views (ADR 0028) | `horizons` | rows per rung |
| **Goals / tasks (Orbit)** | commitments + execution | person; sole executable owner | `goals`, `goalTasks` | rows |
| **Mirror** | synthesized "who you are" | AI-derived, **disposable** | `mirror` | generated |
| **Ritual items (briefs)** | typed morning/night components | person + system defaults | `ritualItems`, `ritualDays` | typed rows (assembled) |
| **Morning note** | note to tomorrow-morning-you | person | `morningNotes` | one line / day |
| **Roadmap entries** | tomorrow's first moves | person | `roadmapEntries` | rows / day |
| **Mantras** | short recurring conduct lines | person or shared pool | `ritualItems` kind=`mantra` + `lib/mantras.ts` | inline |
| **Daily tidbit** | generated inspirational quote | AI-generated, ephemeral | `dailyTidbits` | generated (savable) |
| **Character / "who you're becoming"** (future) | textual aspiration doc | person | *no standalone table* — see note | — |
| **Capture / Sessions / Thoughts** | raw intake, brain dump | person (raw); AI-distilled | `captures`, `sessions`, `sessionReplies`, `thoughtMaps` | event/source substrate |

**Note on "Character."** Ariel's future *Character* document ("the person you aspire to become")
already has a home carved out: ADR 0028's **Who I'm Becoming** container, with **Future Self** as its
visual sibling. So part of what Ariel wants is *already modelled* — which sharpens the real ask: the
new work is a **cross-artifact governance layer**, not a new Character store.

**Prior research this absorbs** (all in [`raw/internal-notes/`](raw/internal-notes/)): the
living-person-model note (components as editable data with `timeConstant` / `freshness` / `ownerAgentId`
lifecycle metadata — ARI-17), the core-backbone-ai-treatment note (a per-item, user-authored "how the
AI should treat this" directive), and the pillars-data-model note (ARI-11). Those framed the idea
**inside the Core**; this memo lifts the same two seeds — *lifecycle metadata* and a *per-item AI
treatment/permission note* — to the **whole artifact set**.

---

## 3. Proposed taxonomy

Two axes. **Category** answers *what kind of context this is*; **dimensions** answer *how it must be
governed*. Category largely reuses ADR 0028's Core containers and extends them past Core.

### 3a. Category (what kind of context)

| Category | Question it answers | Artifacts |
|---|---|---|
| **Identity** | who I am now | Life Blueprint answers, *Who I Am* artifacts, Mirror (derived) |
| **Aspiration** | who/what I want to become | *Who I'm Becoming*, *The Life I Want*, North Star, Character, Future Self text |
| **Conduct** | how I choose to live | Personal Code (the conduct Blueprint), *How I Choose to Live*, mantras |
| **Plan** | where I'm going, measurably | Horizons, Goals / tasks |
| **Motivation** | what moves me | *What Moves Me*, saved quotes/tidbits |
| **Memory** | what I want to remember | *What I Want to Remember* |
| **Brief (assembled)** | today's calm surface | ritual items, morning note, roadmap, tidbit — *views over the above* |
| **Source (substrate)** | raw intake | captures, sessions, thoughts, interactions — *feed artifacts across the membrane* |

The last two rows are the taxonomy's soft edges (see §4): briefs are *assembled from* artifacts and
may not be artifacts themselves; source is substrate on the other side of a review membrane.

### 3b. Dimensions that matter (the governance descriptor)

Each artifact type is described by:

1. **Owner of truth** — `person-authored` · `AI-derived (disposable)` · `AI-generated (ephemeral)` ·
   `owner/canon-authored` (Coach KB) · `co-authored (propose→confirm)`.
2. **Mutability / time-constant** — `fixed-frame` · `enduring` · `seasonal` · `live/ephemeral`
   (the living-person-model's `timeConstant`).
3. **Structure** — `fixed-slot` · `structured-units` · `single-document` · `typed-rows` ·
   `generated`. (The Blueprint is moving `single-document → structured-units` right now.)
4. **Agent write-permission** — the heart of the ask: per agent, one of `none` · `read` ·
   `propose` (through the review membrane) · `write-direct` (only person-chosen destinations).
5. **Lifecycle / freshness** — refresh cadence, staleness, gap-awareness (the
   `freshness` / `refreshCadence` seams already stubbed on `pillars` / `coreFiles`).
6. **Composition** — `standalone` vs `assembled-view-over-others` (briefs, Mirror, standing Horizons).

Dimensions 1 and 4 are what make "governed" real; 2, 5 power reminders and gap-awareness; 3 and 6
tell the UI whether a thing is unit-editable or a rendered view.

---

## 4. Data-structure direction

Goal: treat the artifacts **uniformly as manageable components** without ripping out a single
existing per-artifact table. ADR 0028 is explicit that a parallel store is the wrong move; this memo
honours that. The proposal is a **metadata / registry layer over** the existing tables, in two
granularities, adopted cheapest-first:

### Option A — a type-level **artifact manifest** in code (lean: start here)

A single registry (e.g. `lib/contextArtifacts.ts`) with one descriptor per artifact **type**:

```
ArtifactType {
  id: "blueprint" | "life-blueprint" | "living-core" | "horizons" | "north-star"
    | "personal-code" | "brief" | "mantra" | "tidbit" | ...
  label: string
  category: Category            // §3a
  ownerOfTruth: OwnerOfTruth    // §3b.1
  structure: Structure          // §3b.3
  lifecycle: { timeConstant, refreshCadence? }   // §3b.2/5 defaults
  capabilities: {               // §3b.4 — the capability matrix, per agent
    coach:      "none"|"read"|"propose"|"write-direct"
    brainDump:  "none"|"read"|"propose"|"write-direct"
    externalApi:"none"|"read"|"propose"|"write-direct"
    // future: per-pillar owner agents (ownerAgentId)
  }
  ownsTable: string             // the existing Convex table it describes
}
```

This is the **cheapest** move: no schema churn, most governance is genuinely **per-type** (all
Blueprints are treated alike; all briefs are assembled views), and it gives every surface and every
agent **one place** to ask "what am I allowed to do with this?" It directly generalizes ADR 0028's
one sentence — *"external agents receive read and propose capabilities by default, not unrestricted
direct write"* — into a declared matrix that covers every artifact, not just Core.

### Option B — instance-level metadata on existing tables (defer; plug-in seam only)

Only where governance or lifecycle genuinely **varies per instance per user** does metadata move onto
the row itself — as **optional fields on the existing table**, never a parallel store. Some seams
already exist (`pillars.strength/strengthUpdatedAt`, `coreFiles.status` pending/active). The
living-person-model's `freshness` / `refreshCadence` / `ownerAgentId` are the fields that land here
**when** per-instance lifecycle is actually needed — not now.

### The capability matrix (the governable part)

The registry's `capabilities` block is the concrete form of "define, per artifact, what an agent can
and cannot do." It aligns with ADR 0028's already-decided **authority order** and **intake membrane**:

- **Ambient AI (Coach curation, brain-dump routing)** defaults to **`propose`** — never a silent
  write. This is the existing no-silent-overwrite rule ([ADR 0007](../decisions/0007-file-system-on-the-human-and-the-center.md)
  preserved by 0028) expressed as a permission.
- **Manual, person-chosen destinations** are **`write-direct`**.
- **External API / MCP** defaults to **`read` + `propose`** (ADR 0028 §Context/Coach/API/MCP).
- **Derived artifacts** (Mirror, assembled briefs) are **`read`-only to everyone**; they are
  regenerated, never authored.

Nothing here builds the *behavior* — it declares the **contract** the behavior will later obey.

---

## 5. Open questions / forks (Ariel's call — leans recorded, not decided)

### F1 — Merge Character into the Blueprint, or keep separate?
**Lean: keep separate.** *Character* ("who you're becoming") is **Aspiration**; the conduct Blueprint
/ Personal Code is **Conduct** ("how you live"). ADR 0028 already houses them in different containers
(*Who I'm Becoming* vs *How I Choose to Live*), and the concept holds that character and conduct
"interlink but never merge." **But** the registry deliberately makes this **non-load-bearing**:
merge or split is a category/registry edit later, not a migration. So the point of the whole exercise
is that Ariel can defer this and still not be trapped by it.

### F2 — May the brain-dump / capture flow write into an artifact when it picks up something relevant?
**Lean: propose-only, never silent write** — for every governed artifact, consistent with ADR 0028's
intake membrane (raw source stays intact; a routing pass *proposes* create/append/link; the person
confirms exact wording and destination). The genuinely open sub-question is **which artifacts are even
"proposal-open"** — a per-artifact registry flag. E.g. propose into Living Core and (maybe) Horizons;
probably never auto-propose into the fixed 18 Blueprint answers (those are the person's highest-
authority declarations — review-only). Ariel sets the per-artifact flags.

### F3 — Where does the artifact boundary sit? (taxonomy edges)
**Lean:** **briefs are assembled views**, not artifacts (ritual reads already resolve the Blueprint
live at render — no copy); **captures/sessions are source substrate** on the far side of the membrane;
**ephemeral reminders / mantras / tidbits are lightweight artifacts but of an `ephemeral` class**
(short lifecycle, generated ones read-only unless the person saves them — matching ADR 0028's tidbit
rule). Ariel confirms where "artifact" stops and "view" / "source" begins.

### F4 — Registry granularity: type-level manifest vs per-instance table?
**Lean: type-level manifest in code first** (Option A), instance metadata only where lifecycle truly
varies (Option B, deferred). Revisit if governance needs to differ per user per instance.

### F5 — Naming (collision watch)
ADR 0028 already owns **"Living Core artifact"** for the *Core-scoped* units. This memo's
**"context artifact"** is the *platform-wide superset* (includes the conduct Blueprint, Horizons, the
briefs). Settle whether "context artifact" is the umbrella and "Living Core artifact" a subset, or
whether a different umbrella word is wanted — **before** any schema/manifest lands. Avoid the reserved
words *element* and *pillar*.

---

## 6. Scope boundary (restated)

**In scope for this line of work:** the taxonomy (§3), the registry/manifest data structure (§4), and
the per-artifact capability contract (§4). A **design**, governed and recorded.

**Out of scope, explicitly deferred:** building the **agent-editing behavior** — how the Coach or the
brain-dump actually reads/proposes/writes per artifact at runtime. That is downstream of, and gated
by, the contract this memo defines. Also downstream: the actual merge/split of any two artifacts.

---

## 7. Where this lands when committed

- The taxonomy and registry direction → a new **ADR** (the pattern: "context artifacts are a governed,
  categorized layer over existing per-artifact tables"), plus reconciliation notes in
  [`../architecture/context-bus.md`](../architecture/context-bus.md) and
  [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md).
- The capability matrix → folded into the relevant feature docs and kept consistent with
  [ADR 0028](../decisions/0028-core-is-the-fixed-life-blueprint-plus-living-containers.md)'s
  authority order and intake membrane.
- This note is then deleted (per the research-folder rule: a note is where you think before
  committing, not the source of truth).

## 8. Related

- [ADR 0028 — Core is the fixed Life Blueprint plus Living Core containers](../decisions/0028-core-is-the-fixed-life-blueprint-plus-living-containers.md) (the Core-scope instance of this governance)
- [The Blueprint (conduct doctrine)](../product/features/the-blueprint.md) · [The Context Bus](../architecture/context-bus.md) · [Elements and context](../architecture/elements-and-context.md)
- [`raw/internal-notes/living-person-model.md`](raw/internal-notes/living-person-model.md) (ARI-17) · [`raw/internal-notes/core-backbone-ai-treatment.md`](raw/internal-notes/core-backbone-ai-treatment.md) · [`raw/internal-notes/pillars-data-model.md`](raw/internal-notes/pillars-data-model.md) (ARI-11) · [`raw/internal-notes/horizons-vision-goals-blend.md`](raw/internal-notes/horizons-vision-goals-blend.md) (ARI-103)
</content>
</invoke>
