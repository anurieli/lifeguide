import { describe, it, expect } from "vitest";
import { wouldCreateCycle } from "../../convex/edges";

describe("wouldCreateCycle", () => {
  const edges = [
    { fromNode: "a", toNode: "b" },
    { fromNode: "b", toNode: "c" },
  ];

  it("detects a→…→a", () => {
    // c→a would close a→b→c→a
    expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
  });

  it("allows a safe (forward) edge", () => {
    expect(wouldCreateCycle(edges, "a", "c")).toBe(false);
  });

  it("blocks a self-edge", () => {
    expect(wouldCreateCycle(edges, "a", "a")).toBe(true);
  });

  it("allows an edge into a fresh node", () => {
    expect(wouldCreateCycle(edges, "c", "d")).toBe(false);
  });

  it("detects a longer back-edge", () => {
    const chain = [
      { fromNode: "a", toNode: "b" },
      { fromNode: "b", toNode: "c" },
      { fromNode: "c", toNode: "d" },
    ];
    expect(wouldCreateCycle(chain, "d", "a")).toBe(true);
  });
});
