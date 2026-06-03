# LifeGuide

> # VERSION TWO OVERHAUL
> This is the **V2 vision**: a full overhaul and rebuild of the original LifeGuide (the Next.js + Supabase Life Blueprint app). It is a different codebase (Next.js + **Convex**) and a sharpened vision: one **Core** kept honest by the **Coach**, two context streams (the Core and daily **Sessions**), a **Journal** of adaptive prompts, **Pillars & Goals**, a **Vision Board**, and **Future Self**. The original app is the seed and working model. Start at [`docs/README.md`](docs/README.md) and [`docs/product/concept-and-soul.md`](docs/product/concept-and-soul.md) ("the evolved system").

**The space for the individual.** An AI-first, context-aware personal life platform that helps a person, primarily young men who feel lost, reflect, set goals that matter to them, and stay aligned with who they're becoming. Two surfaces, the spatial **Vision Board** and the conversational **Coach**, share one evolving brain (the **Mirror**).

## Orientation
- **Rules for working here:** [`CLAUDE.md`](CLAUDE.md) — docs-as-source-of-truth + changelog discipline. Read it first.
- **Documentation map:** [`docs/README.md`](docs/README.md)
- **The soul:** [`docs/product/concept-and-soul.md`](docs/product/concept-and-soul.md)
- **The spec:** [`docs/product/prd.md`](docs/product/prd.md)
- **What changed, when:** [`CHANGELOG.md`](CHANGELOG.md)
- **Clickable prototype:** `mockup/index.html` (open in a browser)

## Status
Pre-build. Design, PRD, plans, and a full clickable prototype are done. Implementation starts with `docs/plans/2026-05-20-lifeguide-v1-plan1-foundation-whiteboard.md`.

## Stack (planned)
Next.js (App Router) · Convex (real-time DB + storage + vector + server-side AI) · OpenAI. See [`docs/architecture/stack.md`](docs/architecture/stack.md).

## Repo layout
```
CLAUDE.md       # agent operating guide (the rules)
CHANGELOG.md    # every meaningful change + docs touched
README.md       # this file
docs/           # all documentation (see docs/README.md)
mockup/         # clickable HTML prototype
(app code lands at the root once Plan 1 begins)
```
