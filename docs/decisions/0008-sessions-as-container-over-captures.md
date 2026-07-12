# 0008 · Sessions as a container over captures

**Status:** accepted (live) · **Date:** 2026-07-12

## Context

Thought Stream v1 (2026-07-12) established `captures` as the single raw archive: every thought stored immutably (audio blob, link, image, text), ingested into `extractedText`, distilled, and re-analyzable forever. The mobile-capture design (spec 2026-07-12) needs a *living entry*: one journal session a person keeps adding to across voice, typed text, and photos, listed chronologically with an AI title. The Journal element's June docs had reserved a `sessions` table shaped around morning/night beats and prompts; the July capture-first reframe redefined the Session entity as "raw capture + metadata" and made it the MVP spine's core unit, with the beats as front doors into it.

Two shapes were considered for the entry: a parallel `dumps` + `dumpSegments` store (segments own their audio/transcripts), or a thin container table pointing at ordinary captures.

## Decision

`sessions` is a **container, not a store**. One row per entry holding only container-level state (AI `title`/`summary`, `doing` context, `device`, timestamps, digest status); membership is an optional `captures.sessionId` with a `by_session` index. Raw truth stays on captures and their blobs, which the session never duplicates and whose deletion semantics it never touches (`deleteIfEmpty` removes only an empty container). The AI digest is derived state, debounced off member ingest completion, always recomputable. The reserved Journal `sessions` shape is superseded: the Journal, when built, owns `prompts` and opens/writes into this table ("clean storage, associative reading").

## Consequences

- One archive to mine: decomposition, linking, embeddings, and pattern passes read `captures` (optionally grouped by `sessionId`) and can run retroactively over everything ever recorded.
- Loose captures (board intake, stream composer, `voice.brainDump`) are untouched; session membership is purely additive.
- The stream and the entry are two views over the same rows; no sync problems, no duplicated transcripts.
- Container-level display data (preview, counts) is derived at read time from members, keeping storage clean at the cost of a small read amplification in `sessions.list` (bounded: 50 sessions, personal volumes).
- The Journal's beat/kind concept, when it lands, becomes a field or front-door convention on this table rather than a second sessions store.
