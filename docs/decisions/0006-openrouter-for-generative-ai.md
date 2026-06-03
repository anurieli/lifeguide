# 0006 — OpenRouter for generative AI; embeddings deferred

**Status:** Accepted · 2026-05-20 · (supersedes the "OpenAI" choice in ADR 0001 for the generative layer)

## Context
We need a model provider for the generative work: distillation, the Coach agent, transcription, and Mirror compaction. We want one key and the freedom to swap models (OpenAI / Anthropic / Google / open models) without code changes.

## Decision
Use **OpenRouter** as the generative-AI gateway. It is OpenAI-API-compatible, so we keep the `openai` npm SDK and just set:
- `baseURL = https://openrouter.ai/api/v1`
- `OPENROUTER_API_KEY` (replaces the planned `OPENAI_API_KEY`)

Models are referenced by OpenRouter id in the AI config hub — default **`openai/gpt-4o-mini`** for distillation; a stronger model for the Coach (Plan 2). Swapping a model is a one-line change in `convex/ai/config.ts`.

## The catch — embeddings (and transcription)
OpenRouter is a **chat/completions** gateway. It has **no embeddings endpoint** (and does not proxy audio transcription).
- **Embeddings:** In v1, embeddings are *computed-but-unused* — nothing reads vectors until semantic recall / grouping / resurfacing, which are **post-v1**. So we **defer embedding generation and the vector index** until that feature lands, and choose an embeddings provider then (candidates: OpenAI `text-embedding-3-small` (1536), Voyage, Jina, Gemini). The `embedding` field stays optional; the vector index is added when embeddings are wired. **v1 runs on a single OpenRouter key.**
- **Transcription (Whisper, Plan 3):** also not via OpenRouter; pick a transcription provider when audio→nodes is built (OpenAI Whisper, Deepgram, Groq-Whisper, etc.).

## Consequences
- v1 (Plan 1) generative AI = distillation only → goes through OpenRouter. One key.
- `convex/ai/openai.ts` becomes a thin client with the OpenRouter baseURL; `config.ts` holds the model ids.
- Env var: `OPENROUTER_API_KEY`.
- Updates required (same change): `architecture/ai-layer.md`, `architecture/stack.md`, `architecture/data-model.md` (embeddings note), Plan 1 Task 7 (OpenRouter client + defer the embed action/vector index).

## Open questions
- Final embeddings provider + dimensions (drives the vector index `dimensions`).
- Whether to keep a tiny OpenAI key *just* for embeddings later vs an alternative provider.
