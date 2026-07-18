# 0025. A custom guided-tour engine, not driver.js or react-joyride

**Status:** accepted (live) · **Date:** 2026-07-18

## Context

ARI-19 asked for a guided, multi-step product tour: coachmarks anchored to
real UI, navigating a person across the App Shell's pages (Core, Whiteboard,
Today, Coach, Settings), skippable and resumable, tracked per user. The task
explicitly asked to weigh an off-the-shelf coachmark library (`driver.js` /
`react-joyride`) against a custom layer and document the call.

Both libraries are built around a **static step list over a static (or
router-navigable) page**: point a CSS selector at an element, show a bubble,
advance on click. Neither has a first-class notion of "before showing this
step, put the app into the right *state*." This app's shell is a single-page
client-state machine, not a set of routed pages — Today/Core/Whiteboard/Goals/
Thoughts/Settings are all conditionally rendered inside one `Shell` component
based on a `view` string held in React state (`components/shell/AppShell.tsx`),
not separate URLs. A tour step here has to:

1. Push the shell's `view` to the right page (there is no URL to navigate to).
2. Wait for that page's target element to actually mount and lay out (the
   Whiteboard, in particular, keeps its whole canvas mounted at all times and
   toggles a CSS class rather than mount/unmounting, and pans/zooms via a CSS
   transform that fires neither a resize nor a scroll event).
3. Degrade gracefully when a target genuinely isn't present (the Coach talk
   button is desktop-only; `hidden md:flex`).

Both libraries support a "before step" hook to inject exactly this kind of
side effect, which means adopting either one would still require writing
custom step-transition logic — the library would only be contributing the
popover/spotlight chrome on top of that. That chrome is not large: a coachmark
card plus a dimmed backdrop with a cutout, both straightforward to build with
plain positioned `div`s and the "giant `box-shadow`" spotlight trick.

## Decision

**Build a small custom tour engine** (`components/tour/`) rather than add
`driver.js` or `react-joyride` as a dependency:

- `steps.ts` — a flat, ordered array of step descriptors (`view`, `target`
  selector, `placement`, `title`, `body`). Data only, no logic, so swapping in
  real copy later (ARI-20) is a one-line-per-step edit.
- `useTourTarget.ts` — a hook that measures the `data-tour="…"` element for
  the active step on every animation frame while a step is active (bounded
  cost: only during the tour), treating a zero-size rect (display:none) as
  "not found."
- `TourCoachmark.tsx` — the popover + spotlight, styled with the app's own
  `paper`/`ink`/`gold`/`accent` Tailwind tokens rather than overriding a
  library's default CSS.
- `TourVideoSlot.tsx` — the optional dismissible video embed (DoD: build the
  slot; no asset yet, `TOUR_VIDEO_URL = null`).
- `Tour.tsx` — the orchestrator: owns the current step locally for instant
  Back/Next, drives the shell's `view` via the same `nav` function the Rail
  uses, and mirrors progress into Convex (`convex/tour.ts`) as a side effect.

State (current step, completed, skipped) rides three new optional fields on
the existing per-user `settings` row rather than a new table — see
[`../architecture/data-model.md`](../architecture/data-model.md#settings) and
[`../product/features/product-tour.md`](../product/features/product-tour.md).

## Consequences

- **No new runtime dependency** for an early-stage app where every kilobyte of
  bundle and every third-party API surface is a cost against a small team.
- **The chrome matches the app exactly** (paper/ink/gold tokens, existing
  Group/Row/button conventions in Settings) instead of visually clashing with
  or fighting a library's own theme system.
- **The engine is coupled to this shell's shape** (a single `view` state
  string, not routes). If the app ever moves to real per-page routing, the
  `onNav`-driven step transition in `Tour.tsx` would need to become a router
  navigation instead — a small, localized change, not a rewrite, since
  `steps.ts` already models each step's target page as an opaque `View`
  value.
- **Anchor granularity is coarse for three of five steps** (Today, Core,
  Whiteboard anchor on the page's root container, not a specific control) —
  a deliberate simplification to avoid coupling the tour to internals of
  complex, actively-evolving surfaces (the Whiteboard canvas especially).
  The Coach and Settings steps anchor on one specific, stable button each,
  where the copy is literally "click here." See
  [`../design/product-tour.md`](../design/product-tour.md) for the full
  per-step anchor table.
- **Reversible.** The engine is ~350 lines across five files with no schema
  dependency beyond three optional `settings` fields; removing it is a git
  revert with no migration.
