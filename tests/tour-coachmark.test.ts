import { describe, it, expect } from "vitest";
import {
  isSpotlightable,
  cardPosition,
  CARD_W,
  CARD_H,
} from "../components/tour/TourCoachmark";

// Regression guard for the 2026-07-19 "grey film / can't scroll" trap: an
// already-onboarded user's tour fired on a full-height target, which cut a
// spotlight over the whole page (dimming only the left rail) and pushed the
// dismiss card off-screen. These pure geometry checks lock the two fixes:
// large targets get no spotlight, and the card always stays on-screen.
const VW = 1280;
const VH = 800;

describe("isSpotlightable", () => {
  it("rejects a full-height page container (the Today/Core scroll wrappers)", () => {
    // h-full over the main area: this is the exact shape that caused the trap.
    expect(isSpotlightable({ top: 0, left: 72, width: 1208, height: 800 }, VW, VH)).toBe(false);
  });

  it("rejects a target wider than most of the viewport", () => {
    expect(isSpotlightable({ top: 40, left: 0, width: 1200, height: 120 }, VW, VH)).toBe(false);
  });

  it("accepts a compact control (a button or heading)", () => {
    expect(isSpotlightable({ top: 120, left: 200, width: 180, height: 44 }, VW, VH)).toBe(true);
  });
});

describe("cardPosition keeps the card (and its Skip control) on-screen", () => {
  const placements = ["top", "bottom", "left", "right"] as const;

  for (const placement of placements) {
    it(`clamps within the viewport for a tall target — ${placement}`, () => {
      // A target that runs the full height of the viewport must never push the
      // card past the bottom/top edge.
      const style = cardPosition({ top: 0, left: 72, width: 400, height: 800 }, placement, VW, VH);
      const top = style.top as number;
      const left = style.left as number;
      expect(top).toBeGreaterThanOrEqual(12);
      expect(top).toBeLessThanOrEqual(VH - CARD_H - 12);
      expect(left).toBeGreaterThanOrEqual(12);
      expect(left).toBeLessThanOrEqual(VW - CARD_W - 12);
    });
  }

  it("does not rely on a CSS transform to sit on-screen (top placement)", () => {
    // The old 'top' branch used translateY(-100%), which clamping can't see.
    const style = cardPosition({ top: 30, left: 200, width: 180, height: 44 }, "top", VW, VH);
    expect(style.transform).toBeUndefined();
    expect(style.top as number).toBeGreaterThanOrEqual(12);
  });
});
