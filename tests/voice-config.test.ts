import { describe, it, expect } from "vitest";
import { TASKS } from "../convex/ai/config";

describe("voice task config", () => {
  it("declares a realtime voice task with a model", () => {
    expect(TASKS["voice"]).toBeDefined();
    expect(TASKS["voice"].model).toMatch(/realtime/);
  });
  it("declares a synthesis task", () => {
    expect(TASKS["synthesis"]).toBeDefined();
    expect(TASKS["synthesis"].model.length).toBeGreaterThan(0);
  });
});
