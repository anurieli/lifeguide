# The Stack

**Status:** rebuilt 2026-06-03. Source of truth for what LifeGuide is built on and why.

## The stack

- **Next.js (App Router)** for the client and routing.
- **Convex** for the backend: a reactive database (queries re-run live on the client), file storage (images, audio), server-side AI actions, and scheduling (the async distillation and curation passes). One backend covers the real-time DB, the storage, and the model calls.
- **OpenRouter / OpenAI** for the AI layer, server-side inside Convex actions. See [`ai-layer.md`](ai-layer.md).

## Auth and multi-tenancy

Anonymous multi-tenant auth via `@convex-dev/auth`. Every row carries `userId`, and every query and mutation gates on `getAuthUserId`. This is the one rule with no exceptions (see [`data-model.md`](data-model.md)).

## Deployment

The dev deployment is the Convex project **"gregarious-boar-475"**, where `OPENROUTER_API_KEY` is set (hence OpenRouter is live; see [`ai-layer.md`](ai-layer.md)).

## Not this stack: the seed app

There is another LifeGuide app at `~/lifeguide` (Next.js + Supabase). It is the SEED and working model for the Journal and the Core (see [`../product/concept-and-soul.md`](../product/concept-and-soul.md)), not this stack. This build is Next.js + Convex.
