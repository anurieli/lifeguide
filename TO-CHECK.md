# To Check

Features that are done but haven't been manually verified yet.

### Voice transcript cleanup — semantic VAD + Coach-restart de-dup
- [ ] **Model accepts semantic_vad:** start a voice interview and confirm the session connects (no mint/SDP error). If it errors on `turn_detection`, the pinned model rejects `semantic_vad` — fall back to `server_vad` with a long `silence_duration_ms` (~1000ms) in `convex/ai/voice/openaiRealtime.ts`.
- [ ] **No more fragmentation:** speak one answer with natural mid-thought pauses ("Oh… this is, um, like… I guess… when I'm taking charge of something big"). Confirm it lands as **one** user bubble, not several.
- [ ] **Coach not too slow / not cutting in:** confirm the Coach waits for you to finish (doesn't reply during a pause) but still replies promptly once you're done (~a few seconds). If it feels sluggish, lower `eagerness` toward `high`; if it cuts you off, it stays at `auto`/`low`.
- [ ] **Coach-restart de-dup:** barge in while the Coach is speaking, forcing it to restart. Confirm only the single, fuller Coach turn remains in the transcript (no truncated "…So" fragment left behind).

### VoiceField — chunked Whisper transcription (ADR 0005)
- [ ] **Deploy first:** this branch's `convex/voice.ts` (now `"use node"`, with the new `transcribe` action) must be pushed to the deployment — it lands via the normal dev/main merge pipeline, not from this branch. Confirm `voice:transcribe` resolves after the merge deploy (`npx convex run voice:transcribe '{"audio":"","mimeType":"audio/webm"}'` → auth error, not "function not found").
- [ ] **Chrome happy path:** open a field with the mic (Today, Core, or onboarding), grant the mic, speak ~10s, confirm the live caption streams (Web Speech) and that the landed text matches Whisper-grade accuracy (not the rougher on-device transcript). Confirm `voiceShape` still cleans it.
- [ ] **Whisper-only browser:** repeat in Firefox or Safari (no Web Speech) — confirm the mic still appears, the Whisper transcript shows a few seconds behind as segments confirm, and the answer lands.
- [ ] **Fallback:** with `OPENAI_API_KEY` absent (or network blocked to OpenAI), confirm on Chrome the take still completes using the on-device Web Speech transcript (answer never lost).
- [ ] **Cancel mid-take (Escape):** pressing Escape while recording releases the mic, keeps prior text, no shaped chunk lands.
- [ ] **Backspace mid-take does NOT cancel:** pressing Backspace while recording leaves the recording running (no cancel, no discard); the mic stays open and the transcript continues streaming. (Backspace is now a no-op in the listening view — there is no editable field focused there.)

### Onboarding rebuild — manual QA

- [ ] **(a) Realtime voice:** start a voice interview, confirm the mic connects, speak a sentence, and verify that both coach and user transcripts appear in the session transcript panel. Specifically, confirm the `"conversation.item.input_audio_transcription.completed"` event fires for user speech (this event name has not been verified against the live OpenAI Realtime API; if user transcripts are missing, check the data-channel event types in the browser console and update `VoiceInterview.tsx` accordingly).
- [ ] **(b) QR phone handoff:** complete a voice session start on desktop, scan the QR code on a second physical device (not the same browser), confirm the phone route opens the session, type a reply, and verify the turn appears live on the desktop transcript without a refresh.
- [ ] **(c) Full text path:** sign in as a fresh anonymous user, go through Door, pick "Type it out", answer several questions, skip one, complete the interview, wait for synthesis, and verify the answers appear in the Core surface. Confirm the app shell loads and the Core is at least partially filled.
- [ ] **(d) Level promotion:** fill all 18 Core boxes (via the text interview + manual edits if needed), run `settings.recompute` (or trigger it via synthesis), and confirm `blueprintStatus` becomes `"complete"`, `level` becomes `1`, and the Home banner is hidden.
- [ ] **(e) Environment variable:** confirm `OPENAI_API_KEY` is present in the Convex deployment for voice (realtime sessions) and synthesis. Absent key produces a clean error in `VoiceInterview` ("Type it out instead" fallback shown) and a silent no-op in synthesis (user still proceeds to the app).

### Voice onboarding rework — Coach leads, waveform, controls (2026-06-04)
- [ ] **Coach leads:** start a voice interview and stay silent — confirm the Coach greets you and asks the first question on its own within a second or two (the `response.create` on data-channel open fired). If it waits for you to speak, check the console for whether the `dc` `open` event fired before the model was ready.
- [ ] **Live coach transcript:** confirm the Coach's words stream into the ghosted bubble as it speaks (this depends on `response.output_audio_transcript.delta` — if the bubble stays empty while audio plays, log the actual event `type`s from the data channel and add them).
- [ ] **Reactive two-color waveform:** when the Coach speaks the bars dance **gold** and react to its audio; when you speak they turn **blue** and react to your voice; in silence they settle to a low ghost line. Confirm the bars actually move with amplitude (not random).
- [ ] **Controls:** **Mute** silences your mic while the Coach keeps talking (status → "Muted"); **Pause** freezes the wave + pauses the Coach + disables the mic (status → "Paused"), **Resume** restores it (and re-mutes if you were muted); **End** finalizes the session and advances to synthesis.
- [ ] **Layout:** check on a phone viewport and desktop — the conversation is centered with comfortable padding on all edges (not hugging the borders).

---

### Drag photos and documents onto the Vision Board
- [ ] Drag an image file from the desktop onto the board, confirm a dashed drop overlay appears while dragging and the image lands as an image card at the drop point
- [ ] Drag a PDF (or other document) onto the board, confirm it lands as a file card showing the filename and type with a working open/download link
- [ ] Drag several files in at once, confirm they fan out instead of stacking exactly on top of each other

### Remember the active tab across refresh
- [ ] Switch to Board, refresh the page, confirm it stays on Board instead of returning to Today
- [ ] Repeat for Core, Guide, and Settings, confirming each is remembered after a reload
- [ ] In a fresh browser (no saved value), confirm it still opens on Today by default

### Zen mode exit affordances — ✅ verified live on prod (mylifesguide.com) 2026-06-04
- [x] Enter Zen, hover the left timeline rail to expand it — header (◆ Core + "Exit Zen" back chevron) sits above the TOC, list scrolls independently ✓
- [x] "Exit Zen" in the rail header renders (same `onExit` as the top-right; top-right path confirmed below)
- [x] The faint "EXIT ZEN" label in the top-right corner returns to the grid on click ✓
- [ ] Scroll up at the first question so the slim header appears, confirm the top-right "Exit Zen" fades out (no duplicate exit) — not exercised
- [x] Light-theme contrast good; nothing overlaps the centered question scene ✓

### Conversational mode scaffold — ✅ verified live on prod (mylifesguide.com) 2026-06-04
- [x] Hover the rail → "Talk" sits next to "Exit Zen"; clicking it shows the Conversational placeholder ("Talk it through") ✓
- [x] Conversational header shows the same "0 / 18 answered" count as Zen/Grid (shared data) ✓
- [x] From Conversational, "Zen" → lands in Zen; round-trip Grid→Zen→Conversational→Zen→Grid works ✓ (answer-preservation across modes not tested — Core was empty, 0/18)

### Prod Convex deployment / auth — ✅ fixed + verified 2026-06-04
- [x] Prod (`strong-wildebeest-896`) was stale (frontend on `c5d0c05`, backend never deployed there) → `npx convex deploy` pushed the current backend; anonymous + token auth now succeed on mylifesguide.com ✓
- [ ] Google OAuth click-through on prod — still wants a human pass (can't drive Google sign-in headlessly)
- [ ] Wire `CONVEX_DEPLOY_KEY` (prod) into Vercel + build command `npx convex deploy --cmd 'npm run build'` so the prod backend auto-deploys with the frontend (prevents the drift that caused the outage) — needs a prod deploy key from the Convex dashboard
