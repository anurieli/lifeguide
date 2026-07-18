import { describe, it, expect } from "vitest";
import { TOUR_STEPS, TOUR_VIDEO_URL } from "../components/tour/steps";

const VALID_VIEWS = ["today", "core", "board", "goals", "sessions", "settings"];
const VALID_PLACEMENTS = ["top", "bottom", "left", "right"];

describe("TOUR_STEPS (the guided product tour registry)", () => {
  it("covers every surface named in ARI-19: Core, Whiteboard, Today, Coach, Settings", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["today", "core", "board", "coach", "settings"]));
  });

  it("has no duplicate step ids", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every step targets a real shell view and a non-empty data-tour selector", () => {
    for (const step of TOUR_STEPS) {
      expect(VALID_VIEWS).toContain(step.view);
      expect(step.target.trim().length).toBeGreaterThan(0);
      expect(VALID_PLACEMENTS).toContain(step.placement);
    }
  });

  it("every step has non-empty title and body copy", () => {
    for (const step of TOUR_STEPS) {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
    }
  });

  it("ships with no video asset configured (the DoD's dismissible-but-unset slot)", () => {
    expect(TOUR_VIDEO_URL).toBeNull();
  });
});
