# 0031. App feedback auto-forwards to Linear as `agent:cody` tasks

**Status:** accepted (built, flag off by default) · **Date:** 2026-07-22

## Context

[ADR 0019](0019-feedback-to-linear.md) gave the feedback inbox a deliberate, human-triaged "Export to Linear" button: the owner reads a ticket, decides it deserves a tracked issue, names it, sets urgency, and exports. That stays right for turning raw notes into *worked* Linear issues with real names and priorities — a person, not the widget's `bug|tweak|feature|feedback` tag, decides what a ticket actually is.

Separately, LifeGuide now has a coding agent (**Cody**) that picks up Linear issues labeled `agent:cody`, reads them, and works them — posting its understanding/proposal/confidence to the repo's Slack channel per its SOUL. Every feedback submission is a candidate signal for Cody, but routing each one into Cody's queue by hand (read the inbox, decide, export, add the label) is exactly the kind of manual step that causes signal to sit unrouted. The dogfooding volume is still low enough that **all** feedback is worth Cody at least looking at — there is no need yet for a human filter before that first look.

## Decision

**Every feedback submission also auto-forwards to Linear as an `agent:cody` task, gated by a flag.** `convex/feedback.ts` `submit` schedules a new internal action, `convex/linear.ts` `autoForwardFeedback` (`ctx.scheduler.runAfter(0, …)` — not awaited, so a slow or down Linear API never delays or blocks the user's submit).

**This is a dumb, reliable pipe, not a second triage step.** No filtering, no re-typing, no LLM enrichment or rewrite of the note. The created issue carries the feedback close to verbatim — type, view, submitter, the full text under "What they said," and the attached image (if any) uploaded to Linear and embedded — tagged `agent:cody`, set to **Todo**, in the same LifeGuide team/project the manual export uses. The body leads with a line the Cody bridge requires to route the task (`Repo: lifeguide`) and closes with an explicit instruction: read this, then per Cody's SOUL post understanding + proposal + confidence to Slack. **The interpretation — is this real, is it a bug or a feature, how urgent — is Cody's job, not this pipeline's.** This is the same reasoning ADR 0019 used to keep manual export human-judged, applied in the other direction: a pipe that does no judging at all is honest about doing no judging, rather than pretending the `bug|tweak|feature|feedback` tag is a reliable classification.

**Off by default, one flag flips it on.** `FEEDBACK_AUTOFORWARD` unset (or falsy) → the scheduled action no-ops immediately. Setting `FEEDBACK_AUTOFORWARD=1` on the Convex deployment (`npx convex env set FEEDBACK_AUTOFORWARD 1`) activates it. This makes merging the code safe on its own — nothing changes in prod until the flag is deliberately flipped — and keeps activation a conscious, separate act from shipping.

**No schema change.** The `feedback.linear` field already exists (ADR 0019) and is reused unchanged as the idempotency guard: `autoForwardFeedback` is a no-op if the row already has `linear` set (by either path), and on success it sets the same `{issueId, identifier, url, at}` shape the manual export writes. A row filed by one path is simply done, regardless of which path filed it.

**DRY with the manual export path.** `convex/linear.ts` factors the shared `issueCreate` GraphQL call out into `createLinearIssue(apiKey, input)`, used by both `exportFeedback` (manual, no `labelIds`/`stateId` — left for the owner to set) and `autoForwardFeedback` (always `labelIds: [agent:cody]`, `stateId: Todo`). The asset-upload loop is similarly factored into `uploadFeedbackAssets`. Two new internal-only functions in `convex/feedback.ts` support the auto-forward path specifically: `getRowForAutoForward` (like `getRowForExport`, but not auth-gated — the scheduled action runs with no user identity) and `markExportedInternal` (the internal-mutation equivalent of the auth-gated `markExported`).

**Best-effort, never blocks or surfaces to the user.** Any failure — flag off, missing `LINEAR_API_KEY`, a Linear API error — is caught, logged, and swallowed inside the action. A failed forward leaves `linear` unset, so the row stays visible to `adminList` (the out-of-band terminal triage added 2026-07-20) and the `lifeguide-feedback` skill, and can still be exported manually or picked up by a future retry sweep.

## Consequences

- Once `FEEDBACK_AUTOFORWARD=1` is set in prod, every feedback submission reaches Cody's queue with zero manual routing — the fastest possible path from "a user hit an issue" to "an agent is looking at it."
- The manual "Export to Linear" button (ADR 0019) is unchanged and still useful: it is how a human names an issue properly and sets urgency for something that needs to be worked by a person, not Cody. The two paths share the same `linear` idempotency field, so exporting manually first (before auto-forward runs) is a valid way to opt a specific ticket out of the `agent:cody` label.
- Volume risk: because there is no filtering, every stray or half-formed note becomes a Linear issue and a Slack post once the flag is on. Accepted for now given low dogfooding volume; if it becomes noisy, the fix is at the flag (turn it off) or in Cody's own judgment (its SOUL is expected to say "not real, skipping" for junk), not by adding a filter back into this pipe — see the "dumb pipe" framing above.
- No retry loop yet for failed forwards (see `feedback-widget.md` §10's open question) — a sweep of unlinked rows is a possible follow-up once real failure rates are known.
- New module surface: `convex/linear.ts` gains `autoForwardFeedback` (internal action), `createLinearIssue`/`uploadFeedbackAssets` (shared helpers), `deriveAutoTitle`/`buildAutoForwardDescription` (auto-forward-specific formatting), and the fixed `agent:cody` label id / Todo state id constants (not env-overridable, unlike team/project). `convex/feedback.ts` gains `getRowForAutoForward` and `markExportedInternal`, both internal-only.
