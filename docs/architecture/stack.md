# Stack

**Status:** ✅ decided. See ADR [`../decisions/0001-stack-nextjs-convex-openai.md`](../decisions/0001-stack-nextjs-convex-openai.md).

| Layer | Choice | Why |
|---|---|---|
| Shell / routing / SSR | **Next.js** (App Router) | One endpoint hosts all surfaces + auth; renders the canvas as a component |
| Backend / real-time / DB / storage / vector | **Convex** | Real-time is the *default*; bundles reactive DB + file storage + vector index + secure server-side actions in one runtime |
| AI (generative) | **OpenRouter** preferred, **OpenAI-direct** fallback (`aiClient()`; default `openai/gpt-4o-mini`, any model swappable) | One key + model flexibility via the `openai` SDK; uses whichever key is set, OpenRouter winning (ADR 0006). Dev currently runs on `OPENAI_API_KEY`. |
| AI (embeddings / transcription) | **Deferred** (provider TBD) | OpenRouter has no embeddings/audio endpoint; not needed until post-v1 (embeddings) / Plan 3 (transcription) |
| Canvas | Custom **DOM + CSS transform + SVG** | Not Konva (dead dependency in braindump); lightweight and reuse-friendly |
| Auth | **Convex Auth** (Anonymous v1) | Instant, frictionless start; real identity → true multi-tenancy from day one |
| Hosting | Vercel (web) + Convex cloud | Standard, fast |

## Why Convex (the deciding factor)
LifeGuide's defining requirement — every surface live-publishing to one bus that every AI call reads — is fundamentally a **real-time reactivity** problem. Convex makes real-time the default and removes four otherwise-separate concerns (DB, files, vectors, server-side AI) into one runtime. This supersedes the earlier (2-surface) BrainDump/Supabase consideration; at 5+ surfaces + an intake agent, real-time is substrate, not a feature.

## Why not the alternatives (short)
- **Next.js + Supabase:** great pieces, but real-time + the shared context bus would be bolted on; more glue.
- **Continue PillarOS (Convex+Gemini):** has the AI parts but is Vite-SPA, Gemini-locked, rigidly Pillar-structured, and was not built for a multi-surface platform.

Full reasoning: [`../research/extraction/03-foundation-stack.md`](../research/extraction/03-foundation-stack.md).
