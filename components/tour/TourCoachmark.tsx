"use client";

import type { TourStep } from "./steps";
import type { TourRect } from "./useTourTarget";
import { TourVideoSlot } from "./TourVideoSlot";

export const PAD = 8; // px of breathing room the spotlight leaves around the target
export const CARD_W = 320;
export const CARD_H = 260; // rough card height, used only to keep the card fully on-screen
const GAP = 14; // px between the spotlight and the card

// A spotlight only makes sense around a compact control. A target that fills
// most of the viewport (e.g. a page's full-height scroll container) would cut
// a hole over the whole screen and leave the dim showing only in the margins
// (the left rail) — read as an unexplained "grey film." When the target is that
// large we skip the spotlight and show a plain dim + centered card instead.
export function isSpotlightable(rect: TourRect, vw: number, vh: number) {
  return rect.height <= vh * 0.6 && rect.width <= vw * 0.85;
}

// One coachmark: a dimmed overlay with a cut-out "spotlight" around the
// current step's target, plus a small card carrying the copy and controls.
// When `rect` is null (target not found — hidden by a breakpoint, or the
// step's view hasn't finished mounting it yet) the whole thing degrades to a
// plain centered card with no spotlight, so the tour still renders and can
// advance on every page even where a specific control isn't reachable.
//
// Built custom rather than on a library (driver.js / react-joyride): every
// step here also has to drive the app's own view-switch + (previously)
// coach-panel state before it can even measure a target, which the off-the-
// shelf tour libs don't know how to do — a "beforeStep" callback would be
// needed regardless, at which point the library is only buying the popover
// chrome. That chrome is ~150 lines here, styled with the app's own paper /
// ink / gold tokens instead of overriding a library's default CSS, and it
// avoids a new dependency for an early-stage app. See
// docs/product/features/product-tour.md for the full writeup.
export function TourCoachmark({
  step,
  index,
  total,
  rect,
  videoUrl,
  onNext,
  onBack,
  onSkip,
}: {
  step: TourStep;
  index: number;
  total: number;
  rect: TourRect | null;
  videoUrl?: string | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const isLast = index === total - 1;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  // A spotlight is only drawn for a compact, on-screen target; otherwise the
  // card is centered over a plain dim. Either way the tour is dismissable.
  const spotlight = rect !== null && isSpotlightable(rect, vw, vh);
  const cardStyle = spotlight ? cardPosition(rect!, step.placement, vw, vh) : centeredCardStyle();

  // The backdrop is an escape hatch: a click anywhere outside the card ends the
  // tour, so it can never trap someone who can't scroll or reach the controls.
  return (
    <div
      className="fixed inset-0 z-[200]"
      role="dialog"
      aria-modal="true"
      aria-label="Guided tour"
      onClick={onSkip}
    >
      {spotlight ? (
        // The "giant box-shadow" spotlight trick: a transparent rounded rect
        // sized to the target, whose box-shadow is the dimmed backdrop for
        // the rest of the screen. No SVG mask, no extra layers.
        <div
          className="fixed rounded-2xl pointer-events-none transition-all duration-200"
          style={{
            top: rect!.top - PAD,
            left: rect!.left - PAD,
            width: rect!.width + PAD * 2,
            height: rect!.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(20,18,12,0.55)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(20,18,12,0.55)]" />
      )}

      <div
        className="fixed bg-card border border-line rounded-2xl shadow-2xl p-5 flex flex-col gap-3"
        style={{ width: CARD_W, ...cardStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-[0.16em] uppercase text-gold">
            Step {index + 1} of {total}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="text-[12.5px] text-ink-mute hover:text-ink-soft transition"
          >
            Skip tour
          </button>
        </div>

        <div>
          <div className="text-[16px] font-semibold text-ink mb-1">{step.title}</div>
          <p className="text-[13.5px] text-ink-soft leading-relaxed">{step.body}</p>
        </div>

        {index === 0 && <TourVideoSlot url={videoUrl} />}

        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition ${
                  i === index ? "bg-gold" : "bg-line"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={onBack}
                className="border border-line rounded-lg px-3.5 py-1.5 text-[13px] text-ink-soft hover:bg-paper-2 transition"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="bg-accent text-white rounded-lg px-3.5 py-1.5 text-[13px] font-medium hover:opacity-90 transition"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function centeredCardStyle(): React.CSSProperties {
  return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
}

export function cardPosition(
  rect: TourRect,
  placement: TourStep["placement"],
  vw: number,
  vh: number,
): React.CSSProperties {
  const clampLeft = (left: number) => Math.min(Math.max(left, 12), vw - CARD_W - 12);
  // Keep the card (and its Skip control) wholly inside the viewport, so a tall
  // target can never push it off-screen and out of reach.
  const clampTop = (top: number) => Math.min(Math.max(top, 12), vh - CARD_H - 12);

  switch (placement) {
    case "bottom":
      return {
        top: clampTop(rect.top + rect.height + PAD + GAP),
        left: clampLeft(rect.left),
      };
    case "top":
      // Anchor the card's bottom just above the target, then clamp that bottom
      // edge so the whole card stays on-screen even for a target near the top.
      return {
        top: clampTop(rect.top - PAD - GAP - CARD_H),
        left: clampLeft(rect.left),
      };
    case "right":
      return {
        top: clampTop(rect.top),
        left: Math.min(rect.left + rect.width + PAD + GAP, vw - CARD_W - 12),
      };
    case "left":
    default:
      return {
        top: clampTop(rect.top),
        left: Math.max(rect.left - PAD - GAP - CARD_W, 12),
      };
  }
}
