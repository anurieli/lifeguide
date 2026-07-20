import type { View } from "@/components/shell/Rail";

export type TourStep = {
  id: string;
  /** The shell view the step needs on screen. The orchestrator navigates
      there before measuring the target, so every step is reachable from
      anywhere the tour happens to start. */
  view: View;
  /** data-tour value of the DOM node this step's coachmark anchors to. If it
      isn't found (hidden by a breakpoint, not yet mounted) or resolves to a
      zero-size rect (display:none), the coachmark falls back to a centered
      card — see TourCoachmark — so the tour still renders and advances on
      every page even when a specific control isn't reachable there. */
  target: string;
  placement: "top" | "bottom" | "left" | "right";
  title: string;
  body: string;
};

// Five stops, one per surface named in ARI-19. Copy is a placeholder pending
// docs/product/onboarding-strategy.md (ARI-20, in flight in parallel) — kept
// short and in the app's own voice (see docs/product/concept-and-soul.md) so
// swapping in the real copy later is a one-line change per step, not a
// rewrite of the engine.
export const TOUR_STEPS: TourStep[] = [
  {
    id: "today",
    view: "today",
    target: "tour-today",
    placement: "bottom",
    title: "Welcome to LifeGuide",
    body: "Quick tour, five stops — skip anytime, or pick it back up later from Settings. This is Today: your daily ritual and whatever's live right now.",
  },
  {
    id: "core",
    view: "core",
    target: "tour-core",
    placement: "bottom",
    title: "Your Core",
    body: "Who you are, underneath your days. Your Coach reads this before every reply. Fill in a question here any time — the colored dot shows how settled it should be.",
  },
  {
    id: "board",
    view: "board",
    target: "tour-whiteboard",
    placement: "top",
    title: "The vision board",
    body: "An infinite canvas for anything you're carrying. Scroll or pinch to zoom, drag to pan, and use the toolbar to add a card or gather everything back to center.",
  },
  {
    id: "coach",
    view: "today",
    target: "tour-coach",
    placement: "left",
    title: "Talk to your Coach",
    body: "Tap this and just talk — the call happens right here, no new screen. Your Coach sees whatever surface you're on and knows your Core. Prefer typing? The small bubble above it opens the chat.",
  },
  {
    id: "settings",
    view: "settings",
    target: "tour-settings-restart",
    placement: "top",
    title: "Make it yours",
    body: "Tune your daily rhythm and how direct your Coach is. And this exact spot restarts this tour, any time you want to run it again.",
  },
];

// The optional short intro video (DoD: build the embed slot; no real asset
// exists yet). null = nothing renders — swap in a URL once one exists.
export const TOUR_VIDEO_URL: string | null = null;
