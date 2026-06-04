# 0005. VoiceField transcription: chunked Whisper (server) with Web Speech as live caption + fallback

**Status:** accepted (2026-06-04)

---

## Context

VoiceField v1 transcribed entirely on-device with the browser's Web Speech API (`useSpeechRecognition`). That was free, instant, and private, but it has two real limits:

1. **Coverage.** Web Speech is Chrome/Edge-flavored. Firefox and desktop Safari don't expose it, so on those browsers the mic simply never appeared and the field fell back to typing — exactly the friction VoiceField exists to remove.
2. **Fidelity.** On-device recognition is noticeably weaker than Whisper on accents, domain words, and noisy rooms. Since the spoken answer feeds the `voiceShape` pass and then becomes a person's Core/Today entry, transcript quality matters.

The feature doc had already reserved the upgrade (`voice-field.md` Open Question #4: "add a server `voiceTranscribe` task behind the same component"). This ADR records how it was actually built.

A constraint shaped the design: the answer must **never be lost** if the network or a chunk fails mid-take (the soul rule "talk, don't operate" only works if speaking feels safe).

---

## Decisions

### 1. Whisper is the source of truth; Web Speech becomes the live caption + fallback

Both transcribers run at once while listening:

- **Web Speech** (`useSpeechRecognition`, unchanged) drives the instant on-screen caption and is the **fallback** transcript.
- **Chunked Whisper** (`useWhisperRecorder`, new) is the **authoritative** transcript that becomes the answer.

On finish, the raw transcript is Whisper's; if Whisper produced nothing (unsupported, no key, or every chunk dropped), the on-device Web Speech transcript is used instead. Then `voiceShape` runs as before. The mic now appears if **either** layer is available, so Firefox/Safari (no Web Speech) still get voice — they just lose the instant caption (Whisper text shows a few seconds behind as segments confirm).

### 2. Chunk by stop+restart, not by timeslice

A single `MediaRecorder` with a `timeslice` emits chunks where only the first carries the container header — the rest are individually undecodable, so Whisper can't transcribe them in isolation. Instead, `useWhisperRecorder` **stops and restarts** the recorder every ~4s; each segment is then a complete, self-contained file. Segments are dispatched with a monotonic index and reassembled in order, so out-of-order completion doesn't scramble the transcript. The sub-millisecond gap between segments is inaudible for dictation, and Web Speech runs continuously underneath regardless.

This delivers the "captures things as they come in" behavior asked for, and makes a dropped chunk cost only itself rather than the whole take.

### 3. openai-direct, registered in the AI hub as `voiceTranscribe`

Whisper has no OpenRouter endpoint, so the `voiceTranscribe` task in `convex/ai/config.ts` pins `provider: "openai"`, `model: "whisper-1"`. It resolves its key the same way every other AI node does (`aiForTask`): the person's saved OpenAI key if present, otherwise the deployment's `OPENAI_API_KEY` (already required for the realtime onboarding voice, per ADR 0004). Keeping it in the hub means it shows up in the Settings "all AI nodes" view like everything else.

### 4. `convex/voice.ts` becomes a `"use node"` module

Whisper upload needs `Buffer` + the OpenAI SDK's `toFile`, which require the Node runtime. Rather than split the file, the whole `convex/voice.ts` is marked `"use node"`; `shape` and `prompts` run there too. They are plain actions (chat completions over fetch + `runQuery`) that behave identically in the Node runtime, so the move is functionally transparent. The tradeoff is a slightly higher cold-start on those two actions, acceptable for an interactive, low-frequency surface.

---

## Consequences

- **Audio now leaves the device** — in transient ~4s chunks sent to `voice.transcribe`, never stored (passed as Convex `bytes`, transcribed, discarded). The on-device Web Speech layer stays local. This is the privacy delta from v1 and is documented in `voice-field.md` §7–8.
- **Cost** — transcription is no longer free; it's billed Whisper minutes per take. Acceptable for the quality and coverage gain; revisit if volume grows (a settings toggle to force on-device-only is a clean future addition).
- **`OPENAI_API_KEY` is now also required for VoiceField transcription**, not just the realtime interview. Without it, `voiceTranscribe` throws per chunk and the field silently falls back to the Web Speech transcript (still functional on Chrome/Edge; degraded to typing elsewhere).
- **Tuning levers left open** (see `voice-field.md` §9): segment length vs. latency, and whether to merge partial Whisper output with the local transcript on a mid-take disconnect (today it prefers whichever whole transcript is non-empty).
- Component contract is unchanged — every existing VoiceField mount (Today, Core, onboarding Door/Interview) gets the upgrade with no per-field code.
