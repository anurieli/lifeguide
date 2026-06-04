import { describe, it, expect } from "vitest";
import { rectContainsRect } from "../lib/geometry";
import {
  nextSelectionOnClick,
  selectionFromMarquee,
  marqueeWorldRect,
  normalizeScreenRect,
  type SelectableNode,
} from "../lib/selection";

describe("rectContainsRect", () => {
  const outer = { x: 0, y: 0, w: 100, h: 100 };
  it("true when inner is fully swallowed", () => {
    expect(rectContainsRect(outer, { x: 10, y: 10, w: 20, h: 20 })).toBe(true);
  });
  it("true when inner edges touch outer edges", () => {
    expect(rectContainsRect(outer, { x: 0, y: 0, w: 100, h: 100 })).toBe(true);
  });
  it("false when inner only partially overlaps", () => {
    expect(rectContainsRect(outer, { x: 90, y: 90, w: 40, h: 40 })).toBe(false);
  });
  it("false when inner is entirely outside", () => {
    expect(rectContainsRect(outer, { x: 200, y: 200, w: 10, h: 10 })).toBe(false);
  });
});

describe("nextSelectionOnClick", () => {
  const base = new Set(["a", "b"]);
  it("no modifier replaces the selection with just the clicked node", () => {
    expect([...nextSelectionOnClick(base, "c", { shift: false, meta: false })]).toEqual(["c"]);
  });
  it("shift adds the clicked node (union)", () => {
    expect(nextSelectionOnClick(base, "c", { shift: true, meta: false })).toEqual(
      new Set(["a", "b", "c"]),
    );
  });
  it("shift on an already-selected node keeps it (add-only, no toggle)", () => {
    expect(nextSelectionOnClick(base, "a", { shift: true, meta: false })).toEqual(
      new Set(["a", "b"]),
    );
  });
  it("meta+shift toggles a selected node off", () => {
    expect(nextSelectionOnClick(base, "a", { shift: true, meta: true })).toEqual(new Set(["b"]));
  });
  it("meta+shift toggles an unselected node on", () => {
    expect(nextSelectionOnClick(base, "c", { shift: true, meta: true })).toEqual(
      new Set(["a", "b", "c"]),
    );
  });
  it("does not mutate the input set", () => {
    const input = new Set(["a"]);
    nextSelectionOnClick(input, "b", { shift: true, meta: false });
    expect(input).toEqual(new Set(["a"]));
  });
});

describe("normalizeScreenRect", () => {
  it("normalizes regardless of drag direction", () => {
    expect(normalizeScreenRect({ x: 100, y: 80 }, { x: 20, y: 10 })).toEqual({
      x: 20,
      y: 10,
      w: 80,
      h: 70,
    });
  });
});

describe("marqueeWorldRect", () => {
  it("maps a screen-space drag to world coordinates via the viewport", () => {
    // viewport: translate (50,20), scale 2.  world = (screen - offset) / scale
    const r = marqueeWorldRect({ x: 250, y: 120 }, { x: 50, y: 20 }, { x: 50, y: 20, scale: 2 });
    expect(r).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });
});

describe("selectionFromMarquee", () => {
  const nodes: SelectableNode[] = [
    { _id: "a", position: { x: 10, y: 10 }, dimensions: { width: 20, height: 20 } },
    { _id: "b", position: { x: 50, y: 50 }, dimensions: { width: 200, height: 200 } },
    { _id: "c", position: { x: 5, y: 5 }, dimensions: { width: 10, height: 10 } },
  ];
  it("returns only nodes fully swallowed by the world rect", () => {
    const ids = selectionFromMarquee({ x: 0, y: 0, w: 40, h: 40 }, nodes);
    // a (10,10,20,20) is inside; c (5,5,10,10) is inside; b spills out.
    expect(new Set(ids)).toEqual(new Set(["a", "c"]));
  });
  it("returns empty when nothing is fully contained", () => {
    expect(selectionFromMarquee({ x: 0, y: 0, w: 5, h: 5 }, nodes)).toEqual([]);
  });
});
