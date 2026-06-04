# Research · Pillars as a master data object (and how to visualize them)

**Status:** open · **Tracks:** [ARI-11](https://linear.app/cuttheedge/issue/ARI-11) · **Opened:** 2026-06-04
**Artifact:** the visualization brainstorm — `~/Downloads/lifeguide-pillars-viz.html` (Temple / Life Wheel / Orbit / Tree)

> The visualization is the surface. The real question underneath it is a **data** question: what *is* a pillar, what state does it carry, and how does the Core relate to it. Get the object right and every visualization is a cheap lens on it. Get it wrong and each view forks its own shape. This note exists to settle the object before we draw it.

---

## 1. Where this already lives in the architecture (the locus)

This is not a greenfield concept. Pillars are **live** today. The work plays out across these exact places:

| Layer | File | What's there now |
|---|---|---|
| **Schema** | `convex/schema.ts` → `pillars` table (line ~108) | `{ userId, name, description?, weight, source: default\|preset\|custom, createdAt }`. Live. Seeds one default on bootstrap. |
| **Schema (references)** | `convex/schema.ts` → `nodes.pillars[]`, `captures.distilled.pillars`, proposed `goals.pillarId` | Pillars are applied as **tags** onto other elements' rows, never as containers. |
| **Element / feature** | [`../product/features/pillars-and-goals.md`](../product/features/pillars-and-goals.md) | The "Pillars & Goals" element **owns** `pillars` (live) + `goals` (proposed). Full behavior is specced here. |
| **Data model** | [`../architecture/data-model.md`](../architecture/data-model.md) | The canonical shape + ownership map. Pillars row is documented at line ~46. |
| **Ownership / Bus** | [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md), [`../architecture/context-bus.md`](../architecture/context-bus.md) | Pillars **publish** to the Core (who you are) and Sessions (what to check daily); other elements **draw** them at act-time, never hold them. "Gaps are first-class": a recurring theme with no pillar is a **hole** that grows a new pillar. |

**So the visualization is a new READ surface — a lens on the `pillars` table — most naturally living on the Core page.** It writes nothing new on its own; it reads `pillars` plus a *derived* notion of per-pillar strength that **does not exist yet**. That gap is the heart of the research.

The current model in one line: **a pillar is a cross-cutting, user-defined tag** (default + preset + custom), open-ended, with holes growing new ones. That openness collides with some of the visualization concepts below — that collision is question B.

---

## 2. What we are actually researching (the open questions)

### A. Per-pillar "strength / attention" — the missing field
Every visualization in the brainstorm assumes each pillar has a level (the Temple fill, the Wheel radius, the Orbit distance). **The schema has no such field.** It has `weight` (reserved; see feature-doc open question #1: *"Does `weight` drive anything yet, or stay reserved?"*).
Research:
- Is strength **manual** (the person self-rates each domain), **inferred** (from activity tagged to the pillar — captures, active goals, sessions touching it), or **both** (a felt rating + an evidence signal)?
- Is "strength" the same thing as `weight`, or two different fields (`weight` = how much it matters / ordering / context budget; `strength` = how alive it is right now)? **Likely two.**
- This is the single field that unblocks every view. Decide it first.

### B. Fixed canonical set vs. open user-defined tags — the core tension
The brainstorm proposed a **fixed five** (Body · Craft · Bonds · Tribe · Mind) with identity at the center. The live model is **open-ended** (any number of custom pillars; holes grow more).
Research:
- A radar/Wheel wants a **bounded, stable axis set**; the Orbit/Tree tolerate an arbitrary set. Do we (a) bless a canonical default spine of N domains *and still* allow custom ones layered on, or (b) keep it fully open and make the viz adapt to whatever set the user has?
- If canonical: are the defaults seeded as real `pillars` rows, or a separate "domain" concept above pillars? (This may introduce a **second tier**: domains vs. pillars.)
- Recommended starting position: a seeded canonical spine (so first-run looks like a real life), user-extensible, viz degrades gracefully past ~6–7 axes.

### C. History / snapshots — needed for every "over time" view
The Wheel's "overlay last month," the Orbit's drift, the Tree's growth all need a **time series of pillar state**. Nothing stores that today.
Research: a dedicated `pillarSnapshots` table (periodic state captures) vs. deriving a series from the `interactions` Bus log. Calm-principle check: no streaks/no guilt mechanics (see the feature-doc binary-progress question).

### D. Where identity binds to the pillars — "identity is not a pillar"
The framing decision from the brainstorm: **identity isn't a pillar, it's what the pillars hold up** → it sits at the *center* (Core / Mirror), pillars around it. But in the data, `mirror.structured` holds `values[]` / `themes[]`, with **no explicit link to pillar rows**.
Research: how does a view bind Core ↔ pillars? Do themes map onto pillars? Does the north-star/Mirror reference pillar ids? This decision wants an **ADR** ("identity is not a pillar; the Core is the center, pillars are the load-bearing domains").

### E. Goal ↔ pillar cardinality (carried over from the feature doc)
Feature-doc open question: can a goal carry multiple pillar tags (like nodes) or stay single-`pillarId`? The viz (goals as fruit/moons on a pillar) reads cleaner if a goal has **one home pillar**; revisit when `goals` ships.

---

## 3. The related chat (where the master data model was built)

The user asked whether another conversation already dealt with this data model. **Yes — the canonical one is:**

- **Session `ecddbea5-fcf8-4702-962a-d40f449a2f78`** (2026-06-03 ~17:04, opened *"I wanna know where we stand with this build… i have openrouter api key, lets go"*). This is the heaviest pillars/data-model session (≈485 pillar mentions) and is where the elements model + `data-model.md` + `pillars-and-goals.md` took shape. **Treat it as the origin of the master data model.**

Other adjacent sessions (lighter, for cross-reference):
- `f2675850…` (2026-06-03 20:35) — Today/Home/North-Star unification (touches how pillars surface on Home).
- `ecddbea5` is the one to actually re-read for the data object.

> Note for future-me: these are local Claude Code transcripts under `~/.claude/projects/-Users-arielnurieli-Desktop-Life-Board-LifeGuide/`, not Brain Vault notes. Brain Vault had no session note on the pillars data model at the time of writing — worth packaging `ecddbea5` if we want it durable.

---

## 4. When this resolves, it lands here (not in this note)
- Strength/weight fields + history → [`../architecture/data-model.md`](../architecture/data-model.md) (`pillars`, new snapshot table) + `convex/schema.ts`, same change.
- Canonical-set decision + "identity is not a pillar" → a new **ADR** in [`../decisions/`](../decisions/).
- Visualization behavior + which view goes where → [`../product/features/pillars-and-goals.md`](../product/features/pillars-and-goals.md) (or a split-out `pillars-visualization.md`) + [`../design/screens.md`](../design/screens.md).
- Then this note gets a "Resolved → see X" header and stops being authoritative.
