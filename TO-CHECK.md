# To Check

Features that are done but haven't been manually verified yet.

### VoiceField — chunked Whisper transcription (ADR 0005)
- [ ] **Deploy first:** this branch's `convex/voice.ts` (now `"use node"`, with the new `transcribe` action) must be pushed to the deployment — it lands via the normal dev/main merge pipeline, not from this branch. Confirm `voice:transcribe` resolves after the merge deploy (`npx convex run voice:transcribe '{"audio":"","mimeType":"audio/webm"}'` → auth error, not "function not found").
- [ ] **Chrome happy path:** open a field with the mic (Today, Core, or onboarding), grant the mic, speak ~10s, confirm the live caption streams (Web Speech) and that the landed text matches Whisper-grade accuracy (not the rougher on-device transcript). Confirm `voiceShape` still cleans it.
- [ ] **Whisper-only browser:** repeat in Firefox or Safari (no Web Speech) — confirm the mic still appears, the Whisper transcript shows a few seconds behind as segments confirm, and the answer lands.
- [ ] **Fallback:** with `OPENAI_API_KEY` absent (or network blocked to OpenAI), confirm on Chrome the take still completes using the on-device Web Speech transcript (answer never lost).
- [ ] **Cancel mid-take:** backspace/escape while recording releases the mic, keeps prior text, no chunk lands.

### Onboarding rebuild — manual QA

- [ ] **(a) Realtime voice:** start a voice interview, confirm the mic connects, speak a sentence, and verify that both coach and user transcripts appear in the session transcript panel. Specifically, confirm the `"conversation.item.input_audio_transcription.completed"` event fires for user speech (this event name has not been verified against the live OpenAI Realtime API; if user transcripts are missing, check the data-channel event types in the browser console and update `VoiceInterview.tsx` accordingly).
- [ ] **(b) QR phone handoff:** complete a voice session start on desktop, scan the QR code on a second physical device (not the same browser), confirm the phone route opens the session, type a reply, and verify the turn appears live on the desktop transcript without a refresh.
- [ ] **(c) Full text path:** sign in as a fresh anonymous user, go through Door, pick "Type it out", answer several questions, skip one, complete the interview, wait for synthesis, and verify the answers appear in the Core surface. Confirm the app shell loads and the Core is at least partially filled.
- [ ] **(d) Level promotion:** fill all 18 Core boxes (via the text interview + manual edits if needed), run `settings.recompute` (or trigger it via synthesis), and confirm `blueprintStatus` becomes `"complete"`, `level` becomes `1`, and the Home banner is hidden.
- [ ] **(e) Environment variable:** confirm `OPENAI_API_KEY` is present in the Convex deployment for voice (realtime sessions) and synthesis. Absent key produces a clean error in `VoiceInterview` ("Type it out instead" fallback shown) and a silent no-op in synthesis (user still proceeds to the app).

---

### Drag photos and documents onto the Vision Board
- [ ] Drag an image file from the desktop onto the board, confirm a dashed drop overlay appears while dragging and the image lands as an image card at the drop point
- [ ] Drag a PDF (or other document) onto the board, confirm it lands as a file card showing the filename and type with a working open/download link
- [ ] Drag several files in at once, confirm they fan out instead of stacking exactly on top of each other

### Remember the active tab across refresh
- [ ] Switch to Board, refresh the page, confirm it stays on Board instead of returning to Today
- [ ] Repeat for Core, Guide, and Settings, confirming each is remembered after a reload
- [ ] In a fresh browser (no saved value), confirm it still opens on Today by default

### Zen mode exit affordances
- [ ] Enter Zen, hover the left timeline rail to expand it — confirm a header (◆ Core + "Exit Zen" back chevron) sits above the table of contents, and the TOC list scrolls independently beneath it
- [ ] Click "Exit Zen" in the rail header, confirm it returns to the grid view
- [ ] Confirm the faint "Exit Zen" label in the top-right corner brightens on hover and returns to the grid on click
- [ ] Scroll up at the first question so the slim header appears, confirm the top-right "Exit Zen" fades out (no duplicate exit)
- [ ] Check light-theme contrast and that nothing overlaps the centered question scene

### Conversational mode scaffold
- [ ] Enter Zen, hover the rail — confirm a "Talk" control sits next to "Exit Zen" in the rail header; click it and confirm the Conversational placeholder appears
- [ ] In Conversational mode, confirm the header shows the same "X / 18 answered" count as Zen/Grid (shared data)
- [ ] From Conversational, click "Zen" → lands in Zen; click "Grid" → lands in the grid; confirm no answers are lost switching between all three modes
