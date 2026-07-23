import { describe, it, expect } from "vitest";
import { PROVIDERS, TASKS, aiNodeSummary } from "../convex/ai/config";

describe("AI config registry", () => {
  it("every task points at a provider that exists", () => {
    for (const id of Object.keys(TASKS)) {
      const task = TASKS[id];
      expect(PROVIDERS[task.provider], `task "${id}" provider`).toBeDefined();
    }
  });

  it("every provider declares a key env var", () => {
    for (const id of Object.keys(PROVIDERS)) {
      expect(PROVIDERS[id as keyof typeof PROVIDERS].keyEnv).toBeTruthy();
    }
  });

  it("the local provider has a base URL and tolerates a missing key", () => {
    expect(PROVIDERS.local.baseURL).toMatch(/^https?:\/\//);
    expect(PROVIDERS.local.keyOptional).toBe(true);
  });

  it("aiNodeSummary exposes model + provider for every node, and no secrets", () => {
    const nodes = aiNodeSummary();
    expect(nodes.length).toBe(Object.keys(TASKS).length);
    for (const n of nodes) {
      expect(n.id).toBeTruthy();
      expect(n.model).toBeTruthy();
      expect(n.providerLabel).toBeTruthy();
      expect(typeof n.wired).toBe("boolean");
      // the summary must never carry a system prompt or any key material
      expect((n as Record<string, unknown>).system).toBeUndefined();
      expect((n as Record<string, unknown>).key).toBeUndefined();
    }
  });

  it("the two live tasks are wired", () => {
    expect(TASKS.distill.wired).toBe(true);
    expect(TASKS.coachReply.wired).toBe(true);
  });

  it("the distill prompt permits summary/cleaned only on the long-audio request, not by default", () => {
    // Pins the ARI-145 contract: the base JSON shape carries no summary/cleaned, but the
    // prompt explicitly allows the distill.ts long-audio follow-up to add exactly those
    // two fields. This is the fix for the config.ts <-> distill.ts conflict where the
    // "exact shape" wording would have told the model to drop summary/cleaned.
    const sys = TASKS.distill.system ?? "";
    // The base shape stays title/essence/pillars/board_worthy/board_reason.
    expect(sys).toContain('"title"');
    expect(sys).toContain('"board_worthy"');
    // It names both extra fields as a conditional, opt-in addition.
    expect(sys).toContain('"summary"');
    expect(sys).toContain('"cleaned"');
    // And makes the "only when a later message asks" gate explicit, not a blanket allow.
    expect(sys).toMatch(/only\b/i);
    expect(sys).toMatch(/later message/i);
    expect(sys).toMatch(/Never include "summary" or "cleaned"/i);
  });
});
