import { describe, it, expect } from "vitest";
import { assembleContext } from "../convex/context/assemble";
import { ContextFragment } from "../convex/context/types";

const frag = (label: string, priority: number, text: string): ContextFragment => ({
  surfaceId: "s",
  scope: "surface",
  label,
  text,
  priority,
});

describe("assembleContext", () => {
  it("orders by priority and concatenates", () => {
    const out = assembleContext([frag("low", 1, "B"), frag("high", 10, "A")], 1000);
    expect(out.indexOf("A")).toBeLessThan(out.indexOf("B"));
  });

  it("drops lowest-priority fragments past the char budget", () => {
    const out = assembleContext(
      [frag("keep", 10, "X".repeat(50)), frag("drop", 1, "Y".repeat(50))],
      60,
    );
    expect(out).toContain("X");
    expect(out).not.toContain("Y");
  });

  it("returns an empty string for no fragments", () => {
    expect(assembleContext([], 1000)).toBe("");
  });

  it("labels each block with a markdown heading", () => {
    const out = assembleContext([frag("Whiteboard", 5, "stuff")], 1000);
    expect(out).toBe("## Whiteboard\nstuff");
  });
});
