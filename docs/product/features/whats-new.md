# What's New

**Status:** built · **Element of:** spine (cross-surface, owner-authored content) · **Owns:** `whatsNew`, `whatsNewSeen`

> A feed of shipped features, docked near the bottom of the app shell. Clicking an entry navigates to the surface showing that feature, marks it seen for that person, and drops it from the unread scroll; the others stay. If an entry points at one component on the page rather than the whole page, it also opens a one-step spotlight around that component after it mounts, like a tiny tour. The panel defaults to the unread list; **See all** reveals the full history (including items already cleared) and **Clear all** catches everything up at once. The pill stays available while any published entry exists (so history is always reachable), and the count badge shows only when something is unread.

## 1. Purpose

LifeGuide ships continuously, and the person using it has no reason to read `CHANGELOG.md` (technical, dev-facing, not addressed to them). Ariel wants users to **discover** new features passively, in the flow of the app, rather than being told about them in prose they'd have to seek out. What's New gives every shipped, user-visible feature a warm, one-line announcement that surfaces where the person already is, and rewards clicking it by taking them straight to the thing that's new — the click *is* "I saw this and I'm going to look," which is a truer signal than a timer or a generic dismiss would be.

## 2. User-facing behavior

A small pill sits near the bottom of the shell, labeled **"What's new"**. It is present whenever the signed-in person has **any published entry in their history** (seen or not), so the history stays reachable even after everything has been cleared; only when nothing has ever been published does the pill disappear. A gold **count badge** rides on the pill and shows the number of **unread** entries, appearing only when that count is positive.

Tapping the pill expands a short list, newest first: each row is a title, a one- or two-sentence body, and a chevron. By default the list shows the person's **unread** entries. Tapping a **row** (not the pill's close button) does its work in one motion: it switches the app to the tab that shows the feature, marks that entry seen for this person (permanently, for them; other people's feeds are unaffected), and drops it from the unread scroll while the others stay. If the entry carries a **component target**, the same tap also opens a one-step **spotlight** around that specific component once its page mounts, a small tutorial-style coachmark with its own dismiss control (no tour step chrome). An entry without a component target is page-level navigation only.

Two controls sit at the bottom of the panel:

- **See all** toggles the list to the full history, newest first, including entries the person has already cleared. Seen entries are shown dimmed with a small check; the label flips to **Show unread**. Tapping a seen entry revisits it (re-navigates, re-spotlights if it has a target); marking it seen again is a harmless no-op.
- **Clear all** marks every currently published entry seen for this person at once, emptying the unread list. It is disabled when there is nothing unread.

Tapping the pill again, or the panel's ✕, only closes the panel; it changes nothing about which entries are seen. There is still no timer-based auto-dismiss.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Show/hide the pill | Reactive: `whatsNew.history` has ≥1 row for the signed-in user | Renders (or hides) the docked pill. The count badge shows the unread count, and only when it is positive | Manual (passive) | `whatsNew`, `whatsNewSeen` (read) |
| Open the feed | Tap the pill | Expands the short list; defaults to unread entries | Manual | (none) |
| **Click an entry (the acknowledgment)** | Tap an entry row | Navigates to the entry's page (the component's tab if it has a `componentTarget`, else its own `view`), writes a `whatsNewSeen` row for `(user, entry)` so it leaves the unread scroll, and, if the entry has a `componentTarget`, opens a one-step spotlight around that component once it mounts | Manual | `whatsNewSeen` (insert) |
| Toggle See all / Show unread | Tap **See all** at the panel bottom | Switches the list between the unread default and the full history (seen entries shown dimmed, still clickable to revisit) | Manual | (none) |
| Clear all | Tap **Clear all** at the panel bottom | Marks every currently published entry seen for the caller in one write pass (`whatsNew.clearAll`), emptying the unread list; disabled when nothing is unread | Manual | `whatsNewSeen` (insert, gap-fill) |
| Close the panel | Tap the pill again, or ✕ | Collapses the list; no data change, no entry is marked seen | Manual | — |
| Author an entry | `/admin` → What's New → **New entry** | Owner writes `title` + `body`, picks either a **component to spotlight** (which fixes the tab) or a plain **tab** (`view`); inserts a `whatsNew` row, published immediately | Manual (owner-gated) | `whatsNew` |
| Edit an entry | `/admin` → What's New → pencil icon | Owner edits title/body/view and the optional component target (choosing "None" clears it back to page-level) on an existing row | Manual (owner-gated) | `whatsNew` |
| Delete an entry | `/admin` → What's New → trash icon | Owner removes a `whatsNew` row outright (e.g. a mistake); anyone who hadn't seen it simply stops seeing it, no "it was deleted" notice | Manual (owner-gated) | `whatsNew` |
| Seed the launch entries | `npx convex run whatsNew:seedLaunchEntries` | One-shot `internalMutation` publishing the hand-written launch entries so the feed isn't empty on day one; idempotent (skips a title that already exists), stamps `createdBy` to the owner (must have signed in once). Still manual authorship: copy is hand-written in code, not generated from `CHANGELOG.md` (ADR 0026) | Owner (CLI) | `whatsNew` |

There is no Coach path for What's New: it is not something the Coach curates or narrates — see §4.

## 4. Dynamics and interactions with other elements

- **Mounted in** `components/shell/AppShell.tsx` (`components/whatsnew/WhatsNewFeed.tsx`), alongside `FeedbackWidget` and `CoachDock`. It receives the shell's `nav` function as `onNavigate` so a click-through switches the same `View` state the Rail uses (there is no per-surface URL to link to: the app is one route, `/`, with client-side view state; see `components/shell/Rail.tsx`), so an entry's "link" is a `View` key (`today|core|board|goals|sessions|settings`), not a path. It also receives an `onSpotlight` setter: for a component-targeted entry the feed hands the shell a `{ selector, placement, title, body }` payload, and the shell renders `components/whatsnew/WhatsNewSpotlight.tsx` over the newly-navigated page.
- **Component spotlights reuse the tour's geometry.** A `componentTarget` is a key from a small **stable registry**: the closed key set lives in `convex/whatsNewTargets.ts` (so schema and mutations validate against it), and `components/whatsnew/targets.ts` attaches each key's `data-tour` selector, shell `view`, coachmark placement, and admin label. The selectors are anchors the **guided product tour** already depends on (`components/tour/steps.ts`), so they are as stable as the tour. `WhatsNewSpotlight` reuses the tour's measurement and geometry primitives (`useTourTarget`, `isSpotlightable`, `cardPosition`, the box-shadow spotlight) but has **none** of the tour's step chrome (no Back/Next, no dots, no "Step X of Y"): just the copy and a single dismiss, plus click-outside to close. Only **compact** controls belong in the registry: a full-page anchor would fail `isSpotlightable` and degrade to a centered card, which is not a component highlight, so whole-page entries carry no target and use their `view`. See `docs/product/features/product-tour.md` for the shared geometry.
- **Authoring surface** is `components/whatsnew/WhatsNewAdmin.tsx`, embedded in `app/admin/page.tsx` beside `FeedbackInbox`, gated the same way (`enabled={canAccess}` where `canAccess = isDev || isOwner`, the page-level UX gate from [ADR 0006](../../decisions/0006-owner-gated-admin.md)). The real boundary is server-side: every mutation in `convex/whatsNew.ts` that writes a `whatsNew` row re-checks `isOwner` itself, with **no** `isDev` bypass — unlike the page gate, this is genuine cross-user content (everyone's feed), not self-scoped dev tooling, so it follows the stricter pattern `feedback.listAll` uses for the owner's cross-user reads.
- **Does not touch the Context Bus.** What's New is not part of a person's state (it doesn't reflect who they are or what they're building) — it's operational/product content pushed from the owner to every account, closer to the Feedback Widget's relationship to the app than to an Element like Sessions or the Core.
- **No AI in the loop, deliberately** — see §7 and [ADR 0026](../../decisions/0026-whats-new-manual-authorship.md).

## 5. States

- **Hidden:** the signed-in person has **no published entry in their history at all** (nothing has ever been authored, seen or unseen). Only then does nothing render, no pill and no placeholder. Note (ARI-107): in production the feed showed *nothing at all* until the launch entries were seeded (the "shipped but empty, so invisible" trap), since the query only returns published rows and none had been authored. `seedLaunchEntries` (see §3) is the fix; a fresh deployment must run it (or author entries via `/admin`) for the pill to appear.
- **Collapsed (pill):** at least one published entry exists. The pill is always present in this state so history stays reachable, even when everything has been cleared. The gold count badge shows the **unread** count and appears only when that count is positive; a fully-caught-up person sees the pill with no badge.
- **Expanded, unread (default):** the pill is tapped; the list shows the person's unread entries newest-first, scrollable past ~4 rows, with **See all** and **Clear all** at the bottom.
- **Expanded, full history (See all):** the list shows every published entry newest-first, including cleared ones. Seen entries are dimmed with a small check and remain clickable to revisit; the toggle reads **Show unread**.
- **All caught up:** the unread default is open but empty (everything has been seen or cleared). The panel shows an "You're all caught up" line, with **See all** still available to browse history.
- **Component spotlight:** a component-targeted entry was clicked; after navigating to its page, a one-step coachmark is drawn around the mapped component (or, if that component is missing or hidden, a centered dismissable card). It has its own close control and dismisses on click-outside, on **Escape**, or when the person navigates the shell to another view. It is keyboard-reachable without trapping focus: on mount focus moves to its primary "Got it" dismiss, and on unmount the previously focused element is restored; the dialog wires `aria-labelledby`/`aria-describedby` to its visible title and body. It is not a persisted state (dismissing clears it, and the entry is already marked seen).
- **Seen (per user, per entry):** a `whatsNewSeen` row exists for that `(userId, whatsNewId)` pair. The entry leaves that user's unread `feed` forever and shows as dimmed in `history`, independent of every other user's state.
- **Admin: composing:** the owner has tapped New entry or the pencil on an existing row; the inline form is open with `title` / `body`, an optional **component to spotlight** (which fixes the tab), or a plain **tab** (`view`) when no component is chosen, plus Publish/Save + Cancel.

## 6. Edge cases

- **Unauthenticated** → `feed` and `history` both return `[]` server-side; the pill never renders (mirrors the Feedback Widget's unauthenticated behavior). `markSeen` and `clearAll` throw for an unauthenticated caller.
- **Component target missing or hidden** (the `data-tour` anchor is not mounted, or is `display:none` below its breakpoint, e.g. the desktop-only Coach button on a phone) → `useTourTarget` reports no rect, so `WhatsNewSpotlight` falls back to a centered, dismissable card carrying the same copy. The person still lands on the right page and the entry is still marked seen; only the highlight is skipped. Same fallback if a stored `componentTarget` is an unknown key from an older entry (`resolveTarget` returns null, so it is treated as page-level).
- **`clearAll` only touches entries that exist now** → it gap-fills `whatsNewSeen` for every *currently published* entry the caller has not yet seen. Any entry published *later* has no row, so it arrives unread as normal; "Clear all" is a catch-up, not a permanent mute.
- **History stays reachable after clearing** → because the pill is shown whenever any published entry exists (not only when something is unread), **See all** remains available after **Clear all**, so cleared items can always be found and revisited.
- **An entry is deleted while a user has it unseen** → it simply stops appearing in `feed`/`history` (the queries re-collect from `whatsNew`, and a deleted row is gone); no error, no "removed" placeholder. If a `whatsNewSeen` row already existed for it, it is just orphaned data (harmless: the queries only ever look up `whatsNew` rows that still exist).
- **Owner edits an entry a user already saw** → no effect on that user; `whatsNewSeen` keys off the entry's `_id`, not its content, so the click-through stands regardless of later edits (including adding, changing, or clearing its `componentTarget`). Renotifying everyone would need a new entry, not an edit (not supported today, see §9).
- **Two tabs open, same account** → Convex reactivity means both tabs update the instant either one clicks an entry through or runs Clear all (the `whatsNewSeen` rows land and both queries re-run); no stale duplicate pill.
- **Non-owner (or dev-mode-only) visits `/admin`** → `WhatsNewAdmin` renders (page-level `canAccess` UX gate), but `listAll` returns `[]` and every write mutation (`create`/`update`/`remove`) throws server-side; the panel functionally shows nothing and does nothing, matching how `FeedbackInbox` behaves for a non-owner.
- **`view` or `componentTarget` points at something unreachable** (none exist today: all six `View` keys are always in the Rail, and every registry key maps to a live anchor) → not a live edge case, but both fields are closed unions in the schema specifically so an authored entry can never point at a dead surface or a stale selector.
- **Click lands mid-navigation** (person double-taps, or taps while a `view` transition is already animating) → `onNavigate` + `markSeen` (+ `onSpotlight` for a targeted entry) each fire once per click handler invocation; a duplicate `markSeen` call is a no-op (idempotent, see `convex/whatsNew.ts`).
- **Person navigates away while a spotlight is open** (taps the Rail, bottom bar, or a page heading's account menu) → the shell's `nav` clears the spotlight, since it was anchored to the page just left. The click-through path in `WhatsNewFeed` also routes through `nav`, but it calls `nav` and then sets the fresh spotlight in the same event, so its state update lands after the clear and wins (React batches both), leaving that path intact.

## 7. AI involvement

None, by design (see [ADR 0026](../../decisions/0026-whats-new-manual-authorship.md)). Entries are owner-authored, warm, user-facing copy — the opposite register from `CHANGELOG.md`'s technical, file-path-laden entries. Auto-generating from the changelog was considered and rejected: it would either read as engineer-speak or require an AI rewrite pass with no owner review, and What's New is a small, low-frequency, high-visibility surface where a wrong or tone-deaf line is worse than a missing one.

## 8. Data touched

Owns two tables (see [`../../architecture/data-model.md`](../../architecture/data-model.md)):

- **`whatsNew`**: `{ title, body, view: today|core|board|goals|sessions|settings, publishedAt, createdBy, componentTarget? }`, indexed `by_publishedAt`. One row per shipped-feature announcement, owner-authored. `componentTarget` is **optional**: a key from the closed registry in `convex/whatsNewTargets.ts` (today `coach` or `settings-restart`). When present, a click navigates to the component's page and spotlights it; when absent, the entry is page-level and uses `view`.
- **`whatsNewSeen`**: `{ userId, whatsNewId, seenAt }`, indexed `by_user` and `by_user_entry`. One row per `(user, entry)`, written the instant that user clicks that entry through (via `markSeen`) or runs **Clear all** (`clearAll`, which gap-fills a row for every currently published entry the user has not yet seen). Absence of a row means the entry is still unseen for that user.

Read paths over these two tables:

- **`feed`** returns every published entry the caller has **not** seen, newest-first (the unread list and the badge count).
- **`history`** returns **every** published entry newest-first, each tagged with a per-caller `seen` boolean (the See all list; drives the dimmed/revisitable seen rows and keeps the pill present whenever any entry exists).
- **`clearAll`** is idempotent and duplicate-safe: it reads the caller's existing `whatsNewSeen` rows first and inserts only for entries not already recorded, so re-running it (or clearing after some entries were clicked) never writes a second row for the same `(user, entry)`.

## 9. Open questions

- **Re-notifying on a materially changed entry** — today an edit never resurfaces an already-seen entry. If the owner ships a correction significant enough to want re-attention, the only lever is publishing a new entry; a "bump" action that clears `whatsNewSeen` rows for one entry is a plausible follow-up, deferred as unneeded until it comes up.
- **Retention** — old, long-seen `whatsNew` rows and their `whatsNewSeen` rows accumulate forever; no archival/cleanup policy yet (mirrors the same open question on `feedback`'s snapshots).
- **Draft state** — entries publish immediately on create; there's no draft/preview step before it's live in every unseen user's feed. Fine at today's cadence (owner edits/deletes are one tap away); would need a `status` field if authoring gets less careful or more collaborative.
- **Ordering when a user has many unseen entries** — `feed` returns all unseen entries newest-first with no cap; if the feed's backlog for a returning user grows large, a "just show the latest N, the rest folded" treatment may be worth adding.
