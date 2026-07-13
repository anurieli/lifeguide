# 0017. The AI hub: every call logged, every model a Settings dial

**Status:** accepted (live, 2026-07-13)

## Context

Two gaps in the AI layer, both raised by Ariel on 2026-07-13:

1. **No observability.** Model calls ran dark — no record of what was called, when, on which model, with what token usage or cost. ("Every single call needs to be logged at all times, no matter what.")
2. **Models were visible but not adjustable in-app.** The Settings list showed every node read-only, pointing people at `convex/ai/config.ts` — fine for a developer, wrong for "all of this batched into one place."

## Decision

**A universal AI call log.** One `aiLogs` row per model call — chat, transcription, image, and realtime-session mints — success or failure: `taskId`, call-site `fn`, provider, model, input/output tokens, estimated `costUsd`, `durationMs`, `ok`/`error`, timestamp. Implemented as three helpers in `convex/ai/openai.ts` that call sites go through:

- `chatComplete(ctx, {taskId, fn, userId, messages, jsonMode})` — the one way to make a chat call; prepends the node's config system prompt, logs, rethrows errors so call-site fallbacks are unchanged.
- `transcribeLogged(...)` — the audio path (usage tokens when the model reports them; whisper-1 doesn't).
- `logAi(...)` — direct logging for the image endpoint and the realtime mint (the realtime conversation itself runs client-side over WebRTC, so its per-token usage is unknowable server-side; the mint row is the honest marker).

Logging is **best-effort by design**: a log-write failure is swallowed (console only) so observability can never take a feature down. Cost is computed from a **pricing snapshot** (`PRICING` in `openai.ts`, taken from the OpenRouter models API 2026-07-13); unknown models log tokens with cost undefined rather than a made-up number.

**Per-user model overrides.** An `aiOverrides` table (userId + taskId → provider + model). `aiForTask` resolves: **the person's override → the config default**. The Settings AI hub ("AI — models, keys & activity") renders every node with an inline model picker (options verified live on OpenRouter; the three OpenAI-pinned nodes offer their own endpoint family), an "yours · reset" chip when overridden, the per-provider keys, and the activity log with month-to-date totals (calls, tokens, ~cost, errors).

## Consequences

- Cost and behavior are inspectable in-app: what ran, on what, for how much — per user, live (Convex reactivity).
- A person can re-point any node (e.g. Coach on opus for a day) without a deploy; clearing the override falls back to config. Deployment defaults still change in `config.ts`.
- Every new call site MUST go through the helpers — a raw `client.chat.completions.create` is now a code-review smell.
- The pricing snapshot drifts; refresh it when models change (it's labeled with its date). Transcription cost is a floor (audio-token premium not attributed). The `aiLogs` table grows unboundedly; pruning/rollup is deferred until it matters.
- Tables: `aiLogs`, `aiOverrides` (see `data-model.md`).
