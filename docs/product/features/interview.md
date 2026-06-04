# Interview Engine

**Status:** built (2026-06-03, branch `onboarding-rebuild`) · **Element of:** spine (serves onboarding) · **Owns:** `interviewSessions`, `experienceEvents`

> The interview engine drives a one-question-at-a-time conversation that fills the Life Blueprint, on any transport (text or voice), on any device.

---

## 1. Purpose

The interview engine is the mechanism behind onboarding. It abstracts over the transport (typed text or realtime voice) and the question-selection policy so that both arrive at the same data shape: a completed `interviewSessions` row full of transcript turns, ready for synthesis. It also provides the QR phone handoff so a desktop session can be handed to a physical phone for voice.

---

## 2. User-facing behavior

See [`onboarding.md`](onboarding.md) for the full UX flow. The engine's job is below the UX layer: picking the next question, recording answers, managing skips, and providing the Convex API that all transports write through.

---

## 3. Question-selection policy (`lib/interview/policy.ts`)

The policy is a pure function, unit-tested without any network or DB dependency.

```ts
nextQuestion(state: InterviewState): BlueprintQuestion | null
```

`InterviewState` carries three fields:
- `answered`: a `{ questionKey: content }` map derived from the transcript (latest user turn per key).
- `skipped`: the `session.skipped` array from Convex.
- `circledBack`: keys that have already been re-offered once (stored in component state for the text interview).

**Selection logic (priority order):**

1. The first question in canonical blueprint order (`lib/blueprint.ts` flat order: s1q0 through s3q4) that is not filled and not in `skipped`.
2. If all fresh questions are exhausted: the first question that is in `skipped` but not in `circledBack` (single circle-back per key).
3. If both lists are empty or every skipped key is already in `circledBack`: return `null` (interview complete).

This implements the "without being too pushy" rule from the spec: every key is offered twice at most (once fresh, once on the circle-back), never more.

**Text interview implementation:** the `Interview` component uses `session.skipped` for the `skipped` field and a local `doubleSkipped` state for `circledBack`. When the user skips a question that is already in `session.skipped` (meaning it is a circle-back re-offer), the key is added to `doubleSkipped`, which the policy sees as `circledBack` and will never offer again.

---

## 4. Experience registry (`lib/experiences/index.ts`)

A typed, swappable registry of onboarding experiences. Adding a new experience = add one descriptor object, no other changes.

```ts
type Experience = {
  id: "text-interview" | "voice-interview";
  label: string;
  transport: "text" | "voice";
  description: string;
};
```

`getExperience(id)` looks up by id. The `Onboarding` orchestrator renders cards for each experience and routes to the matching transport component.

---

## 5. Convex API (`convex/interview.ts`)

All mutations and queries enforce ownership (every session carries `userId`; every auth-gated call checks `session.userId === authUserId`).

### Public mutations

| Function | Args | What it does |
|---|---|---|
| `start` | `experienceId, device` | Inserts an `interviewSessions` row (`status:"active"`, empty transcript and skipped); logs a `"started"` event; returns the session id. |
| `appendTurn` | `sessionId, role, questionKey?, text` | Appends a turn to `transcript` via `appendTranscriptTurn` (collapses back-to-back Coach restarts, see §6); if `role === "user"`, logs an `"answered"` event. Ownership-checked. |
| `skip` | `sessionId, questionKey` | Adds `questionKey` to `session.skipped` (deduplicated); logs a `"skipped"` event. Ownership-checked. |
| `end` | `sessionId, status ("completed"/"abandoned")` | Patches `status` and `endedAt`; logs the matching event. Ownership-checked. |
| `issueJoinToken` | `sessionId` | Owner-only. Generates a random token (two concatenated `crypto.randomUUID()` calls), stores `sha256(token)` as `joinTokenHash` with a 10-minute expiry. Returns the raw token (never stored). |
| `markJoined` | `sessionId, token` | Public (no auth). Validates token against `joinTokenHash` and expiry; logs a `"qr_scanned"` event. |
| `appendTurnByToken` | `sessionId, token, role, questionKey?, text` | Public. Validates token; appends turn to transcript via `appendTranscriptTurn` (same Coach-restart de-dup as `appendTurn`); logs `"answered"` if user turn. |
| `endByToken` | `sessionId, token, status` | Public. Validates token; patches status/endedAt; logs event. |

### Internal mutation

| Function | What it does |
|---|---|
| `logEvent` | Inserts a row into `experienceEvents`. Used by other modules (synthesis, voice). |

### Public query

| Function | What it does |
|---|---|
| `get` | Returns the session row if it belongs to the authenticated user, else `null`. |
| `joinWithToken` | Public. Validates token; returns a safe view of the session (`_id`, `experienceId`, `status`, `transcript`, `skipped`). Throws on bad/expired token. |

### Token security model

The raw join token is returned exactly once from `issueJoinToken` and embedded in the QR URL as `?t=<token>`. Only its SHA-256 hash is stored in the DB row. Public mutations verify by rehashing the incoming token and comparing. Tokens expire after 10 minutes. A session can have only one live token at a time (issuing a new one overwrites the previous hash).

---

## 6. Voice transport

### Overview

The voice transport connects the browser directly to the OpenAI Realtime API via WebRTC using an ephemeral client secret minted server-side. The long-lived `OPENAI_API_KEY` never reaches the browser.

### Server-side: voice provider abstraction (`convex/ai/voice/`)

```
convex/ai/voice/
  provider.ts       — VoiceProvider interface + getVoiceProvider()
  openaiRealtime.ts — OpenAIRealtimeAdapter (implements VoiceProvider)
  index.ts          — mintRealtimeSession Convex action
```

**`VoiceProvider` interface:**
```ts
interface VoiceProvider {
  mint(instructions: string): Promise<{ clientSecret: string; model: string; expiresAt: number }>
}
```

**`OpenAIRealtimeAdapter.mint()`:** calls `POST https://api.openai.com/v1/realtime/client_secrets` (the GA Realtime endpoint) with a nested `session` config: `{ type: "realtime", model, instructions, audio: { input: { transcription, turn_detection }, output: { voice: "alloy" } } }`. **Turn detection is `semantic_vad` with `eagerness: "auto"`** (plus `create_response: true` / `interrupt_response: true`): a classifier decides when the speaker is *actually finished* rather than ending the turn on any short silence, so natural mid-thought pauses ("um…", "like…") no longer shatter one spoken answer into many tiny transcript bubbles. The Coach still auto-replies when the user finishes and the user can still barge in. Returns the ephemeral key `value` as `clientSecret` and derives `expiresAt` from `expires_at`. Requires `OPENAI_API_KEY` in the Convex deployment environment. (The pre-GA `POST /v1/realtime/sessions` + `OpenAI-Beta: realtime=v1` endpoint now 404s "Invalid URL" — that change is what broke "Talk it through"; pinned by `tests/voice-mint.test.ts`.) The browser then POSTs its WebRTC SDP offer to `https://api.openai.com/v1/realtime/calls` using that ephemeral key (the model is bound to the key; the old Beta `/v1/realtime?model=…` SDP shape was retired 2026-05-12 and now 400s).

**`getVoiceProvider()`:** reads `TASKS.voice.model` from `convex/ai/config.ts` and returns an `OpenAIRealtimeAdapter` for that model. Swapping to a different realtime provider = add a new adapter class and update `getVoiceProvider()`.

**`mintRealtimeSession` action (args: `{ sessionId }`):**
1. Authenticates the caller.
2. Verifies session ownership via `api.interview.get`.
3. Calls `getVoiceProvider().mint(INTERVIEW_INSTRUCTIONS)`.
4. Logs a `"voice_connected"` event via `internal.interview.logEvent`.
5. Returns `{ clientSecret, model, expiresAt }` to the browser.

**`INTERVIEW_INSTRUCTIONS`:** instructs the model to conduct a calm blueprint interview (sections from `BLUEPRINT`), ask one question at a time, allow skips, circle back to skipped topics once, and keep a warm tone.

**AI config entries (in `convex/ai/config.ts`):**
- `voice`: `{ provider: "openai", model: "gpt-4o-mini-realtime-preview", temperature: 0.7, wired: true }`. Uses `OPENAI_API_KEY` directly (the Realtime API is not available on OpenRouter).
- `synthesis`: `{ provider: "openrouter", model: "openai/gpt-4o-mini", temperature: 0.3, wired: true }`. Used by the synthesis action.

### Client-side: `VoiceInterview` component

1. Calls `mintRealtimeSession` (via `useAction`) to get the ephemeral secret and model id.
2. Calls `navigator.mediaDevices.getUserMedia({ audio: true })` to get the mic stream, and taps it with a Web Audio `AnalyserNode` (the "you" half of the waveform).
3. Creates an `RTCPeerConnection`, adds the mic track, creates a data channel `"oai-events"`, and creates an SDP offer. In `pc.ontrack`, the remote (Coach) audio stream is both attached to an `<audio>` element for playback **and** tapped with a second `AnalyserNode` (the "Coach" half of the waveform).
4. Posts the SDP offer to `https://api.openai.com/v1/realtime/calls` (GA WebRTC endpoint; model is bound to the ephemeral key) with `Authorization: Bearer <clientSecret>` and `Content-Type: application/sdp`. On a non-OK response the status + body are surfaced in the error message.
5. Sets the SDP answer as the remote description.
6. **The Coach leads.** On the data channel's `open` event the client sends a `{ type: "response.create", response: { instructions } }` event instructing the model to greet the person and ask the first question — so the conversation starts itself instead of waiting for the user to speak first.
7. Listens for transcript events on the `"oai-events"` data channel — streaming **delta** events fill the in-progress turn live (word by word), **done/completed** events commit the full turn to the DB. Both the pre-GA and GA event names are handled so the Coach's words always stream in:
   - `"response.audio_transcript.delta"` / `"response.output_audio_transcript.delta"` → appends to the live coach partial (`coachLive`).
   - `"response.audio_transcript.done"` / `"response.output_audio_transcript.done"` → `interview.appendTurn({ role: "coach", text })`, clears `coachLive`.
   - `"conversation.item.input_audio_transcription.delta"` → appends to the live user partial (`userLive`).
   - `"conversation.item.input_audio_transcription.completed"` → `interview.appendTurn({ role: "user", text })`, clears `userLive`.
   User-speech transcription only fires because the mint enables it via `session.audio.input.transcription = { model: "gpt-realtime-whisper" }`; without that, only the coach side is transcribed. With semantic VAD (above), each `…input_audio_transcription.completed` now fires once per whole thought rather than once per pause, so a user answer commits as a single bubble.

   **Coach-restart de-dup:** a barge-in can truncate the Coach mid-sentence (its partial `…transcript.done` commits) before it restarts with the fuller version, producing two consecutive Coach turns. `appendTurn`/`appendTurnByToken` run the new turn through `appendTranscriptTurn` (`convex/lib/transcript.ts`), which **replaces** a back-to-back Coach turn within `COACH_RESTART_WINDOW_MS` (15s) instead of appending — collapsing the restart to the single later turn. Safe because the Coach asks one question then waits, so it never legitimately speaks twice in a row without an intervening user turn.
8. **Pause / Mute / End controls** sit under the waveform. **Mute** toggles `track.enabled` on the mic (the Coach keeps talking, it just can't hear you). **Pause** holds the whole exchange — disables the mic, pauses the Coach `<audio>`, and `suspend()`s the AudioContext so the waveform freezes — and **Resume** restores it (respecting the mute state). **End** closes the peer connection, stops mic tracks, tears down the audio graph, calls `interview.end({ status:"completed" })`, and calls `onComplete()`. The status chip reads `Listening` / `Muted` / `Paused` accordingly.
9. On any connection or mic error, sets `micState = "error"` and renders the actual error reason plus a fallback link to the text interview.

**Live view (adopts the blueprint VoiceField language):** committed turns render as conversation bubbles (coach left `bg-coach`, user right ink/white); the active turn streams in as a ghosted bubble with a blinking `vf-caret`; a single `vf-pulse` dot + status chip is the only status chrome. The **waveform is real and two-colored** — a `requestAnimationFrame` loop reads both analysers each frame, picks whoever is louder, and shapes the `vf-wave` bars to that party's frequency spectrum in their color (**gold `#B8945A`** = Coach, **blue `#3A5C86`** = you, ghost `#C7BEAC` = silence), so the line reacts to whoever is actually speaking. The view is centered with breathing room on every edge (`px-5 sm:px-8 py-5 sm:py-8`, max-width 680px) so it sits well on phone and desktop, and auto-scrolls as turns and live words arrive.

---

## 7. QR phone handoff

`QrHandoff.tsx` is rendered inside the voice interview screen. On mount (via `useEffect`, runs once):

1. Calls `interview.issueJoinToken({ sessionId })`.
2. Builds the URL: `${window.location.origin}/interview/${sessionId}?t=${token}`.
3. Generates a QR code image via the `qrcode` library (`npm` package `qrcode`) at 200px, colors matched to the design tokens.
4. Renders the QR image with alt text "Scan to continue on your phone" and the caption "Continue on your phone."

### Phone route (`app/interview/[sessionId]/page.tsx`)

A standalone page (no rail nav) wrapped in a Suspense boundary (required for `useSearchParams`).

- Reads `sessionId` from `useParams()` and the `t` token from `useSearchParams()`.
- Calls `api.interview.joinWithToken` as a reactive query (passing `"skip"` until both values are available). On success, renders the session transcript and a text input.
- On first successful session load, calls `interview.markJoined({ sessionId, token })` to log the `"qr_scanned"` event.
- Text input: sends turns via `interview.appendTurnByToken({ role:"user", text })`.
- "End interview" calls `interview.endByToken({ status:"completed" })`.
- Transcript is reactively live: Convex pushes updates to both the desktop and the phone simultaneously.

**Cross-device auth note:** the phone page is fully public (no sign-in required). The join token is the only credential. This means any person who obtains the QR link can join the session within the 10-minute window. For v1 this is an acceptable tradeoff for friction reduction; cross-device auth hardening is a deferred item.

---

## 8. Synthesis (`convex/ai/synthesizeInterview.ts`)

### `applySynthesis` (pure, exported, unit-tested)

```ts
applySynthesis(
  existing: Record<string, string>,
  drafted: Record<string, string | null>
): { toWrite: Record<string, string>; conflicts: string[]; emptyKeys: string[] }
```

For each blueprint key in `drafted`:
- If `drafted[key]` is non-empty and `existing[key]` is empty: add to `toWrite` (safe to write).
- If both are non-empty and differ: add to `conflicts` (do not overwrite; log for the Coach).
- If `drafted[key]` is null/empty and `existing[key]` is also empty: add to `emptyKeys`.

This enforces the core-curator rule: the AI never silently overwrites a box the user has already written. Conflicts are surfaced (logged in `experienceEvents.meta`) for the Coach to raise later.

### `synthesizeInterview` action (args: `{ sessionId }`)

1. Authenticates the caller.
2. Loads the session via `api.interview.get`.
3. Loads the current core answers via `api.core.get`.
4. Builds a transcript string (`User: <text>` / `Coach: <text>` lines) from the session turns.
5. Calls the `synthesis` task model with a system prompt that lists all 18 blueprint questions and instructs the model to return a `{ [key]: string|null }` JSON object grounded only in the transcript. Uses `response_format: { type: "json_object" }`.
6. Parses the response with `parseSynthesisJson` (tries direct JSON parse; falls back to regex extraction of the first `{...}` block; fills missing keys with `null`).
7. Runs `applySynthesis(existingCore, drafted)`.
8. For each key in `toWrite`, calls `api.core.save({ questionKey, content })`.
9. Logs a `"synthesized"` event with `meta = JSON.stringify({ conflicts, filled: Object.keys(toWrite) })`.
10. Calls `api.settings.recompute` to update `blueprintStatus` and `level`.
11. Logs a `"completed"` event.
12. Returns `{ filled: count, conflicts, emptyKeys }`.

**On AI error** (missing key, network failure): the action catches the error, skips synthesis, and returns `{ filled: 0, conflicts: [], emptyKeys: ALL_KEYS.filter(k => !existingCore[k]) }`. The Synthesis component catches this and still lets the user enter the app.

---

## 9. Level and status recompute (`convex/settings.ts: recompute`, `lib/levels.ts`)

### `lib/levels.ts`

```ts
ALL_KEYS: string[]          // all 18 blueprint keys in canonical order
filledCount(answers): number
blueprintStatus(answers): "unstarted" | "in_progress" | "complete"
deriveLevel(answers): number  // 0 = unfinished, 1 = all 18 filled; 2+ deferred
```

`blueprintStatus`:
- `"unstarted"`: `filledCount === 0`
- `"complete"`: `filledCount === ALL_KEYS.length` (all 18 non-empty, non-whitespace)
- `"in_progress"`: anything in between

`deriveLevel`: returns `1` if status is `"complete"`, else `0`. Level 2+ is a stub; the ranking rules are deferred.

A value is "filled" if it is a non-empty, non-whitespace string. Whitespace-only answers are treated as empty.

### `convex/settings.ts: recompute`

A public mutation (`args: {}`). Loads all `coreResponses` for the authenticated user, builds a `{ questionKey: content }` map, calls `blueprintStatus` and `deriveLevel`, and patches the user's settings row with the new values and `updatedAt`. Called by synthesis after writing answers, and available to call from any surface that updates `coreResponses` (e.g. the Core editor).

---

## 10. Status surfacing (post-onboarding)

Two surfaces show blueprint progress without being intrusive:

**Home banner (`components/today/Today.tsx`):** if `settings.blueprintStatus !== "complete"` and `settings` has loaded, a small line appears above the morning/evening tabs: "Your blueprint isn't finished — N/18." with a "Continue" link to the Core surface. The banner is hidden once the blueprint is complete.

**Guide marker (`components/guide/Guide.tsx`):** a small pill near the top of the Guide page: "Blueprint: N/18 | Level L". Always visible when settings have loaded. It does not link anywhere; the Core surface is reachable via the rail nav.

---

## 11. Edge cases

- **Empty transcript at synthesis time:** `synthesizeInterview` passes `"(no transcript)"` to the model. The model should return all nulls; synthesis writes nothing; the user enters the app with an empty blueprint.
- **No API key for voice:** `OpenAIRealtimeAdapter.mint()` throws `"No OpenAI API key found."` The Convex action propagates this; the VoiceInterview component catches it and shows the error/fallback UI.
- **No API key for synthesis:** the `aiForTask` call inside `synthesizeInterview` will throw. The outer try/catch returns the zero-filled result and lets the user proceed.
- **Duplicate / restarted Coach turns:** a barge-in can make the Coach emit a truncated turn then a fuller restart. Both `appendTurn` and `appendTurnByToken` route through `appendTranscriptTurn`, which collapses consecutive Coach turns within 15s to the later one (see §6). Non-Coach duplicates (e.g. repeated user events) are not deduplicated; synthesis reads the transcript as a flat string so any residual duplicates add noise but do not break the output.
- **Session with no skipped keys circles back:** `nextQuestion` only enters the circle-back pass if `skipped.length > 0`. A session with no skips returns `null` as soon as all fresh keys are answered.

---

## 12. Open questions

- **Voice phone route:** the phone route at `app/interview/[sessionId]/page.tsx` currently renders a text input, not a voice input. Voice on the phone is a natural next step but was not built in v1.
- **Realtime event name verification:** the user-speech transcript event `"conversation.item.input_audio_transcription.completed"` needs live-API verification (see `TO-CHECK.md`).
- **Token refresh:** a 10-minute QR token cannot currently be refreshed from the desktop without reloading the component. A "Regenerate QR" button is a small UX improvement for longer sessions.
- **Synthesis conflicts and the Coach:** conflicts are logged but no surface shows them. The Coach curation pass should pick up `experienceEvents` rows with `event="synthesized"` and `meta` containing a non-empty `conflicts` array.
