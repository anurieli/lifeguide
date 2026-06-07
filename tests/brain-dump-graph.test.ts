import { describe, expect, it } from "vitest";
import {
  fallbackBrainDumpGraph,
  normalizeBrainDumpGraph,
  parseBrainDumpGraph,
} from "../lib/brainDumpGraph";

describe("brain dump graph", () => {
  it("normalizes messy model output into stable ideas and relations", () => {
    const graph = normalizeBrainDumpGraph(
      {
        ideas: [
          { id: "i1", title: "Health", summary: "I want more energy.", mentions: 2 },
          { id: "bad", title: "", summary: "", details: ["  gym consistency  "] },
        ],
        relations: [
          {
            id: "r1",
            from: "i1",
            to: "i2",
            label: "supports",
            reason: "Energy helps training.",
            strength: 4,
          },
          { from: "i2", to: "i2", label: "self" },
        ],
      },
      123,
    );

    expect(graph.ideas.map((idea) => idea.id)).toEqual(["I1", "I2"]);
    expect(graph.ideas[1].title).toBe("Untitled idea");
    expect(graph.ideas[1].details).toEqual(["gym consistency"]);
    expect(graph.relations).toHaveLength(1);
    expect(graph.relations[0]).toMatchObject({
      id: "R1",
      from: "I1",
      to: "I2",
      strength: 1,
    });
  });

  it("parses prose-wrapped JSON", () => {
    const graph = parseBrainDumpGraph(
      'Updated: {"version":1,"ideas":[{"id":"I1","title":"Work","summary":"I need focus.","details":[],"mentions":1,"createdAt":0,"updatedAt":0}],"relations":[]}',
      123,
    );

    expect(graph.ideas[0].title).toBe("Work");
  });

  it("falls back by adding a new idea", () => {
    const graph = fallbackBrainDumpGraph(
      { version: 1, ideas: [], relations: [] },
      "I want a calmer morning routine before work.",
      123,
    );

    expect(graph.ideas).toHaveLength(1);
    expect(graph.ideas[0].id).toBe("I1");
    expect(graph.ideas[0].summary).toBe("I want a calmer morning routine before work.");
  });
});
