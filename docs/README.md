# LifeGuide Documentation Map

The single source of truth for what LifeGuide is and how it works. If you change the product, you change these docs in the same step (see [`../CLAUDE.md`](../CLAUDE.md)).

> Status legend: ✅ written · 🟡 outline/stub (expand me) · ⬜ planned

## product/ — what we're building and why
| Doc | Purpose | Status |
|---|---|---|
| [`product/concept-and-soul.md`](product/concept-and-soul.md) | The mission, the why, the soul | ✅ |
| [`product/prd.md`](product/prd.md) | The product requirements / spec | ✅ |
| [`product/personas.md`](product/personas.md) | Who this is for | 🟡 |
| [`product/glossary.md`](product/glossary.md) | Shared vocabulary (define terms once, here) | 🟡 |
| [`product/features/`](product/features/README.md) | One fully-expanded doc per feature | see index |

## product/features/ — every feature, fully expanded
The expectation (per `_TEMPLATE.md`): **all** uses, functions, dynamics, states, edge cases, AI involvement, and cross-feature interactions. See the [feature index](product/features/README.md).

## architecture/ — how it's built
| Doc | Purpose | Status |
|---|---|---|
| [`architecture/overview.md`](architecture/overview.md) | The layered system: intake → context → surfaces → Mirror → outputs | 🟡 |
| [`architecture/context-bus.md`](architecture/context-bus.md) | The four context scopes + the Assembler (the core) | ✅ |
| [`architecture/data-model.md`](architecture/data-model.md) | Full Convex schema reference | ✅ |
| [`architecture/ai-layer.md`](architecture/ai-layer.md) | AI config hub, models, prompts, cost | 🟡 |
| [`architecture/stack.md`](architecture/stack.md) | Next.js + Convex + OpenAI rationale | ✅ |
| [`architecture/security-privacy.md`](architecture/security-privacy.md) | Multi-tenancy, trust model, data ownership | 🟡 |

## design/ — how it looks and feels
| Doc | Purpose | Status |
|---|---|---|
| [`design/interaction-principles.md`](design/interaction-principles.md) | The "calm, never bombarding" contract | ✅ |
| [`design/design-system.md`](design/design-system.md) | Tokens, components, the aesthetic | 🟡 |
| [`design/screens.md`](design/screens.md) | Screen-by-screen UX (maps to the prototype) | 🟡 |

## decisions/ — why we chose what we chose
ADRs, one per notable decision. See the [decisions index](decisions/README.md).

## research/ — what we learned
- [`research/extraction/`](research/extraction/) — deep extraction of `braindump` & `PillarOS`, foundation/stack synthesis, competitor + gaps scout.

## plans/ — how we build it
Foundation-first, bite-sized implementation plans. Current: [`plans/2026-05-20-lifeguide-v1-plan1-foundation-whiteboard.md`](plans/2026-05-20-lifeguide-v1-plan1-foundation-whiteboard.md).

## roadmap
[`roadmap.md`](roadmap.md) — phases: v1 (plans 1–4) → v1.5 → v2.
