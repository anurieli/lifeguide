# VoiceField

**Status:** built (v1) · **Element of:** spine (a shared input primitive, not a surface) · **Owns:** nothing (view + write-through; persists via each host field's existing path)

> One voice-capable input that drops into any text field in LifeGuide: tap to speak, see a live transcript, and let the Coach shape your words into what the field is actually asking for — with contextual "say this next" prompts floating around it.

## 1. Purpose

LifeGuide's soul is "talk, don't operate." Typing is friction, especially for the lost person who finds it easier to *say* what's on their mind than to write it cleanly. VoiceField pushes "talk, don't operate" down to the level of a single field: anywhere the app asks a question, you can answer it out loud. The raw, rambly spoken answer is then shaped into clean text fitted to the question, so speaking costs the person nothing in quality. It is the calm, manual counterpart to the conversational Coach — no chat required, just a mic on the field you're already looking at.

## 2. User-facing behavior

A field starts as an ordinary text box with a quiet mic in the corner (the mic appears only if the browser supports speech recognition; otherwise the field is just a normal textarea).

Happy path:
1. The person taps the mic. The field morphs into a recording surface: a live, reactive waveform and a single breathing dot. No timer, no buttons.
2. As they speak, words stream in live (committed words solid, in-flight words ghosted). Inside the surface, **Prompt Mode** shows **one** short, contextual suggestion at a time of what they could say next — drawn from the question and what the app knows about them, refreshed as they talk and rotated gently so only a single nudge is ever on screen.
3. When they're done, they **tap the waveform** (or the explicit finish button beside it). The surface shows a brief "understanding what you mean…" while the transcript is shaped.
4. The cleaned answer lands back in the field, editable and saved through the field's normal save path, with a small "✓ shaped from what you said · show raw" note. One tap swaps between the shaped version and their exact raw words. Editing by hand dismisses the note.

Manual and Coach paths: VoiceField is the **manual** voice path (the person drives). It is independent of the Coach dock, which remains the conversational path. The two never block each other.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Type | Person types in the idle field | Standard controlled input; calls `onChange`, persists via host `onCommit` on blur | Manual | host field's store |
| Begin speaking | Tap the mic | Starts client-side Web Speech recognition; switches to the recording surface | Manual | none (audio stays on device) |
| Live transcribe | Speaking | `useSpeechRecognition` streams committed + interim words into the UI | Manual | none |
| Prompt Mode | On start, then ~2.5s after each pause | `voice.prompts` generates contextual suggestions from field metadata + Mirror; the UI shows one at a time, rotating | Manual (AI-assisted) | reads Mirror via Context Bus |
| Finish | Tap the waveform or the finish (■) button | Stops recognition, captures the full raw transcript | Manual | none |
| Shape | After finish | `voice.shape` cleans the raw transcript to fit the field's `intent`; result written via `onChange`/`onCommit` | Manual (AI-assisted) | host field's store |
| Show raw / shaped | Tap the toggle after shaping | Swaps the field value between the cleaned text and the exact raw words | Manual | host field's store |

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
- **shaped (back to idle)** — field holds the cleaned text; the "shaped · show raw" affordance is present.
- **shaped→raw** — same as above, field showing the exact raw words; toggle reads "show shaped".

## 6. Edge cases

- **Unsupported browser** (no Web Speech): the mic is not rendered; the field is a plain, fully functional textarea. Nothing breaks.
- **Mic permission denied** (`not-allowed`): listening stops and the status line reads "I can't hear the mic — check the browser's mic permission." The person can still type.
- **Engine idle timeout:** Web Speech ends sessions periodically; the hook auto-restarts while the person still intends to listen, so long pauses don't drop the session.
- **Shape pass fails / offline:** `voice.shape` falls back to the raw transcript — the answer is never lost.
- **Prompt pass fails:** `voice.prompts` returns `[]`; Prompt Mode simply shows nothing (ambient, never blocking, never an error toast).
- **Existing text in the field:** a voice take is **appended** (newline-joined) to whatever was already there, never destructive. The show-raw/shaped toggle swaps only the spoken portion.
- **Empty transcript:** shaping of empty input returns empty; nothing is written.
- **Manual edit after shaping:** dismisses the "shaped" relationship (the raw/shaped toggle disappears), since the field is now hand-authored.

## 7. AI involvement

Two live server tasks (`convex/ai/config.ts`), both via `aiForTask` and routed through OpenRouter (per-profile key if set, else env), defined in `convex/voice.ts`:
- **`voiceShape`** (temp 0.3) — raw transcript + field `question`/`descriptor`/`intent` → cleaned, intent-fitted text. Framed as a *silent text editor* (not a chatbot) with a strict output contract + one-shot example: returns ONLY the rewritten first-person answer, never a preamble/greeting/meta sentence, never adds ideas the person didn't say, returns the input unchanged if empty/unintelligible.
- **`voicePrompts`** (temp 0.7, JSON mode) — field metadata + Mirror → up to 3 short next-thought nudges.

**Transcription is not server AI** — it is the browser's on-device Web Speech API (no audio leaves the device, no cost). See [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) role 6.

## 8. Data touched

VoiceField owns no tables. It reads the **Mirror** (`mirror.assemble`) for Prompt Mode context, and writes only through the host field's callbacks into that field's existing store (`interactions`, `coreResponses`, or onboarding-local → `captures`). See [`../../architecture/data-model.md`](../../architecture/data-model.md). No schema change was needed for v1.

## 9. Open questions

1. **Prompt Mode cadence** — refresh-on-pause (current) vs. a steadier cycle; tune against real latency/cost once observed.
2. **Multi-take semantics** — appending successive voice takes is safe but can get long; a future "replace vs. add" choice may be warranted on short fields.
3. **Language** — fixed `en-US` in v1; field- or settings-driven locale later.
4. **Whisper upgrade path** — when cross-browser fidelity matters, add a server `voiceTranscribe` task (record → Whisper) behind the same component, selected per `config.ts`. Component contract is already medium-agnostic.
5. **Compact (Coach dock) variant** — implemented in the component but not yet wired into `CoachDock`; do when voice-to-Coach is prioritized.
