# AI Layer

**Status:** 🟡 outline

All AI runs **server-side** (Convex actions); keys never reach the client. One central config hub owns every model, prompt, and parameter per process — change behavior in one file.

## Config hub (the `AI` object)
Pattern adapted from PillarOS `AI_PROCESSES` + braindump `src/lib/ai/`. Each process declares `model`, params, and prompt(s); add a `provider` field for multi-model later.

## Processes (v1)
| Process | Model | Where |
|---|---|---|
| Distillation (capture → essence/title/pillars) | gpt-4o-mini (JSON mode) | `convex/ai/distill.ts` |
| Embeddings | text-embedding-3-small (1536) | `convex/ai/embed.ts` |
| Coach agent (multi-turn, tools) | gpt-4o family | `convex/ai/coach.ts` (Plan 2) |
| Transcription (audio → text) | Whisper | Plan 3 |
| Mirror compaction | higher tier, batched | Plan 2+ |

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
