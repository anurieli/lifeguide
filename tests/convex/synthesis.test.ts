import { describe, it, expect } from "vitest";
import { applySynthesis } from "../../convex/ai/synthesizeInterview";

describe("applySynthesis", () => {
  it("fills only empty boxes and flags conflicts, never overwriting authored text", () => {
    const existing = { s1q0: "my own words" };
    const drafted = { s1q0: "ai version", s1q1: "ai persona", s1q2: null };
    const { toWrite, conflicts, emptyKeys } = applySynthesis(existing, drafted);
    expect(toWrite).toEqual({ s1q1: "ai persona" });      // s1q0 not overwritten; s1q2 null skipped
    expect(conflicts).toEqual(["s1q0"]);
    expect(emptyKeys).toContain("s1q2");
  });
});
