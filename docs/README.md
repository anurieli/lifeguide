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

## Live in the app (build state, 2026-06-03)
What actually works in code today (`~/Desktop/Life Board/LifeGuide`, Convex deployment `gregarious-boar-475`):
- [x] **Auth** — Convex Auth with **Google** (durable, cross-device) + Anonymous ("just look around"). No Supabase.
- [x] **Onboarding** — 5-step flow; completion persists (`settings.onboardedAt`).
- [x] **Today** — AM/PM ritual, north star, one-move capture.
- [x] **Daily Ritual** (2026-07-12): editable morning/night checklists on Today ("do" steps + inline mantra "read" steps), time-of-day selection, per-day check state with a 4am rollover (ADR 0009), seal-the-day completion history, doctrine-seeded defaults. See [`product/features/daily-ritual.md`](product/features/daily-ritual.md).
- [x] **Core** — the Life Blueprint: 3 sections, 18 questions, malleability colors, editable, autosaved (`coreResponses` + `lib/blueprint.ts`).
- [x] **Board** — vision board (nodes/edges), unified "Add anything" card, capture → AI distillation (OpenRouter, OpenAI fallback).
- [x] **Thought Stream** — the one-spot capture valve (speak / type / link / photo) with the async ingest pipeline (Whisper transcription, link fetch + extraction, image vision) and durable, re-analyzable raw storage. First slice of the MVP capture spine.
- [x] **Sessions** — the living entry: the phone bar's center ➕ opens a fresh session already recording; the entry is one continuous tap-and-type document (inline takes with pause/discard, photos); a take keeps recording in the background across navigation; the list is AI-titled with pin (swipe left), delete (swipe right), and multi-select merge; the phone bar is Today · Board · ➕ · Sessions (`sessions` + `captures.sessionId`, ADR 0008).
- [x] **Guide** — the Mirror (synthesized reflection) + north star + pillars.
- [x] **Coach** — context-aware dock; **conversation persists** to `messages`/`threads`.
- [x] **Settings** — rhythm, tone, pillars, plus AI models and per-profile keys.
- [ ] Journal as adaptive prompts (beats opening sessions), Future Self — not built.
- [ ] Coach tool-use (acting on the board) and Core→Mirror regeneration — not built.
- [ ] Account linking (anonymous data → Google account) — not built (clean start chosen).

## The map (rebuilt 2026-06-03)

The rebuild is complete. The set below is written fresh to the evolved vision; nothing was restored from the old docs.

**Foundation (read first)**
- [`architecture/elements-and-context.md`](architecture/elements-and-context.md): the large elements, what each owns, the two streams (Core and Sessions), owns-vs-draws, text as the shared currency, gap-awareness.
- [`architecture/context-bus.md`](architecture/context-bus.md): the spine. How context is held, published, and assembled (the two streams, owns vs draws, the assembler, gap-awareness).
- [`architecture/data-model.md`](architecture/data-model.md): the data shape. Live tables plus the proposed ones (sessions, prompts, futureSelf, goals, the Core backbone).

**Product**
- [`product/prd.md`](product/prd.md): the v1 requirements, the index that ties the feature docs together.
- [`product/concept-and-soul.md`](product/concept-and-soul.md): the why (seed 1; the "evolved system" section is the source of truth).
- [`product/blueprint/the-life-blueprint.md`](product/blueprint/the-life-blueprint.md): the recovered Blueprint, the Core's backbone (3 sections, 18 questions).
- [`product/coach-knowledge-base/`](product/coach-knowledge-base/mantras.md): the **Coach Knowledge Base** — the canon the Coach draws from (mantra pool, blueprint, doctrine). Canonical source is the developer's Brain Vault; repo copies are pulled from there. See [`../CLAUDE.md`](../CLAUDE.md#coach-knowledge-base-pulled-from-the-developers-brain-vault).
- [`product/features/`](product/features/README.md): one doc per element (Vision Board, Future Self, Journal, Pillars & Goals, Core, Coach, Guide, Dashboard, Settings).

**Architecture**
- [`architecture/ai-layer.md`](architecture/ai-layer.md): the AI roles and providers (OpenRouter preferred, OpenAI fallback).
- [`architecture/stack.md`](architecture/stack.md): Next.js + Convex + OpenRouter, and why.
- [`architecture/security-privacy.md`](architecture/security-privacy.md): the trust contract (multi-tenant isolation, server-only keys, likeness-photo handling).

**Design**
- [`design/interaction-principles.md`](design/interaction-principles.md), [`design/design-system.md`](design/design-system.md), [`design/screens.md`](design/screens.md).

**Decisions**
- [`decisions/`](decisions/README.md): the evolved-vision pivot and docs reset, Future Self as its own element, OpenRouter.

**Sequence**
- [`roadmap.md`](roadmap.md): the spine-first build order.

## The two seeds (kept)
The rebuild was grown from two seeds, both still canonical: the soul and evolved vision in [`product/concept-and-soul.md`](product/concept-and-soul.md), and the recovered Life Blueprint from the original app at `~/lifeguide`.

The operating rules (docs change in the same step as code; keep the CHANGELOG) still hold: see [`../CLAUDE.md`](../CLAUDE.md).
