# 0019. Feedback → Linear: a manual export, and a three-state triage inbox

**Status:** accepted (live, 2026-07-15)

> **Amendment (2026-07-24):** the widget's type tag went from three (`bug|feature|other`) to four — **Bug** (an issue) · **Tweak** (improve something that exists) · **Feature** (something new to add) · **Feedback** (general commentary). The legacy `other` value was migrated to `feedback`. The manual-export decision is unchanged; the type still only seeds the issue title prefix and the "Type as tagged" line in the description (no programmatic labels/routing — still deferred). References to `bug|feature|other` below are historical.

## Context

The in-app feedback widget lands notes in a `feedback` table, surfaced in the `/admin` inbox with a two-state toggle (`open` ⇄ `dealt_with`) and a `mailto:` **Reply**. As dogfooding volume grows, Ariel wants bugs and features **worked in Linear** (assignee, status, board, priority), while the app stays the place they're *received* and *replied to*. Two questions fell out of that:

1. **Auto-sync or manual?** Auto-creating a Linear issue on every submission fills the tracker with dupes and half-thoughts, and the widget's `bug|feature|other` tag is often wrong — the person submitting can't reliably tell a bug from a feature. The human judgment of "this deserves a tracked issue, and here's its real name/urgency" belongs at triage, not at submit.
2. **What does "dealt with" mean now?** With replies and Linear in the loop, a ticket is often *in flight* (you replied; it's out in Linear) but not closed. The binary open/closed state can't express that.

## Decision

**Export to Linear is a deliberate button, not auto-sync.** In the inbox, **Export to Linear** opens a small inline form — issue **name** (prefilled from the note) and **urgency** (→ Linear priority) — and creates one real Linear issue via a Convex action (`convex/linear.ts` `exportFeedback`). The issue carries the note, the captured page context (route/view/title/viewport/UA + recent errors), and the snapshot/attached photos **uploaded to Linear as real assets** (Linear's `fileUpload` → PUT → `assetUrl`, embedded in the description). The ticket then stores `linear {issueId, identifier, url, at}`, links out to the card, and moves to `pending`. Export is **idempotent** — an already-exported ticket returns its existing link. Labels/assignee/status are left to be set in Linear.

**A three-state triage lifecycle** replaces the binary: `open` (needs you) → `pending` (being dealt with — you replied *or* pushed to Linear) → `dealt_with` (closed, a separate pile). `reopen` returns a ticket to `open` and clears both `pendingAt`/`resolvedAt`. The inbox renders the three as piles with live counts, plus a type filter (All/Bugs/Tweaks/Features/Feedback). **Reply** now also flips a ticket to `pending` (`markPending`).

**Config is injected, not bound to a person.** `convex/linear.ts` reads `LINEAR_API_KEY` (required) and `LINEAR_TEAM_ID` / `LINEAR_PROJECT_ID` (optional; default to LifeGuide's Personal-team/LifeGuide-project). The inbox is a self-contained component (`components/feedback/FeedbackInbox.tsx`) with no route dependency. This keeps the widget + inbox + push extractable as a standalone/open-source package later, and keeps the module owner-agnostic.

## Consequences

- Bugs/features live where they get worked (Linear) with the photo attached, while replies-to-humans stay in-app. The two sides link, they don't duplicate.
- **Setup requirement:** live export needs `LINEAR_API_KEY` in the Convex deployment (`npx convex env set LINEAR_API_KEY …`). Without it, `exportFeedback` throws a clear message; everything else in the inbox works unchanged.
- Export is owner/self gated server-side (`getRowForExport`); the action never lets a non-owner read another user's ticket. Convex redacts thrown error text in prod, so failures read as "Server Error" in the UI (message is in logs) — an accepted tradeoff, matching the Todoist integration.
- Deferred: **inline replies via Resend** (a verified sending domain + API key) to send from within the panel instead of `mailto`; programmatic **labels/assignee** at export; true **npm-package extraction**. See `feedback-widget.md` §10.
- Schema: `feedback.status` gains `pending`; adds `linear?` + `pendingAt?` (see `data-model.md`). New module `convex/linear.ts`; new component `components/feedback/FeedbackInbox.tsx` (the `/admin` inbox extracted from `app/admin/page.tsx`).
