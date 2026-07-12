# Mobile capture + Sessions (the living entry) — design

> **Status:** approved design, pre-implementation · **Tracked in:** [ARI-24](https://linear.app/cuttheedge/issue/ARI-24) · **Parked sibling:** [ARI-25](https://linear.app/cuttheedge/issue/ARI-25) (Vision visualization player, v1.1)
> **Builds on:** [Thought Stream v1](../../product/features/thought-stream.md) (`16a8c17`), the capture-first reframe in [`docs/roadmap.md`](../../roadmap.md), and the one-loop spine in `raw/life-coach-app-action-plan.md`.

## 1. Context: what this is the delta of

Brainstormed 2026-07-10 as "mobile quick capture + immutable recordings archive." Between design and build, **Thought Stream v1 shipped** and already delivers the archive layer this design demanded: whole-file voice recordings stored raw and replayable forever, Whisper ingest with retry/reprocess, typed notes, links, photos and files as first-class captures, distilled receipts (title, essence, pillars), `sourceMeta` (device), and a chronological stream view. The "never lose a take" ground truth exists.

This spec covers what remains, in the roadmap's own vocabulary:

1. **Session, the living entry.** One journal entry / brain dump you can keep adding to (the Mindsera model): speak, type, add photos, come back tomorrow and continue. The roadmap's MVP names this entity ("Session: raw capture + metadata"); today captures are loose cards with no container.
2. **The mobile-first shell.** On a phone the app reduces to the daily panel plus a bottom bar with a big center record button. Desktop stays the command center.
3. **Session digest.** An AI-written title + one-line subtext per session, for the chronological list.

Explicitly retroactive-friendly, per the core thesis: because every capture keeps its raw artifact and extracted text, any future pipeline (decomposition into atomic thoughts, cross-session linking, embeddings, pattern mining) can run over the entire backlog after the fact. Nothing in this build blocks that; the Session container is what those passes will read.

## 2. The model

**A session is a container over captures; captures stay the single source of raw truth.** No parallel storage layer. The Thought Stream remains the flat, all-captures view; Sessions is the grouped, entry-shaped view over the same rows ("clean storage, associative reading").

- Tap the center record button → recording starts immediately (zero friction, no form). Stop → a new session is created holding that take as its first capture. Ingest and distillation run exactly as they do today.
- Open a session → the document view: its captures render chronologically as one flowing entry (transcript text, typed passages, photos inline). At the bottom: a "Write here" input, a mic button to continue with voice, and a plus menu (photo, "what was I doing").
- Every added piece is just a new capture with `sessionId` set. Segments are immutable; managing them inherits the stream's soft-delete.
- Captures without a `sessionId` (composer quick thoughts, board intake, `voice.brainDump` splits) keep working unchanged.

## 3. Data model (Convex)

Additive only; nothing existing moves.

```ts
// A session is one living journal entry: an ordered container of captures that the
// person keeps adding to over time. Raw stays on captures; this row holds only
// container-level state (digest, context). See docs/roadmap.md "MVP — the capture spine".
sessions: defineTable({
  userId: v.id("users"),
  title: v.optional(v.string()),    // AI digest; fallback: date + first words
  summary: v.optional(v.string()),  // AI one-liner for the list view
  doing: v.optional(v.string()),    // optional "what I was doing" context, person-entered
  device: v.union(v.literal("phone"), v.literal("desktop")), // where it was opened
  digest: v.optional(
    v.object({
      status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
      at: v.optional(v.number()),
    }),
  ),
  startedAt: v.number(),
  updatedAt: v.number(),           // bumped on every appended capture
}).index("by_user_updated", ["userId", "updatedAt"]),
```

`captures` gains one optional field:

```ts
sessionId: v.optional(v.id("sessions")),
```

plus an index `by_session: ["sessionId", "createdAt"]` for the document view.

**Not** in this build: `atomicThoughts` / main-thought promotion (the membrane), embeddings, cross-session relations. The roadmap's decomposition step reads sessions later; storing clean now is what makes that possible.

## 4. Mobile shell

- Breakpoint: the existing `md` split in `Rail.tsx`; no user-agent sniffing.
- **Mobile bottom bar: Today · ● Record (center, elevated) · Sessions · Talk.** Board and Core disappear from the mobile bar (still reachable on desktop; Settings stays in the account menu). The center button is visually dominant, per the original ask.
- ● tap: starts recording immediately using the existing `useAudioRecorder` full-file path, over a minimal full-screen take surface (timer, waveform pulse, stop, cancel). Stop → create session, upload take, land in the session document view so typing/photos can continue the entry right away.
- Desktop: rail unchanged except the `dump` slot's Thought Stream gains a Sessions tab (stream = flat view, sessions = entries), and the Coach dock keeps working. The record path exists on desktop too via the composer, unchanged.
- The Today panel stays the mobile home (respond to the daily beats); nothing else about Today changes in this build.

## 5. Session digest (AI)

New AI task `sessionDigest` in `convex/ai/config.ts` (OpenRouter with OpenAI fallback, per ADR 0003): reads the session's captures' `extractedText`/`rawText` in order (capped ~6k chars), returns `{title, summary}` JSON. When a capture with a `sessionId` finishes ingest, a digest run is scheduled ~30s out; the run reads the session's current captures, so the last append always wins, and overlapping runs are harmless (idempotent overwrite of `title`/`summary`). Failure: `digest.status = "error"`, list falls back to date + first words; next append retries. One model call per append-burst, matching the calm-AI principle.

## 6. Views

- **Sessions list** (mobile tab + desktop sub-tab): chronological, newest first. Each row: date/time, AI title, AI subtext, small glyphs for content kinds (voice minutes, photos). Tap → document view.
- **Session document view**: the entry as one readable document; per-capture affordances stay quiet (play audio inline, retry ingest, soft-delete). Composer strip pinned at the bottom (write, mic, plus).
- **Thought Stream**: unchanged; session-member captures show a small session chip linking to the entry.

## 7. Errors and edge cases

- **Recording failure modes inherit Thought Stream v1**: the raw take uploads even if transcription fails; ingest errors show quietly with retry; nothing is silently lost. Recordings under ~1s ignored.
- **Kill/crash mid-take**: same as v1 composer behavior (take lost before stop). Accepted for MVP; a local crash-recovery buffer is a follow-up, not scope creep here.
- **Mic denied on mobile**: the take surface offers "type instead," which still creates the session.
- **iOS Safari**: `useAudioRecorder` MIME negotiation (audio/mp4) already handled in ingest; verify on-device as part of DoD.
- **Empty session** (created then cancelled): sessions with zero captures are deleted on exit, so the list never shows husks.
- **No AI keys**: sessions and captures land; digest no-ops; list uses fallbacks.

## 8. Out of scope (deliberately)

Analysis / AI comments on entries (Mindsera's blue layer), decomposition into atomic thoughts, cross-session batching/linking, editing or reordering segments, offline queueing, location capture, the Vision visualization player ([ARI-25](https://linear.app/cuttheedge/issue/ARI-25)), any Listener changes. Inspiration capture from the phone already exists via the composer (photo/quote/link land as captures and surface in the board Inbox).

## 9. Testing / definition of done (mirrors ARI-24)

- Record a 2+ minute take on a real iPhone; the audio is playable from desktop and the transcript matches.
- Typing and photos mid-entry land as ordered captures in the session; continuing the entry the next day appends and refreshes the digest.
- Transcription failure never loses audio (take survives; retry works).
- A phone-captured photo/quote appears distilled in the desktop board Inbox.
- Unit tests: session ordering assembly, digest input assembly + fallback title, empty-session cleanup. Manual smokes logged to `TO-CHECK.md`.
- Mobile bar shows Today/Record/Sessions/Talk only, at ~390px; desktop rail unaffected.

## 10. Docs to update in the build (same change, per CLAUDE.md)

`docs/product/features/sessions.md` (new, from `_TEMPLATE.md`), `docs/product/features/thought-stream.md` (session chip + relation), `docs/architecture/data-model.md` (sessions table + captures.sessionId), ADR (sessions as container over captures; why not a parallel segments table), `docs/roadmap.md` (mark the Session entity + mobile front door in progress), `CHANGELOG.md`.

## 11. Implementation deviations (locked at build, 2026-07-12)

- **Sessions is its own rail view on desktop too**, not a sub-tab inside Thoughts (simpler shell; the stream stays the flat view, Sessions the grouped one).
- **Sessions are created with their first capture** (or on "Type instead"); husk cleanup is `deleteIfEmpty` fired on the entry's explicit back action plus a sweep when the list renders. NOT effect cleanup: React StrictMode's dev double-mount fires unmount cleanup immediately and would delete a just-opened empty entry (found live during verification). The server re-checks emptiness before deleting, so neither path races an in-flight append.
- **The session chip on Thought Stream cards is deferred** to a follow-up; membership is stored (`captures.sessionId`) but not yet surfaced on stream cards.
- The RecordTake surface **keeps a finished take in memory after a failed save** so stop retries without re-recording (strengthens the "never lose audio" rule beyond the spec's wording).

## 12. Open questions (parked, not blocking)

- Relation of `sessions` to `interviewSessions` (Listener calls): should Listener calls eventually become sessions in this table so all talk lives in one archive? Adjacent to the [listener memory backbone](../../research/listener-memory-backbone.md) research; decide when that work is picked up.
- Morning/night beats as "front doors" that auto-open a session (roadmap MVP): natural next slice after this ships.
- Whether the flat Thought Stream remains a top-level view once sessions dominate usage, or demotes to a filter.

## 13. Revision: capture v2 (same day, after first phone use)

Ariel's feedback on the shipped v1, from using it on his phone, replaced several v1 surfaces. Locked as built:

- **The bar's center button is a screen-centered ➕, not a mic**, and the Talk/Listener tab left the phone bar entirely (two voice buttons read as the same thing). Bar: Today · ➕ · Sessions (+ avatar). The Listener stays desktop (Coach dock).
- **➕ opens the document, not a recording overlay.** It creates a fresh session, lands inside its empty entry, and starts recording inline there (RecordTake deleted). While recording, the page stays usable: type, add photos. Tapping ➕ always starts a NEW session; appending to an old one goes through the list.
- **The entry is one continuous document**: no "Write here" strip, no send button. Tap anywhere and type; the paragraph commits as a text capture on blur. Mic (primary) + photo float bottom-right; a live take shows in-flow as a pulsing timer. A failed take save stays in memory on the page with Try again.
- **List gestures:** swipe left pins/unpins (`sessions.setPinned`, pinned lead the list); swipe right parks the row open with a Delete confirm (`sessions.remove`: container deleted, members soft-deleted with raw + `sessionId` kept). Desktop gets hover equivalents. Rows use `touch-action: pan-y` and suppress the post-swipe click.
- **Merge:** Select 2+ entries → `sessions.merge` folds them into the earliest-started one; members re-parent, `createdAt` ordering interleaves the merged document chronologically, digest re-synthesizes.
- **Element metadata:** every capture keeps `createdAt`; audio `sourceMeta` gains `recordingStartedAt` next to `durationMs`; sessions gain `pinnedAt?` and `lastOpenedAt?` (`sessions.touchOpened` on document open, deliberately not bumping `updatedAt`).
- **Atmosphere is desktop-only**; the phone shell hides the music player.

## 14. Revision: capture v2.1 (same day, second round of phone feedback)

- **The bar is five even slots: Today · Board · ➕ · Sessions · account.** With only two flexing tabs, the active tab's solid accent fill painted half the bar dark (the "wtf is this menu bar" screenshot). Now only the ➕ is dark; active tabs get a light `accent/10` tint. The Board joins the phone bar (per Ariel's sketch); Core and Thoughts stay desktop-only. Mobile bar and desktop rail are separate JSX trees in `Rail.tsx` (the shared-classname tree kept breaking one to style the other).
- **A live take has pause, resume, and discard.** The mic swaps for a slim pill while recording: ✕ (two-tap confirm) · ⏸/▶ · ■ save. `useAudioRecorder` gained `pause/resume/cancel`; paused stretches add no audio and no elapsed time (MediaRecorder.pause + accumulated-run timing).
- **Recording survives navigation.** The take moved out of SessionDoc into `RecordingProvider` (mounted in AppShell above the view switch): navigate anywhere mid-take and it keeps recording; a top-center pill (dot · elapsed · Recording/Paused) leads back to the entry. Only one live take exists; starting another saves the current first. The husk sweep and the back action both exempt the entry a live take is recording into. The failed-take retry blob also lives in the provider now, so it survives leaving the document. The ➕ handoff (`autoRecordId` + StrictMode ref guard) is gone; the shell starts the take directly.
- **Atmosphere's engine is gated off phone viewports**, not just its orb: `attemptPlay` no-ops below `md` (autoplay used to arm a first-tap play on the phone with no visible control to stop it) and crossing into the phone breakpoint mid-play pauses.
- **Hardening:** a synchronous `MediaRecorder.start()` throw (dead stream, mic yanked) is caught and surfaces as mic-unavailable; the take target clears so no zombie recording pill survives.
