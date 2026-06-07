# 0007 — The file system on the human, the Listener, and the Center

**Status:** accepted · **Date:** 2026-06-04

## Context

The parts of a person were either frozen in code (the 18 Blueprint questions in `lib/blueprint.ts` → `coreResponses`) or reduced to a thin `values[]`/`themes[]` Mirror. There was no open-ended, growing structure for "everything that makes up a man," and no low-friction way to feed it. The product brief: an always-available voice button (`/speak`) that lets a person think out loud, and a system that routes what they say into who they are, building something long-term.

This realizes a first concrete slice of the parked **living person-model** research ([`../research/raw/internal-notes/living-person-model.md`](../research/raw/internal-notes/living-person-model.md)).

## Decision

Three parts, one loop:

1. **The file system on the human.** Model the person as a filesystem: `pillars` become **folders** (gaining `about` + `composition` metadata), and a new `coreFiles` table holds the **files** (`kind`, `content`, `status: active|pending`). Bootstrap seeds a **canonical 8-pillar skeleton** (idempotent top-up for older accounts). Pillars evolve in place rather than being replaced by a new `components` table (DRY, per the research note).

2. **The Listener** (`agents/listener/`). An always-available realtime voice persona that only listens and reflects. The onboarding interview's realtime engine is extracted into a shared `hooks/useRealtimeVoice.ts`; the Listener and the interviewer differ only in persona and post-call behavior. Reuses `interviewSessions` (`experienceId: "listen"`).

3. **The Center** (`agents/center/`, `convex/center.ts`). On call-end, it **always fans out one isolated synthesis per pillar**, each deciding the file ops for its own folder. Pure routing (`lib/center.ts`) classifies create / update / pending. It **never silently overwrites**: a contradicting change is held as `pending` for the person to resolve in the **filing report**.

## Alternatives considered

- **Feed the existing Core only** (Mirror values/themes + Blueprint answers). Rejected: no long-term, per-region accumulation — the whole point.
- **A new `components` table.** Rejected for v1: evolving `pillars` in place is less churn and matches the research lean.
- **Triage which pillars were touched, synthesize only those.** Rejected for v1 (chosen: always fan out) for thoroughness; revisit if cost bites.
- **Build store-first / voice-first in separate commitments.** Rejected: the voice half was already built, so one thin vertical slice was the easiest robust path.

## Consequences

- Schema grows by one table (`coreFiles`) and two optional `pillars` fields; new `center` AI task.
- N model calls per Listener session (N ≈ 8). Accepted.
- The Mirror is *not* re-grounded on the filesystem yet; that and lifecycle metadata (`freshness`/`timeConstant`/`ownerAgentId`) are deferred.
- Mobile's bottom-bar Coach tab became "Talk"; text Coach lost its mobile entry (open question in [`../product/features/listener.md`](../product/features/listener.md)).

## See also

[`../product/features/file-system-on-the-human.md`](../product/features/file-system-on-the-human.md) · [`../product/features/the-center.md`](../product/features/the-center.md) · [`../product/features/listener.md`](../product/features/listener.md) · [`../architecture/data-model.md`](../architecture/data-model.md)
