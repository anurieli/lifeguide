# The Listener

**Status:** built (v1) · **Element of:** the spine (an entry to the Coach; feeds the Core via the Center) · **Owns:** no tables (reuses `interviewSessions` with `experienceId: "listen"`)

> The ear. An always-available voice call you open with one tap to think out loud. It listens and thinks *with* you; afterwards the Center files what mattered.

## 1. Purpose

Lostness is easier to talk through than to type. The Listener answers it the simplest way the product can: a button you can always press to just *talk*. No form, no script, no friction — say whatever is on your mind, and be heard. It is the headline way into the Coach, and the primary feeder of the [file system on the human](file-system-on-the-human.md).

## 2. User-facing behavior

A **talk button** (a microphone) is always present: the floating dock's primary action on desktop, the bottom-bar "Talk" tab on mobile, and the `/speak` URL from anywhere. Pressing it opens a calm full-screen surface: "Talk it through." Press **Start talking**, grant the mic, and the Listener opens with a warm one-liner and an invitation. From there it follows *your* thread — reflecting, asking one short question at a time, comfortable with silence.

A live two-color waveform shows who is speaking (gold = the Listener, blue = you), with the rolling transcript above it. Controls: **Pause** (holds the whole exchange), **Mute** (it keeps talking, can't hear you), **End**. Ending runs the [Center](the-center.md) ("Filing what you shared…") and then shows the **filing report**. **Close** leaves at any time. A small secondary button on desktop opens the text chat instead.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| open the Listener | talk button / `/speak` | starts a `listen` session, opens the surface | Manual | writes `interviewSessions` (`start`), `experienceEvents` · **BUILT** |
| start the call | "Start talking" | mints a realtime token (Listener persona) + opens the mic + WebRTC | Manual | reads nothing new; realtime session · **BUILT** |
| converse | speaking | streams both sides' live transcription; commits turns | Coach (Listener) | writes `interviewSessions.transcript` · **BUILT** |
| pause / mute | controls | holds the exchange / silences the mic | Manual | client only · **BUILT** |
| end the call | "End" | ends the session, triggers the Center, shows the report | Manual | writes `interviewSessions` (`end`); invokes `center.synthesizeSession` · **BUILT** |

## 4. Dynamics and interactions with other elements

- **Owns no tables.** It reuses `interviewSessions` (the onboarding interview's table) with `experienceId: "listen"`, so transcript persistence (`appendTurn`/`get`/`end`) is shared, not duplicated.
- **Shares the realtime engine** with the onboarding [interview](interview.md): both render on `hooks/useRealtimeVoice.ts` (the WebRTC handshake, two-party transcription, real-audio waveform, controls). They differ only in **persona** and **what happens after**.
- **Persona** lives in `agents/listener/` (`LISTENER_INSTRUCTIONS`); the mint (`convex/ai/voice/index.ts`) picks it for `listen` sessions and the interviewer persona otherwise.
- **Hands off** to the [Center](the-center.md) on end; the Center files into the [file system on the human](file-system-on-the-human.md). The Listener itself files nothing and (v1) acts on no other surface.
- **Sits beside** the text [Coach](coach.md) dock (the secondary "type instead" affordance) — same Coach, two mouths.

## 5. States

- **Closed.** The talk button waits.
- **Preparing.** Session being created ("Opening a quiet space…").
- **Pre-start.** The calm intro + "Start talking".
- **Connecting / Live.** WebRTC up; conversation streaming; Listening / Muted / Paused.
- **Error.** Mic denied or realtime failed — the reason, "Try again", or "Not now".
- **Filing.** Call ended; the Center is running.
- **Report.** The filing report; "Done" closes.

## 6. Edge cases

- **Mic denied / realtime down.** Calm error with the reason and a graceful exit (no QR fallback — this isn't onboarding).
- **Close mid-call.** Unmounting tears down audio + the peer connection; the session is left as-is (no Center run unless ended).
- **Empty conversation.** The Center files nothing; the report says so warmly.
- **Unauthenticated `/speak`.** Bounced to `/` (the surface needs an identity to own the session).
- **Cross-tenant.** The session, transcript, and all filing gate on `getAuthUserId`.

## 7. AI involvement

Two model touchpoints: (1) the **realtime conversation** — OpenAI Realtime (`gpt-realtime-mini`, the `voice` task) bound to `LISTENER_INSTRUCTIONS`, with semantic-VAD turn detection and streaming input transcription (see [`../decisions/0004-voice-stack-and-levels.md`](../decisions/0004-voice-stack-and-levels.md)); (2) the post-call **Center** fan-out (see [`the-center.md`](the-center.md)). The Listener persona is deliberately non-directive: reflect, open the door wider, never lecture or fix.

## 8. Data touched

**Owns:** none. **Writes:** `interviewSessions` (`experienceId: "listen"`, transcript, status) and `experienceEvents`; triggers `coreFiles` writes via the Center. **Draws:** the realtime token (server-minted). Shapes in [`../../architecture/data-model.md`](../../architecture/data-model.md).

## 9. Open questions

- **Text on mobile.** The mobile bottom-bar tab is now "Talk"; the text Coach has no mobile entry. Add one back, or is voice-first right on mobile?
- **Resume / history.** Listener sessions are one-shot. Should past calls be browsable (they live in `interviewSessions`)?
- **Long calls.** The Center runs inline on end; very long conversations may want a background pass with a "we'll file this shortly" close.
- **Off-platform tether.** The Listener is on-demand; the earned-interruption reach-out (see [`coach.md`](coach.md)) is separate and unbuilt.
