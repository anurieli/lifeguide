import { describe, it, expect } from "vitest";
import { boardCentroid, screenToCanvas, rectsOverlap, spiralOffsets } from "../lib/geometry";

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

describe("boardCentroid", () => {
  it("averages the CENTERS of the cards, not their corners", () => {
    const c = boardCentroid([
      { position: { x: 0, y: 0 }, dimensions: { width: 100, height: 40 } },
      { position: { x: 200, y: 100 }, dimensions: { width: 100, height: 40 } },
    ]);
    // Centers are (50, 20) and (250, 120) → average (150, 70).
    expect(c).toEqual({ x: 150, y: 70 });
  });

  it("one card centers on that card; empty board has no centroid", () => {
    expect(
      boardCentroid([{ position: { x: -80, y: 30 }, dimensions: { width: 40, height: 20 } }]),
    ).toEqual({ x: -60, y: 40 });
    expect(boardCentroid([])).toBeNull();
  });
});

describe("spiralOffsets", () => {
  it("starts at origin and grows", () => {
    const offs = spiralOffsets();
    expect(offs[0]).toEqual({ x: 0, y: 0 });
    expect(offs.length).toBeGreaterThan(10);
  });
});
