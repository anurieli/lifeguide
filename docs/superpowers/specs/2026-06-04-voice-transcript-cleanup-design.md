# Voice transcript cleanup — design

**Date:** 2026-06-04
**Branch:** `voice-transcript-cleanup`
**Status:** approved design, ready to plan
**Feature doc:** [`docs/product/features/interview.md`](../../product/features/interview.md)

## Problem

The Coach-led voice onboarding interview produces a transcript that visually shatters into fragments. Two distinct glitches, observed live:

1. **The user's side fragments into tiny bubbles.** One continuous thought ("Oh" / "This is um like" / "I guess" / "When I'm taking charge of something big" / "That's what I feel the most") renders as five separate bubbles instead of one cohesive turn.

2. **The Coach repeats itself.** A truncated opener ("That's a great insight. So") is immediately followed by the full version ("That's a great insight. It sounds like you feel energized when you're leading…"). The abandoned fragment stays in the transcript as its own bubble.

The transcript is the raw material the Core/blueprint synthesis reads, and it is shown to the user live. Both glitches make a calm, reflective interview feel broken.

## Root cause

- **Fragmentation:** `convex/ai/voice/openaiRealtime.ts` mints the OpenAI Realtime session with **no `turn_detection` config**, so it falls back to default server VAD, which ends the user's turn on *any* short silence. Each silence commits a new input item → one `conversation.item.input_audio_transcription.completed` event → one `appendTurn` call (`components/onboarding/VoiceInterview.tsx:252`) → one bubble. Natural mid-thought pauses ("um…", "like…") become message breaks.

- **Coach repeat:** a barge-in artifact. The user makes a sound while the Coach is speaking; with interruption enabled, the Coach's in-flight response is cut, its truncated `response.output_audio_transcript.done` still fires and commits, then the Coach restarts and emits a second, fuller `…transcript.done`. The Coach side is **not** VAD-segmented — one successful spoken response emits exactly one `transcript.done`. So two Coach `transcript.done` events with no user turn between them always mean a restart, never a legitimate second turn (the Coach asks one question, then waits).

## Goals

- A whole spoken thought from the user commits as **one** transcript turn → one bubble.
- A barge-in-restarted Coach turn collapses to the single, fuller version.
- No added latency budget, no LLM in the path, no schema change.

## Non-goals (YAGNI)

- Display-time coalescing of arbitrary same-role bubbles — unnecessary once the source is fixed.
- Any LLM "rewrite the transcript" pass — it would alter the user's own words, which is wrong for a "true self" blueprint.
- Changing the user's ability to barge in (we keep `interrupt_response: true`).

## Design

Two independent parts. Part 1 fixes the user-side fragmentation at the source; Part 2 cleans up the Coach-repeat artifact at the storage layer.

### Part 1 — Turn detection on the Realtime session (source fix)

In `convex/ai/voice/openaiRealtime.ts`, add `turn_detection` under the existing `session.audio.input` block (confirmed location for the GA Realtime API — turn detection lives under `session.audio.input.turn_detection`, not top-level):

```ts
audio: {
  input: {
    transcription: { model: "gpt-realtime-whisper" },
    turn_detection: {
      type: "semantic_vad",
      eagerness: "auto",        // medium — tolerates "um…/like…" pauses; ~4s max patience
      create_response: true,    // Coach still auto-replies when the user finishes
      interrupt_response: true, // user can still barge in
    },
  },
  output: { voice: "alloy" },
},
```

`semantic_vad` uses a classifier to judge whether the user is *actually done speaking* rather than ending the turn on a fixed silence timer, which is exactly what collapses the "Oh… this is um, like… I guess…" fragments into one committed turn. `eagerness: "auto"` (= medium, ~4s max wait) is the balanced setting chosen during brainstorming.

No client change is required: the existing `…input_audio_transcription.completed` handler simply fires once per whole thought instead of once per pause.

### Part 2 — Coach-repeat de-dup (storage layer)

Two mutations build the transcript array today and must behave identically: `appendTurn` (`convex/interview.ts:122`, in-app path) and `appendTurnByToken` (`convex/interview.ts:296`, phone path). To stay DRY, extract a single pure helper and use it in both.

**New pure helper** (no DB, no auth — trivially unit-testable), e.g. in `convex/lib/transcript.ts`:

```ts
type Turn = { role: "coach" | "user"; questionKey?: string; text: string; at: number };

const COACH_RESTART_WINDOW_MS = 15_000;

/**
 * Append `next` to `transcript`, except: if `next` is a Coach turn and the last
 * turn is also a Coach turn within COACH_RESTART_WINDOW_MS (i.e. two Coach turns
 * with no user turn between them), treat it as a barge-in restart and REPLACE the
 * last turn with `next` (the fuller, later text) instead of appending.
 */
export function appendTranscriptTurn(transcript: Turn[], next: Turn): Turn[] {
  const last = transcript[transcript.length - 1];
  const isCoachRestart =
    next.role === "coach" &&
    last?.role === "coach" &&
    next.at - last.at <= COACH_RESTART_WINDOW_MS;
  if (isCoachRestart) {
    return [...transcript.slice(0, -1), next];
  }
  return [...transcript, next];
}
```

Both mutations replace their inline `transcript: [...session.transcript, turn]` with `transcript: appendTranscriptTurn(session.transcript, turn)`.

**Why "replace the last Coach turn" is safe:** the Coach asks one question and waits, so it never legitimately emits two consecutive turns without an intervening user turn. The time window (15s) further guards against collapsing two genuinely separate Coach utterances far apart; a real restart happens within ~1–2s. Keeping the *later* turn is correct because the restart's full text always arrives after the truncated fragment.

## Data flow (after the change)

```
mic → Realtime (semantic_vad) → ONE input_audio_transcription.completed per thought
    → appendTurn(user) → appendTranscriptTurn() appends → one user bubble

Coach response → response.output_audio_transcript.done
    → appendTurn(coach) → appendTranscriptTurn():
        last turn coach & <15s & no user between → REPLACE (drop the truncated restart)
        otherwise → append
```

## Edge cases

- **Two real Coach turns >15s apart with no user between** (unlikely given turn-taking): both kept — correct, window prevents false collapse.
- **Coach turn following a user turn:** `last.role === "user"` → always appended, never collapsed.
- **First turn in the session is a Coach greeting:** `last` is undefined → appended.
- **Rapid double barge-in (truncated, truncated, full):** each new Coach turn replaces the previous within the window → collapses to the final full text.
- **`semantic_vad` unsupported by the model/endpoint:** mint would error; out of scope here, but worth a manual check on the chosen model. Server VAD with a long `silence_duration_ms` is the documented fallback if needed.

## Testing strategy

TDD on the pure helper (the only branching logic):

1. Empty transcript + any turn → appended.
2. Last turn is `user`, next is `coach` → appended (no collapse).
3. Last turn is `coach`, next is `coach`, within window → **replaced** (length unchanged, text = next).
4. Last turn is `coach`, next is `coach`, outside window → appended.
5. Last turn is `coach`, next is `user` → appended.
6. Restart chain (coach, coach, coach within window) → single final coach turn.

The VAD config change (Part 1) is verified manually in the live interview: speak a multi-pause sentence and confirm it lands as one bubble, and confirm a barge-in no longer leaves a truncated Coach fragment behind. Logged to `TO-CHECK.md`.

## Docs to update (same change)

- `docs/product/features/interview.md` — document turn-detection behavior (semantic VAD, user-finishes-then-Coach-replies, barge-in) and the Coach-restart de-dup rule.
- `CHANGELOG.md` — entry naming the docs touched (per repo rule).

## Open questions

- Does the pinned Realtime model accept `semantic_vad`? Confirm on first live test; fall back to `server_vad { silence_duration_ms: ~1000 }` if not.
