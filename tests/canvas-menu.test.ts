import { describe, it, expect } from "vitest";
import { closeThenAct } from "../lib/canvasMenu";

// ARI-137: choosing an action in the right-click canvas menu must close the menu first
// (so it never lingers over the new card), then run the action. Because the action closure
// captures the clicked board position, closing first never loses where the click landed.
// These lock both guarantees for the pure boundary helper the three menu buttons share.

describe("closeThenAct (ARI-137)", () => {
  it("closes the menu before running the action", () => {
    const order: string[] = [];
    const handler = closeThenAct(
      () => order.push("close"),
      () => order.push("act"),
    );
    handler();
    expect(order).toEqual(["close", "act"]);
  });

  it("still runs the action with the world position captured before the close", () => {
    const world = { x: 120, y: -40 };
    let seen: { x: number; y: number } | null = null;
    let closed = false;
    // The action closes over `world`, exactly as Whiteboard's onAddText/onGenerate/onUpload
    // close over menu.world, so clearing the menu must not disturb that captured value.
    const handler = closeThenAct(
      () => {
        closed = true;
      },
      () => {
        seen = world;
      },
    );
    handler();
    expect(closed).toBe(true);
    expect(seen).toEqual({ x: 120, y: -40 });
  });

  it("runs the action exactly once per click", () => {
    let acted = 0;
    const handler = closeThenAct(
      () => {},
      () => {
        acted += 1;
      },
    );
    handler();
    expect(acted).toBe(1);
  });
});
