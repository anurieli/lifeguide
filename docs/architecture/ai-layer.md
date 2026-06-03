# The AI Layer

**Status:** rebuilt 2026-06-03. Source of truth for how LifeGuide talks to a model: the provider setup, the roles AI plays across the product, and what flows where. Built from [`elements-and-context.md`](elements-and-context.md) (ownership), [`context-bus.md`](context-bus.md) (assembly and publishing), and the live code under `convex/ai/`.

The AI layer is server-only. It lives entirely inside Convex actions; no key, prompt, or model call ever reaches the client.

---

## Providers: OpenRouter preferred, OpenAI fallback

One client, provider-flexible (`convex/ai/openai.ts`). The same OpenAI SDK talks to either provider; only the `baseURL` and the model namespace differ.

- **OpenRouter is preferred and LIVE today.** The dev deployment has `OPENROUTER_API_KEY` set, so `aiClient()` returns an OpenRouter client (custom `baseURL` `https://openrouter.ai/api/v1`, LifeGuide referer headers).
- **OpenAI is the automatic fallback.** If no OpenRouter key is present but `OPENAI_API_KEY` is, the same SDK runs against OpenAI-direct with no code change. With neither key, `aiClient()` throws with the exact `npx convex env set` command to fix it.
- **Swappable models.** Canonical model ids are OpenRouter-namespaced (`openai/gpt-4o-mini`, the default in `convex/ai/config.ts`). `resolveModel(id, provider)` strips the `openai/` prefix when running OpenAI-direct, so one config id works against either provider. Pointing a role at a different model (an Anthropic or open-weights model on OpenRouter) is a one-line change in `config.ts`.

`convex/ai/config.ts` is the single hub for models, params, and prompts. Tune AI behavior there, not in the actions.

### Server-only keys

Keys live in Convex env (`OPENROUTER_API_KEY` / `OPENAI_API_KEY`), read via `process.env` inside actions. AI work runs in `internalAction`s scheduled by mutations (see distillation below), so the model call and its key stay on the server. The client never sees either.

---

## The AI roles across the product

AI shows up in five places. One is live; the rest are designed and proposed, to be built with their elements.

### 1. Distillation: capture to title/essence/pillars (LIVE)

When a capture lands, `captures.create` schedules `distillCapture` (`convex/ai/distill.ts`), an `internalAction`. It builds a text input from the capture (`rawText`, or the saved `rawUrl`; a bare image has nothing textual yet and is placed as-is), calls the model in JSON mode with the `distill` system prompt, and writes the result back via `captures.updateDistilled`.

The output is `{ title, essence, pillars[] }`, parsed defensively by the pure `parseDistilled` (`convex/ai/parse.ts`): it tolerates clean JSON, prose-wrapped JSON, and garbage, clamps lengths, and keeps only pillar tags from the fixed vocabulary (`PILLAR_TAGS`). This distilled text is the capture's contribution to the shared context (see `captures` in [`data-model.md`](data-model.md)).

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

---

## Text is the shared currency

Whatever the medium, only distilled TEXT flows onto the Bus. Distillation publishes a capture's `essence`, not its image or link; Future Self and Vision Board image rows publish their `caption`, never the pixels. The meaning is the context; the image stays inside its element. This is the rule that keeps context blendable across media (see [`context-bus.md`](context-bus.md) and [`elements-and-context.md`](elements-and-context.md)).

---

## Embeddings deferred

OpenRouter has no embeddings endpoint, so semantic recall is deferred. The `embedding` fields on `nodes` and `captures` stay optional and unused, and no vector index is created, until embeddings land (see Notes in [`data-model.md`](data-model.md)).
