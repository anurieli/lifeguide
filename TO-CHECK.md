# To Check

Features that are done but haven't been manually verified yet.

### Sessions + mobile capture (ARI-24)
- [ ] **One-tap take (real iPhone):** tap ● in the bottom bar, speak 2+ minutes, stop. The entry opens; transcript fills in ("Listening back…" then text); the audio plays inline, from desktop too; the transcript matches what was said.
- [ ] **Living entry:** in the open entry, type a line, add a photo, record a second take. All land in order. Next day, reopen and append; the list row's AI title/subtext refresh (~30s after ingest completes).
- [ ] **Digest fallback:** with no AI keys, the list shows the first-words fallback instead of a title; no errors surface.
- [ ] **Failure never loses audio:** kill the network after stopping a take (before upload completes): the failure notice shows and tapping stop retries with the kept blob. Break transcription (no OPENAI key): the entry shows "Transcription failed, the recording is safe" and Try again works once the key is back.
- [ ] **No husks:** open record, tap X immediately (and: deny the mic → Type instead → leave without typing). The Sessions list gains nothing.
- [ ] **Mobile bar:** at ~390px only Today · ● · Sessions · Talk (+ avatar). Core/Board/Thoughts are absent on the phone, present on desktop; the desktop rail gains a Sessions tab.
- [ ] **Inspiration from phone:** add a photo inside an entry on the phone; confirm it appears distilled in the board Inbox on desktop.
- [ ] **Loose captures unaffected:** the Thought Stream composer, board intake, and board voice brain dump all still work exactly as before (no sessionId, no session created).

### The Listener + the Center + the file system on the human
- [ ] **Talk button → Listener (needs a mic):** on desktop, confirm the floating dock's primary button is now a **mic** (talk), not the message icon, and opens the full-screen "Talk it through" surface. The small secondary button below it still opens the text Coach. On mobile (~414px) the bottom-bar tab reads **"Talk"** and opens the same surface. The `/speak` URL opens it directly; visiting `/speak` while signed out bounces to `/`.
- [ ] **Listener conversation:** press "Start talking", grant the mic, confirm the Listener opens with a warm one-liner (not a blueprint question), follows your thread. Pause/Mute/End behave. Confirm onboarding's voice interview **still works** (shared `useRealtimeVoice` hook refactor) — start one and verify it asks blueprint questions as before (it still uses the bar waveform).
- [ ] **The audio orb (WebGL):** in a live Listener call, confirm the orb renders as a circular fabric of dots that moves; when the Listener speaks it warms **gold** and agitates from the top, when you speak it cools **blue** from the bottom, and it calms to neutral in silence. Check it's smooth (no jank), and that on a browser/GPU without WebGL it falls back to a calm pulsing circle rather than blank. Tune in `VoiceOrb.tsx` if the color/level response feels too weak or too strong (the `*2.4` level gain and the `top`/`bot` smoothstep).
- [ ] **Captions behind the orb:** confirm the **current line is always clearly readable** just below the orb with the right speaker dot (gold = Listener, blue = you), and that earlier lines **rise and fade behind the orb** as new ones land. Long lines shouldn't break the layout (history truncates to one line).
- [ ] **Toss a session:** in a call, press **Toss**. Confirm the calm "Tossed — that one was just for thinking" close appears, that **nothing was filed** (no filing report; the Core gains no files from this call), and that the session is still recorded with time (`status: tossed`, `endedAt` set). Contrast with **End**, which should still file via the Center.
- [ ] **The Center files it (the core test):** in a Listener call, talk for a minute across a few life areas (e.g. "I've been scared I'm wasting my potential at work, but I love my partner and want to get back in shape"). End the call. Confirm the **filing report** appears showing notes filed under the relevant pillars (Fears & Shadows, Work & Money, Relationships, Body & Health) with sensible names/kinds — and that empty/untouched pillars get nothing. Then open a **second** call, deepen one topic, and confirm it **updates** the existing file rather than duplicating.
- [ ] **Contradiction → pending (never overwrites):** in one call say something, in a later call contradict it (e.g. "what drives me is legacy" then later "honestly it's just money"). Confirm the report holds the new version as a **pending** item with a reason and "Use this" / "Keep what I had" buttons, that the held file is untouched until you choose, and that choosing applies/drops correctly.
- [ ] **Skeleton seeding:** a brand-new account should start with the 8 canonical pillars (check the Core/pillars surface). An **older** account (only "Lifestyle") should gain the 8 on next load without losing "Lifestyle" or duplicating (`seedDefaultPillars` is idempotent). Probe: `npx convex run pillars:list` after sign-in.
- [ ] **AI-unavailable degrades gracefully:** with no AI key, end a Listener call and confirm it still closes cleanly and the report says nothing landed (no crash).

### Vision Board batch 1 — navigation, document preview, brain dump (ARI-3/6/8)
- [ ] **Brain dump end-to-end (needs a mic):** open the board, tap the mic toolbar button, speak 3–5 sentences across clearly different topics (e.g. "I want to run a marathon. I should call my dad. I've been thinking about quitting coffee."). Confirm it transcribes, splits into **distinct** thoughts, and each lands as its own card with a distilled title — no-overlap placement. Then speak one sentence and confirm exactly **one** card. Decline the mic and confirm "mic not available" instead of a crash.
- [ ] **Document preview — PDF (needs a file drop):** drag a `.pdf` onto the board. Confirm it embeds and scrolls inline, the header download link works, and the bottom-right drag handle resizes it and the size **persists across reload**. Test in Chrome, Safari, Firefox (Firefox without a PDF viewer should show the download fallback).
- [ ] **Document preview — HTML (sandbox):** drop an `.html` file containing a `<script>` tag. Confirm it renders and scrolls internally but the **script does not execute** and it cannot touch the parent page. Drop a `.txt`/`.docx` and confirm the icon + "download to open" fallback.
- [ ] **Center on nearest:** pan far from your cards, tap the crosshair button, confirm the viewport animates to the nearest card's center.
- [ ] **Minimap accuracy on a large/zoomed board:** with many cards spread out, confirm the minimap rects and the dashed viewport indicator track reality as you pan/zoom, and that clicking the minimap pans to that region.
- [ ] **Toolbar clearance across widths:** confirm the four toolbar buttons (gather / add / center / mic) sit clear of the bottom nav rail and are all clickable at mobile (~414px) and desktop widths.

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

### Vision board drag-to-select / multi-select (ARI-12)
- [ ] Shift-drag on empty canvas pans the board (and a plain drag on empty canvas draws a marquee instead, not a pan)
- [ ] Trackpad two-finger swipe pans the board smoothly
- [ ] ⌘-scroll (or trackpad pinch) zooms toward the cursor and stops at the min/max zoom
- [ ] Marquee-select a few cards, then ⌘-Shift-click one of them and confirm it drops out of the selection (count decreases)
- [ ] Group-move with image / document / link cards (not just empty text cards) keeps their relative spacing and doesn't snap back after the move lands
- [ ] Zoom in, then group-move a selection — confirm the cards track the cursor 1:1 at that zoom and commit in place
- [ ] ⌘-A selects every card; ⌫/Delete clears the whole selection from the board
- [ ] Click into a card, type, and press Backspace/Delete — confirm it edits the text and does NOT delete the selected cards

### Vision board AI image generation + add menu
- [ ] Double-click empty canvas, confirm a blank text card appears at the cursor and is focused to type
- [ ] Right-click empty canvas, confirm the menu opens at the cursor with Add text / Generate image with AI / Upload image; click outside (or Esc) closes it
- [ ] Menu "Add text" drops a focused card where you right-clicked; "Upload image" opens a picker and drops the chosen image there
- [ ] In an empty card type "/" then a space, confirm it switches to the purple "Generate with AI" prompt (the slash is gone)
- [ ] Type an image prompt and press Enter, confirm the card turns into a spinner showing the prompt, then fills with a generated image a few seconds later
- [ ] Menu "Generate image with AI" opens a new card already in AI mode at the click point
- [ ] Force a failure (e.g. no OpenAI key) and confirm the card shows "Couldn't generate that image" with a working Try again, and the rest of the board stays interactive while a card is generating
- [ ] Generated image cards drag, resize, connect, and delete like any other card

### Thought Stream (the Thoughts tab)
- [ ] Open Thoughts in the rail, tap the mic, speak for 20+ seconds, tap stop, confirm the recording appears with a playable audio player and a transcript shows up under "What I heard" within a minute
- [ ] Play the audio back, confirm it is your actual recording (raw audio is stored, not just the transcript)
- [ ] Attach a photo (on the phone this should offer the camera), confirm a thumbnail appears and a description of the image lands under "What I heard" plus a receipt below it
- [ ] Open the app on your phone, confirm the Thoughts tab is in the bottom bar and the composer (mic, photo, send) is comfortably tappable
- [ ] Record a dump on the phone specifically, since mic permissions and audio format differ on iOS Safari
- [ ] Paste a YouTube link, confirm the title lands and the receipt reflects the video's topic
- [ ] Hover a thought card and delete it, confirm it disappears without a confirm dialog
