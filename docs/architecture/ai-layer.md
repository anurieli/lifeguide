# AI Layer

**Status:** 🟡 outline

All AI runs **server-side** (Convex actions); keys never reach the client. The generative layer goes through **OpenRouter** — an OpenAI-compatible gateway (ADR [0006](../decisions/0006-openrouter-for-generative-ai.md)) — so we keep the `openai` SDK with a custom `baseURL` and one `OPENROUTER_API_KEY`, and swap models by id in one file.

## Config hub (the `AI` object)
Pattern adapted from PillarOS `AI_PROCESSES` + braindump `src/lib/ai/`. Each process declares `provider`, `model`, params, and prompt(s). v1 provider = OpenRouter; the `provider`/`baseURL` indirection makes a model swap (or adding a separate provider for embeddings/transcription) a one-line change.

```ts
// convex/ai/openai.ts — one client, pointed at OpenRouter
new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" })
```

## Processes
| Process | Provider · model | Where |
|---|---|---|
| Distillation (capture → essence/title/pillars) | OpenRouter · `openai/gpt-4o-mini` (JSON mode) | `convex/ai/distill.ts` |
| Coach agent (multi-turn, tools) | OpenRouter · stronger model (TBD) | `convex/ai/coach.ts` (Plan 2) |
| Mirror compaction | OpenRouter · batched | Plan 2+ |
| Embeddings | **Deferred** — OpenRouter has no embeddings endpoint; computed-but-unused in v1, wired with a dedicated provider when semantic recall/grouping lands (post-v1) | `convex/ai/embed.ts` (later) |
| Transcription (audio → text) | **Deferred** — dedicated provider in Plan 3 (Whisper / Deepgram / …); not via OpenRouter | Plan 3 |

## Cost discipline (from the cost analysis)
- Cheap tier by default; higher tier only for high-stakes calls (compaction, ceremony).
- **Cache the Mirror** (read on every Coach call) — biggest lever.
- Batch the silent work (Mirror deltas, daily generation).
- Platform-native extraction before LLM (link previews, captions).
- Embed once, reuse forever. Image gen opt-in only.
- Server boundary = where runaway cost dies (log, throttle, abort).

## Degradation
Manual manipulation always works without AI. Distillation retries; the board/Guide never hard-depend on a live model.

> To expand: prompt texts, per-process params, token-budget numbers, the Coach behavioral-contract prompt assembly.
