# Feedback Widget — Design Spec

**Date:** 2026-06-03
**Status:** Approved, building
**Branch:** `feat/feedback-widget` (off `origin/dev`)

## Purpose

A lightweight, always-available in-app feedback channel for any authenticated user. The user drops a quick note (typed or spoken), tags it, and submits. Each submission is captured with rich context (route, page metadata, the page's recent JS/console errors, and a visual snapshot) so the developer can act on it. The `/admin` dev panel surfaces submissions as a live ticketing queue: open items carry an alert, and they can be marked "Dealt with" (or reopened).

This is a dev/builder feedback loop for the current single-builder phase. Submissions are self-scoped (each user only writes their own rows), matching the existing anonymous, cookie-bound auth model and the self-scoped `/admin` convention. It is NOT a cross-user moderation system.

## User-facing behavior

A single client island `<FeedbackWidget>`, mounted once in `AppShell` (rides every authenticated view, like `CoachDock`). Three states, one component:

- **Docked tab (resting/closed):** a slim vertical pill anchored on the right edge, labeled **"Feedback?"**. This is the default state.
- **Composer (open):** a floating card with a type selector (Bug · Feature · Other), a textarea, a mic button (speech-to-text), and Submit. Modeled on `CoachDock`'s fixed/opacity-translate panel.
- **Dragging:** the launcher pill is draggable. On drop, its vertical position is saved. Closing the composer collapses back to the docked "Feedback?" tab at the remembered position.

Position and last-used type persist to **localStorage** (`lifeguide.feedback.pos`, `lifeguide.feedback.type`) — per-browser, no backend round-trip for UI state.

Submit flow: pick type → type and/or dictate text → Submit. A brief "Thanks" confirmation, the composer closes, and the widget returns to the docked tab. Submission never blocks on the snapshot — if the screenshot fails, the text + metadata + errors still go through.

## Context capture

Two always-on pieces feed every submission:

1. **Error buffer** (`lib/errorBuffer.ts`): a module installed once at app mount (in `Providers`). Listens to `window.onerror`, `window.onunhandledrejection`, and wraps `console.error`, keeping the last ~25 entries in a ring buffer `{ message, stack?, at }`. The widget reads a snapshot of this buffer at submit time. SSR-safe: no-ops when `window` is undefined; install is idempotent.

2. **Page snapshot** (on submit): `html2canvas` renders the current viewport to a PNG blob → uploaded via the existing `files.generateUploadUrl` flow → stored as a `_storage` ref. Wrapped in try/catch; on failure the submission proceeds without an image. Paired with structured metadata: `route` (`window.location.pathname`), app `view` (from a prop), page `title`, `viewport {w,h}`, `userAgent`.

Speech-to-text reuses the existing `useSpeechRecognition()` hook (Web Speech API, on-device). The transcript drops into the textarea; the user edits before sending. No AI cleanup pass — feedback is the user's raw words.

## Data model — new `feedback` table

Added to `convex/schema.ts`:

```ts
feedback: defineTable({
  userId: v.id("users"),
  type: v.union(v.literal("bug"), v.literal("feature"), v.literal("other")),
  text: v.string(),
  route: v.string(),                 // window.location.pathname at submit
  view: v.string(),                  // app view: "today" | "core" | "board" | "settings"
  title: v.string(),                 // document.title
  viewport: v.object({ w: v.number(), h: v.number() }),
  userAgent: v.string(),
  errors: v.array(v.object({
    message: v.string(),
    stack: v.optional(v.string()),
    at: v.number(),
  })),
  shotId: v.optional(v.id("_storage")),   // page snapshot, optional
  status: v.union(v.literal("open"), v.literal("dealt_with")),
  createdAt: v.number(),
  resolvedAt: v.optional(v.number()),
})
  .index("by_user", ["userId", "createdAt"])
  .index("by_status", ["status", "createdAt"])
```

## Convex functions — `convex/feedback.ts`

- `submit(args)` — mutation. `getAuthUserId` auth-check (throws if unauthenticated). Inserts with `status: "open"`, `createdAt: Date.now()`. Args: `type, text, route, view, title, viewport, userAgent, errors, shotId?`. Returns the new id.
- `listAll()` — query for admin. Self-scoped to the current user (matches `/admin` convention), newest-first via `by_user`. Resolves each `shotId` to a URL with `ctx.storage.getUrl`, returning `{ ...row, shotUrl }`. Reactive — Convex pushes updates live, so the admin queue "keeps polling" with no extra code.
- `resolve({ id })` — mutation. Auth-check; verifies the row belongs to the user; patches `status: "dealt_with"`, `resolvedAt: Date.now()`.
- `reopen({ id })` — mutation. Auth-check; ownership check; patches `status: "open"`, `resolvedAt: undefined`.

Reuses existing `files.generateUploadUrl` for the snapshot upload (no new storage function needed).

## Admin ticketing view (`/admin`)

A new **"Feedback / Escalations"** section in `app/admin/page.tsx`, below Interview sessions, dev-gated like the rest of the page:

- Rows newest-first from `api.feedback.listAll` (reactive — new feedback appears without refresh).
- Each row: type chip, route, relative time, the text, an error count, and the snapshot thumbnail (click to open full-size in a new tab).
- **Open** items show a red **alert dot**; the section header shows an open-count badge.
- A **"Dealt with"** button per open row → `api.feedback.resolve`. Resolved rows grey out, alert clears, and show a subtle **"Reopen"** → `api.feedback.reopen`.

## States & edge cases

- `useSpeechRecognition.supported === false` → mic button hidden; typing only.
- Empty/whitespace text → Submit disabled.
- `html2canvas` throws (cross-origin images, complex CSS) → caught; submit proceeds imageless; the failure is itself logged to console (and thus may appear in a later error buffer).
- Stored drag position off-screen (smaller window) → clamped back into the viewport; falls back to default anchor if invalid.
- Widget only renders inside `AppShell`, i.e. only for authenticated, onboarded users.
- `resolve`/`reopen` on a row the user doesn't own → throws (ownership check).

## Files

New:
- `convex/feedback.ts`
- `lib/errorBuffer.ts`
- `components/feedback/FeedbackWidget.tsx`
- `docs/product/features/feedback-widget.md`
- `tests/convex/feedback.test.ts`

Edited:
- `convex/schema.ts` (add `feedback` table)
- `components/shell/AppShell.tsx` (mount widget)
- `app/providers.tsx` (install error buffer)
- `app/admin/page.tsx` (ticketing section)
- `package.json` (add `html2canvas`)
- `CHANGELOG.md`

## Testing & QA

- **Convex function tests** (`tests/convex/feedback.test.ts`, convex-test pattern): submit inserts an open row with the given fields; `listAll` returns it newest-first; `resolve` flips to `dealt_with` + sets `resolvedAt`; `reopen` flips back; unauthenticated submit throws.
- **Build/lint:** `npm run lint`, `npm run build`, `npm test` clean.
- **Manual QA** (browser): drag the tab and confirm position persists across reload; docked "Feedback?" tab; type selection persists; submit typed feedback; submit dictated feedback (where supported); snapshot + metadata land in `/admin`; alert dot on open item; "Dealt with" clears it; "Reopen" restores it; trigger a console error and confirm it shows in the submission's error list.

## Effort

~half-day. Single-builder, one-shot on the worktree; no migration risk (additive schema only).
