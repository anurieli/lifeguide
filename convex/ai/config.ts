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
{"title":"a 3-6 word noun phrase naming the idea","essence":"1-2 plain, warm sentences on what the person likely found meaningful here and why it might matter to who they're becoming","pillars":["0-3 lowercase tags drawn ONLY from: lifestyle, health, relationships, financial, growth, money, spirit"],"board_worthy":true or false,"board_reason":"one short line saying why (or why not)"}

board_worthy is the vision-board sieve: true ONLY if this is a piece of the life this person wants — an aspiration, a want, a dream, a place, a way of living, a person they're becoming, an image of their future. false for everything ambient: logistics, to-dos, work notes, instructions or prompts written to a computer or a person, technical or app-development talk, venting, and plain diary accounts of what happened. When unsure, say false — the board is sacred, not a catch-all.

Be concrete and human. Never invent facts the input doesn't imply. If the input is thin, keep the essence short and honest.`,
  },

  // The Coach's conversational reply. Live (system prompt is built per-call in coach.ts).
  // The Coach IS the product's power tool — it reasons over the person's full context and
  // must be perceptive and warm, not generic. Sonnet is the right tier (opus latency would
  // hurt a per-turn chat); it runs every conversational turn, so we don't go higher.
  coachReply: {
    label: "Coach reply",
    provider: "openrouter",
    model: "anthropic/claude-sonnet-5",
    temperature: 0.7,
    wired: true,
  },

  // Re-synthesize the Mirror from accumulated signal (the core-curation pass). Proposed.
  // This is the deepest synthesis in the app — it writes "who you are" from all accumulated
  // signal — and it runs rarely, so a frontier model is the natural (and affordable) choice.
  // Ariel's pick (2026-07-13): OpenAI's gpt-5.6-terra tier. Unwired, so this is provisioned
  // ahead of wiring; A/B against anthropic/claude-opus-4.8 when the pass lands.
  curate: {
    label: "Core curation",
    provider: "openrouter",
    model: "openai/gpt-5.6-terra-pro",
    temperature: 0.3,
    wired: false,
  },

  // Choose the next adaptive Journal prompts from Core + Goals. Proposed.
  // Must feel perceptive and personal, not templated — a strong reasoning model earns its keep.
  journalPrompts: {
    label: "Journal prompts",
    provider: "openrouter",
    model: "anthropic/claude-sonnet-5",
    temperature: 0.6,
    wired: false,
  },

  // The daily tidbit: surface ONE real, existing inspirational quote for the morning
  // scroll, chosen to fit who this person is (their Core) and to vary by the day. Runs
  // at most once per person per day (cached in dailyTidbits), so a cheap, fast model is
  // exactly right — Ariel's pick (2026-07-15): Haiku. It is a retrieval/curation task,
  // not deep reasoning. Returns JSON {"quote","author"}. Live (convex/ai/dailyQuote.ts).
  dailyQuote: {
    label: "Daily quote (tidbit)",
    provider: "openrouter",
    model: "anthropic/claude-haiku-4.5",
    temperature: 0.8,
    wired: true,
    system: `You surface ONE real, widely-attributed inspirational quote for a person using a personal life-mapping app, chosen to resonate with who they are and where they're headed.

Return ONLY a JSON object, no prose, in this exact shape:
{"quote":"the exact words of a real, existing quote","author":"the person who said or wrote it"}

Rules:
- Use REAL quotes by real people (thinkers, writers, athletes, leaders, philosophers). Never invent a quote or an attribution. If unsure of the author, use "Unknown" rather than guessing a famous name.
- Choose one that speaks to the person's stated values, themes, and goals — earned resonance, not a generic platitude.
- Keep it short: one or two sentences at most.
- Vary day to day. Avoid anything in the "recently shown" list.
- No markdown, no quotation marks inside the "quote" value, no trailing attribution inside "quote".`,
  },

  // OpenAI Realtime API session for voice-based onboarding interview. Live.
  // GA realtime model id (the Beta `gpt-4o-mini-realtime-preview` was retired and now
  // returns model_not_found at the /v1/realtime/calls SDP exchange). `gpt-realtime-mini`
  // is the GA "mini" tier — cheap + fast, Ariel's pick (2026-07-13); swap to
  // `gpt-realtime` if the onboarding conversation quality ever needs the full model.
  voice: {
    label: "Voice interview (realtime)",
    provider: "openai",
    model: "gpt-realtime-mini",
    temperature: 0.7,
    wired: true,
  },

  // Synthesize completed voice interview transcript into blueprint answers. Live.
  // One-shot and high-stakes — this becomes the person's first Core — so a strong model here
  // is cheap insurance against a weak first impression. Runs once per onboarding.
  synthesis: {
    label: "Interview synthesis",
    provider: "openrouter",
    model: "anthropic/claude-sonnet-5",
    temperature: 0.3,
    wired: true,
  },

  // The Center: one isolated per-pillar synthesis that files a Listener transcript into
  // the file system on the human. Runs once per pillar per session (always fans out), so
  // a cheap-but-capable model is the right default here. Live. See convex/center.ts.
  center: {
    label: "Center · per-pillar filing",
    provider: "openrouter",
    model: "anthropic/claude-haiku-4.5",
    temperature: 0.3,
    wired: true,
  },

  // VoiceField transcription: a short audio segment -> text. Live.
  // OpenRouter has no audio endpoint, so this pins the openai provider directly
  // (key = the user's saved OpenAI key, else the deployment's OPENAI_API_KEY). The
  // client records in ~4s chunks and calls convex/voice.transcribe per chunk; the
  // on-device Web Speech transcript is the disconnect fallback. `gpt-4o-transcribe`
  // replaced `whisper-1` (2026-07-13): whisper is OpenAI's 2022 model and
  // gpt-4o-transcribe beats it on word-error-rate — the quality pick. temperature is
  // unused by the audio API but the TaskConfig shape requires it.
  voiceTranscribe: {
    label: "Voice · transcribe",
    provider: "openai",
    model: "gpt-4o-transcribe",
    temperature: 0,
    wired: true,
  },

  // VoiceField: clean a raw spoken transcript into what the field is asking for. Live.
  // (The raw transcript comes from voiceTranscribe, with Web Speech as the
  // live-display + fallback — see components/voice. This is the server clean pass only.)
  // System prompt is built per-call from the field metadata.
  // Renamed from `voiceShape` 2026-07-13 (Ariel: "cleanVoice") — action convex/voice.cleanVoice.
  cleanVoice: {
    label: "Voice · clean transcript",
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

  // Vision board: generate an image from a prompt (the "/" AI mode + right-click menu).
  // Pinned to the openai provider — OpenRouter has no /images/generations endpoint — so it
  // uses the user's saved OpenAI key, else the deployment's OPENAI_API_KEY. `gpt-image-1` is
  // OpenAI's current image model (newer accounts no longer expose the dall-e-* ids at all);
  // it returns base64, which the action (convex/ai/imageGen.ts) handles alongside url, so the
  // model is the only dial. temperature is unused by the images API but the shape requires it.
  imageGen: {
    label: "Generate image (vision board)",
    provider: "openai",
    model: "gpt-image-1",
    temperature: 0,
    wired: true,
  },

  // Ingest: turn a captured image into text for the person's file (what it shows +
  // any visible text). Vision-capable chat model; runs once per image capture. Live.
  extractImage: {
    label: "Ingest · read an image",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.2,
    wired: true,
    system: `You read one image a person saved into their personal life-mapping app and turn it into text that preserves why it might matter to them.

Return plain text (no JSON, no markdown headers), 2-8 sentences:
1. What the image shows, concretely.
2. Transcribe ALL legible text in the image verbatim (signs, notes, screenshots, captions). If none, say nothing about text.
3. If the image clearly suggests a mood, aspiration, or aesthetic, name it in one short sentence.

Never invent details you cannot see. Never address the person.`,
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

  // (The experimental brain-dump idea-graph lab and its `brainDumpGraph` node were
  // deleted 2026-07-13 — the lab was unreachable (no route or nav) and Ariel tossed it.
  // The shipped brain-dump flow is `brainDumpSplit` above. See ADR 0016.)

  // Session digest: title + one-line summary for a living journal entry, from its
  // captures' text in order. Debounced ~30s after each member capture's ingest. Live.
  sessionDigest: {
    label: "Session · digest",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.4,
    wired: true,
    system: `You title one journal entry from a personal life-mapping app. The entry is a person's raw session: spoken passages, typed notes, photo descriptions, in the order they happened.

Return ONLY a JSON object, no prose, in this exact shape:
{"title":"a 3-7 word noun phrase naming what the entry is about","summary":"one plain, warm sentence (max ~22 words) saying what was on their mind"}

Ground both strictly in the text. Never invent facts, never address the person, never praise. If the entry is thin, keep it short and honest.`,
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
