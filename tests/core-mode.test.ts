import { describe, it, expect } from "vitest";
import { coreModeReducer, type CoreMode } from "../lib/core/mode";

describe("coreModeReducer (Core mode machine, ADR 0022)", () => {
  it("starts callers can drive to any of the three modes from grid", () => {
    expect(coreModeReducer("grid", { type: "toZen" })).toBe("zen");
    expect(coreModeReducer("grid", { type: "toConversational" })).toBe("conversational");
    expect(coreModeReducer("grid", { type: "toGrid" })).toBe("grid");
  });

  it("switches directly from zen to conversational without passing through grid", () => {
    expect(coreModeReducer("zen", { type: "toConversational" })).toBe("conversational");
  });

  it("switches directly from conversational back to zen without passing through grid", () => {
    expect(coreModeReducer("conversational", { type: "toZen" })).toBe("zen");
  });

  it("every mode can return to grid", () => {
    const modes: CoreMode[] = ["grid", "zen", "conversational"];
    for (const m of modes) {
      expect(coreModeReducer(m, { type: "toGrid" })).toBe("grid");
    }
  });

  it("is a pure function of (state, action) — same action from any state lands on the same target", () => {
    const modes: CoreMode[] = ["grid", "zen", "conversational"];
    for (const m of modes) {
      expect(coreModeReducer(m, { type: "toConversational" })).toBe("conversational");
    }
  });
});
