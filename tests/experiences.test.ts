import { describe, it, expect } from "vitest";
import { EXPERIENCES, getExperience } from "../lib/experiences";

describe("experience registry", () => {
  it("includes text and voice interviews", () => {
    expect(getExperience("text-interview")?.transport).toBe("text");
    expect(getExperience("voice-interview")?.transport).toBe("voice");
  });
  it("every experience has a label and unique id", () => {
    const ids = EXPERIENCES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EXPERIENCES) expect(e.label.length).toBeGreaterThan(0);
  });
});
