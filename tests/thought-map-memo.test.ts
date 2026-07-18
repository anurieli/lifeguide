import { describe, it, expect } from "vitest";
import { buildMapSystemPrompt, THOUGHT_MAP_MEMO_CAP } from "../lib/thoughtMap";

describe("buildMapSystemPrompt", () => {
  const BASE = "You extract the ACTUAL thoughts a person expressed...";

  it("returns the base prompt unchanged when no memo is given", () => {
    expect(buildMapSystemPrompt(BASE)).toBe(BASE);
    expect(buildMapSystemPrompt(BASE, undefined)).toBe(BASE);
    expect(buildMapSystemPrompt(BASE, null)).toBe(BASE);
  });

  it("appends nothing for an empty or whitespace-only memo", () => {
    expect(buildMapSystemPrompt(BASE, "")).toBe(BASE);
    expect(buildMapSystemPrompt(BASE, "   ")).toBe(BASE);
    expect(buildMapSystemPrompt(BASE, "\n\t  \n")).toBe(BASE);
  });

  it("appends a trimmed memo as a clearly-fenced section", () => {
    const memo = "Keep it to 5 nodes or fewer. Root is always the underlying want.";
    const result = buildMapSystemPrompt(BASE, memo);
    expect(result.startsWith(BASE)).toBe(true);
    expect(result).toContain(memo);
    expect(result).toContain(
      "The user's standing guidance for how they want their thinking mapped — follow it even where it overrides the defaults above:",
    );
  });

  it("trims surrounding whitespace on a non-empty memo", () => {
    const result = buildMapSystemPrompt(BASE, "  fewer, bigger nodes  ");
    expect(result).toContain("fewer, bigger nodes");
    expect(result).not.toContain("  fewer, bigger nodes  ");
  });

  it("caps an oversized memo at THOUGHT_MAP_MEMO_CAP characters", () => {
    const longMemo = "z".repeat(THOUGHT_MAP_MEMO_CAP + 500);
    const capped = "z".repeat(THOUGHT_MAP_MEMO_CAP);
    const result = buildMapSystemPrompt(BASE, longMemo);
    expect(result).not.toContain(longMemo); // the full oversized string never appears
    expect(result).toContain(capped); // exactly the cap survives
    expect(result).not.toContain(capped + "z"); // not one character more
  });
});
