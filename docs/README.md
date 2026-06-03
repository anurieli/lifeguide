# LifeGuide Documentation

**Status:** clean slate (reset 2026-06-03).

The previous docs described an earlier direction (a Whiteboard plus Coach build, with Journaling and a Vision Board marked out of scope). That set was removed so it stops conflicting with where LifeGuide is actually going. All of it remains in git history if any piece is ever needed again.

## The two seeds we rebuild from
1. **The soul and the evolved vision:** [`product/concept-and-soul.md`](product/concept-and-soul.md). Its "evolved system" section is the current source of truth: two context streams (the Core, who you are; the Sessions, your days), the Journal as adaptive prompts, the Coach as core-curator, pillars, and Future Self.
2. **The original Life Blueprint app:** `~/lifeguide` (GitHub `anurieli/lifeguide`). A Next.js + Supabase app whose Blueprint (life sections, subsections, guided prompts, written responses, malleability levels) is the working model for the Journal and the Core.

## Two apps named "LifeGuide" (do not confuse them)
| | Original | This build |
|---|---|---|
| Path | `~/lifeguide` | `~/Desktop/Life Board/LifeGuide` |
| Stack | Next.js + Supabase | Next.js + Convex |
| Core idea | Life Blueprint (guided reflection) | rebuilding to the evolved vision |
| Role | the model and seed | the live build |

## Rebuilt so far
- [`architecture/elements-and-context.md`](architecture/elements-and-context.md): the foundation. The large elements, what each owns, the two streams (Core and Sessions), owns-vs-draws, text as the shared currency, and gap-awareness.
- [`product/blueprint/the-life-blueprint.md`](product/blueprint/the-life-blueprint.md): the recovered Life Blueprint, the Core's backbone (3 sections, 18 questions). Personal recovered answers: [`product/blueprint/ariel-profile.md`](product/blueprint/ariel-profile.md).
- [`product/features/core.md`](product/features/core.md): the Core surface (the blueprint, in the app).

## Live in the app (build state, 2026-06-03)
What actually works in code today (`~/Desktop/Life Board/LifeGuide`, Convex deployment `gregarious-boar-475`):
- [x] **Auth** — Convex Auth with **Google** (durable, cross-device) + Anonymous ("just look around"). No Supabase.
- [x] **Onboarding** — 5-step flow; completion persists (`settings.onboardedAt`).
- [x] **Today** — AM/PM ritual, north star, one-move capture.
- [x] **Core** — the Life Blueprint: 3 sections, 18 questions, malleability colors, editable, autosaved (`coreResponses` + `lib/blueprint.ts`).
- [x] **Board** — vision board (nodes/edges), unified "Add anything" card, capture → AI distillation (OpenRouter, OpenAI fallback).
- [x] **Guide** — the Mirror (synthesized reflection) + north star + pillars.
- [x] **Coach** — context-aware dock; **conversation persists** to `messages`/`threads`.
- [x] **Settings** — rhythm, tone, pillars.
- [ ] Sessions (daily self-stream), Journal as adaptive prompts, Future Self — not built.
- [ ] Coach tool-use (acting on the board) and Core→Mirror regeneration — not built.
- [ ] Account linking (anonymous data → Google account) — not built (clean start chosen).

## To be rebuilt (deliberately, not restored)
- The spec (product requirements) for the evolved vision.
- The data model for the new components (sessions, prompts, future self) alongside what already exists in `convex/schema.ts`.
- One doc per component (the units) and the shared Context Bus contract.
- Architecture, design, decisions, and roadmap, written fresh to the current direction.

The operating rules (docs change in the same step as code; keep the CHANGELOG) still hold: see [`../CLAUDE.md`](../CLAUDE.md).
