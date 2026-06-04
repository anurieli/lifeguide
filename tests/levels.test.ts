import { describe, it, expect } from "vitest";
import { blueprintStatus, deriveLevel, ALL_KEYS } from "../lib/levels";

describe("levels", () => {
  it("ALL_KEYS has the 18 blueprint keys", () => {
    expect(ALL_KEYS.length).toBe(18);
    expect(ALL_KEYS).toContain("s1q0");
  });
  it("status is unstarted with no answers", () => {
    expect(blueprintStatus({})).toBe("unstarted");
  });
  it("status is in_progress with some answers", () => {
    expect(blueprintStatus({ s1q0: "hi" })).toBe("in_progress");
  });
  it("status is complete only when all 18 non-empty", () => {
    const full = Object.fromEntries(ALL_KEYS.map((k) => [k, "x"]));
    expect(blueprintStatus(full)).toBe("complete");
    const missingOne = { ...full, s1q0: "  " }; // whitespace = empty
    expect(blueprintStatus(missingOne)).toBe("in_progress");
  });
  it("level is 0 until complete, then 1", () => {
    expect(deriveLevel({})).toBe(0);
    const full = Object.fromEntries(ALL_KEYS.map((k) => [k, "x"]));
    expect(deriveLevel(full)).toBe(1);
  });
});
