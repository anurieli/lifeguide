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
});
