# 0002 — Build net-new, harvest patterns (not code)

**Status:** Accepted · 2026-05-20

## Context
Two prior apps exist: `braindump` (Next/Supabase/OpenAI canvas) and `PillarOS` (Convex/Gemini AI agent). Both have real, working pieces — and real flaws.

## Decision
Build LifeGuide net-new on a clean foundation, **reusing proven patterns, not codebases**. Lift: the AI config hub, the context-injection mechanic (→ Context Bus), the labeled edge graph, the capture loop, the media→node pipeline. Leave: the rigid Pillar→Zone→Item hierarchy, the growing-blob memory, the undo/optimistic plumbing.

## Why (flaws found in the deep extraction)
- braindump: **no multi-tenancy** (RLS off, service-role keys in routes); canvas is DOM+SVG (Konva is dead); embeddings computed but never used.
- PillarOS: **leaks the model key to the browser**; the agent "loop" is single-pass (cosmetic); memory is an unindexed blob.

## Consequences
A clean, multi-tenant, real-time foundation. The hard AI parts are de-risked (we've seen them work once). Reuse map lives in each feature doc §9 and in `../research/extraction/`.
