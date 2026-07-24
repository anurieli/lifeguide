# 0031. App feedback auto-forwards to Linear, type-routed

**Status:** accepted (built, flag off by default) · **Date:** 2026-07-22 · **Amended:** 2026-07-24 (type-routed — see the amendment below)

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

## Amendment (2026-07-24): type-routed forwarding, and the admin surface goes read-only

The original decision above forwarded **everything** to one lane — `agent:cody` + Todo — on the reasoning that the widget's `bug|tweak|feature|feedback` tag is not a reliable classification, so the pipe should do no judging and let Cody interpret. Two things changed that calculus once the four feedback types (ADR-less schema change in `62635be`) settled in:

1. **Not every type should reach Cody, and not every type belongs in the same state.** A `feature` request is not something Cody should silently pick up and start building — it needs to be parked for human prioritization first. And a plain `feedback` note (general commentary, "I like this," "this felt off") is often not a code task at all, and the downstream agent has no email/reply capability to act on it — filing it as a Linear issue just creates noise.
2. **The tag is now a deliberate user choice**, presented as four distinct, described options in the composer, not a default. It is still not a *classification of severity*, but it is a reliable-enough statement of **intent** (report a break vs. tweak vs. request vs. comment) to route on. Routing on intent is not the same as the "judging" ADR 0019/this ADR warned against — Cody still does all the interpretation of *what the thing actually is*; the pipe only decides *which lane the user's stated intent lands in*.

**The pipe stays dumb (no filtering, no re-typing, no AI rewrite) but is now type-routed.** `routeForType(type)` in `convex/linear.ts` maps the row's own `type` to labels + workflow state:

| `type` | Linear labels | Workflow state | Reaches Cody? |
|---|---|---|---|
| `bug` | `agent:cody` + `Bug` | Todo | Yes — picked up |
| `tweak` | `agent:cody` + `Improvement` | Todo | Yes — picked up |
| `feature` | `Feature` (no `agent:cody`) | **Backlog** | No — parked for human prioritization |
| `feedback` | *(no issue filed at all)* | — | No — stays in the app only |

- **`tweak` → `Improvement`:** the team has no literal "Tweak" label; `Improvement` is its exact semantic match ("improve something that already exists"). If a dedicated "Tweak" label is created, repoint the `TWEAK_LABEL_ID` constant.
- **`feedback` → not filed:** `routeForType` returns `null`; `autoForwardFeedback` returns before touching Linear and leaves the row unlinked (`status: open`), so it stays visible in the app's admin queue but never becomes a Linear issue.
- Label/state IDs are fixed constants (verified against the Linear team 2026-07-24), same non-env style as the original `agent:cody`/Todo constants; team/project remain env-overridable.

**The admin surface (`FeedbackInbox`) becomes read-only.** With every actionable submission (bug/tweak/feature) filed to Linear in real time and its status worked *there*, the in-app inbox no longer drives triage. It drops the manual **Export to Linear** composer, **Mark as replied**, **Dealt with**, and **Reopen** — leaving a read-only window: each row shows its status read-only, links out to its Linear issue when one exists (`View in Linear`), and offers a plain `mailto:` **Reply** with no status side effect. `feedback`-type rows (never filed) simply display, labeled "not filed — stays in the app." The owner-gated lifecycle mutations (`markPending`/`resolve`/`reopen`) and the manual `exportFeedback` action still exist server-side and the terminal/skill triage path (`adminList`/`adminSetStatus`/`adminResolveMany`, ADR note in `feedback-widget.md` §9) is unchanged; only the browser UI stopped surfacing manual triage.

**Coach / MCP (CLAUDE.md rule 5):** does the Coach need this? **No — and here's why.** Feedback is builder/dev tooling, an owner-and-infrastructure concern (ADR 0006 owner-gated), not part of any user's self or plan. The Coach's job is to know the person and act across *their* space; the cross-user feedback queue and its Linear routing are not that person's context and not something the Coach should read or act on. By parity the MCP does not need it either. This stays out of the Coach Capability Registry by deliberate decision, not omission.

## Consequences

- Once `FEEDBACK_AUTOFORWARD=1` is set in prod, every **bug/tweak** submission reaches Cody's queue with zero manual routing, every **feature** lands parked in Backlog for prioritization, and plain **feedback** stays in the app — the fastest possible path from "a user hit an issue" to "an agent is looking at it," without Cody being handed feature scope or non-code commentary.
- The manual `exportFeedback` action (ADR 0019) still exists server-side, sharing the same `linear` idempotency field, so exporting a ticket manually first (before auto-forward runs) still opts it out of the auto path. Its **UI button is gone** as of the amendment — the admin surface is read-only — but the action remains callable (e.g. from the terminal/skill path) if a human ever wants to name an issue and set urgency by hand.
- Volume risk narrows: `feature` no longer lands in Cody's queue (Backlog) and plain `feedback` no longer becomes a Linear issue at all, so the "every stray note becomes an `agent:cody` task and a Slack post" risk now applies only to `bug`/`tweak`. Accepted for now given low dogfooding volume; if it becomes noisy, the fix is at the flag (turn it off) or in Cody's own judgment, not by adding a filter back into the `bug`/`tweak` lanes.
- No retry loop yet for failed forwards (see `feedback-widget.md` §10's open question) — a sweep of unlinked rows is a possible follow-up once real failure rates are known. Note that `feedback`-type rows are *intentionally* unlinked and must be excluded from any such sweep.
- New module surface: `convex/linear.ts` gains `autoForwardFeedback` (internal action), `routeForType` (type → labels/state router), `createLinearIssue`/`uploadFeedbackAssets` (shared helpers), `deriveAutoTitle`/`buildAutoForwardDescription` (auto-forward-specific formatting), and the fixed label/state id constants — `agent:cody`, `Bug`, `Feature`, `Improvement`, Todo, Backlog (not env-overridable, unlike team/project). `convex/feedback.ts` gains `getRowForAutoForward` and `markExportedInternal`, both internal-only.
