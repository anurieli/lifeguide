import { describe, it, expect } from "vitest";
import {
  WHATS_NEW_TARGETS,
  WHATS_NEW_TARGET_OPTIONS,
  resolveTarget,
} from "../components/whatsnew/targets";
import { WHATS_NEW_TARGET_KEYS } from "../convex/whatsNewTargets";

const VALID_VIEWS = ["today", "core", "board", "goals", "sessions", "settings"];
const VALID_PLACEMENTS = ["top", "bottom", "left", "right"];

// The tour's full-page anchors (Today/Core/Whiteboard root scroll containers). A
// What's New spotlight around one of these degrades to a centered card (see
// isSpotlightable), which is NOT a component highlight, so the registry must never
// expose them. This locks the ARI-142 review fix that removed `core`/`board`.
const PAGE_LEVEL_ANCHORS = ["tour-today", "tour-core", "tour-whiteboard"];

describe("What's New component-target registry", () => {
  it("the frontend registry covers exactly the backend key set", () => {
    expect(Object.keys(WHATS_NEW_TARGETS).sort()).toEqual([...WHATS_NEW_TARGET_KEYS].sort());
  });

  it("the admin options mirror the registry keys, each with a non-empty label", () => {
    expect(WHATS_NEW_TARGET_OPTIONS.map((o) => o.key).sort()).toEqual(
      [...WHATS_NEW_TARGET_KEYS].sort(),
    );
    for (const o of WHATS_NEW_TARGET_OPTIONS) {
      expect(o.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("every target has a real view, a tour-scoped selector, a placement, and a label", () => {
    for (const key of WHATS_NEW_TARGET_KEYS) {
      const spec = WHATS_NEW_TARGETS[key];
      expect(VALID_VIEWS).toContain(spec.view);
      expect(VALID_PLACEMENTS).toContain(spec.placement);
      expect(spec.selector.startsWith("tour-")).toBe(true);
      expect(spec.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("exposes only compact controls, never a full-page anchor", () => {
    for (const key of WHATS_NEW_TARGET_KEYS) {
      expect(PAGE_LEVEL_ANCHORS).not.toContain(WHATS_NEW_TARGETS[key].selector);
    }
  });

  it("resolveTarget returns the spec for a known key and null otherwise", () => {
    expect(resolveTarget("coach")).toEqual(WHATS_NEW_TARGETS.coach);
    expect(resolveTarget(null)).toBeNull();
    expect(resolveTarget(undefined)).toBeNull();
    expect(resolveTarget("")).toBeNull();
    expect(resolveTarget("core")).toBeNull(); // removed page-level key
    expect(resolveTarget("nonsense")).toBeNull();
  });
});
