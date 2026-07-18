import { describe, it, expect } from "vitest";
import { normalizeThoughtMap } from "../lib/thoughtMap";

describe("normalizeThoughtMap", () => {
  it("normalizes a valid payload and derives levels + rootId from parentId chains", () => {
    const result = normalizeThoughtMap({
      nodes: [
        { id: "n1", label: "Overcommitting", status: "active" },
        { id: "n2", label: "Saying yes to work asks", parentId: "n1", status: "active" },
        { id: "n3", label: "Costing me the gym", parentId: "n2", status: "active" },
      ],
      edges: [{ from: "n1", to: "n2", kind: "leads_to" }],
      rootId: "n1",
    });
    if ("error" in result) throw new Error("expected success");
    expect(result.nodes).toHaveLength(3);
    const byId = Object.fromEntries(result.nodes.map((n) => [n.id, n]));
    expect(byId.n1.level).toBe(0);
    expect(byId.n2.level).toBe(1);
    expect(byId.n3.level).toBe(2);
    expect(result.rootId).toBe("n1"); // n1 has the most descendants (2)
    expect(result.edges).toHaveLength(1);
  });

  it("drops edges referencing missing nodes", () => {
    const result = normalizeThoughtMap({
      nodes: [{ id: "n1", label: "A thought" }],
      edges: [
        { from: "n1", to: "ghost", kind: "leads_to" },
        { from: "ghost", to: "n1", kind: "relates" },
      ],
    });
    if ("error" in result) throw new Error("expected success");
    expect(result.edges).toHaveLength(0);
  });

  it("drops edges with an invalid kind", () => {
    const result = normalizeThoughtMap({
      nodes: [
        { id: "n1", label: "A" },
        { id: "n2", label: "B" },
      ],
      edges: [{ from: "n1", to: "n2", kind: "bogus_kind" }],
    });
    if ("error" in result) throw new Error("expected success");
    expect(result.edges).toHaveLength(0);
  });

  it("dedupes duplicate node ids, first occurrence wins", () => {
    const result = normalizeThoughtMap({
      nodes: [
        { id: "n1", label: "First version" },
        { id: "n1", label: "Duplicate, should be dropped" },
      ],
      edges: [],
    });
    if ("error" in result) throw new Error("expected success");
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].label).toBe("First version");
  });

  it("preserves superseded status and treats the replacement as a sibling", () => {
    const result = normalizeThoughtMap({
      nodes: [
        { id: "n1", label: "Saying yes to everything", status: "superseded" },
        { id: "n2", label: "Saying yes to work asks", status: "active" },
      ],
      edges: [{ from: "n1", to: "n2", kind: "leads_to" }],
    });
    if ("error" in result) throw new Error("expected success");
    const byId = Object.fromEntries(result.nodes.map((n) => [n.id, n]));
    expect(byId.n1.status).toBe("superseded");
    expect(byId.n2.status).toBe("active");
    expect(byId.n1.level).toBe(0);
    expect(byId.n2.level).toBe(0); // sibling, not a child of the superseded node
  });

  it("clamps label and detail lengths", () => {
    const longLabel = "word ".repeat(50).trim();
    const longDetail = "x".repeat(1000);
    const result = normalizeThoughtMap({
      nodes: [{ id: "n1", label: longLabel, detail: longDetail }],
      edges: [],
    });
    if ("error" in result) throw new Error("expected success");
    expect(result.nodes[0].label.length).toBeLessThanOrEqual(80);
    expect(result.nodes[0].detail!.length).toBeLessThanOrEqual(300);
  });

  it("breaks a parentId cycle instead of infinite-looping", () => {
    const result = normalizeThoughtMap({
      nodes: [
        { id: "n1", label: "A", parentId: "n2" },
        { id: "n2", label: "B", parentId: "n1" },
      ],
      edges: [],
    });
    if ("error" in result) throw new Error("expected success");
    // Both nodes get a finite level; the cycle was broken somewhere.
    for (const n of result.nodes) expect(Number.isFinite(n.level)).toBe(true);
  });

  it("treats a dangling parentId as a root rather than dropping the node", () => {
    const result = normalizeThoughtMap({
      nodes: [{ id: "n1", label: "Orphaned", parentId: "does-not-exist" }],
      edges: [],
    });
    if ("error" in result) throw new Error("expected success");
    expect(result.nodes[0].level).toBe(0);
    expect(result.nodes[0].parentId).toBeUndefined();
  });

  it("garbage input returns an error", () => {
    expect(normalizeThoughtMap(null)).toEqual({ error: expect.any(String) });
    expect(normalizeThoughtMap("not an object")).toEqual({ error: expect.any(String) });
    expect(normalizeThoughtMap({})).toEqual({ error: expect.any(String) });
    expect(normalizeThoughtMap({ nodes: [] })).toEqual({ error: expect.any(String) });
    expect(normalizeThoughtMap({ nodes: [{ id: "", label: "" }] })).toEqual({
      error: expect.any(String),
    });
  });
});
