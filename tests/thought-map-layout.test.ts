import { describe, it, expect } from "vitest";
import { layoutThoughtMap, nodeWidth } from "../lib/thoughtMapLayout";
import { ThoughtMapNode, ThoughtMapEdge } from "../lib/thoughtMap";

function node(partial: Partial<ThoughtMapNode> & { id: string; level: number }): ThoughtMapNode {
  return {
    label: partial.id,
    status: "active",
    ...partial,
  };
}

describe("layoutThoughtMap", () => {
  it("handles an empty map without throwing", () => {
    const result = layoutThoughtMap([], []);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it("gives every node a finite position and size", () => {
    const nodes: ThoughtMapNode[] = [
      node({ id: "n1", level: 0, label: "Overcommitting" }),
      node({ id: "n2", level: 1, label: "Saying yes to work asks", parentId: "n1" }),
      node({ id: "n3", level: 1, label: "Skipping the gym", parentId: "n1" }),
      node({ id: "n4", level: 2, label: "Costing me the gym", parentId: "n2" }),
    ];
    const result = layoutThoughtMap(nodes, []);
    expect(result.nodes).toHaveLength(4);
    for (const p of result.nodes) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
    }
  });

  it("never overlaps two nodes within the same level", () => {
    const nodes: ThoughtMapNode[] = [
      node({ id: "root", level: 0, label: "Root" }),
      node({ id: "a", level: 1, label: "A short one", parentId: "root" }),
      node({ id: "b", level: 1, label: "A much, much, much longer sibling label here", parentId: "root" }),
      node({ id: "c", level: 1, label: "C", parentId: "root" }),
      node({ id: "d", level: 1, label: "D also here", parentId: "root" }),
    ];
    const result = layoutThoughtMap(nodes, []);
    // Group by y (== level, since layoutThoughtMap derives y purely from level).
    const levels = new Map<number, typeof result.nodes>();
    for (const p of result.nodes) {
      if (!levels.has(p.y)) levels.set(p.y, []);
      levels.get(p.y)!.push(p);
    }
    for (const boxes of levels.values()) {
      const sorted = [...boxes].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];
        expect(prev.x + prev.width).toBeLessThanOrEqual(cur.x);
      }
    }
  });

  it("maps levels to strictly increasing y", () => {
    const nodes: ThoughtMapNode[] = [
      node({ id: "n0", level: 0 }),
      node({ id: "n1", level: 1, parentId: "n0" }),
      node({ id: "n2", level: 2, parentId: "n1" }),
      node({ id: "n3", level: 3, parentId: "n2" }),
    ];
    const result = layoutThoughtMap(nodes, []);
    const byId = Object.fromEntries(result.nodes.map((p) => [p.id, p]));
    expect(byId.n0.y).toBeLessThan(byId.n1.y);
    expect(byId.n1.y).toBeLessThan(byId.n2.y);
    expect(byId.n2.y).toBeLessThan(byId.n3.y);
  });

  it("passes through edge kind and label, and drops edges to missing nodes", () => {
    const nodes: ThoughtMapNode[] = [
      node({ id: "n1", level: 0 }),
      node({ id: "n2", level: 1, parentId: "n1" }),
    ];
    const edges: ThoughtMapEdge[] = [
      { from: "n1", to: "n2", kind: "leads_to", label: "then" },
      { from: "n1", to: "n2", kind: "relates" },
      { from: "n1", to: "n2", kind: "part_of" },
      { from: "n1", to: "ghost", kind: "leads_to" },
    ];
    const result = layoutThoughtMap(nodes, edges);
    expect(result.edges).toHaveLength(3);
    expect(result.edges[0].kind).toBe("leads_to");
    expect(result.edges[0].label).toBe("then");
    expect(result.edges[1].kind).toBe("relates");
    expect(result.edges[2].kind).toBe("part_of");
    for (const e of result.edges) {
      expect(e.path).toMatch(/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);
    }
  });

  it("sizes boxes from label length", () => {
    expect(nodeWidth("hi")).toBeLessThan(nodeWidth("a considerably longer thought than that"));
  });
});
