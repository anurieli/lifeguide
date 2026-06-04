// ============================================================================
// THE AI CONFIG HUB  —  every AI "node" in LifeGuide is defined here, in one file.
// ============================================================================
// To change which model a task uses, or move a task to a local model, edit the
// TASKS table below. Nothing else needs to change. See ./README.md for the how.
//
// Two concepts:
//   PROVIDERS = WHERE a model runs (a base URL + which env var holds the key).
//   TASKS     = each distinct AI job in the app, each pointing at a provider + model.
// Everything is OpenAI-compatible, so OpenRouter, OpenAI-direct, and a local
// router (LM Studio / Ollama / vLLM) all use the same client, just a different
// baseURL and key.
// ============================================================================

export type ProviderId = "openrouter" | "openai" | "local";

export type ProviderConfig = {
  label: string;
  baseURL?: string; // omit for OpenAI-direct (SDK default)
  keyEnv: string; // the Convex env var holding the API key for this provider
  /** When true, a missing key is fine (local routers usually ignore the key). */
  keyOptional?: boolean;
  defaultHeaders?: Record<string, string>;
};

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  // Preferred gateway: one key, hundreds of models, model ids are "vendor/model".
  openrouter: {
    label: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    keyEnv: "OPENROUTER_API_KEY",
    defaultHeaders: { "HTTP-Referer": "https://lifeguide.app", "X-Title": "LifeGuide" },
  },
  // OpenAI-direct fallback: model ids are bare ("gpt-4o-mini").
  openai: {
    label: "OpenAI",
    keyEnv: "OPENAI_API_KEY",
  },
  // A local model or local router exposing an OpenAI-compatible endpoint.
  // Point LOCAL_AI_BASE_URL at it (e.g. http://localhost:1234/v1 for LM Studio,
  // http://localhost:11434/v1 for Ollama). The key is usually ignored.
  local: {
    label: "Local",
    baseURL: process.env.LOCAL_AI_BASE_URL ?? "http://localhost:1234/v1",
    keyEnv: "LOCAL_AI_API_KEY",
    keyOptional: true,
  },
};

export type TaskConfig = {
  /** Human label shown in Settings so every AI node is visible in one place. */
  label: string;
  provider: ProviderId;
  /** Model id in the form the chosen provider expects. */
  model: string;
  temperature: number;
  /** Whether this task is actually wired into the app yet. */
  wired: boolean;
  system?: string;
};

// ----------------------------------------------------------------------------
// THE AI NODES. Add, remove, or re-point any of these. `provider` + `model` are
// the two dials. To use a local model for distillation, for example, set
// distill.provider = "local" and distill.model = "llama-3.1-8b-instruct".
// ----------------------------------------------------------------------------
export const TASKS: Record<string, TaskConfig> = {
  // Capture -> {title, essence, pillars}. Live.
  distill: {
    label: "Distill a capture",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.4,
    wired: true,
    system: `You distill a captured artifact (a quote, note, link, or image caption) for a personal life-mapping app, where someone is slowly figuring out who they are and where they're going.

Return ONLY a JSON object, no prose, in this exact shape:
{"title":"a 3-6 word noun phrase naming the idea","essence":"1-2 plain, warm sentences on what the person likely found meaningful here and why it might matter to who they're becoming","pillars":["0-3 lowercase tags drawn ONLY from: lifestyle, health, relationships, financial, growth, money, spirit"]}

Be concrete and human. Never invent facts the input doesn't imply. If the input is thin, keep the essence short and honest.`,
  },

  // The Coach's conversational reply. Live (system prompt is built per-call in coach.ts).
  coachReply: {
    label: "Coach reply",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.7,
    wired: true,
  },

  // Re-synthesize the Mirror from accumulated signal (the core-curation pass). Proposed.
  // A stronger model is the natural choice here; flip the model when this lands.
  curate: {
    label: "Core curation",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.3,
    wired: false,
  },

  // Choose the next adaptive Journal prompts from Core + Goals. Proposed.
  journalPrompts: {
    label: "Journal prompts",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.6,
    wired: false,
  },

  // OpenAI Realtime API session for voice-based onboarding interview. Live.
  // GA realtime model id (the Beta `gpt-4o-mini-realtime-preview` was retired and now
  // returns model_not_found at the /v1/realtime/calls SDP exchange). `gpt-realtime-mini`
  // is the GA "mini" tier; swap to `gpt-realtime` for the stronger model.
  voice: {
    label: "Voice interview (realtime)",
    provider: "openai",
    model: "gpt-realtime-mini",
    temperature: 0.7,
    wired: true,
  },

  // Synthesize completed voice interview transcript into blueprint answers. Live.
  synthesis: {
    label: "Interview synthesis",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.3,
    wired: true,
  },

  // VoiceField transcription: a short audio segment -> text, via Whisper. Live.
  // OpenRouter has no audio endpoint, so this pins the openai provider directly
  // (key = the user's saved OpenAI key, else the deployment's OPENAI_API_KEY). The
  // client records in ~4s chunks and calls convex/voice.transcribe per chunk; the
  // on-device Web Speech transcript is the disconnect fallback. temperature is
  // unused by the audio API but the TaskConfig shape requires it.
  voiceTranscribe: {
    label: "Voice · transcribe (Whisper)",
    provider: "openai",
    model: "whisper-1",
    temperature: 0,
    wired: true,
  },

  // VoiceField: clean a raw spoken transcript into what the field is asking for. Live.
  // (The raw transcript comes from voiceTranscribe/Whisper, with Web Speech as the
  // live-display + fallback — see components/voice. This is the server "shape" pass only.)
  // System prompt is built per-call from the field metadata.
  voiceShape: {
    label: "Voice · shape transcript",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.3,
    wired: true,
  },

  // VoiceField Prompt Mode: contextual "say this next" nudges for the field being spoken into. Live.
  voicePrompts: {
    label: "Voice · prompt mode",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.7,
    wired: true,
  },

  // Brain dump: segment a free-form spoken dump into distinct atomic thoughts.
  // Returns JSON {"segments": ["...", "..."]}. A single-thought dump yields one element.
  brainDumpSplit: {
    label: "Brain dump · split",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.3,
    wired: true,
    system: `You receive a free-form spoken brain dump and split it into the distinct, atomic thoughts the person expressed. Each thought will become a separate capture on their vision board.

Return ONLY a JSON object in this exact shape:
{"segments": ["thought one as a clean sentence or two", "thought two", ...]}

Rules:
- Split on clear topic boundaries. One sentence per thought is ideal; keep a thought together if two sentences are inseparable.
- Preserve the person's exact words and meaning. Do NOT summarise, paraphrase beyond light cleanup, or add anything.
- Remove verbal filler ("um", "like", "you know"), false starts, and stutters.
- If the entire dump is one thought, return a single-element array.
- Minimum useful segment length: ~5 words. Merge very short fragments into the nearest related thought.
- Do NOT return empty segments.`,
  },
};

export type TaskId = string;

// Back-compat alias: older call sites referenced `AI.distill`. Keep them working.
export const AI = TASKS;

/** Safe, secret-free view of the registry for the Settings UI ("see all AI nodes"). */
export function aiNodeSummary() {
  return Object.keys(TASKS).map((id) => {
    const t = TASKS[id];
    return {
      id,
      label: t.label,
      provider: t.provider,
      providerLabel: PROVIDERS[t.provider].label,
      model: t.model,
      wired: t.wired,
    };
  });
}
