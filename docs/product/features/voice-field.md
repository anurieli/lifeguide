# VoiceField

**Status:** built (v1) · **Element of:** spine (a shared input primitive, not a surface) · **Owns:** nothing (view + write-through; persists via each host field's existing path)

> One voice-capable input that drops into any text field in LifeGuide: tap to speak, see a live transcript, and let the Coach shape your words into what the field is actually asking for — with contextual "say this next" prompts floating around it.

## 1. Purpose

LifeGuide's soul is "talk, don't operate." Typing is friction, especially for the lost person who finds it easier to *say* what's on their mind than to write it cleanly. VoiceField pushes "talk, don't operate" down to the level of a single field: anywhere the app asks a question, you can answer it out loud. The raw, rambly spoken answer is then shaped into clean text fitted to the question, so speaking costs the person nothing in quality. It is the calm, manual counterpart to the conversational Coach — no chat required, just a mic on the field you're already looking at.

## 2. User-facing behavior

A field starts as an ordinary text box with a quiet mic in the corner (the mic appears if the browser can either record audio or do on-device speech recognition; with neither, the field is just a normal textarea).

Happy path:
1. The person taps the mic. The field morphs into a recording surface: a live, reactive waveform and a single breathing dot. No timer, no buttons. Two transcribers start together: the browser's **Web Speech API** for the instant on-screen caption, and a **chunked Whisper** recorder that ships ~4-second audio segments to the server as they speak.
2. As they speak, words stream in live (committed words solid, in-flight words ghosted — from Web Speech, or from Whisper segments where Web Speech is unavailable). Inside the surface, **Prompt Mode** shows **one** short, contextual suggestion at a time of what they could say next — drawn from the question and what the app knows about them, refreshed as they talk and rotated gently so only a single nudge is ever on screen.
3. When they're done, they **tap the waveform** (or the explicit finish button beside it). The surface shows a brief "understanding what you mean…" while the transcript is shaped.
4. The cleaned answer lands back in the field as **plain, regular text** — editable and saved through the field's normal save path, with no special "shaped" state or chrome. The mic returns to the corner of the (auto-grown) textarea and the box is refocused for typing.

To bail mid-recording, press **Escape**: the audio is discarded, whatever text was already in the box is kept, and the cursor returns to the box to keep typing. Pressing **Backspace** mid-recording does nothing destructive; the recording continues uninterrupted (the listening UI has no editable text field, so Backspace has nowhere to act).

Manual and Coach paths: VoiceField is the **manual** voice path (the person drives). It is independent of the Coach dock, which remains the conversational path. The two never block each other.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Type | Person types in the idle field | Standard controlled input; calls `onChange`, persists via host `onCommit` on blur | Manual | host field's store |
| Begin speaking | Tap the mic | Starts both transcribers (Web Speech caption + chunked Whisper recorder); switches to the recording surface | Manual | mic audio → server (transient) |
| Live caption | Speaking | `useSpeechRecognition` streams committed + interim words into the UI (instant). Where Web Speech is absent, the Whisper transcript shows as segments confirm | Manual | none (Web Speech is on-device) |
| Chunk transcribe | Every ~4s while speaking | `useWhisperRecorder` stops+restarts the recorder to cut a self-contained segment and calls `voice.transcribe` (Whisper) per segment; results are reassembled in order | Manual (AI) | audio bytes → `voice.transcribe` (not stored) |
| Prompt Mode | On start, then ~2.5s after each pause | `voice.prompts` generates contextual suggestions from field metadata + Mirror; the UI shows one at a time, rotating | Manual (AI-assisted) | reads Mirror via Context Bus |
| Finish | Tap the waveform or the finish (■) button | Stops both transcribers, flushes the final Whisper segment; the raw transcript is Whisper's (the on-device transcript if Whisper produced nothing) | Manual | none |
| Shape | After finish | `voice.shape` cleans the raw transcript to fit the field's `intent`; result written via `onChange`/`onCommit` | Manual (AI-assisted) | host field's store |
| Cancel | **Escape** while listening | Discards the audio + transcript, keeps the text that was already there, returns focus to the textarea | Manual | none |

## 4. Dynamics and interactions with other elements

VoiceField **owns no data**. It is a write-through input: each host field passes `value` + `onChange` (+ optional `onCommit`) and keeps full control of persistence. So the same component feeds:
- **Today** → `interactions.log` (morning "one move", evening reflection),
- **Blueprint / Core** → `core.save` (the 18 blueprint boxes),
- **Onboarding** → the Door (`Door.tsx`, → northStar + vision-seed capture) and the text interview (`Interview.tsx`, every blueprint question → `interview.appendTurn`). The realtime `VoiceInterview` is a separate spoken-conversation path; the phone composer is a chat box (future compact-variant fit).

It **draws** at act-time: `voice.prompts` pulls the **Mirror** through the Context Bus (`mirror.assemble`) so suggestions are about *this* person, not generic. It does not publish to the streams itself — the host field's existing write path is what reaches the Bus (e.g. a saved capture still distills as before).

The modular **field bundle** (`lib/voiceField.ts` `FieldMeta`: `id`, `question`, `descriptor`, `placeholder`, `intent`) is the seam: it carries the field's identity to both the person (labels) and the AI (shaping + prompts), so behavior changes per field with zero per-field code.

Relationship to the **onboarding voice interview**: separate mechanism (realtime conversation vs. per-field dictation); see [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) role 6. The onboarding rebuild reuses this exact component for its typed/Door text inputs.

## 5. States

- **idle** — text box + mic. Empty or holding a value.
- **listening** — a borderless, centered surface (no box): a minimalist waveform you can tap to finish (plus a quiet finish button with a "Tap to finish" tooltip), live transcript, a breathing dot, and one Prompt Mode suggestion at a time. The idle mic is a quiet glyph with a hover tooltip (configurable via `ctaTooltip`); the idle text box auto-grows to fit its content (no inner scrollbar).

The **rainbow comet halo** (`.vf-halo` in `globals.css`) is a reusable, strokeless rotating-rainbow border for *any* rounded element — a glowing head dragging a fading rainbow trail around the rim (gradient-angle animated via the registered `--vf-angle` custom property + the gradient-border mask trick). It is applied not to the mic but to the onboarding **on-ramp**: the Door's "I don't know" button, to magnetize the lost person into the guided interview.
- **analyzing** — waveform settles to a flat ghost line, transcript blurs, spinner + "understanding what you mean…".
- **done (back to idle)** — field holds the cleaned text as plain editable text; mic back in the textarea corner, box refocused. No special state.
- **cancelled** — Escape mid-recording returns to idle with the prior text intact, no shaping. (Backspace mid-recording does not cancel; it is a no-op in the listening view since there is no focused editable field.)

## 6. Edge cases

- **Unsupported browser** (no `MediaRecorder` *and* no Web Speech): the mic is not rendered; the field is a plain, fully functional textarea. Nothing breaks. With only one of the two, the mic still works (Whisper-only loses the instant caption; Web-Speech-only loses server-grade accuracy).
- **Mic permission denied** (`not-allowed`): listening stops and the status line reads "I can't hear the mic — check the browser's mic permission." The person can still type.
- **Whisper chunk drops / transcribe fails:** each failed segment costs only itself; the remaining segments still assemble. If Whisper produced nothing at all (every chunk failed, no key, offline), the finish falls back to the on-device Web Speech transcript — the answer is never lost.
- **Engine idle timeout:** Web Speech ends sessions periodically; the hook auto-restarts while the person still intends to listen, so long pauses don't drop the caption.
- **Shape pass fails / offline:** `voice.shape` falls back to the raw transcript — the answer is never lost.
- **Prompt pass fails:** `voice.prompts` returns `[]`; Prompt Mode simply shows nothing (ambient, never blocking, never an error toast).
- **Existing text in the field:** a voice take is **appended** (newline-joined) to whatever was already there, never destructive.
- **Empty transcript:** shaping of empty input returns empty; nothing is written.
- **After shaping:** the cleaned text is just regular text — the person can keep typing/editing it normally; nothing special to dismiss.

## 7. AI involvement

Three live server tasks (`convex/ai/config.ts`), all defined in `convex/voice.ts` and keyed via `aiForTask` (per-profile key if set, else env):
- **`voiceTranscribe`** (Whisper `whisper-1`, **openai-direct** — OpenRouter has no audio endpoint) — one short audio segment → text. Called per ~4s chunk by `useWhisperRecorder`; a too-small/near-silent segment returns `""`. Because Whisper needs `Buffer`/`toFile`, `convex/voice.ts` is a `"use node"` module (shape/prompts run there too — functionally identical).
- **`voiceShape`** (temp 0.3) — raw transcript + field `question`/`descriptor`/`intent` → cleaned, intent-fitted text. Framed as a *silent text editor* (not a chatbot) with a strict output contract + one-shot example: returns ONLY the rewritten first-person answer, never a preamble/greeting/meta sentence, never adds ideas the person didn't say, returns the input unchanged if empty/unintelligible.
- **`voicePrompts`** (temp 0.7, JSON mode) — field metadata + Mirror → up to 3 short next-thought nudges.

**Transcription is now server AI** (Whisper), with the browser's on-device Web Speech API as the live caption and the disconnect fallback. Audio leaves the device in transient chunks (sent to `voice.transcribe`, never stored); the Web Speech layer stays on-device. See [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) role 6 and [`../../decisions/0005-voicefield-chunked-whisper.md`](../../decisions/0005-voicefield-chunked-whisper.md).

## 8. Data touched

VoiceField owns no tables. It reads the **Mirror** (`mirror.assemble`) for Prompt Mode context, and writes only through the host field's callbacks into that field's existing store (`interactions`, `coreResponses`, or onboarding-local → `captures`). See [`../../architecture/data-model.md`](../../architecture/data-model.md). Audio chunks are passed to `voice.transcribe` as transient `bytes` and never persisted. No schema change was needed.

## Brain dump (Vision Board spoken entry)

A voice-first on-ramp to the Vision Board, built on VoiceField's recorder hooks (`useWhisperRecorder` + `useSpeechRecognition`) without modifying `VoiceField.tsx`. Lives in `components/voice/BrainDump.tsx`; mounted from the board toolbar (mic icon). See [`vision-board.md`](vision-board.md).

**Purpose.** Let the person speak a free-form stream of consciousness that becomes *multiple* captures (and therefore multiple nodes) without typing or manual segmentation.

**Flow.** speak → transcribe → split → distill → place.
1. The person taps the mic and speaks; dual-layer transcription runs (Whisper server-side, chunked, accurate; Web Speech for the instant live caption + fallback).
2. On stop, the transcript goes to the `voice.brainDump` action, which calls the new `brainDumpSplit` AI task (`convex/ai/splitDump.ts`; gpt-4o-mini via OpenRouter, temp 0.3, JSON `{"segments":[...]}`) to break the dump into distinct thoughts. A single-thought dump yields one segment; very short fragments are merged.
3. Each segment becomes a `captures.create` (`source: "audio"`), which auto-schedules the existing `distillCapture` pipeline in parallel.
4. The client watches the batch reactively via the new `captures.getMany` query and spiral-places each node (`placement.placeCapture`) the moment its `distilled` field lands. A ~28s timeout force-places any stragglers with raw text.
5. A brief success state, then auto-close.

**Phase machine.** `idle → recording → processing (split) → placing (watch distill, place as ready) → done`; plus `error` (retryable).

**Graceful degradation.** Split AI fails → whole transcript becomes one capture. Whisper unavailable → Web Speech transcript. Distill stalls → place raw text after timeout. Mic denied → "mic not available" rather than a crash.

**Data.** No new schema fields or tables. Captures use the existing `source: "audio"` / `rawType: "text"`.

## 9. Open questions

1. **Prompt Mode cadence** — refresh-on-pause (current) vs. a steadier cycle; tune against real latency/cost once observed.
2. **Multi-take semantics** — appending successive voice takes is safe but can get long; a future "replace vs. add" choice may be warranted on short fields.
3. **Language** — fixed `en-US` in v1; field- or settings-driven locale later.
4. ~~**Whisper upgrade path**~~ — **done.** `voiceTranscribe` (chunked Whisper) is now the primary transcriber, with Web Speech as the live caption + fallback. See §7 and ADR 0005. Remaining tuning: segment length (currently 4s) vs. latency, and whether to merge partial Whisper output with the local transcript on a mid-take disconnect (today it prefers whichever is non-empty whole).
5. **Compact (Coach dock) variant** — implemented in the component but not yet wired into `CoachDock`; do when voice-to-Coach is prioritized.
