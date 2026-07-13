# 0014. Per-node model tiering: match the model to the job

**Status:** accepted (live, 2026-07-13)

## Context

Every AI node in the app is defined in [`../../convex/ai/config.ts`](../../convex/ai/config.ts) (see [ADR 0003](0003-openrouter-for-generative-ai.md)), and until now every node defaulted to the same small model — `openai/gpt-4o-mini` via OpenRouter. That was the right default to get the surface wired end to end, but it flattened a real distinction: some nodes do genuine synthesis and carry the relationship (the Coach, the Core), while others do bounded, mechanical structuring (title a capture, clean a transcript, split a dump). Running all of them on the cheapest tier caps the ceiling of the reasoning-heavy nodes for no benefit; running all of them on a strong tier burns money and latency on nodes a mini does perfectly.

The `curate` node's own comment already conceded the point ("a stronger model is the natural choice here") while shipping the mini anyway. The config was built precisely so that `provider` + `model` are the only two dials per node, so per-node tiering is a config change, not a code change.

## Decision

Assign each node a model by **what the job is**, not a uniform default. The dividing line is *synthesis / relationship work that builds or steers the Core* vs. *mechanical structuring* (short input → bounded structured output).

**Strong tier — reasoning + warmth, builds or steers the Core:**
- `curate` (Core curation) → `anthropic/claude-opus-4.8` — the deepest synthesis in the app; runs rarely, so opus is affordable.
- `coachReply` (the Coach) → `anthropic/claude-sonnet-5` — the product's power tool; runs every conversational turn, so sonnet (not opus) keeps per-turn latency sane.
- `synthesis` (interview → first blueprint) → `anthropic/claude-sonnet-5` — one-shot, high-stakes, low-frequency.
- `journalPrompts` (adaptive prompts) → `anthropic/claude-sonnet-5` — must feel perceptive and personal.

**Mid tier — capable but cost-aware because they fan out or run often:**
- `center` (per-pillar filing) → `anthropic/claude-haiku-4.5` — fans out once per pillar per session; "cheap-but-capable" is exactly haiku's tier.
- `brainDumpGraph` (idea graph) → `anthropic/claude-haiku-4.5` — incremental structured reasoning where a mini drifts on graph coherence.
- `voice` (realtime onboarding) → `gpt-realtime` (up from `gpt-realtime-mini`) — the onboarding conversation is the first thing a person feels.

**Small tier — bounded and mechanical, keep `openai/gpt-4o-mini`:**
- `distill`, `voiceShape`, `voicePrompts`, `extractImage`, `brainDumpSplit`, `sessionDigest`. A bigger model here buys only latency and cost.

**Off this axis (unchanged):** `voiceTranscribe` (`whisper-1`) and `imageGen` (`gpt-image-1`) are pinned to the `openai` provider for endpoints OpenRouter doesn't serve.

The strong/mid model ids were verified against the live OpenRouter model list on 2026-07-13.

## Consequences

- The reasoning-heavy nodes are no longer capped by the cheapest tier; the Coach and the Core can be as perceptive as the product needs.
- Cost and latency stay concentrated where they earn their keep — the frequent, mechanical nodes stay on the mini.
- The Settings "AI models & keys" list reads from `aiNodeSummary()`, so it reflects the new per-node models automatically with no UI change.
- Provider stays `openrouter` for every re-pointed node — only the `model` string changed — so key resolution, fallback, and the local-model path (see [ADR 0003](0003-openrouter-for-generative-ai.md)) are untouched. A person's own OpenRouter key covers Anthropic models the same as OpenAI ones.
- Model ids drift; when a slug changes or a better/cheaper model lands, re-tiering remains a one-line-per-node config edit. The canonical reference stays [`../architecture/ai-layer.md`](../architecture/ai-layer.md).
