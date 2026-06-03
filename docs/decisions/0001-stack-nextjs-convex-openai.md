# 0001 — Stack: Next.js + Convex + OpenAI

**Status:** Accepted · 2026-05-20

## Context
LifeGuide's defining requirement is "reflect context at all times": every surface live-publishes state to one shared bus that every AI call reads. That's a real-time reactivity problem at the core. We also need file storage, vector search, secure server-side AI, auth, and a multi-surface web shell.

## Decision
- **Convex** as the backend: reactive DB + file storage + vector index + secure server-side actions in one runtime; real-time is the default.
- **Next.js** (App Router) as the shell/routing/SSR, rendering surfaces (incl. the custom canvas).
- **OpenAI** as the model layer via a central config hub (`provider` field for future flexibility).

## Alternatives rejected
- Next.js + Supabase: real-time + shared context bus would be bolted on; more glue.
- Continue PillarOS (Convex + Gemini): has AI parts but Vite-SPA, Gemini-locked, Pillar-rigid, not multi-surface.

## Consequences
Real-time context is substrate, not a feature. Supersedes the earlier (2-surface) Supabase consideration. Canvas is built DOM+CSS+SVG (not Konva). Auth via Convex Auth (Anonymous v1) → multi-tenant from day one.

Detail: [`../architecture/stack.md`](../architecture/stack.md) · [`../research/extraction/03-foundation-stack.md`](../research/extraction/03-foundation-stack.md).
