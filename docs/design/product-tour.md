# Product Tour: Screens and Interaction

**Status:** built (2026-07-18, ARI-19). For behavior and data, see [`../product/features/product-tour.md`](../product/features/product-tour.md). Not to be confused with [`onboarding.md`](onboarding.md) (the earlier Door/Interview/Synthesis flow) — see the disambiguation note there. For the interaction contract, see [`interaction-principles.md`](interaction-principles.md).

---

## Design posture

The tour is a light layer over the real app, not a takeover: the underlying page is always the actual surface (Today, Core, the board, Settings), never a mock or a screenshot. It dims and spotlights rather than blocking — the person can always see roughly where they are. Every step carries a visible, always-available "Skip tour," honoring the same calm-never-bombarding posture as the rest of the app (see [`interaction-principles.md`](interaction-principles.md)): a guided tour that can't be dismissed instantly is a bombardment, not a courtesy.

---

## The coachmark

A card, `320px` wide, `bg-card border border-line rounded-2xl shadow-2xl`, positioned relative to the step's target element:

- **Eyebrow row:** "Step N of 5" in gold uppercase tracking, "Skip tour" as a muted text button on the right.
- **Title:** `text-[16px] font-semibold text-ink`.
- **Body:** one to two sentences, `text-[13.5px] text-ink-soft leading-relaxed`.
- **Video slot** (step 1 only): see below.
- **Progress dots:** one per step, gold when active, line-gray otherwise.
- **Controls:** "Back" (border button, hidden on step 1) and "Next" / "Finish" (solid accent button) on the right.

**Placement:** the card sits `top` / `bottom` / `left` / `right` of its target with a 14px gap, clamped to stay on-screen (`components/tour/TourCoachmark.tsx: cardPosition`). When no target is found (see the fallback case below) it centers itself in the viewport instead.

## The spotlight

A giant-box-shadow cutout: a transparent, rounded rectangle sized to the target plus 8px of padding, whose `box-shadow: 0 0 0 9999px rgba(20,18,12,0.55)` is the dimmed backdrop for the rest of the screen. No SVG mask, no extra DOM layers — one `div`. When the target can't be found, the whole viewport dims uniformly instead and the coachmark centers itself; the tour still renders and can be advanced, just without a spotlight for that one step.

## The five stops

| Step | Page | Anchor | Placement |
|---|---|---|---|
| 1. Today | `today` | `Today`'s root container | bottom |
| 2. Core | `core` | `Core`'s root container | bottom |
| 3. Whiteboard | `board` | `Whiteboard`'s (desktop) or `MobileBoard`'s (mobile) root container | top |
| 4. Coach | unchanged (stays on whatever page step 3 left) | the floating talk button (`CoachDock`, desktop only) | left |
| 5. Settings | `settings` | the "Restart tour" button (Settings → Guided tour) | top |

The tour navigates the shell to each step's page automatically as it advances — the person never has to find the right rail item themselves mid-tour.

**Anchor granularity is page-level, not micro-control**, for three of the five steps (Today, Core, Whiteboard): each anchors on that surface's outer container rather than a specific button inside it, so the spotlight reads as "you are here" rather than pointing at one control among many complex ones (the Whiteboard canvas especially — its toolbar buttons move relative to pan/zoom in a way a fixed anchor rect can't track cleanly). The Coach and Settings steps are the exception: both anchor on one specific, stable button (the talk button; the Restart-tour button) because the copy is literally "click here."

## Step 1: the optional video slot

Sits inside the step-1 card, below the body copy. When `TOUR_VIDEO_URL` (in `components/tour/steps.ts`) is unset — the current, shipped state — nothing renders at all: no placeholder box, no "video coming soon." When a URL is set, a `16:9` video player appears with a small dismiss (×) button in the top-right corner; dismissing hides just the video for that step, not the rest of the tour. Dismissal isn't persisted — it's local component state, since once the whole tour is completed or skipped the slot won't reappear regardless.

## Resume, skip, restart

- **Resume:** the current step index is written to Convex on every advance (`tour.advance`). A reload or a new session picks up the same query result and resumes there rather than restarting from step 1.
- **Skip:** ends the tour from any step, no confirmation dialog — consistent with the rest of the app's low-friction dismiss patterns (e.g. the Feedback Widget).
- **Restart:** lives in Settings under a new "Guided tour" group, styled like the existing rows there (`Group`/`Row` pattern) — a single "Restart tour" button with a brief "Starting over ✓" confirmation, matching the "Saved ✓" pattern used elsewhere in Settings.

## Not built

- No dedicated onboarding-strategy copy pass yet (ARI-20, parked separately) — current step copy is placeholder, written in the app's own voice from `docs/product/concept-and-soul.md`.
- No animated step-to-step transition beyond the coachmark's own `transition-all duration-200` on the spotlight resize; the card itself appears/disappears with the step, no crossfade.
