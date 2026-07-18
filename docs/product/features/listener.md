# The Listener

**Status:** built (v1) · **Element of:** the spine (an entry to the Coach; feeds the Core via the Center) · **Owns:** no tables (reuses `interviewSessions` with `experienceId: "listen"`)

> The ear. An always-available voice call you open with one tap to think out loud. It listens and thinks *with* you; afterwards the Center files what mattered, and its own memory backbone remembers the conversation itself.

## 1. Purpose

Lostness is easier to talk through than to type. The Listener answers it the simplest way the product can: a button you can always press to just *talk*. No form, no script, no friction — say whatever is on your mind, and be heard. It is the headline way into the Coach, and the primary feeder of the [file system on the human](file-system-on-the-human.md).

## 2. User-facing behavior

A **talk button** (a microphone) is always present: the floating dock's primary action on desktop, the bottom-bar "Talk" tab on mobile, and the `/speak` URL from anywhere. Pressing it opens a calm full-screen surface: "Talk it through." Press **Start talking**, grant the mic, and the Listener opens with a warm one-liner and an invitation. From there it follows *your* thread — reflecting, asking one short question at a time, comfortable with silence.

**The orb remembers the last call (ARI-23, the memory backbone, [ADR 0022](../../decisions/0022-listener-memory-backbone.md)).** The person never sees a "history" screen — the memory shows up as the Listener itself opening grounded instead of cold: when there's a summary of the last call on file, its opening line references it specifically ("how did things land with the career thing?") instead of a generic invitation. This is separate from the Center's identity filing: it's the Listener's memory of the *conversation*, not the Center's read on *who the person is*.

A live two-color waveform shows who is speaking (gold = the Listener, blue = you), with the rolling transcript above it. Controls: **Pause** (holds the whole exchange), **Mute** (it keeps talking, can't hear you), **End**. Ending runs the [Center](the-center.md) ("Filing what you shared…") and then shows the **filing report**. **Close** leaves at any time. A small secondary button on desktop opens the text chat instead.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| open the Listener | talk button / `/speak` | starts a `listen` session, opens the surface | Manual | writes `interviewSessions` (`start`), `experienceEvents` · **BUILT** |
| start the call | "Start talking" | mints a realtime token (Listener persona, grounded in the last call's summary if one exists) + opens the mic + WebRTC | Manual | reads `interviewSessions.summary` (the last "listen" call, via `latestListenSummaryInternal`); realtime session · **BUILT** |
| converse | speaking | streams both sides' live transcription; commits turns | Coach (Listener) | writes `interviewSessions.transcript` · **BUILT** |
| pause / mute | controls | holds the exchange / silences the mic | Manual | client only · **BUILT** |
| end the call | "End" | ends the session, triggers the Center, shows the report | Manual | writes `interviewSessions` (`end`); invokes `center.synthesizeSession` · **BUILT** |
| remember the call | any call end (completed, abandoned, or tossed) | schedules the post-call summary pass (ARI-23) | Coach (the backbone) | writes `interviewSessions.summary` · **BUILT** |

## 4. Dynamics and interactions with other elements

- **Owns no tables.** It reuses `interviewSessions` (the onboarding interview's table) with `experienceId: "listen"`, so transcript persistence (`appendTurn`/`get`/`end`) is shared, not duplicated.
- **Shares the realtime engine** with the onboarding [interview](interview.md): both render on `hooks/useRealtimeVoice.ts` (the WebRTC handshake, two-party transcription, real-audio waveform, controls). They differ only in **persona** and **what happens after**.
- **Persona** lives in `agents/listener/` (`LISTENER_INSTRUCTIONS`); the mint (`convex/ai/voice/index.ts`) picks it for `listen` sessions and the interviewer persona otherwise.
- **Hands off** to the [Center](the-center.md) on end; the Center files into the [file system on the human](file-system-on-the-human.md). The Listener itself files nothing and (v1) acts on no other surface.
- **Sits beside** the text [Coach](coach.md) dock (the secondary "type instead" affordance) — same Coach, two mouths.
- **Runs its own memory backbone alongside the Center, not through it** (ARI-23, ADR 0022): `convex/ai/listenerMemory.ts`'s `summarizeSession` is a separate scheduled pass off `interview.end`, independent of `center.synthesizeSession`. This is deliberate — a toss must be able to withhold Core filing while still keeping the conversational memory; conflating the two passes would make "toss" also mean "forget we talked," which it never was meant to mean. `agents/listener/persona.ts`'s `buildListenerInstructions` and `lib/listenerMemory.ts`'s `buildListenerOpeningAddendum` do the actual grounding, called from `convex/ai/voice/index.ts` when minting a new "listen" session.
- **"Session per speaker" is the account's own call history, not a new concept** (ADR 0022 §1): every `interviewSessions` row is already scoped to exactly one `userId` (one human), so that per-user sequence of "listen" calls, newest first, IS the continuity thread. No multi-human diarization; the realtime transport (one input stream) and the whole schema (single-tenant per row) don't support it, and nothing asked for it.

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

Three model touchpoints: (1) the **realtime conversation** — OpenAI Realtime (`gpt-realtime-mini`, the `voice` task) bound to `LISTENER_INSTRUCTIONS` (optionally grounded in the last call's summary — ARI-23), with semantic-VAD turn detection and streaming input transcription (see [`../decisions/0004-voice-stack-and-levels.md`](../decisions/0004-voice-stack-and-levels.md)); (2) the post-call **Center** fan-out (see [`the-center.md`](the-center.md)); (3) the post-call **memory-backbone summary** — `openai/gpt-4o-mini`, the `listenerSummary` task, one call per ended "listen" call, strict JSON (`convex/ai/listenerMemory.ts`). The Listener persona is deliberately non-directive: reflect, open the door wider, never lecture or fix; the summary pass is deliberately non-addressing (it writes ABOUT the conversation, for the Listener to read later, never TO the person).

## 8. Data touched

**Owns:** none. **Writes:** `interviewSessions` (`experienceId: "listen"`, transcript, status, `summary` — ARI-23) and `experienceEvents`; triggers `coreFiles` writes via the Center. **Draws:** the realtime token (server-minted); the last call's `interviewSessions.summary` (via `latestListenSummaryInternal`, ARI-23) when minting a new call. Shapes in [`../../architecture/data-model.md`](../../architecture/data-model.md); the memory-backbone decision record is [ADR 0022](../../decisions/0022-listener-memory-backbone.md).

## 9. Open questions

- **Text on mobile.** The mobile bottom-bar tab is now "Talk"; the text Coach has no mobile entry. Add one back, or is voice-first right on mobile?
- **Resume / history.** Listener sessions are one-shot. Should past calls be browsable (they live in `interviewSessions`)? The memory backbone (ARI-23) gives the orb its own read of the past; a person-facing browsable history is still separate and unbuilt.
- **Long calls.** The Center runs inline on end; very long conversations may want a background pass with a "we'll file this shortly" close. The memory-backbone summary pass runs inline too (scheduled, but the report doesn't wait on it) — same consideration applies if a call gets very long.
- **Off-platform tether.** The Listener is on-demand; the earned-interruption reach-out (see [`coach.md`](coach.md)) is separate and unbuilt.
- **Memory depth beyond the last call (ARI-23, [ADR 0022](../../decisions/0022-listener-memory-backbone.md) §4).** v1 grounds the opening in exactly one prior summary. Last-N, or a rolling synthesized "where we are" memo that updates each call, is a real future direction — deliberately deferred as a bigger feature than a first cut needs.
- **A toss affordance.** The backend fully supports it (`interview.end` accepts `status: "tossed"`, and the memory backbone runs regardless — ADR 0022 §3), but no client UI calls it yet in this codebase.
