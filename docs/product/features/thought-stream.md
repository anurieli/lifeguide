# Thought Stream

**Status:** built (v1) · **Element of:** Sessions (feeds the Core) · **Owns:** the ingest pipeline over `captures`; shares the `captures` table with the Vision Board

> The Thought Stream is the one spot where every thought lands: spoken dumps, typed notes, links, photos. Each thought is durably stored raw, AI-processed into text (transcription, article extraction, image reading), analyzed into a receipt, and kept retrievable forever. It is the capture half of the observation contract: the person lets thoughts out; the system visibly learns.

## 1. Purpose

The concept (see [`../concept-and-soul.md`](../concept-and-soul.md), "The observation contract") holds that a person is a system, and no system gets optimized without being tracked first. The Thought Stream is the tracking instrument. A lost person's thoughts about the life he wants, the crises he is in, and how life works according to him are the raw material for everything downstream: the Core, the Mirror, the zone-of-genius search. This surface removes every excuse between "I have a thought" and "it is in the system", then proves the system heard it. Its distinct contribution against the Vision Board (spatial, curated, slow) is temporal and effortless: a chronological valve you open when your head is full.

## 2. User-facing behavior

The surface is one column: a composer on top, the stream of thoughts below, newest first. It is the `Thoughts` item in the rail (and the mobile bottom bar), replacing the experimental Brain Dump Lab in the `dump` view slot.

**Recording a thought.** Four ways in, all first-class:
- **Speak.** Tap the record button, talk as long as needed, tap stop. The full recording uploads as one file. No live transcription pressure, no chunking: this is the "let go and explain what's on your brain" mode. Recordings under about a second are ignored.
- **Type.** A text box, submit with Cmd/Ctrl+Enter.
- **Paste a link.** If the input is a single URL it is captured as a link (YouTube/Vimeo URLs as `video_link`).
- **Drop a photo or file.** Images are analyzed; other files are stored durably for later parsing.

Every capture stamps `sourceMeta` (device: phone or desktop) so the when/where/how of thinking accrues alongside the what.

**Watching it process.** Each card shows three layers as they fill in, live (Convex reactivity, no refresh):
1. **Raw:** the playable audio, the image, the link, the text. The raw artifact is permanent and replayable.
2. **What I heard:** the extracted text (transcript, article body, image description), collapsed behind a toggle. While processing, a calm status line shows ("Listening back…", "Reading the link…", "Looking at the image…"). Errors show quietly with a retry.
3. **What I took from it:** the distilled receipt (title, essence, pillar tags). This is the visible-learning moment, the reason the stream feels like a place that is learning you rather than a bucket.

**Managing.** A quiet delete soft-deletes a card (the row survives for the Mirror). Reprocess retries a failed extraction; it can also re-analyze an old thought after the pipeline improves, because the raw is never discarded.

## 3. Functions / actions

| Action | Trigger | What it does | Data touched |
|---|---|---|---|
| Capture (speak/type/link/photo/file) | Composer | Uploads raw (if a file) to storage; inserts a `captures` row; schedules ingest | `captures` (create), `_storage` |
| Ingest | Auto after create, or reprocess | Derives `extractedText` from the raw: Whisper transcript (audio), fetched title/description/body (link), vision description + verbatim visible text (image); text passes through; files stored only. Writes `extraction` status/meta, then schedules distillation | `captures.extractedText`, `captures.extraction` |
| Distill | Auto after ingest | The existing distill pass, now reading `extractedText` first (with the person's own note prepended when both exist) | `captures.distilled` |
| Stream | Query | Active captures newest-first with `fileUrl` resolved from storage for playback/display | read-only |
| Reprocess | Retry button (or future pipeline upgrades) | Resets extraction to pending, reschedules ingest | `captures.extraction`, then as Ingest |
| Soft delete | Card action | Flags `isActive: false`; row and raw file kept | `captures.isActive` |

## 4. Dynamics with other components

- **Vision Board.** Same `captures` table. Board adds still distill and place as before (their ingest is a pass-through for text, real extraction for links/images, which the board also benefits from). Thoughts recorded in the stream are not auto-placed on the board; placement stays a board/Coach concern.
- **The Center / file system on the human.** Not yet wired: stream thoughts do not yet file into `coreFiles`. This is the next loop (see Open questions).
- **Voice brain dump on the board** (`voice.brainDump`) still splits a live transcript into multiple text captures; those flow through the same ingest (skipped extraction) and appear in the stream too. One table, one history.
- **Mirror / interactions.** Unchanged for now; the stream is upstream signal.

## 5. States and edge cases

- **No AI keys:** captures land and are listed; extraction errors or distill silently no-ops; nothing is lost, reprocess works once keys exist.
- **Extraction failure** (fetch blocked, transcription error): `extraction.status = "error"` with a truncated message; distillation still runs on whatever text exists (raw text or bare URL) so a receipt usually appears anyway.
- **Bare image with no note:** extraction produces the description; distill runs on it (previously bare images were never distilled).
- **Huge pages / long dumps:** extracted text capped at 8k chars; Whisper accepts files to 25MB (roughly 20+ minutes of opus voice).
- **Paywalled/bot-blocked links:** fetched with a browser user agent; on failure the URL string itself still distills.
- **Anonymous users:** everything is per-user (`getAuthUserId`), same as the rest of the app.

## 6. AI involvement

Three AI nodes (see `convex/ai/config.ts`): `voiceTranscribe` (Whisper, OpenAI-pinned) for audio; `extractImage` (vision chat) for images; `distill` for the receipt. Link extraction is deterministic (fetch + `lib/extractHtml.ts`), no model. All keyed per-user with deployment fallback, all server-side.

## 7. Data touched

`captures` (extended: `rawType` gains `audio` and `file`; new `sourceMeta`, `extractedText`, `extraction{status,error,meta,at}`), `_storage` (audio blobs, images, files, all permanent). See [`../../architecture/data-model.md`](../../architecture/data-model.md).

## 8. Open questions

- **Filing into the Core:** when does a stream thought reach `coreFiles`? Likely the Center runs over accumulated dumps on a cadence (or per dump). Parked; see the Listener memory backbone research note.
- **Document parsing** (`file` rawType): PDFs and docs are stored but not yet read.
- **Video links:** we capture title/description; pulling transcripts is a follow-up.
- **When/where metadata:** `sourceMeta` holds device today; location and richer context ("what I was doing") are deliberate future adds, consent-first.
- **The Brain Dump Lab** (`components/brain-dump/BrainDumpLab.tsx`) lost its nav slot to this surface; its idea-graph experiment stays in the codebase pending a decision.
