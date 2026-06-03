# Changelog

All meaningful changes to LifeGuide — product, docs, and code. Newest on top.
Every entry records **what changed** and **which documentation files were touched**. Maintained via the `changelog` skill (see `CLAUDE.md`).

Format per entry: `## YYYY-MM-DD · Title` → short summary → **Docs touched:** list. (Commit hash added once the codebase exists.)

---

## 2026-05-20 · Documentation architecture + governance established
Set up the canonical documentation structure under `docs/` (product / architecture / design / decisions / research / plans), relocated existing docs into it, and wrote the root `CLAUDE.md` codifying the two non-negotiable rules: docs-as-source-of-truth (update in the same change) and changelog discipline (record which docs were touched). Added the feature-doc template and indexes; began expanding feature documentation.
**Docs touched:** created `CLAUDE.md`, `CHANGELOG.md`, `README.md`, `docs/README.md`, `docs/product/features/_TEMPLATE.md`, `docs/product/features/README.md`, `docs/product/features/whiteboard.md`, feature stubs (`coach`, `mirror`, `guide`, `intake-distillation`, `pillars`, `daily-ritual`, `settings`), `docs/architecture/*`, `docs/design/*`, `docs/decisions/*`, `docs/roadmap.md`, `docs/product/personas.md`, `docs/product/glossary.md`. Moved `docs/PRD.md → docs/product/prd.md`, `docs/concept-and-soul.md → docs/product/concept-and-soul.md`, `docs/extraction → docs/research/extraction`.

## 2026-05-20 · Clickable prototype (full app)
Built the interactive HTML prototype covering the whole v1 shape: splash, 5-step onboarding, app shell (Today/Board/Guide/Settings), interactive Whiteboard (drag/pan/zoom/connect/audio-demo/inbox), the Guide (north star + Mirror + pillars), Settings, and the global context-aware Coach. Fixed a script-breaking escaping bug.
**Docs touched:** `mockup/index.html`.

## 2026-05-20 · v1 implementation plan — Plan 1 (Foundation + Whiteboard)
Wrote the first foundation-first, bite-sized, TDD implementation plan (9 tasks): Next.js + Convex + anonymous multi-tenant auth, full schema, node/edge model, canvas, capture→distill→place, and context scaffolding. Defined the 4-plan series.
**Docs touched:** `docs/plans/2026-05-20-lifeguide-v1-plan1-foundation-whiteboard.md`.

## 2026-05-20 · PRD authored and scoped
Wrote the v1 PRD. Resolved scope: audio→nodes in v1; calendar/to-dos deferred (context slot reserved); pillars start with a single default "Lifestyle" + preset library. Centerpiece: the four-scope context system (selection/viewport/surface/global) + assembler.
**Docs touched:** `docs/product/prd.md`.

## 2026-05-20 · Concept & soul captured
Documented the mission (answering lostness in young men), the soul ("the text layer behind the human"), the Coach model, the morning/evening ritual, the alignment engine, and the interaction contract.
**Docs touched:** `docs/product/concept-and-soul.md`.

## 2026-05-20 · Foundation blueprint + decisions
Synthesized four extraction agents into the foundation blueprint: stack pick (Next.js + Convex), the 9-primitive reusable component library, the reflection loop as the wedge, and the foundation-first sequence.
**Docs touched:** (external HTML at the time) — now reflected in `docs/architecture/*` and `docs/decisions/*`.

## 2026-05-20 · Codebase extraction + landscape research
Ran four agents: deep extraction of `braindump` and `PillarOS`, a foundation/stack synthesis, and a competitor/landscape + gaps scout.
**Docs touched:** `docs/research/extraction/{01-braindump,02-pillaros,03-foundation-stack,04-references-and-gaps}.md`.
