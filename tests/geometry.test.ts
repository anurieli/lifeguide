import { describe, it, expect } from "vitest";
import { screenToCanvas, rectsOverlap, spiralOffsets } from "../lib/geometry";

describe("screenToCanvas", () => {
  it("inverts viewport translate + scale", () => {
    const p = screenToCanvas({ x: 200, y: 100 }, { x: 50, y: 20, scale: 2 });
    expect(p).toEqual({ x: 75, y: 40 });
  });
});

describe("rectsOverlap", () => {
  it("true when overlapping", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 50, y: 50, w: 100, h: 100 })).toBe(true);
  });
  it("false when apart", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 100, y: 100, w: 10, h: 10 })).toBe(false);
  });
});

describe("spiralOffsets", () => {
  it("starts at origin and grows", () => {
    const offs = spiralOffsets();
    expect(offs[0]).toEqual({ x: 0, y: 0 });
    expect(offs.length).toBeGreaterThan(10);
  });
});
