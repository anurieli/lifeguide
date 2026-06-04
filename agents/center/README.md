# The Center

The **Center** is the orchestrator that turns what the Listener heard into durable structure: it files the conversation into the **file system on the human**.

When a Listener (`/speak`) call ends, the Center:

1. Loads every pillar's metadata (`about`, `composition`) and its current files.
2. **Fans out — one isolated synthesis per pillar.** Each pillar, on its own, decides what (if anything) from the transcript belongs in its folder. One pillar's noise can't corrupt another. (Per product decision, every pillar always gets its own pass.)
3. Applies the result: new files are created, refinements update existing files, and any change that **contradicts** held truth is held as a `pending` file for the person to decide — never silently overwritten.
4. Returns a **filing report**: what was heard, and what got filed where.

## Where the pieces live

- **The contract** — the per-pillar prompt and the shape the model must return: [`synthesis.ts`](synthesis.ts) (`buildPillarSynthesisPrompt`, `parsePillarSynthesis`, `FileOp`).
- **Pure op-planning** — matching ops to existing files and classifying create / update / pending: `lib/center.ts` (unit-tested in `tests/center.test.ts`).
- **Orchestration** — fan-out, applying ops via `coreFiles` mutations, building the report: `convex/center.ts` (`synthesizeSession`).
- **The model** — the `center` task in `convex/ai/config.ts`.
- **Feature doc:** [`docs/product/features/the-center.md`](../../docs/product/features/the-center.md).

The Center is the core-curator role from `docs/product/features/coach.md` made literal, scoped for v1 to filing (no Mirror re-synthesis yet).
