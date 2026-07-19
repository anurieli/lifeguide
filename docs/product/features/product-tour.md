# Product Tour (guided walkthrough)

**Status:** built (2026-07-18, ARI-19) · **Element of:** spine · **Owns:** no table of its own — rides `settings.tourStep` / `tourCompletedAt` / `tourSkippedAt` (see [`../../architecture/data-model.md`](../../architecture/data-model.md))

> A guided, multi-step walkthrough of the app shell for an already-onboarded person: five coachmarks anchored to real UI, one per surface (Today, Core, Whiteboard, Coach, Settings). Skippable, resumable, restartable.

---

> **Not the same thing as [`onboarding.md`](onboarding.md).** That feature (the Door → Interview → Synthesis flow) draws a brand-new person's Core out of them *before the app shell ever mounts* — it is the front door. This feature runs *after* that: it walks an already-onboarded person around the shell they just entered, so a beta tester doesn't need hand-holding to find Core, the board, the Coach, and Settings. The two features share nothing except the coincidence that both are, informally, "onboarding" — this doc calls the newer one the **product tour** throughout to keep them apart. See the naming note in Open Questions.

## 1. Purpose

Beta testers were landing in a fully-built app shell — Today, Core, the vision board, Goals, Thoughts, Settings, the Coach — with no guided path in beyond a rail full of icons. Every new tester had to be walked through the app by hand. The product tour replaces that hand-holding with a short, skippable, resumable in-app walkthrough that touches every major surface once, so a cold user can orient themselves without a live demo.

## 2. User-facing behavior

The tour fires automatically the first time an onboarded user (`settings.onboardedAt` set) lands in the app shell with no tour history (`tourCompletedAt` and `tourSkippedAt` both unset). It shows a small floating card with a title, a line of copy, a step counter (dot row), and Back / Next / Skip controls, plus a **spotlight**: the rest of the screen dims and a rounded cutout highlights the real UI element the step is about.

The card is always positioned wholly inside the viewport (clamped on every edge), so its controls — Skip in particular — are always reachable, and **a click anywhere on the dimmed backdrop (outside the card) ends the tour**, the same as Skip. Together these mean the overlay can never trap a person: even if a step's card lands somewhere awkward, one click on the dim gets them out. The spotlight is only drawn around a **compact** target; a target that fills most of the viewport (a page's full-height scroll container) gets a plain centered card over an even dim instead of a cutout — see §6.

Five stops, in order:

1. **Today** — welcome + orientation. Carries the optional intro-video slot (see §4).
2. **Core** — "who you are," the Life Blueprint.
3. **Whiteboard** — the vision-board canvas: zoom, pan, add a card.
4. **Coach** — the floating talk button; anchored on desktop, falls back to a centered card on a phone (that button is desktop-only).
5. **Settings** — anchored on the exact "Restart tour" button, so the person's last impression of the tour is also the control that brings it back.

Each step **navigates the shell to that step's page automatically** — the person doesn't have to click the rail themselves to follow along; the coachmark just appears wherever the tour has taken them. "Next" advances; "Back" (hidden on step 1) returns; "Skip tour" ends it immediately from any step. Reaching "Finish" on the last step and clicking "Skip tour" both end the tour permanently (see §5) — the difference is only which terminal stamp gets set, for future analytics.

If the browser is closed or the tab is reloaded mid-tour, the tour resumes at the same step next time the app loads (see §3, `advance`). From Settings, a "Restart tour" button (Guided tour group) clears both terminal stamps and replays the whole thing from step 1.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Auto-start | App shell mounts, onboarded + no tour history | Shows step 1's coachmark, navigates shell to `today` | Manual (no Coach path) | `settings` (read only, via `tour.get`) |
| Next | "Next" / "Finish" button | Advances to the next step (or ends the tour on the last step) | Manual | `tour.advance` (mid-tour) or `tour.complete` (last step) |
| Back | "Back" button (hidden on step 1) | Returns to the previous step | Manual | `tour.advance` |
| Skip | "Skip tour" (visible on every step) | Ends the tour immediately from wherever it is | Manual | `tour.skip` |
| Restart | Settings → Guided tour → "Restart tour" | Clears both terminal stamps, resets step to 0; the tour fires again on the next render | Manual | `tour.restart` |
| Resume | Reload / new session mid-tour | Reads `tour.get().step` and continues from there instead of restarting | Manual (automatic) | `tour.get` (read only) |

## 4. Dynamics and interactions with other elements

The tour **draws** on, and **drives**, the App Shell rather than owning any surface of its own:

- **Draws:** `settings.onboardedAt` (the gate — the tour never runs before the Door/Interview onboarding is complete) and its own `tourStep` / `tourCompletedAt` / `tourSkippedAt` fields (via `convex/tour.ts`).
- **Drives:** the shell's `view` state (`components/shell/AppShell.tsx`'s `Shell`) via the same `nav` function the Rail uses — each step's `view` is pushed the moment that step becomes active, so the person is looking at the right page before the coachmark appears.
- **Anchors on, but does not modify the behavior of:** `data-tour="…"` attributes added to five existing elements — `Today`'s root, `Core`'s root, `Whiteboard`'s and `MobileBoard`'s roots (same attribute value, whichever is mounted), `CoachDock`'s talk button, and the new "Restart tour" button in `Settings`. None of those elements' own logic changed; the attribute is purely a hook for `components/tour/useTourTarget.ts` to find and measure.
- **Does not touch:** the Coach chat panel's open/closed state. Earlier drafts had the tour force the panel open for its Coach step; that was dropped in favor of anchoring on the always-present talk button, so the tour never fights whatever the person happens to be doing in their own chat.

**Engine, not library:** built as a small custom engine (`components/tour/`) rather than on `driver.js` or `react-joyride`. Every step here first has to drive the app's own view-switch before it can even measure a target — an off-the-shelf tour library still needs a `beforeStep`-style callback to do that, at which point it's only buying popover chrome, and that chrome is ~150 lines here (`TourCoachmark.tsx`), styled with the app's own paper/ink/gold tokens instead of overriding a library's default CSS. Avoiding the dependency also keeps the bundle honest for an early-stage app. See [ADR 0025](../../decisions/0025-custom-guided-tour-engine.md).

## 5. States

| State | When | Visual |
|---|---|---|
| Inactive | `onboardedAt` unset, or `tourCompletedAt`/`tourSkippedAt` set | Nothing renders |
| Active — step N | Eligible and running | Spotlight (or centered card if the target isn't found or is oversized) + coachmark, N of 5 |
| Completed | "Finish" clicked on step 5 | `tourCompletedAt` stamped; inactive from then on |
| Skipped | "Skip tour" clicked on any step | `tourSkippedAt` stamped; inactive from then on |
| Restarted | Settings → "Restart tour" | Both stamps cleared, step reset to 0; re-enters Active — step 1 |

`tourCompletedAt` and `tourSkippedAt` are both terminal and both suppress re-fire; they're kept as two separate fields (rather than one boolean) purely so a future pass can tell "watched the whole thing" from "bailed early" without a schema change.

## 6. Edge cases

- **Target not found** (element hidden by a breakpoint — the Coach talk button is `hidden md:flex`, or not yet mounted a render after a view switch): `useTourTarget` treats a zero-size `getBoundingClientRect()` the same as "not found." The coachmark falls back to a plain centered card with no spotlight, so the tour still renders and can advance on every step on every device, even where a specific control isn't reachable there.
- **Oversized target — the "grey film" trap (fixed 2026-07-19):** the `today` and `core` steps anchor `data-tour` on each page's full-height `overflow-auto` scroll container. As first shipped (ARI-19), the spotlight cut a rounded hole over that entire container, so the dim showed only in the margins — chiefly the left rail — reading as an unexplained grey film over the sidebar; the `fixed inset-0` overlay also swallowed all scroll, and the "bottom"-placed card was pushed below a full-height target, off-screen, taking the Skip control with it. An already-onboarded user landing after the deploy was simply locked out. Three guards now prevent it, all in `TourCoachmark.tsx` (pure geometry, unit-tested in `tests/tour-coachmark.test.ts`): `isSpotlightable()` suppresses the cutout for any target taller than 60% of the viewport or wider than 85% (those get a centered card over an even dim); `cardPosition()` clamps the card fully on-screen on every placement (no more off-screen Skip, and the `top` placement no longer relies on a `translateY(-100%)` the clamp can't see); and a click on the backdrop calls `skip`, so the overlay is never a dead end.
- **Whiteboard's moving canvas:** the board pans/zooms via a CSS transform, which fires neither a resize nor a scroll event. `useTourTarget` re-measures on every animation frame while a step is active (bounded cost: only during the tour) rather than relying on `ResizeObserver`/scroll listeners, so the spotlight never drifts off a moving target — though in practice the tour anchors on the Whiteboard's root container, not a node, so this mostly matters if a future step ever anchors on a canvas-space element.
- **User navigates away manually mid-tour** (clicks a different rail item): the shell's `view` changes, the tour's own effect immediately pushes it back to the current step's required view. This is deliberate — the tour is a directed walkthrough, not a free-roam overlay — but it means a person who wants to explore instead of following along should use Skip.
- **Restart while sitting on a different page than step 1:** the "Restart tour" button lives in Settings; clicking it navigates the shell to Today (step 1's view) immediately, same as any other step transition.
- **New settings row** (never-onboarded user, or `tour.get` called before `settings` exists): `tour.get` reads `tourStep`/`tourCompletedAt`/`tourSkippedAt` as `0`/`null`/`null` even before a `settings` row exists — it queries directly rather than calling `getOrCreate`, so merely checking eligibility never creates a row. The row is only created (via `settings.getOrCreate`, reused from `convex/settings.ts`) on the first real mutation (`advance`/`complete`/`skip`/`restart`).
- **Signed out:** `tour.get` returns `null`; the Tour component never renders (no `settings`/`tour` query result to derive `shouldRun` from).

## 7. AI involvement

None. The tour is a fully deterministic, client-driven walkthrough — no model in the loop for step content, sequencing, or copy.

## 8. Data touched

**Owned:** none — the tour has no table. Three optional fields ride the existing `settings` row (see [`../../architecture/data-model.md`](../../architecture/data-model.md#settings)):
- `tourStep?: number` — current step index while in progress.
- `tourCompletedAt?: number` — set on Finish; terminal.
- `tourSkippedAt?: number` — set on Skip; terminal.

**Read:** `settings.onboardedAt` (the gate — see `convex/tour.ts: get`, which reads `settings` directly rather than through `settings.getOrCreate` to avoid creating a row on a mere eligibility check).

**Mutations (`convex/tour.ts`):** `advance({ step })`, `complete({})`, `skip({})`, `restart({})` — all auth-gated, all operate only on the caller's own `settings` row (via the shared `settings.getOrCreate` helper).

## 9. Open questions

- **Naming collision with `onboarding.md`.** This repo already used "onboarding" for the Door/Interview/Synthesis Core-drawing flow (built 2026-06-03, see [`onboarding.md`](onboarding.md)) before ARI-19 was scoped as "in-app onboarding tour." Rather than overwrite that doc or that component folder, this feature is named **Product Tour** everywhere it appears (this doc, `docs/design/product-tour.md`, `components/tour/`, `convex/tour.ts`, `ADR 0025`) — a judgment call made mid-implementation, documented here so a future pass doesn't reintroduce the collision. If ARI-20's copy/strategy doc (parked separately) settles on different terminology, rename here and in the ADR together.
- **Real copy:** step titles/bodies are placeholder copy in the app's own voice (see `docs/product/concept-and-soul.md`), written before `docs/product/onboarding-strategy.md` (ARI-20) existed. `components/tour/steps.ts` is a flat, ordered array specifically so swapping in ARI-20's copy is a one-line-per-step edit, not an engine rewrite.
- **Intro video asset:** the slot (`components/tour/TourVideoSlot.tsx`) is built and wired to step 1, but ships with `TOUR_VIDEO_URL = null` in `steps.ts` — no real asset exists yet. Renders nothing until a URL is set there.
- **Goals and Thoughts surfaces:** ARI-19 named five target pages (Core, Whiteboard, Today, Coach, Settings); Goals and Thoughts aren't stops. Could be added as two more entries in `TOUR_STEPS` later with no engine change.
- **Analytics on skip-vs-complete:** the two terminal fields are already split for this, but nothing reads them yet beyond gating re-fire.
