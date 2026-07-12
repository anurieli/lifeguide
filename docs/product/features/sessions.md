# Sessions (the living entry)

**Status:** built (v1) · **Element of:** Sessions (feeds the Core) · **Owns:** `sessions` (container rows); members are `captures` rows via `captures.sessionId`

> A session is one living journal entry: a brain dump you keep adding to. Tap record and talk; the take lands as an entry you can reopen tomorrow to speak more, type into, or drop photos on. Every piece stays a raw, immutable capture; the entry is the document view over them, titled by AI for the chronological list. On the phone, this is the app's main action.

## 1. Purpose

The observation contract says: let the thought out first, structure later. The Thought Stream catches single thoughts; a session catches a *sitting*, the twenty-minute walk where one thread unspools across voice, a typed line, and a photo of the whiteboard. The roadmap's MVP capture spine names this entity ("Session: raw capture + metadata"). Because members stay ordinary captures with their raw artifacts kept forever, every future pass (decomposition into atomic thoughts, cross-session linking, pattern mining) can run retroactively over the whole archive; the session is the unit those passes will read.

## 2. User-facing behavior

**Starting one (phone).** The bottom bar's big center ● starts recording immediately: no form, a timer, a stop button. Stop saves the take and opens the entry; a too-short take (~1s) or the X saves nothing. If the mic is denied, "Type instead" opens an empty entry.

**The entry (document view).** The session's captures render in order as one flowing document: spoken passages as text (with a quiet inline player; "Listening back…" while transcribing; on failure, "the recording is safe" + Try again), typed passages, photos. A strip at the bottom continues the entry: write, add a photo, or record more. A small "What were you doing?" field holds context. Entries are never closed; reopening one days later and appending is the intended use.

**The list.** The Sessions tab is the chronological archive, newest first: relative time, voice/photo count glyphs, the AI title, and a one-sentence AI summary (until the digest runs, the entry's first words). Tap to open.

**Desktop.** Sessions is a rail tab; recording continues via each entry's strip or the Thought Stream composer (loose thoughts). Desktop remains the command center; the phone bar carries only Today · ● Record · Sessions · Talk.

## 3. Functions / actions

| Action | Trigger | What it does | Data touched |
|---|---|---|---|
| Start a take | ● (phone bar) | Records one whole audio file; stop creates the session + its first capture (`sourceMeta` carries device + durationMs); hands off to the entry | `sessions` (create), `captures` (create), `_storage` |
| Append (voice/text/photo) | Entry strip | `captures.create` with `sessionId` (ownership-checked); bumps `sessions.updatedAt` | `captures`, `sessions.updatedAt` |
| Ingest + distill members | Auto | Unchanged Thought Stream pipeline per capture | `captures.extractedText/extraction/distilled` |
| Digest | ~30s after a member's ingest completes | AI writes `title` + `summary` onto the session (idempotent; last append wins; skipped while any member is still ingesting) | `sessions.title/summary/digest` |
| Set context | "What were you doing?" field | Saves `doing` (≤200 chars) | `sessions.doing` |
| List / open | Sessions tab | `sessions.list` (derived preview + counts) / `sessions.get` (ordered members, file URLs resolved) | read-only |
| Retry transcription | Entry's Try again | Existing `captures.reprocess`; digest refreshes after | `captures.extraction`, then as ingest |
| No husks | Leaving an entry | `sessions.deleteIfEmpty` removes a container with no active members (raw captures are never touched by session deletion; an empty container holds none) | `sessions` (delete) |

## 4. Dynamics with other elements

- **Thought Stream.** Same `captures` table, same ingest, same receipts. Loose captures (`sessionId` absent) behave exactly as before; session members also appear in the stream. A visible session chip on stream cards is deferred (spec deviation).
- **Vision Board.** Unchanged. Session members surface in the board Inbox like any unplaced capture; a photo added to an entry from the phone is also inspiration waiting to be placed.
- **Journal (proposed).** The Journal's morning/night beats will *open* sessions (the roadmap's three front doors); the Journal owns `prompts` and writes into this table when built. See [`journal.md`](journal.md).
- **The Center / Core.** Not yet wired; sessions are upstream signal, like the stream.
- **The Listener.** Separate for now (`interviewSessions`); unifying Listener calls into this archive is an open question (see the listener memory backbone research note).

## 5. States and edge cases

- **No AI keys:** entries and captures land; digest no-ops with fallback title; transcription errors show with retry; nothing is lost.
- **Failed save of a take (network):** the RecordTake surface keeps the finished blob in memory and says so; stop retries the upload. Killing the app mid-take still loses it (accepted v1; crash-recovery buffer is a parked follow-up).
- **Failed transcription:** the audio file is stored regardless; the entry says "the recording is safe" with Try again.
- **Empty session:** only reachable via "Type instead" then bailing, or soft-deleting every member elsewhere; `deleteIfEmpty` on exit clears it.
- **Digest burst:** several appends in a row cost one model call (each ingest completion schedules a run 30s out; runs skip while any member is pending, and overwrite idempotently).
- **iOS Safari:** `useAudioRecorder` negotiates audio/mp4; ingest maps the extension. On-phone QA tracked in `TO-CHECK.md`.

## 6. AI involvement

One new node, `sessionDigest` (`convex/ai/config.ts`): OpenRouter, JSON `{title, summary}`, grounded strictly in member text via `lib/sessionDigest.ts` (`assembleDigestInput`, 6k cap, chronological, labeled by kind). Members' transcription/vision/distillation are the existing Thought Stream nodes.

## 7. Data touched

`sessions { userId, title?, summary?, doing?, device: phone|desktop, digest?{status: pending|done|error, at?}, startedAt, updatedAt }` (index `by_user_updated`); `captures.sessionId?` (index `by_session [sessionId, createdAt]`). See [`../../architecture/data-model.md`](../../architecture/data-model.md) and [ADR 0008](../../decisions/0008-sessions-as-container-over-captures.md).

## 8. Open questions

- Morning/night beats auto-opening a session (the Journal integration; roadmap front doors).
- Listener calls joining this archive (one table for all talk) vs staying on `interviewSessions`.
- The stream chip linking a member capture back to its entry.
- Whether the flat Thought Stream stays a top-level view once sessions dominate, or demotes to a filter.
- Decomposition: when atomic thoughts land (roadmap MVP back half), they extract *from* sessions and point back at member captures.
