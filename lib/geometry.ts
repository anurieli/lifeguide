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
