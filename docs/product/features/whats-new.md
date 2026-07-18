# What's New

**Status:** built · **Element of:** spine (cross-surface, owner-authored content) · **Owns:** `whatsNew`, `whatsNewSeen`

> A dismiss-by-click-through feed of shipped features, docked near the bottom of the app shell. It only leaves the feed for a person once they click that *specific* entry and it navigates them to the surface showing the feature — never a generic X-to-dismiss.

## 1. Purpose

LifeGuide ships continuously, and the person using it has no reason to read `CHANGELOG.md` (technical, dev-facing, not addressed to them). Ariel wants users to **discover** new features passively, in the flow of the app, rather than being told about them in prose they'd have to seek out. What's New gives every shipped, user-visible feature a warm, one-line announcement that surfaces where the person already is, and rewards clicking it by taking them straight to the thing that's new — the click *is* "I saw this and I'm going to look," which is a truer signal than a timer or a generic dismiss would be.

## 2. User-facing behavior

A small pill sits near the bottom of the shell, labeled **"What's new"** with a count badge, and is **only present when the signed-in person has unseen entries** — no unseen entries, no pill, nothing to look at. Tapping the pill expands a short list, newest first: each row is a title, a one- or two-sentence body, and a chevron. Tapping a **row** (not the pill's close button) does two things in one motion: it switches the app to the tab that shows the new feature, and it removes that entry from the person's feed — permanently, for them; other people's copies of the feed are unaffected. Tapping the pill again, or the panel's ✕, only closes the panel; it changes nothing about which entries are seen. There is no "mark all read," no timer-based auto-dismiss, and no way to clear an entry without visiting what it points to.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Show/hide the pill | Reactive: `whatsNew.feed` has ≥1 row for the signed-in user | Renders (or hides) the docked pill with an unseen count | Manual (passive) | `whatsNew`, `whatsNewSeen` (read) |
| Open the feed | Tap the pill | Expands the short list of unseen entries | Manual | — |
| **Click an entry (the acknowledgment)** | Tap an entry row | Navigates to the entry's linked tab (`view`) **and** writes a `whatsNewSeen` row for `(user, entry)` — the entry never reappears in that user's feed | Manual | `whatsNewSeen` (insert) |
| Close the panel | Tap the pill again, or ✕ | Collapses the list; no data change, no entry is marked seen | Manual | — |
| Author an entry | `/admin` → What's New → **New entry** | Owner writes `title` + `body` + picks the linked `view`; inserts a `whatsNew` row, published immediately | Manual (owner-gated) | `whatsNew` |
| Edit an entry | `/admin` → What's New → pencil icon | Owner edits title/body/view on an existing row | Manual (owner-gated) | `whatsNew` |
| Delete an entry | `/admin` → What's New → trash icon | Owner removes a `whatsNew` row outright (e.g. a mistake); anyone who hadn't seen it simply stops seeing it — no "it was deleted" notice | Manual (owner-gated) | `whatsNew` |

There is no Coach path for What's New: it is not something the Coach curates or narrates — see §4.

## 4. Dynamics and interactions with other elements

- **Mounted in** `components/shell/AppShell.tsx` (`components/whatsnew/WhatsNewFeed.tsx`), alongside `FeedbackWidget` and `CoachDock`, and receives the shell's `nav` function as `onNavigate` so a click-through switches the same `View` state the Rail uses — there is no per-surface URL to link to (the app is one route, `/`, with client-side view state; see `components/shell/Rail.tsx`), so an entry's "link" is a `View` key (`today|core|board|goals|sessions|settings`), not a path.
- **Authoring surface** is `components/whatsnew/WhatsNewAdmin.tsx`, embedded in `app/admin/page.tsx` beside `FeedbackInbox`, gated the same way (`enabled={canAccess}` where `canAccess = isDev || isOwner`, the page-level UX gate from [ADR 0006](../../decisions/0006-owner-gated-admin.md)). The real boundary is server-side: every mutation in `convex/whatsNew.ts` that writes a `whatsNew` row re-checks `isOwner` itself, with **no** `isDev` bypass — unlike the page gate, this is genuine cross-user content (everyone's feed), not self-scoped dev tooling, so it follows the stricter pattern `feedback.listAll` uses for the owner's cross-user reads.
- **Does not touch the Context Bus.** What's New is not part of a person's state (it doesn't reflect who they are or what they're building) — it's operational/product content pushed from the owner to every account, closer to the Feedback Widget's relationship to the app than to an Element like Sessions or the Core.
- **No AI in the loop, deliberately** — see §7 and [ADR 0022](../../decisions/0022-whats-new-manual-authorship.md).

## 5. States

- **Hidden:** the signed-in person has zero unseen entries (new account with none published yet, or they've clicked through everything so far). Nothing renders — no empty pill, no placeholder.
- **Collapsed (pill):** unseen entries exist; the pill shows a count badge.
- **Expanded (panel):** the pill is tapped; the list of unseen entries shows, scrollable past ~4 rows.
- **Seen (per user, per entry):** a `whatsNewSeen` row exists for that `(userId, whatsNewId)` pair — the entry is gone from that user's `feed` query forever, independent of every other user's state.
- **Admin: composing:** the owner has tapped New entry or the pencil on an existing row; the inline form is open with `title` / `body` / `view` fields and Publish/Save + Cancel.

## 6. Edge cases

- **Unauthenticated** → `feed` returns `[]` server-side; the pill never renders (mirrors the Feedback Widget's unauthenticated behavior).
- **An entry is deleted while a user has it unseen** → it simply stops appearing in `feed` (the query re-collects from `whatsNew`, and a deleted row is gone); no error, no "removed" placeholder. If a `whatsNewSeen` row already existed for it, it's just orphaned data (harmless — `feed` only ever looks up `whatsNew` rows that still exist).
- **Owner edits an entry a user already saw** → no effect on that user; `whatsNewSeen` keys off the entry's `_id`, not its content, so the click-through stands regardless of later edits. (If the intent were "renotify everyone," that would need a new entry, not an edit — not supported today, see §9.)
- **Two tabs open, same account** → Convex reactivity means both tabs' feeds update the instant either one clicks an entry through (the `whatsNewSeen` row lands and both queries re-run) — no stale duplicate pill.
- **Non-owner (or dev-mode-only) visits `/admin`** → `WhatsNewAdmin` renders (page-level `canAccess` UX gate), but `listAll` returns `[]` and every write mutation (`create`/`update`/`remove`) throws server-side — the panel functionally shows nothing and does nothing, matching how `FeedbackInbox` behaves for a non-owner.
- **`view` points at a tab the account can't currently reach** (none exist today — all six `View` keys are always in the Rail) → not a live edge case, but the `view` field is a closed union in the schema specifically so an authored entry can never point at a dead surface.
- **Click lands mid-navigation** (person double-taps, or taps while a `view` transition is already animating) → `onNavigate` + `markSeen` both fire once per click handler invocation; a duplicate `markSeen` call is a no-op (idempotent — see `convex/whatsNew.ts`).

## 7. AI involvement

None, by design (see [ADR 0022](../../decisions/0022-whats-new-manual-authorship.md)). Entries are owner-authored, warm, user-facing copy — the opposite register from `CHANGELOG.md`'s technical, file-path-laden entries. Auto-generating from the changelog was considered and rejected: it would either read as engineer-speak or require an AI rewrite pass with no owner review, and What's New is a small, low-frequency, high-visibility surface where a wrong or tone-deaf line is worse than a missing one.

## 8. Data touched

Owns two tables (see [`../../architecture/data-model.md`](../../architecture/data-model.md)):

- **`whatsNew`**: `{ title, body, view: today|core|board|goals|sessions|settings, publishedAt, createdBy }`, indexed `by_publishedAt`. One row per shipped-feature announcement, owner-authored.
- **`whatsNewSeen`**: `{ userId, whatsNewId, seenAt }`, indexed `by_user` and `by_user_entry`. One row per `(user, entry)` the instant that user clicks that entry through — the click-through itself, never a generic dismiss. Absence of a row means the entry is still unseen for that user.

## 9. Open questions

- **Re-notifying on a materially changed entry** — today an edit never resurfaces an already-seen entry. If the owner ships a correction significant enough to want re-attention, the only lever is publishing a new entry; a "bump" action that clears `whatsNewSeen` rows for one entry is a plausible follow-up, deferred as unneeded until it comes up.
- **Retention** — old, long-seen `whatsNew` rows and their `whatsNewSeen` rows accumulate forever; no archival/cleanup policy yet (mirrors the same open question on `feedback`'s snapshots).
- **Draft state** — entries publish immediately on create; there's no draft/preview step before it's live in every unseen user's feed. Fine at today's cadence (owner edits/deletes are one tap away); would need a `status` field if authoring gets less careful or more collaborative.
- **Ordering when a user has many unseen entries** — `feed` returns all unseen entries newest-first with no cap; if the feed's backlog for a returning user grows large, a "just show the latest N, the rest folded" treatment may be worth adding.
