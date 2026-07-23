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

/**
 * What a pointer-down on a card means: drive the card's own gesture (select /
 * drag) or yield to the card's native interactive content (place a caret,
 * highlight text, or follow a link).
 *
 * The select-first / interact-second contract (ARI-139):
 *  - Any modifier click → "card" (it toggles/extends the selection, never edits).
 *  - The sole-selected card, pressed on its own interactive content → "content":
 *    the browser handles the caret / highlight / link natively.
 *  - Everything else (an unselected card, a card pressed on its chrome, or any
 *    card while a group is selected) → "card": press-drag moves it, a completed
 *    click selects it. This preserves immediate drag on an unselected card and
 *    keeps whole-body / group drag working.
 *
 * `soleSelected` means this card is selected AND it is the only selected card;
 * a card inside a multi-selection is deliberately NOT content-interactive so a
 * press still drags the whole group.
 */
export type CardPointerIntent = "card" | "content";

export function cardPointerIntent(opts: {
  soleSelected: boolean;
  onInteractiveContent: boolean;
  mods: SelectionMods;
}): CardPointerIntent {
  if (opts.mods.shift || opts.mods.meta) return "card";
  if (opts.soleSelected && opts.onInteractiveContent) return "content";
  return "card";
}

/**
 * True for elements that own native text editing (textarea, input, or any
 * contenteditable). Used to decide whether a focused element must be blurred when
 * selecting another card: if it stays focused, board shortcuts (Command+Backspace)
 * keep targeting it and read as "editing", so they get suppressed (ARI-139).
 */
export function isEditableElement(
  el: { tagName?: string; isContentEditable?: boolean } | null,
): boolean {
  if (!el) return false;
  return el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable === true;
}

/**
 * The board's keyboard map, as a pure decision so the shortcut rules (including
 * the "never hijack while editing" guard) are testable without a DOM (ARI-139).
 *
 *  - Escape always clears (a universal cancel, allowed even mid-edit).
 *  - While an input/textarea/contenteditable is being edited, every other
 *    shortcut is inert so native editing (caret, undo, select-all) is untouched.
 *  - ⌫/Delete (with or without a modifier, so ⌘⌫ counts) deletes the selection.
 *  - ⌘/Ctrl+Z restores the most recently deleted selection (undo).
 *  - ⌘/Ctrl+A selects every card.
 */
export type BoardKeyAction = "clear" | "delete" | "undo" | "selectAll" | "none";

export function boardKeyAction(e: {
  key: string;
  meta: boolean;
  editing: boolean;
  hasSelection: boolean;
}): BoardKeyAction {
  if (e.key === "Escape") return "clear";
  if (e.editing) return "none";
  const k = e.key.toLowerCase();
  if ((e.key === "Delete" || e.key === "Backspace") && e.hasSelection) return "delete";
  if (e.meta && k === "z") return "undo";
  if (e.meta && k === "a") return "selectAll";
  return "none";
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
