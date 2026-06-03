# 0003. OpenRouter for generative AI

**Status:** accepted (live, 2026-06-03)

## Context

LifeGuide leans on generative AI throughout (distillation, the Coach, core-curation). We wanted one gateway that lets us swap models freely without rewriting call sites, while keeping a safe fallback if one provider is down or unconfigured. The live client is [`../../convex/ai/openai.ts`](../../convex/ai/openai.ts).

## Decision

Use **OpenRouter** as the generative-AI gateway.

- It is OpenAI-compatible, so the same OpenAI SDK is reused with a different `baseURL` and model namespace.
- One `OPENROUTER_API_KEY` drives it, with **automatic fallback to OpenAI-direct** when only an `OPENAI_API_KEY` is present.
- Models are swappable and OpenRouter-namespaced (default `openai/gpt-4o-mini`); for OpenAI-direct the `openai/` prefix is stripped so one canonical config id works against either provider.
- Keys are server-only (Convex actions).
- **Embeddings and transcription are deferred:** OpenRouter has no endpoint for them. Embeddings are computed-but-unused for now; transcription arrives with the Journal's spoken path.

## Consequences

- Model choice is a config change, not a code change; we can move to a better or cheaper model freely.
- Resilience: an OpenAI key alone keeps the app running if OpenRouter is unset or unavailable.
- Embeddings and transcription will need a direct path (likely OpenAI-direct) when activated, since they bypass the gateway.
- Now live in dev. The canonical reference for the AI layer is [`../architecture/ai-layer.md`](../architecture/ai-layer.md).
