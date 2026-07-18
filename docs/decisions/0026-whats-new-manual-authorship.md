# 0026. What's New: manually authored entries, not auto-generated from CHANGELOG.md

**Status:** accepted · **Date:** 2026-07-18

## Context

ARI-105 asked for an in-app "What's New" feed docked at the bottom of the app shell: every time a feature ships, an entry appears; it leaves a user's feed only once they click that specific entry and it navigates them to the surface showing the feature. Ariel's stated goal is passive discovery — users should stumble onto what's new in the flow of the app rather than being expected to go read a changelog.

The repo already has a rigorously maintained `CHANGELOG.md` — every meaningful change appends an entry there (repo rule, `CLAUDE.md` §2). It was worth asking directly: could What's New just **read** that file, or a table populated from it, instead of adding a second authored artifact?

## Decision

**Entries are manually authored by the owner**, through the same owner-gated `/admin` surface as the rest of the admin content (`WhatsNewAdmin.tsx`, alongside `FeedbackInbox.tsx`), with warm, user-facing copy — not generated from `CHANGELOG.md`.

The two are addressed to different readers and say different things by design. Compare an actual recent `CHANGELOG.md` entry:

> "Added `recompute` mutation to `convex/settings.ts`. It loads all `coreResponses` for the authed user, builds a `{ questionKey: content }` map, calls `blueprintStatus()` and `deriveLevel()`... Covered by TDD... Files changed: `convex/settings.ts`, `tests/convex/levels-settings.test.ts`..."

against what a What's New row needs to be: one sentence, in second person, about what the *person* gets — "Your Core now recalculates your level automatically." A changelog entry is a receipt, written after the fact, for whoever picks up the repo cold (another agent, future-Ariel); it accumulates file paths, commit-style language, and internal terms (`recompute`, `coreResponses`) because that's exactly what makes it useful *as a changelog*. A What's New entry is a small piece of marketing copy aimed at someone who has never heard of a mutation. Feeding one into the other mechanically produces either unreadable engineer-speak or requires an AI rewrite pass with no human review before it ships to every unseen user — and this is a small, low-frequency, highly visible surface (a person opens the panel a handful of times and reads every row) where one tone-deaf or wrong line does more damage than a missing entry.

This also matches the one existing precedent for owner-authored, user-facing content in this codebase: the **Coach Knowledge Base** (`docs/product/coach-knowledge-base/`, referenced in `CLAUDE.md`) is explicitly owner-authored and lives behind owner-gated admin (ADR 0006) rather than being derived from some other technical artifact. What's New follows the same shape: a small owner-curated table, written through `/admin`, gated the same way.

Not every shipped change gets an entry, either — most `CHANGELOG.md` entries are internal (refactors, test coverage, doc rebuilds) and would be noise in a user-facing feed. Manual authorship is also a **selection** mechanism: the owner decides which shipped changes are worth a user's attention, not just how to phrase the ones that are.

## Why not the alternatives

- **Auto-generate from `CHANGELOG.md` verbatim:** wrong register entirely (file paths, commit-style language, internal names) — would need heavy postprocessing to be readable, and still couldn't do the human "is this even worth surfacing" filtering above.
- **Auto-generate via an AI rewrite pass over `CHANGELOG.md` entries:** solves the tone problem but not the selection problem, and ships copy with no review step directly into a user-facing feed — the same "one bad line does real damage" concern as above, now compounded by an extra point of failure (a bad rewrite silently going live). Revisit if authoring volume ever makes manual writing the bottleneck; today it plainly isn't (`whatsNew` entries will be far rarer than `CHANGELOG.md` entries).
- **No feed at all, point users at `CHANGELOG.md`:** defeats the actual goal (passive, in-app discovery) and was never seriously on the table given ARI-105's brief.

## Consequences

- The owner must remember to author a What's New entry separately from (and after) the `CHANGELOG.md` entry, for any change judged worth surfacing to users. To make that a habit rather than a thing that quietly lapses, `CLAUDE.md`'s Git & PR conventions section now carries a one-line reminder: user-facing changes ship with a What's New entry in the same PR.
- No mechanical link between a `whatsNew` row and the `CHANGELOG.md`/commit that shipped it — they are two independent artifacts serving two independent readers. If that traceability turns out to matter, a future `whatsNew.sourceCommit?` field is a cheap, additive way to add it without changing this decision.
- Authoring is fully manual today (title/body/view, no AI assist, no templates). If entry volume grows, a lightweight "draft from this CHANGELOG entry" assist *for the owner to edit*, not to auto-publish, would be a reasonable middle ground — deferred, not needed at current shipping cadence.
