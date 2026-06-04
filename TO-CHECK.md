# To Check

Features that are done but haven't been manually verified yet.

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
