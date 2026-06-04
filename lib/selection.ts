// Pure, framework-free core for vision-board selection.
//
// Selection is ephemeral UI state — a set of node ids. None of this touches
// Convex. The Whiteboard owns a Set<string> and routes user gestures through
// these helpers so the rules live in one tested place.

import { Point, Rect, Viewport, rectContainsRect } from "./geometry";

/** Keyboard modifiers that change how a click mutates the selection. */
export type SelectionMods = { shift: boolean; meta: boolean };

/** Minimal node shape the selection geometry needs (world-space box). */
export type SelectableNode = {
  _id: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
};

/**
 * How a click on a node changes the selection:
 *  - no modifier        → replace selection with just this node
 *  - shift              → add this node (union, add-only)
 *  - meta (or meta+shift) → toggle this node (the "select a few and deselect" gesture)
 *
 * Never mutates the input set.
 */
export function nextSelectionOnClick(
  current: ReadonlySet<string>,
  id: string,
  mods: SelectionMods,
): Set<string> {
  if (mods.meta) {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }
  if (mods.shift) {
    return new Set(current).add(id);
  }
  return new Set([id]);
}

/** Normalize two screen points into a positive-extent rect (drag any direction). */
export function normalizeScreenRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

/** Convert a screen-space marquee drag (two client points) to a world-space rect. */
export function marqueeWorldRect(a: Point, b: Point, vp: Viewport): Rect {
  const wa = { x: (a.x - vp.x) / vp.scale, y: (a.y - vp.y) / vp.scale };
  const wb = { x: (b.x - vp.x) / vp.scale, y: (b.y - vp.y) / vp.scale };
  return normalizeScreenRect(wa, wb);
}

/** Ids of nodes fully swallowed by the world-space marquee rect. */
export function selectionFromMarquee(worldRect: Rect, nodes: readonly SelectableNode[]): string[] {
  return nodes
    .filter((n) =>
      rectContainsRect(worldRect, {
        x: n.position.x,
        y: n.position.y,
        w: n.dimensions.width,
        h: n.dimensions.height,
      }),
    )
    .map((n) => n._id);
}
