# 0020. A voice take is never lost to a cold start

**Status:** accepted (live) · **Date:** 2026-07-17

## Context

The strongest promise the capture surface makes is the plainest: **a thought a
person speaks is never lost.** Ariel hit a repeatable break in exactly that
promise (2026-07-17): opening the web app from a **cold start** — the app freshly
loaded, or resumed after the phone locked, the screen dimmed, or the PWA sat in
the background — tapping ➕, and rambling produced *nothing*. The take did not
save. Tapping ➕ a second time, immediately, always worked. "There can never be a
chance that something a user says isn't captured… what comes up comes up once,
and that's it."

**Root cause.** On the phone the mic arms against the `sessions.create` *promise*
so the first words never wait on the round-trip (see
[`../product/features/sessions.md`](../product/features/sessions.md)). On a cold
or resumed start the stored auth token can be momentarily stale while
`@convex-dev/auth` refreshes it, so the first mutation runs before the identity is
attached and `getAuthUserId` returns null — the server throws "Not authenticated."
Convex retries a *dropped socket* automatically, but a **thrown** server error
rejects the promise and is not retried. The provider's rejection handler treated
that as "the take has no home" and **cancelled the recorder mid-sentence**, so
everything after the first ~second went into a stopped mic. The whole ramble was
lost, silently (the error was swallowed). The second tap worked because the token
had refreshed in the meantime. The feature doc had even codified the flawed
assumption — "at most a couple of seconds of audio are lost, at the very start" —
which is wrong: the create rejects *fast*, killing the mic while the person is
still talking.

## Decision

**Decouple a recording from the entry it is filed into. A take is never discarded
because its entry could not be created.** Two independent layers, so the guarantee
does not rest on either one alone:

1. **Ride out the cold-start auth settle.** The mutations on the capture path —
   `sessions.create`, `files.generateUploadUrl`, `captures.create` — are wrapped
   in `lib/withRetry.ts`: a few short, exponentially backed-off retries (~4.5s
   total across the default schedule) that outlast a token refresh. Every wrapped
   op is safe to re-run on throw, because the auth check throws *before* any write
   — a retry never duplicates a row or a file.

2. **Never cancel a live take on create failure; give it a home at save.** The
   provider (`components/sessions/RecordingProvider.tsx`) no longer cancels the
   recorder when the target `sessions.create` rejects — the mic keeps running. At
   save it resolves the target entry, and **if there still isn't one it mints a
   fresh entry** for the take. Anything that still cannot save is kept as a
   `failedTake` (the blob held in memory, never re-recorded) and **auto-retried on
   a gentle cadence** until it lands, on top of the existing manual "Try again."
   `PendingTake.sessionId` is now `Id<"sessions"> | null` to carry a
   "no entry yet" take, and the created id is stamped back onto the take so a later
   retry reuses the same entry rather than spawning empty husks.

## Consequences

- **The promise holds through the actual failure mode.** The cold-start ramble
  that motivated this now records through the auth settle and files into a real
  entry — the trigger is fixed (layer 1) and there is a durable safety net if
  anything else races (layer 2).
- **The old "offline drops the take" edge case is gone.** Being offline no longer
  discards audio; the take waits in `failedTakes` and self-heals when connectivity
  and auth return. `docs/product/features/sessions.md` was updated accordingly
  (the "Never lose a take" paragraph, the table's optimistic-save row, and the
  edge-case list).
- **The only remaining loss is a hard app kill mid-take** (the in-memory blob dies
  with the tab). A crash-recovery buffer (persisting the live blob to IndexedDB)
  remains the parked follow-up; this ADR does not close it.
- **Not just the sessions surface.** The same silent-swallow shape exists in the
  legacy `components/thoughts/Composer.tsx` (Thought Stream), which is **not
  currently mounted** anywhere (the flat-stream tab was retired, ADR 0010). It was
  left untouched here; if it is ever remounted it must adopt the same "never
  discard the blob" contract before shipping.
- **Reversible and test-guarded.** `withRetry` is a pure helper with unit tests
  (`tests/with-retry.test.ts`); the provider change is local. Nothing was migrated
  (`sessionId` widening is a client type only, no schema change).
