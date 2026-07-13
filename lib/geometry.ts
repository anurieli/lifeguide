export type Point = { x: number; y: number };
export type Viewport = { x: number; y: number; scale: number };
export type Rect = { x: number; y: number; w: number; h: number };

/** Convert a screen-space point to canvas (world) coordinates given the viewport transform. */
export function screenToCanvas(p: Point, vp: Viewport): Point {
  return { x: (p.x - vp.x) / vp.scale, y: (p.y - vp.y) / vp.scale };
}

/** Axis-aligned rectangle overlap test. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

/** True when `inner` is fully swallowed by `outer` (edges may touch). */
export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

/**
 * The whole-board center: the average of every card's center point. This is
 * where the toolbar's center button lands, and where the board centers when
 * accessed. Null when the board is empty (no centroid to speak of).
 */
export function boardCentroid(
  items: { position: Point; dimensions: { width: number; height: number } }[],
): Point | null {
  if (items.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const it of items) {
    sx += it.position.x + it.dimensions.width / 2;
    sy += it.position.y + it.dimensions.height / 2;
  }
  return { x: sx / items.length, y: sy / items.length };
}

/** Outward spiral of candidate offsets for non-overlapping placement. */
export function spiralOffsets(): Point[] {
  const out: Point[] = [{ x: 0, y: 0 }];
  for (let r = 1; r < 24; r++) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      out.push({ x: Math.cos(a) * r * 240, y: Math.sin(a) * r * 190 });
    }
  }
  return out;
}
