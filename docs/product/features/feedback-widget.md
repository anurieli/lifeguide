# Feedback Widget

**Status:** built · **Element of:** spine (cross-surface dev tooling) · **Owns:** `feedback` table

> A draggable, always-available widget that lets any authenticated user send a quick note (typed or spoken), captured with the page's full context, and surfaced in `/admin` as a live ticketing queue.

## 1. Purpose

LifeGuide is in a single-builder, dogfooding phase. The fastest way to improve it is a frictionless path from "this feels off / this broke" to a logged, actionable ticket with enough context to fix it without a repro hunt. The widget gives that: one tap from anywhere in the app, a note in the user's own words, and an automatic capture of where they were, what was on screen, and what had just gone wrong. It is a builder feedback loop, not a user-facing support system.

## 2. User-facing behavior

A slim vertical tab labeled **"Feedback?"** rests against the right edge of the app on every authenticated surface. The user can drag it up or down to reposition it; it stays where they leave it (remembered per browser). Tapping it opens a small composer: pick a type (**Bug · Feature · Other**), type a note or tap the mic to dictate it (live transcription, on-device), optionally attach photos, and Submit. A brief "Thanks. Noted." confirms, and the composer collapses back to the docked tab.

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
| Submit | Click Submit | Captures errors, uploads attachments + (fallback) auto-snapshot concurrently, inserts a `feedback` row (`status: open`) | Manual | `feedback`, `_storage` |
| Filter inbox | Pile + type controls in `/admin` | Filters tickets by pile (Needs you / In progress / Dealt with) and type (Bug/Feature/Other) | Manual (admin) | — |
| Reply | "Reply" in `/admin` | Opens a pre-addressed `mailto:`. Does **not** itself change status (a `mailto:` link gives no completion signal — the browser's own "leave this site?" prompt can cancel it after the click already fired) | Manual (admin) | — |
| Mark as replied | "Mark as replied" in `/admin` (shown while `open`) | Explicit, deliberate move to `pending` (`markPending`) — the owner confirms the reply actually happened | Manual (admin) | `feedback` |
| Export to Linear | "Export to Linear" → inline form (name + urgency) | Creates a Linear issue (note + context + photo attachment) via `convex/linear.ts`, links the ticket (`linear{…}`), moves it to `pending` | Manual (admin) | `feedback`, `_storage`, Linear |
| Resolve ticket | "Dealt with" in `/admin` | Sets `status: dealt_with` + `resolvedAt` | Manual (admin) | `feedback` |
| Reopen ticket | "Reopen" in `/admin` | Sets `status: open`, clears `pendingAt` + `resolvedAt` | Manual (admin) | `feedback` |
| View inbox | Open `/admin` | Live three-pile inbox with type filters; open items carry an alert | Manual (admin) | `feedback`, `_storage` |

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
- **Ticket states (admin):** a triage lifecycle — `open` (red alert dot, "Needs you") → `pending` (dashed, "In progress" — replied or pushed to Linear) → `dealt_with` (green check, greyed, a separate pile). `reopen` returns a ticket to `open`. See §9 and [ADR 0019](../../decisions/0019-feedback-to-linear.md).

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

None. By design, feedback is captured as the user's raw words with no model in the loop — neither transcript cleanup nor categorization. (Dictation uses the browser's on-device Web Speech API, not a server model.)

## 8. Data touched

Owns the `feedback` table (see [`../../architecture/data-model.md`](../../architecture/data-model.md)):

`userId`, `type` (`bug|feature|other`), `text`, `route`, `view`, `title`, `viewport {w,h}`, `userAgent`, `errors[] {message, stack?, at}`, `shotId?` (`_storage`, the fallback auto-snapshot — present only when the user didn't attach their own screenshot), `imageIds?` (`_storage[]`, user-attached photos **and** one-click page screenshots, max 4 combined), `status` (`open|pending|dealt_with`), `linear?` (`{issueId, identifier, url, at}` — set when exported to Linear), `createdAt`, `pendingAt?`, `resolvedAt?`. Indexes: `by_user [userId, createdAt]`, `by_status [status, createdAt]`.

Draws `_storage` (the uploaded snapshot + attached photos) via `files.generateUploadUrl` / `ctx.storage.getUrl`; `listAll` resolves `imageIds` to `imageUrls`, and `/admin` renders them as thumbnails beside the snapshot.

## 9. Owner inbox, triage lifecycle & Linear export

The inbox lives in `components/feedback/FeedbackInbox.tsx` — a self-contained, embeddable panel (no route dependency; today it renders inside `/admin`). Its queries/mutations are **owner-aware** (see [`0006-owner-gated-admin.md`](../../decisions/0006-owner-gated-admin.md)): the owner (`anurieli365@gmail.com`) sees **every** user's feedback as a support inbox — each row joins the submitter's `{ name, email, isAnonymous }` from the users table — and can act on any ticket; everyone else stays self-scoped.

**Piles + filters.** The panel splits tickets into three piles by status — **Needs you** (`open`), **In progress** (`pending`), **Dealt with** (`dealt_with`) — with live counts, and filters by type (All · Bugs · Features · Other).

**Reply.** Each ticket with a known submitter email gets a **Reply** button that opens a `mailto:` in the owner's own mail client (mail goes from the owner's real address, no email provider needed), pre-addressed and quoting their note. Reply is a plain link with **no status side effect** — a `mailto:` navigation gives the page no way to know whether the mail client actually opened or a message was sent (some browsers show a "leave this site?" confirmation for it, and that confirmation fires *after* any click handler already ran, so an earlier version of this that optimistically called `markPending` on click would flip a ticket to "In progress" even when the user cancelled and sent nothing — fixed 2026-07-15). A separate **Mark as replied** button (shown only while `open`) is the deliberate, explicit action that moves a ticket to **In progress** (`markPending`) — it reflects the owner's confirmation, not a guess. Anonymous submitters have no email and are not repliable. *(Sending inline via Resend — rather than handing off to a mail client, and with the send's own success/failure as the real completion signal — is a deferred follow-up; see §10.)*

**Export to Linear** (see [ADR 0019](../../decisions/0019-feedback-to-linear.md)). Because you can't always tell a bug from a feature from the widget tag, export is a deliberate button, not an auto-sync. **Export to Linear** opens a small inline form (issue **name**, prefilled from the note; **urgency** → Linear priority) and creates a real Linear issue in the configured project via `convex/linear.ts` — carrying the note, the captured page context, and the snapshot/photos uploaded as **real Linear assets**. On success the ticket stores `linear {issueId, identifier, url, at}`, surfaces the `ARI-…` identifier as a link chip, and moves to **In progress**. You finish the card in Linear (assignee, status, board). Export is idempotent — an already-exported ticket links out instead of re-creating. **Setup:** `LINEAR_API_KEY` must be set in the Convex deployment; `LINEAR_TEAM_ID` / `LINEAR_PROJECT_ID` default to LifeGuide's and are env-overridable so the module can travel.

**Close.** **Dealt with** moves a ticket to the closed pile (`resolve`); **Reopen** returns it to **Needs you** (`reopen`, clearing the pending/resolved marks).

**Out-of-band triage (owner tooling, no browser).** The panel's read/resolve mutations gate on `getAuthUserId`, so a `npx convex run` (which carries no user identity) can't drive them. For an agent/automation triaging the queue from a terminal, `convex/feedback.ts` also exposes three **internal** functions — `adminList` (the whole queue or one status, flattened: id, status, type, view, submitter, note, linked Linear ticket), `adminSetStatus` ({id, status}), and `adminResolveMany` ({ids}) — callable only server-side, from the Convex dashboard, or via `npx convex run` with a deploy key (never from a client, so they're owner-only in practice). This lets a fix be shipped and its source ticket marked **dealt_with** in the same flow, without clicking through `/admin`. Added 2026-07-20; wrapped by the `lifeguide-feedback` skill, which also documents the two keys involved (`CONVEX_DEPLOY_KEY`, `LINEAR_API_KEY`).

## 10. Open questions

- **Inline replies via Resend** — sending the reply from within the panel (a verified sending domain + API key) instead of handing off to `mailto`, plus threading, is the next slice. Deferred here.
- **Standalone package** — the widget + inbox + Linear push are structured to be extractable (config-injected Linear settings, self-contained components), but true npm-package extraction is a follow-up.
- **Linear labels/assignee at export** — v1 puts the type in the title/description and leaves labels/assignee/status to be set in Linear; setting them programmatically at export time is a possible enhancement.
- Snapshot fidelity depends on `html2canvas`; if it proves lossy on the canvas-heavy Board, consider the native screen-capture API behind an explicit opt-in there.
- No retention/cleanup policy yet for snapshots in `_storage`.
