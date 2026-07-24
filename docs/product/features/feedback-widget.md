# Feedback Widget

**Status:** built · **Element of:** spine (cross-surface dev tooling) · **Owns:** `feedback` table

> A draggable, always-available widget that lets any authenticated user send a quick note (typed or spoken), captured with the page's full context, and surfaced in `/admin` as a live ticketing queue.

## 1. Purpose

LifeGuide is in a single-builder, dogfooding phase. The fastest way to improve it is a frictionless path from "this feels off / this broke" to a logged, actionable ticket with enough context to fix it without a repro hunt. The widget gives that: one tap from anywhere in the app, a note in the user's own words, and an automatic capture of where they were, what was on screen, and what had just gone wrong. It is a builder feedback loop, not a user-facing support system.

## 2. User-facing behavior

A slim vertical tab labeled **"Feedback?"** rests against the right edge of the app on every authenticated surface. The user can drag it up or down to reposition it; it stays where they leave it (remembered per browser). Tapping it opens a small composer: pick a type (**Bug · Tweak · Feature · Feedback** — an issue · improve something that exists · something new to add · general commentary), type a note or tap the mic to dictate it (live transcription, on-device), optionally attach photos, and Submit. A brief "Thanks. Noted." confirms, and the composer collapses back to the docked tab.

**Mobile (< 768px): a minimalist nub.** On the phone the tab shrinks to a slim icon-only nub (a message-plus glyph) against the right edge — same drag/tap behavior, same remembered position. The composer opens bottom-anchored on the right, just above the bottom bar (safe-area aware), instead of riding the tab's vertical position, so the on-screen keyboard doesn't hide it. The old collision that kept feedback desktop-only is resolved by yielding: while the full-width Coach sheet is open, the whole widget hides (`coachOpen` prop from the shell) and returns when the sheet closes.

**Photos & screenshots.** The composer takes up to 4 attached images per submission (photos and page screenshots share the limit), each shown as a thumbnail with a remove ✕. Three ways to add one:
- **Paste** an image straight into the textarea (screenshot, copied photo).
- **Attach** — tap the image button to pick from the photo library / camera roll (`accept="image/*"`).
- **Screenshot this page** — tap the camera button (the third action, beside mic and attach) to capture the current page in one click. The shot is added as a *visible* attachment tagged with a small "Page" badge, so the user can preview and remove it before sending. The button shows a spinner while capturing and is timeout-capped so a slow render can't hang the composer.

Every successful add — paste, attach, or screenshot — surfaces the same two signals so it never reads as a no-op: a **"N image(s) attached" count line** above the thumbnail row, and a brief pop-in animation on the new tile (skipped under `prefers-reduced-motion`). This matters most for paste/attach, which (unlike the screenshot button's spinner) have no other transitional feedback of their own — the OS file dialog just closes and, without the count line and pop-in, a real attach could look like nothing happened.

Attachments upload to `_storage` on submit, in parallel and each independently — one failed upload doesn't drop the rest or the note.

On submit the widget also silently attaches page context: the current route and app view, the page title, viewport size, the user agent, and the page's recent JS/console errors. It captures a PNG snapshot of the visible page **as a fallback** (`shotId`) only when the user did *not* attach a screenshot themselves — that auto-capture is timeout-capped and uploads concurrently with the attachments, so Submit never blocks in series on it. The widget itself is excluded from every shot.

There is no Coach path: feedback is deliberately the user's raw words, with no AI rewrite.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Open composer | Tap the docked tab | Opens the composer panel | Manual | — |
| Drag / reposition | Pointer-drag the tab vertically | Moves the tab; persists `top` to `localStorage` (`lifeguide.feedback.pos`) | Manual | localStorage |
| Select type | Click a type chip | Sets type; persists to `localStorage` (`lifeguide.feedback.type`) | Manual | localStorage |
| Dictate | Tap the mic | Starts/stops Web Speech transcription into the textarea | Manual | — (on-device) |
| Attach photos | Paste into the textarea, or tap the image button (file picker) | Adds up to 4 images as thumbnails; ✕ removes one | Manual | — (uploads on submit) |
| Screenshot page | Tap the camera button | Captures the current page (html2canvas, timeout-capped) and adds it as a visible "Page"-tagged attachment | Manual | — (uploads on submit) |
| Submit | Click Submit | Captures errors, uploads attachments + (fallback) auto-snapshot concurrently, inserts a `feedback` row (`status: open`), schedules the auto-forward action | Manual | `feedback`, `_storage` |
| Auto-forward to Linear (type-routed) | Runs automatically after every `submit` (system, no click) | If `FEEDBACK_AUTOFORWARD` is set and the row isn't already linked, routes on the row's `type` via `routeForType` in `convex/linear.ts`: `bug` → `agent:cody`+`Bug`/Todo, `tweak` → `agent:cody`+`Improvement`/Todo, `feature` → `Feature`/Backlog (no `agent:cody`), `feedback` → **not filed at all** (returns, row left unlinked). On a filed row, links the ticket (`linear{…}`) and moves it to `pending`. No-ops (off by default) if the flag is unset. See [ADR 0031](../../decisions/0031-feedback-autoforward-to-linear.md) | System | `feedback`, `_storage`, Linear |
| Filter inbox | Pile + type controls in `/admin` | Filters tickets by pile (Needs you / In progress / Dealt with) and type (Bug/Tweak/Feature/Feedback) | Manual (admin) | — |
| Reply | "Reply" in `/admin` | Opens a pre-addressed `mailto:`. Does **not** change status (a `mailto:` link gives no completion signal — the browser's own "leave this site?" prompt can cancel it after the click already fired) | Manual (admin) | — |
| View in Linear | "View in Linear" / the identifier chip in `/admin` | Opens the row's linked Linear issue in a new tab (shown only when `row.linear` is set) | Manual (admin) | — |
| View inbox (read-only) | Open `/admin` | Live three-pile inbox with type filters; open items carry an alert. Status is shown **read-only** — Linear owns the lifecycle now (ADR 0031), so the panel no longer offers manual Export / Mark-as-replied / Dealt-with / Reopen | Manual (admin) | `feedback`, `_storage` |

## 4. Dynamics and interactions with other elements

- **Mounted in** `components/shell/AppShell.tsx` alongside `CoachDock`, so it rides every authenticated view and receives the current `view` plus the Coach dock's `coachOpen` state as props (the latter is what lets it yield to the mobile Coach sheet).
- **Error buffer** (`lib/errorBuffer.ts`) is installed once in `app/providers.tsx` at app mount. It is a passive observer of `window.onerror`, `unhandledrejection`, and `console.error` across the whole app; the widget reads a snapshot of it at submit time. It does not publish to the Context Bus — feedback is dev tooling, not user-state.
- **Snapshot upload** reuses `convex/files.ts` `generateUploadUrl` (the same storage path captures and file-nodes use). No new storage function.
- **Speech** reuses `lib/useSpeechRecognition.ts` (shared with `VoiceField`), unchanged.
- **Admin queue** lives in `app/admin/page.tsx`, dev-gated like the rest of that page. It draws only from `feedback`; Convex reactivity makes the list self-updating ("keeps polling" with no polling code).

This element **owns** the `feedback` table and **draws** nothing from the user-state streams.

## 5. States

- **Docked (resting):** the "Feedback?" tab at its remembered vertical position (icon-only nub on mobile).
- **Composer open:** type selector + textarea + attachment thumbnails (photos + "Page"-tagged screenshots) + mic + image picker + screenshot + Submit.
- **Image just attached:** an "N image(s) attached" count line appears above the thumbnail row and the new tile pops in — the confirmation that the attach (paste, file picker, or screenshot) actually landed.
- **Capturing:** the screenshot button shows a spinner while html2canvas renders the page; disabled meanwhile and when the 4-image limit is reached.
- **Yielded (mobile):** hidden entirely while the Coach sheet is open; returns when it closes.
- **Listening:** textarea is read-only and shows the live transcript; mic shows a stop icon.
- **Submitting:** Submit shows a spinner; disabled.
- **Sent:** a transient "Thanks. Noted." then auto-collapse.
- **Ticket states (admin, read-only):** the `open` (red alert dot, "Needs you") → `pending` (dashed, "In progress") → `dealt_with` (green check, greyed) lifecycle still lives on the row, but as of ADR 0031's amendment the admin panel only **displays** it — status is now moved in Linear (auto-forward flips a filed row to `pending`), not by admin buttons. `feedback`-type rows stay `open` in-app (never filed). See §9 and [ADR 0031](../../decisions/0031-feedback-autoforward-to-linear.md).

## 6. Edge cases

- **Speech unsupported** (`useSpeechRecognition.supported === false`) → mic button hidden; typing only.
- **Mic blocked** (`error === "not-allowed"`) → inline "Mic blocked. You can type instead."
- **Empty/whitespace note** → Submit disabled.
- **Snapshot fails or hangs** (cross-origin images, complex CSS, `html2canvas` throw, or a slow render) → caught, and additionally capped by an 8s timeout; the submission still goes through without an image (`shotId` omitted). A manual screenshot that times out simply adds no attachment. Either way Submit is never blocked.
- **Manual screenshot taken** → the silent submit-time snapshot is skipped (no duplicate); only the user's visible screenshot is sent (via `imageIds`).
- **A photo/attachment upload fails** → that image is skipped (logged to console); the note and the other attachments still submit. Uploads run in parallel.
- **Non-image paste / pick** → ignored; only `image/*` files attach. The 5th image and beyond are dropped; the picker and screenshot buttons disable at 4.
- **Mobile Coach sheet opens over the widget** → the widget hides (`coachOpen`) rather than floating on top of the sheet.
- **Stored position off-screen** (smaller window) → clamped back into the viewport on mount and on resize.
- **Tap vs drag** → movement under 4px counts as a tap (opens); beyond that it's a drag (repositions, no open).
- **Ownership** → `resolve`/`reopen` on a row the user doesn't own throws ("Not found"); each identity only sees its own feedback.
- **Reply link cancelled** (the browser's "leave this site?" prompt, declined) → no status change; the ticket stays exactly where it was, since Reply no longer mutates on click (see §9).
- **Unauthenticated** → the widget never renders (it lives inside `AppShell`); `submit` also rejects unauthenticated calls server-side.

## 7. AI involvement

None. By design, feedback is captured as the user's raw words with no model in the loop — neither transcript cleanup nor categorization. (Dictation uses the browser's on-device Web Speech API, not a server model.) The auto-forward-to-Linear path (§9) is the same: it is a dumb pipe by design, forwarding the verbatim note with no LLM enrichment — the downstream Cody coding agent is where interpretation happens, not this pipeline. Its type-routing (bug/tweak/feature/feedback → different lanes) is a plain `switch` on the user's chosen type, not a model classification.

## 8. Data touched

Owns the `feedback` table (see [`../../architecture/data-model.md`](../../architecture/data-model.md)):

`userId`, `type` (`bug|tweak|feature|feedback`), `text`, `route`, `view`, `title`, `viewport {w,h}`, `userAgent`, `errors[] {message, stack?, at}`, `shotId?` (`_storage`, the fallback auto-snapshot — present only when the user didn't attach their own screenshot), `imageIds?` (`_storage[]`, user-attached photos **and** one-click page screenshots, max 4 combined), `status` (`open|pending|dealt_with`), `linear?` (`{issueId, identifier, url, at}` — set when exported to Linear), `createdAt`, `pendingAt?`, `resolvedAt?`. Indexes: `by_user [userId, createdAt]`, `by_status [status, createdAt]`.

Draws `_storage` (the uploaded snapshot + attached photos) via `files.generateUploadUrl` / `ctx.storage.getUrl`; `listAll` resolves `imageIds` to `imageUrls`, and `/admin` renders them as thumbnails beside the snapshot.

## 9. Owner inbox (read-only), and type-routed Linear forwarding

The inbox lives in `components/feedback/FeedbackInbox.tsx` — a self-contained, embeddable panel (no route dependency; today it renders inside `/admin`). Its query is **owner-aware** (see [`0006-owner-gated-admin.md`](../../decisions/0006-owner-gated-admin.md)): the owner (`anurieli365@gmail.com`) sees **every** user's feedback as a support inbox — each row joins the submitter's `{ name, email, isAnonymous }` from the users table; everyone else stays self-scoped.

**The panel is READ-ONLY as of ADR 0031's amendment (2026-07-24).** With every actionable submission (`bug`/`tweak`/`feature`) auto-forwarded to Linear in real time and its status worked *there*, the in-app inbox no longer drives triage. It dropped the manual **Export to Linear** composer, **Mark as replied**, **Dealt with**, and **Reopen**. What remains: filter, read, see status read-only, open the Linear issue, and reply by email.

**Piles + filters.** The panel splits tickets into three piles by status — **Needs you** (`open`), **In progress** (`pending`), **Dealt with** (`dealt_with`) — with live counts, and filters by type (All · Bugs · Tweaks · Features · Feedback). Each row shows its status **read-only** (a labeled icon), and — when `row.linear` is set — a **View in Linear** link / identifier chip out to the tracked issue. `feedback`-type rows (never filed, see below) show "not filed — stays in the app."

**Reply.** Each ticket with a known submitter email gets a **Reply** button that opens a `mailto:` in the owner's own mail client (mail goes from the owner's real address, no email provider needed), pre-addressed and quoting their note. Reply is a plain link with **no status side effect** — a `mailto:` navigation gives the page no way to know whether the mail client actually opened or a message was sent, and Linear now owns status anyway. Anonymous submitters have no email and are not repliable. *(Sending inline via Resend — with the send's own success/failure as the real completion signal — is a deferred follow-up; see §10.)*

**What happened to the lifecycle mutations.** The owner-gated `markPending`/`resolve`/`reopen` mutations and the manual `exportFeedback` action (ADR 0019) still exist server-side, but nothing in the UI calls them any more — Linear is where a ticket's status is now moved. They remain callable from the terminal/skill path (below) and are kept in case a manual naming/urgency export is ever wanted again. The old `mailto`-cancel race that once flipped a ticket to "In progress" on a cancelled reply (fixed 2026-07-15) is moot now that Reply has no status side effect and the status buttons are gone.

**Out-of-band triage (owner tooling, no browser).** The panel's read/resolve mutations gate on `getAuthUserId`, so a `npx convex run` (which carries no user identity) can't drive them. For an agent/automation triaging the queue from a terminal, `convex/feedback.ts` also exposes three **internal** functions — `adminList` (the whole queue or one status, flattened: id, status, type, view, submitter, note, linked Linear ticket), `adminSetStatus` ({id, status}), and `adminResolveMany` ({ids}) — callable only server-side, from the Convex dashboard, or via `npx convex run` with a deploy key (never from a client, so they're owner-only in practice). This lets a fix be shipped and its source ticket marked **dealt_with** in the same flow, without clicking through `/admin`. Added 2026-07-20; wrapped by the `lifeguide-feedback` skill, which also documents the two keys involved (`CONVEX_DEPLOY_KEY`, `LINEAR_API_KEY`).

**Type-routed auto-forward to Linear** (see [ADR 0031](../../decisions/0031-feedback-autoforward-to-linear.md), including its 2026-07-24 amendment). When the `FEEDBACK_AUTOFORWARD` env var is set on the Convex deployment, **every** feedback submission runs through the forward automatically, immediately after `submit` inserts the row (`ctx.scheduler.runAfter(0, internal.linear.autoForwardFeedback, { feedbackId })` — scheduled, not awaited, so a slow or down Linear API never delays or blocks the user's submit). It stays a **dumb, reliable pipe** — no filtering, no re-typing, no AI rewrite of the note — but *where* each submission lands is routed by the row's own `type` via `routeForType`:

| `type` | Linear labels | Workflow state | Reaches Cody? |
|---|---|---|---|
| `bug` | `agent:cody` + `Bug` | Todo | Yes — picked up |
| `tweak` | `agent:cody` + `Improvement` | Todo | Yes — picked up |
| `feature` | `Feature` (no `agent:cody`) | **Backlog** | No — parked for human prioritization |
| `feedback` | *(no issue filed)* | — | No — stays in the app only |

`bug`/`tweak` flow straight into the Cody coding-agent pipeline (which does all the interpreting) and surface in Slack; `feature` is parked in Backlog for a human to prioritize, deliberately **not** handed to Cody; and plain `feedback` is **not filed at all** — `routeForType` returns `null`, the action returns before touching Linear, and the row is left unlinked (`status: open`) so it simply shows in the read-only inbox. (`tweak` maps to the team's `Improvement` label — its exact semantic match; there is no literal "Tweak" label. Label/state IDs are fixed constants, verified against the Linear team 2026-07-24.) A filed row carries the type/view/submitter/verbatim text (plus any attached image) essentially as-is and stores `linear {issueId, identifier, url, at}`, moving to `pending`. Off by default (unset `FEEDBACK_AUTOFORWARD` = no-op); flip it on with `npx convex env set FEEDBACK_AUTOFORWARD 1` on the deployment. Shares `LINEAR_API_KEY`/`LINEAR_TEAM_ID`/`LINEAR_PROJECT_ID` and the `createLinearIssue` GraphQL call with the (now UI-less) manual export path. Idempotent on the `linear` field: a row already linked is skipped. Best-effort — a failed forward (missing key, Linear error) is logged and swallowed, never surfaced to the submitting user; the row's `linear` field stays unset so it remains visible to `adminList`/the `lifeguide-feedback` skill. **Note:** `feedback`-type rows are *intentionally* unlinked, so any future retry sweep of unlinked rows must exclude them.

**Does the Coach need this? (CLAUDE.md rule 5.)** **No — and here's why.** Feedback is builder/dev tooling: an owner-and-infrastructure concern (ADR 0006 owner-gated), not part of any user's self or plan. The Coach knows the *person* and acts across *their* space; the cross-user feedback queue and its Linear routing are neither that person's context nor something the Coach should act on. **By parity the MCP does not need it either.** This surface is deliberately absent from the [Coach Capability Registry](coach-capabilities.md) — a decision, not an oversight.

## 10. Open questions

- **Inline replies via Resend** — sending the reply from within the panel (a verified sending domain + API key) instead of handing off to `mailto`, plus threading, is the next slice. Deferred here.
- **Standalone package** — the widget + inbox + Linear push are structured to be extractable (config-injected Linear settings, self-contained components), but true npm-package extraction is a follow-up.
- **Linear labels/assignee** — the *auto-forward* path now sets labels + workflow state programmatically per the type-routing table in §9 (`agent:cody`/`Bug`/`Improvement`/`Feature`, Todo/Backlog); assignee is still left unset for a human/Cody to claim. The manual `exportFeedback` action (no longer surfaced in the UI) still leaves labels/assignee to be set by hand if ever used.
- Snapshot fidelity depends on `html2canvas`; if it proves lossy on the canvas-heavy Board, consider the native screen-capture API behind an explicit opt-in there.
- **No retry loop yet** — a forward that fails (Linear down, bad key) stays unlinked until someone notices via the inbox/skill; an automatic retry (e.g. a periodic sweep of `open`/`pending` rows with no `linear` field) is a possible follow-up once auto-forward has run long enough to know how often it actually fails. Any such sweep must **exclude `feedback`-type rows**, which are intentionally never filed.
- No retention/cleanup policy yet for snapshots in `_storage`.
