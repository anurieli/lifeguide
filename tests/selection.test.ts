import { describe, it, expect } from "vitest";
import { rectContainsRect } from "../lib/geometry";
import {
  nextSelectionOnClick,
  selectionFromMarquee,
  marqueeWorldRect,
  normalizeScreenRect,
  cardPointerIntent,
  boardKeyAction,
  isEditableElement,
  type SelectableNode,
} from "../lib/selection";

const NO_MODS = { shift: false, meta: false };

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

describe("cardPointerIntent (ARI-139 select-first / interact-second)", () => {
  it("an unselected card drives the card gesture even on its content (immediate drag)", () => {
    expect(
      cardPointerIntent({ soleSelected: false, onInteractiveContent: true, mods: NO_MODS }),
    ).toBe("card");
  });
  it("the sole-selected card yields to its own interactive content (caret / highlight)", () => {
    expect(
      cardPointerIntent({ soleSelected: true, onInteractiveContent: true, mods: NO_MODS }),
    ).toBe("content");
  });
  it("the sole-selected card still drags from non-content chrome", () => {
    expect(
      cardPointerIntent({ soleSelected: true, onInteractiveContent: false, mods: NO_MODS }),
    ).toBe("card");
  });
  it("a modifier press is always the card gesture, never content (selection toggle/extend)", () => {
    expect(
      cardPointerIntent({ soleSelected: true, onInteractiveContent: true, mods: { shift: true, meta: false } }),
    ).toBe("card");
    expect(
      cardPointerIntent({ soleSelected: true, onInteractiveContent: true, mods: { shift: false, meta: true } }),
    ).toBe("card");
  });
  it("a card inside a group (not sole) drags the group, not its content", () => {
    // soleSelected is false for a card in a multi-selection, so a press on its
    // content still runs the card gesture (group drag), never native editing.
    expect(
      cardPointerIntent({ soleSelected: false, onInteractiveContent: true, mods: NO_MODS }),
    ).toBe("card");
  });
});

describe("boardKeyAction (ARI-139 keyboard map)", () => {
  const base = { editing: false, hasSelection: true };
  it("Escape always clears, even mid-edit", () => {
    expect(boardKeyAction({ ...base, key: "Escape", meta: false })).toBe("clear");
    expect(boardKeyAction({ ...base, key: "Escape", meta: false, editing: true })).toBe("clear");
  });
  it("Backspace / Delete delete a non-empty selection", () => {
    expect(boardKeyAction({ ...base, key: "Backspace", meta: false })).toBe("delete");
    expect(boardKeyAction({ ...base, key: "Delete", meta: false })).toBe("delete");
  });
  it("Command+Backspace deletes the selection (the ⌘⌫ gesture)", () => {
    expect(boardKeyAction({ ...base, key: "Backspace", meta: true })).toBe("delete");
  });
  it("does not delete when nothing is selected", () => {
    expect(boardKeyAction({ ...base, key: "Backspace", meta: true, hasSelection: false })).toBe("none");
  });
  it("Command+Z is undo; Command+A is select-all", () => {
    expect(boardKeyAction({ ...base, key: "z", meta: true })).toBe("undo");
    expect(boardKeyAction({ ...base, key: "Z", meta: true })).toBe("undo");
    expect(boardKeyAction({ ...base, key: "a", meta: true })).toBe("selectAll");
  });
  it("never hijacks a shortcut while a field is being edited (delete/undo/select-all inert)", () => {
    const editing = { ...base, editing: true };
    expect(boardKeyAction({ ...editing, key: "Backspace", meta: true })).toBe("none");
    expect(boardKeyAction({ ...editing, key: "z", meta: true })).toBe("none");
    expect(boardKeyAction({ ...editing, key: "a", meta: true })).toBe("none");
  });
  it("plain letter keys with no modifier do nothing", () => {
    expect(boardKeyAction({ ...base, key: "z", meta: false })).toBe("none");
    expect(boardKeyAction({ ...base, key: "a", meta: false })).toBe("none");
  });
});

describe("isEditableElement (ARI-139 blur-before-select)", () => {
  it("is true for a textarea, input, or contenteditable (the old editor to blur)", () => {
    expect(isEditableElement({ tagName: "TEXTAREA" })).toBe(true);
    expect(isEditableElement({ tagName: "INPUT" })).toBe(true);
    expect(isEditableElement({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });
  it("is false for a non-editable element or null (nothing to blur)", () => {
    expect(isEditableElement({ tagName: "DIV" })).toBe(false);
    expect(isEditableElement({ tagName: "DIV", isContentEditable: false })).toBe(false);
    expect(isEditableElement(null)).toBe(false);
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
