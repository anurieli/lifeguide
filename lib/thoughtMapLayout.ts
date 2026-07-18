// Pure layout for the post-hoc thought map (ARI-18): turns a session's nodes +
// edges (lib/thoughtMap.ts's normalized shape, or the stored `thoughtMaps` row)
// into pixel positions and SVG edge paths for ThoughtMapView's desktop graph.
// A layered tree: y is a direct function of `level` (root(s) at the top); x is
// decided per level, ordered by each node's parent (children stay near where
// their parent landed) and packed left-to-right so nothing overlaps. Parents
// are then nudged to the mean x of their own children (bottom-up, deepest level
// first) so the tree reads centered, without a full Reingold-Tilford layout —
// packing (not the raw average) always sets the final x, so overlap is
// impossible regardless of how lopsided a subtree's target position is.

import { ThoughtMapEdge, ThoughtMapNode } from "./thoughtMap";

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutEdge = {
  from: string;
  to: string;
  kind: ThoughtMapEdge["kind"];
  label?: string;
  path: string; // SVG path data ("M x1 y1 L x2 y2")
};

export type ThoughtMapLayout = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
};

export const NODE_HEIGHT = 44;
const LEVEL_GAP_Y = 96;
const SIBLING_GAP_X = 28;
const MARGIN = 24;
const CHAR_WIDTH = 6.5;
const PAD_X = 28;
const MIN_WIDTH = 88;
const MAX_WIDTH = 220;

/** Box width from label length, clamped so a one-word thought and a long
 * sentence both stay legible without either shrinking to nothing or
 * dominating the row. */
export function nodeWidth(label: string): number {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(label.length * CHAR_WIDTH) + PAD_X));
}

export function layoutThoughtMap(nodes: ThoughtMapNode[], edges: ThoughtMapEdge[]): ThoughtMapLayout {
  if (nodes.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

  const levelOf = (n: ThoughtMapNode) => Math.max(0, Math.round(n.level));

  const byLevel = new Map<number, ThoughtMapNode[]>();
  let maxLevel = 0;
  for (const n of nodes) {
    const lvl = levelOf(n);
    maxLevel = Math.max(maxLevel, lvl);
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(n);
  }

  const childrenOf = new Map<string, string[]>();
  const idSet = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    if (n.parentId && idSet.has(n.parentId)) {
      if (!childrenOf.has(n.parentId)) childrenOf.set(n.parentId, []);
      childrenOf.get(n.parentId)!.push(n.id);
    }
  }

  const widthById = new Map(nodes.map((n) => [n.id, nodeWidth(n.label)] as const));
  const centerX = new Map<string, number>();

  // Bottom-up so a parent's mean-of-children target is known before its own
  // level is packed. Ordering by that target (falling back to array order for
  // childless nodes) is what makes the tree read roughly centered; the actual
  // x always comes from sequential packing, which is what guarantees no
  // within-level overlap no matter what the target says.
  for (let lvl = maxLevel; lvl >= 0; lvl--) {
    const levelNodes = byLevel.get(lvl) ?? [];
    const keyed = levelNodes.map((n, i) => {
      const kids = childrenOf.get(n.id);
      const key =
        kids && kids.length > 0
          ? kids.reduce((sum, k) => sum + (centerX.get(k) ?? 0), 0) / kids.length
          : i;
      return { n, key, i };
    });
    keyed.sort((a, b) => a.key - b.key || a.i - b.i);
    let cursor = 0;
    for (const { n } of keyed) {
      const w = widthById.get(n.id)!;
      centerX.set(n.id, cursor + w / 2);
      cursor += w + SIBLING_GAP_X;
    }
  }

  const positioned: LayoutNode[] = nodes.map((n) => {
    const w = widthById.get(n.id)!;
    return {
      id: n.id,
      x: (centerX.get(n.id) ?? 0) - w / 2 + MARGIN,
      y: levelOf(n) * (NODE_HEIGHT + LEVEL_GAP_Y) + MARGIN,
      width: w,
      height: NODE_HEIGHT,
    };
  });

  const byId = new Map(positioned.map((p) => [p.id, p]));
  const laidEdges: LayoutEdge[] = [];
  for (const e of edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    // Same level (a lateral "relates"/"leads_to" between siblings): connect
    // side-to-side instead of top-to-bottom. Otherwise: parent-child flow,
    // bottom of the earlier box to the top of the later one.
    const path =
      a.y === b.y
        ? a.x <= b.x
          ? `M ${a.x + a.width} ${a.y + a.height / 2} L ${b.x} ${b.y + b.height / 2}`
          : `M ${a.x} ${a.y + a.height / 2} L ${b.x + b.width} ${b.y + b.height / 2}`
        : a.y < b.y
          ? `M ${a.x + a.width / 2} ${a.y + a.height} L ${b.x + b.width / 2} ${b.y}`
          : `M ${a.x + a.width / 2} ${a.y} L ${b.x + b.width / 2} ${b.y + b.height}`;
    laidEdges.push({ from: e.from, to: e.to, kind: e.kind, ...(e.label ? { label: e.label } : {}), path });
  }

  const width = Math.max(...positioned.map((p) => p.x + p.width)) + MARGIN;
  const height = Math.max(...positioned.map((p) => p.y + p.height)) + MARGIN;

  return { nodes: positioned, edges: laidEdges, width, height };
}

// ---- fit-to-screen (directive: the whole map visible without scrolling) ----
// The default case scales the whole layout down (never up past 1:1) so it fits
// inside whatever container it's rendered in, via the SVG's own viewBox — the
// caller just sets width/height to `layout.width * scale` / `layout.height *
// scale` and lets the browser do the rest. A huge map would need to shrink text
// past legibility to fit, so the scale never drops below MIN_READABLE_SCALE;
// past that point `fitsWithoutScroll` goes false and the caller should fall
// back to pan/scroll at the clamped (still-readable) size instead of shrinking
// further.
export const MIN_READABLE_SCALE = 0.42;

export type FitToContainer = {
  scale: number;
  fitsWithoutScroll: boolean;
};

export function fitToContainer(
  layout: Pick<ThoughtMapLayout, "width" | "height">,
  containerWidth: number,
  containerHeight: number,
): FitToContainer {
  if (layout.width <= 0 || layout.height <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { scale: 1, fitsWithoutScroll: true };
  }
  // Never magnify past natural size — a tiny map should just sit centered
  // (letterboxed) in a big container, not stretch to fill it.
  const naturalScale = Math.min(containerWidth / layout.width, containerHeight / layout.height, 1);
  if (naturalScale >= MIN_READABLE_SCALE) {
    return { scale: naturalScale, fitsWithoutScroll: true };
  }
  return { scale: MIN_READABLE_SCALE, fitsWithoutScroll: false };
}
