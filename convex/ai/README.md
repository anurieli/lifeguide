# The AI layer

Every AI call in LifeGuide is defined in **one file**: [`config.ts`](config.ts). This is the place to see every AI node, change models, swap providers, or move a task onto a local model. Nothing else needs to change.

## The two dials

`config.ts` has two tables:

- **`PROVIDERS`** = where a model runs. Each is just a base URL + which Convex env var holds its key. Three ship by default:
  - `openrouter` (preferred): one key, hundreds of models, ids look like `vendor/model` (`openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`).
  - `openai`: OpenAI-direct, ids are bare (`gpt-4o-mini`).
  - `local`: any OpenAI-compatible local server. Point `LOCAL_AI_BASE_URL` at it.
- **`TASKS`** = the AI nodes. Each task names a `provider` and a `model`. That pair is the only thing you change to re-point a task.

## Common changes

**Use a different model for one task.** Edit that task in `TASKS`:
```ts
coachReply: { provider: "openrouter", model: "anthropic/claude-3.5-sonnet", temperature: 0.7, ... }
```

**Move a task to a local model.** Set the provider to `local`, the model to whatever your local server serves, and point the env var at your server:
```ts
distill: { provider: "local", model: "llama-3.1-8b-instruct", temperature: 0.4, ... }
```
```bash
npx convex env set LOCAL_AI_BASE_URL http://localhost:1234/v1   # LM Studio
# or http://localhost:11434/v1 for Ollama
```
Local servers usually ignore the key, so none is required (`keyOptional: true`).

**Add a new provider** (a second gateway, a hosted vLLM, etc.): add an entry to `PROVIDERS` with its `baseURL` and `keyEnv`, then point tasks at it.

**Add a new AI node:** add an entry to `TASKS`, then call it from your action with `aiForTask(ctx, "yourTaskId", userId)`.

## Keys: env vs per-profile

A task resolves its key in this order:
1. The **user's own key** for that provider, if they saved one in Settings (stored per profile, server-only, never sent to the client). See [`../aiKeys.ts`](../aiKeys.ts).
2. The **deployment env key** (`PROVIDERS[provider].keyEnv`), set with `npx convex env set`.

So a person can bring their own OpenRouter key and their calls run on it; everyone else falls back to the shared deployment key.

## Where this is wired

`aiForTask(ctx, taskId, userId)` in [`openai.ts`](openai.ts) builds the client for a task: it reads the provider + model from `config.ts`, resolves the key (profile then env), and returns `{ client, model, temperature, system }`. Live call sites: [`distill.ts`](distill.ts) (`distill`) and [`../coach.ts`](../coach.ts) (`coachReply`). The `curate` and `journalPrompts` nodes are defined and visible in Settings but not yet called.

The full architecture writeup is in [`../../docs/architecture/ai-layer.md`](../../docs/architecture/ai-layer.md).
