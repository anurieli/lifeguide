import { describe, it, expect } from "vitest";
import { parseDistilled } from "../convex/ai/parse";

describe("parseDistilled", () => {
  it("parses clean JSON", () => {
    const d = parseDistilled(
      '{"title":"Morning Discipline","essence":"He values consistency.","pillars":["health","growth"]}',
    );
    expect(d.title).toBe("Morning Discipline");
    expect(d.essence).toBe("He values consistency.");
    expect(d.pillars).toEqual(["health", "growth"]);
  });

  it("extracts JSON from prose-wrapped output", () => {
    const d = parseDistilled(
      'Sure! {"title":"X","essence":"Y","pillars":["spirit","banana"]} Hope that helps.',
    );
    expect(d.title).toBe("X");
    expect(d.pillars).toEqual(["spirit"]); // invalid tag dropped
  });

  it("falls back on non-JSON garbage", () => {
    const d = parseDistilled("not json at all");
    expect(d.title).toBe("Untitled");
    expect(d.essence).toBe("");
    expect(d.pillars).toEqual([]);
  });

  it("caps pillars at 3 and de-dupes", () => {
    const d = parseDistilled(
      '{"title":"t","essence":"e","pillars":["health","health","growth","money","spirit"]}',
    );
    expect(d.pillars).toEqual(["health", "growth", "money"]);
  });

  it("defaults a blank title to Untitled", () => {
    const d = parseDistilled('{"title":"   ","essence":"e","pillars":[]}');
    expect(d.title).toBe("Untitled");
  });
});
