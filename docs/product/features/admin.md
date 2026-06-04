# Feature: Admin / Dev Panel

**Status:** Built. **Access: open in local dev, OWNER-ONLY in production.**
**Route:** `/admin` (standalone, no rail). Entry point: an "Admin" row in Settings (shown in dev, or to the owner in prod).
**Backend:** `convex/admin.ts`, `convex/feedback.ts`, `convex/owner.ts`. **Frontend:** `app/admin/page.tsx`.

## Purpose

Two jobs in one panel:

1. **Self-service maintenance for the current identity** — put yourself back in front of the Door (reset onboarding) so it can be re-tested without minting a new anonymous user; seed/clear the Core; inspect your interview sessions. These tools only ever touch the caller's own data.
2. **The feedback support inbox** — the owner triages every user's feedback and replies to submitters (see the Feedback / Escalations queue below).

## Access model

`/admin` is **open in local dev** (any localhost session) and **owner-only in production** (gated on the owner's email — see [`0006-owner-gated-admin.md`](../../decisions/0006-owner-gated-admin.md) and `convex/owner.ts`). The page resolves `owner.amOwner` and renders "Not authorized" to non-owners in prod. This client gate is UX; the real boundary is server-side: the cross-user feedback queries enforce owner-only in `convex/feedback.ts`. The self-scoped dev tools (reset/seed/wipe) stay self-scoped (only the caller's own data) and so carry no cross-user risk.

## Why it exists

Onboarding is gated by `settings.onboardedAt`. Once `completeOnboarding` stamps it, `app/page.tsx` routes straight to the app forever for that identity, and the identity lives in an httpOnly cookie that page JS cannot clear. Without this panel, the only ways to see onboarding again were an incognito window, a different browser, or hand-editing Convex. The reset action removes that friction.

## User-facing behavior

`/admin` renders (in development only):

- **Current identity** card: `Onboarded` (yes / "no (will see the Door)"), `Blueprint status`, `Level`, `Core filled N/18` — all live via reactive queries.
- **Actions** (each is a two-click confirm; no native browser dialogs):
  - **Reset onboarding** — clears `onboardedAt`, `blueprintStatus`, `level`. Reload the app → the Door. Keeps Core answers.
  - **Seed Core (fill all 18)** — writes sample text to every blueprint box → status `complete`, level `1`.
  - **Clear Core answers** (danger) — deletes all `coreResponses` → status `unstarted`.
  - **Wipe test data** (danger) — deletes `coreResponses` + `interviewSessions` + `experienceEvents` and resets onboarding. Keeps rhythm/tone preferences.
- **Interview sessions** list: the user's sessions, newest first (experience, status, turn count, started time).
- **Feedback / Escalations** queue: in-app feedback, newest first and live (Convex-reactive). For the **owner** this is **every user's** feedback (the support inbox); for anyone else it is only their own. Each row shows the type, route/view, time, the **submitter** (name + email, or "anonymous"), the note, an error count + expandable error log, and the page snapshot thumbnail. Open items carry a red alert dot and the header shows an open-count badge; **Dealt with** resolves a row (greys it, clears the alert), **Reopen** restores it. A **Reply** button (when the submitter has an email) opens a `mailto:` in your own mail client, pre-addressed and quoting their note — replies go from your real email, no provider needed. Backed by `convex/feedback.ts` (`listAll`/`resolve`/`reopen`, owner-aware); submissions come from the [Feedback Widget](feedback-widget.md).
- **Back to app** link.

In a production build the page renders only "The admin panel is only available in development." and runs no queries (`useQuery(..., "skip")`). The Settings entry point is hidden in production (`process.env.NODE_ENV !== "production"`).

## Functions / actions (`convex/admin.ts`)

All authenticate via `getAuthUserId` and operate only on rows owned by that user.

- `resetOnboarding` (mutation) — patch settings: `onboardedAt`, `blueprintStatus`, `level` → `undefined`.
- `clearCore` (mutation) — delete the user's `coreResponses`; then recompute status/level (→ unstarted/0).
- `seedCore` (mutation) — upsert all 18 `ALL_KEYS` with `"[seed] sample answer for <key>"`; recompute (→ complete/1).
- `listSessions` (query) — the user's `interviewSessions`, ordered desc; returns `[]` if unauthenticated.
- `clearTestData` (mutation) — delete the user's `coreResponses` + `interviewSessions` + `experienceEvents`; reset onboarding fields.

Internal helpers: `requireUser` (auth or throw), `settingsRow` (get-or-create settings, mirrors `settings.getOrCreate`), `recomputeFor` (mirrors `settings.recompute`; status/level from current `coreResponses`).

## Dynamics / interactions

- Reads/writes the same `settings`, `coreResponses`, `interviewSessions`, `experienceEvents` tables as onboarding; the Today banner and Guide marker react to the status/level changes immediately.
- `resetOnboarding` flips the `app/page.tsx` gate (`!me.onboarded`) so the next render shows `<Onboarding/>`.
- Recompute logic is duplicated from `settings.recompute` because a Convex mutation cannot call a sibling mutation; if a third copy appears, extract a shared helper into `convex/lib`.

## States & edge cases

- Unauthenticated: `listSessions` returns `[]`; mutations throw "Not authenticated" (not reachable from the panel in normal use, since the app auto-signs-in anonymously).
- No settings row yet: `settingsRow` creates one with defaults before patching.
- Production: tools hidden; queries skipped; entry point hidden.
- Two-click confirm guards against accidental destructive clicks; danger actions are styled red.

## Data touched

`settings` (onboardedAt, blueprintStatus, level), `coreResponses` (delete/upsert), `interviewSessions` (delete, read), `experienceEvents` (delete). No schema changes.

## AI involvement

None.

## Open questions / future

- Promote to a real `isAdmin` role + cross-user admin if/when LifeGuide has accounts beyond anonymous.
- Optionally expose a "jump straight into a specific blueprint box" or "replay a session" tool.
