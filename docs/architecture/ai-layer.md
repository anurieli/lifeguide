# The AI Layer

**Status:** rebuilt 2026-06-03. Source of truth for how LifeGuide talks to a model: the provider setup, the roles AI plays across the product, and what flows where. Built from [`elements-and-context.md`](elements-and-context.md) (ownership), [`context-bus.md`](context-bus.md) (assembly and publishing), and the live code under `convex/ai/`.

The AI layer is server-only. It lives entirely inside Convex actions; no key, prompt, or model call ever reaches the client.

---

## One file holds every AI node

The whole AI surface is defined in one place: [`../../convex/ai/config.ts`](../../convex/ai/config.ts) (see also [`../../convex/ai/README.md`](../../convex/ai/README.md)). It has two tables, and they are the only dials:

- **`PROVIDERS`** = where a model runs. Each is a `baseURL` plus the Convex env var holding its key. Three ship: `openrouter` (preferred), `openai` (direct fallback), and `local` (any OpenAI-compatible local server, pointed at by `LOCAL_AI_BASE_URL`, key optional).
- **`TASKS`** = every AI node in the app, each naming a `provider` + `model` (+ temperature, + optional system prompt). This is what makes "a different model for different tasks" trivial: `distill` can run on OpenRouter while `coachReply` runs on a local Llama, by editing two fields.

Because everything is OpenAI-compatible, the same SDK reaches all three providers; only the `baseURL` and key differ. Moving a task to a local model is: set its `provider` to `local`, set its `model` to whatever the local server serves, and `npx convex env set LOCAL_AI_BASE_URL http://localhost:1234/v1`. Pointing a task at a stronger hosted model (an Anthropic or open-weights model on OpenRouter) is a one-line model change.

**Nodes are tiered by job, not run on one default model** (see [ADR 0014](../decisions/0014-per-node-model-tiering.md); model picks revised 2026-07-13). Synthesis and relationship nodes that build or steer the Core run on strong models — `curate` on `openai/gpt-5.6-terra-pro` (deepest, low-frequency; Ariel's pick, to be A/B'd against opus when the pass is wired), `coachReply` / `synthesis` / `journalPrompts` on `anthropic/claude-sonnet-5`; `center` (fans out per pillar) runs mid-tier `anthropic/claude-haiku-4.5`; the realtime interview uses `gpt-realtime-mini` (cheap + fast); transcription upgraded from `whisper-1` to `gpt-4o-transcribe` (higher accuracy); the bounded mechanical nodes (`distill`, `cleanVoice`, `voicePrompts`, `extractImage`, `brainDumpSplit`, `sessionDigest`, `thoughtMap`, `listenerSummary`) stay on `openai/gpt-4o-mini`; `sessionReply` (the dynamic-mode interviewer) runs `anthropic/claude-sonnet-5`, the same tier as `coachReply`, since it's a live per-turn chat loop that has to feel perceptive; the once-a-day `dailyQuote` node (the morning scroll's [daily-quote tidbit](../product/features/daily-tidbit.md)) runs `anthropic/claude-haiku-4.5` — a cheap retrieval/curation job, Ariel's pick (2026-07-15). The experimental `brainDumpGraph` node was deleted with its lab ([ADR 0016](../decisions/0016-toss-the-brain-dump-lab.md)).

`aiForTask(ctx, taskId, userId)` in `convex/ai/openai.ts` builds the client for a task. Provider + model resolve in two steps ([ADR 0017](../decisions/0017-ai-hub-logging-and-overrides.md)): **the person's own override for the node** (saved from the Settings AI hub into `aiOverrides`) wins; otherwise the config default. Then the key resolves (per-profile then env, below) and it returns `{ client, model, temperature, system, provider }`. Call sites don't use the raw client for chat anymore — they go through the logged helpers (next section). The `curate` and `journalPrompts` nodes are defined and visible in Settings but not yet called. The Settings hub reads `aiModels.nodes` (the registry overlaid with the caller's overrides).

### Observability: every call is logged (ADR 0017)

Every model call — chat, transcription, image, realtime mint — writes one row to `aiLogs`: task, call-site `fn`, provider, model, tokens in/out, estimated cost (from the dated `PRICING` snapshot in `openai.ts`), duration, ok/error, timestamp. Three helpers in `convex/ai/openai.ts` are the only sanctioned way to call a model: `chatComplete` (chat; prepends the node's config system prompt, logs, rethrows), `transcribeLogged` (audio), and `logAi` (direct, for the images endpoint and the realtime-session mint — the realtime conversation runs client-side over WebRTC so its usage is unknowable server-side). Logging is best-effort: a failed log write never breaks the feature. The Settings AI hub shows the recent log and month-to-date totals per user.

### Keys: deployment env and per-profile

A task resolves its key in this order:

1. **The user's own key** for that provider, if they saved one in Settings. Stored per profile in the `apiKeys` table (see [`data-model.md`](data-model.md)), gated by `userId`, **server-only**: the key is never returned to the client (the UI reads back only "set or not" plus the last four). So a person can bring their own OpenRouter key and their calls run on it.
2. **The deployment env key** (`PROVIDERS[provider].keyEnv`, e.g. `OPENROUTER_API_KEY`), the shared fallback. OpenRouter is LIVE on the dev deployment today; OpenAI is the automatic fallback when only `OPENAI_API_KEY` is present.

All resolution and the model call happen inside Convex actions (`internalAction`s for scheduled work like distillation), so neither key nor prompt reaches the client. Hardening note: per-profile keys are stored as-is and gated by `userId`; encryption at rest is tracked in [`security-privacy.md`](security-privacy.md).

---

## The AI roles across the product

AI shows up in five places. One is live; the rest are designed and proposed, to be built with their elements.

### 1. Distillation: capture to title/essence/pillars (LIVE)

When a capture lands, `captures.create` schedules `distillCapture` (`convex/ai/distill.ts`), an `internalAction`. It builds a text input from the capture (`rawText`, or the saved `rawUrl`; a bare image has nothing textual yet and is placed as-is), calls the model in JSON mode with the `distill` system prompt, and writes the result back via `captures.updateDistilled`.

The output is `{ title, essence, pillars[] }`, parsed defensively by the pure `parseDistilled` (`convex/ai/parse.ts`): it tolerates clean JSON, prose-wrapped JSON, and garbage, clamps lengths, and keeps only pillar tags from the fixed vocabulary (`PILLAR_TAGS`). This distilled text is the capture's contribution to the shared context (see `captures` in [`data-model.md`](data-model.md)).

The same response carries the **vision sieve**: two extra fields (`board_worthy`, `board_reason`) in which the model judges whether the capture is a piece of the life the person wants (an aspiration, a want, a vision) or ambient noise (logistics, work notes, prompts to a computer, venting, diary accounts). `parseBoardWorthy` reads them with the same tolerance and **defaults to not worthy** — garbage can only keep something off the board, never leak it on. The verdict lands on `captures.boardWorthy` and gates the board Inbox alongside explicit `target: "board"` intent (ADR 0015). One model call does both jobs; no second pass, no extra latency or cost.

The same call also carries the **long-audio "made readable" pair** (ARI-145) — but conditionally, and for audio only. When a capture's transcript passes the character threshold in `lib/audioReadable.ts` (`isLongAudioTranscript`), `distillCapture` appends one extra instruction asking the model to also return `summary` (a concise gist) and `cleaned` (the full transcript with filler and false starts removed and grammar repaired, every point kept), and sends the transcript up to a larger cap (`LONG_AUDIO_DISTILL_INPUT_CAP`) so the cleaned output isn't truncated. `parseReadable` reads them with the same tolerance and returns `null` unless both are present, so a partial response leaves `captures.readable` unset and the UI falls back to the raw transcript. A short note never sends the instruction, so it adds no tokens there. The pure selection of what the card shows (`selectAudioDisplay`) and the threshold both live in `lib/audioReadable.ts`, unit-tested without a model; `extractedText` (the raw transcript) and the stored audio are never modified.

### 2. Core-curation: the Coach's hard filter (proposed)

The Coach periodically and on meaningful events re-synthesizes the Core (`mirror`) from the accumulated `interactions`, bumping `version`. It strengthens or reshapes the backbone, fills gaps, and surfaces conflicts rather than silently overwriting (the person decides). This is the alignment engine made concrete. See [`context-bus.md`](context-bus.md) (publishing and gap-awareness) and the Core backbone on `mirror.structured` in [`data-model.md`](data-model.md).

### 3. Prompt adaptation: the Journal choosing today's prompts (proposed)

The Journal draws Core + Goals through the Bus to shape each session's prompts: rhythm beats, backbone-filling questions, and drift checks. A prompt's `origin` and `blueprintQuestionId` (see `prompts` in [`data-model.md`](data-model.md)) record why it was chosen now.

### 4. Image generation (proposed)

Two consumers, both writing text-bearing image rows:

- **Future Self.** Generates you living the life you want, drawing the Vision Board (the world, the aesthetic) + the Core (who you are). Output is a `futureSelf` row of `kind: "generated"` whose `caption` is the aspiration text that flows to the Core.
- **Vision Board.** The Coach, co-building the board, places `generated_image` nodes asynchronously (the `generated_image` node type in [`data-model.md`](data-model.md)).

### 5. Transcription: spoken Journal answers (proposed)

A session prompt may be answered by voice (`answerAudioFileId`). Transcription turns the audio into `answerText`, the form the rest of the system reads. This is the `source: "audio"` path on captures and the spoken self-session.

### 6. VoiceField: spoken answers on any field (LIVE)

[`VoiceField`](../product/features/voice-field.md) lets a person speak into any text field instead of typing. **Transcription itself is client-side** — the browser's Web Speech API does live, on-device speech-to-text, so no audio ever reaches the server (and there is no transcription cost). The AI layer enters only after the words exist, in two field-aware server passes (both in `convex/voice.ts`):

- **`cleanVoice`** (renamed from `voiceShape`, 2026-07-13) — takes the raw transcript plus the field's `question` / `descriptor` / `intent` and returns the words cleaned and fitted to what the field asks. It keeps the person's meaning; the client retains the raw transcript and offers a one-tap "show raw", so nothing is silently overwritten.
- **`voicePrompts`** — "Prompt Mode": generates 2–3 short, contextual nudges for what to say next, grounded in the field metadata and the Mirror (drawn through the Context Bus). It is ambient — on any error it returns `[]` and the UI simply shows nothing.

This is distinct from the **onboarding voice interview** (a realtime, conversational OpenAI Realtime stack, provider-abstracted, still proposed in the onboarding-rebuild spec): VoiceField is per-field dictation, the interview is a spoken conversation. They coexist and share nothing but the goal of letting people talk instead of type.

---

## Text is the shared currency

Whatever the medium, only distilled TEXT flows onto the Bus. Distillation publishes a capture's `essence`, not its image or link; Future Self and Vision Board image rows publish their `caption`, never the pixels. The meaning is the context; the image stays inside its element. This is the rule that keeps context blendable across media (see [`context-bus.md`](context-bus.md) and [`elements-and-context.md`](elements-and-context.md)).

---

## Embeddings deferred

OpenRouter has no embeddings endpoint, so semantic recall is deferred. The `embedding` fields on `nodes` and `captures` stay optional and unused, and no vector index is created, until embeddings land (see Notes in [`data-model.md`](data-model.md)).
