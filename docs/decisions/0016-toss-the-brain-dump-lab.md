# 0016. Toss the brain-dump idea-graph lab

**Status:** accepted (done, 2026-07-13)

## Context

The Brain Dump Lab (`components/brain-dump/BrainDumpLab.tsx` + `convex/brainDumps.ts` + `lib/brainDumpGraph.ts` + the `brainDumpSessions` table) was an experiment: maintain a live idea graph (ideas + relations JSON) from a spoken stream, with per-session engine knobs and its own AI-call audit trail. It lost its nav slot to the Thought Stream on 2026-07-12 and had been sitting unreachable since — no route, no nav entry, no import rendered it. Its config node (`brainDumpGraph`) was also misleading: the Settings list showed one model while the lab's real runtime default lived in `lib/brainDumpGraph.ts`.

Reviewing the AI nodes (2026-07-13), Ariel called it: "brain dump graph — just toss."

## Decision

Delete the lab outright rather than keep parking it: the component folder, `convex/brainDumps.ts`, `lib/brainDumpGraph.ts`, its tests, the `brainDumpSessions` schema table, the `brainDumpGraph` config node, and the now-orphaned `aiForEngine` helper.

The **shipped** brain-dump flow is untouched and unrelated in code: the Vision Board voice modal (`components/voice/BrainDump.tsx` → `voice.brainDump` → `brainDumpSplit` → one capture per thought). Same name, different machine — the naming collision was half the confusion.

## Consequences

- ~1,900 lines of unreachable code gone; the Settings AI list now only shows nodes that can actually run.
- Everything remains in git history; if a concept-graph surface returns, it should be rebuilt against the current capture/session spine rather than revived from this experiment.
- The lab's per-session AI-call audit idea was the seed for the universal AI log that replaced it (ADR 0017).
