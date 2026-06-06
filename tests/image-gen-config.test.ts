import { describe, it, expect } from "vitest";
import { TASKS } from "../convex/ai/config";

describe("vision board image generation task config", () => {
  it("declares an imageGen task pinned to the openai provider", () => {
    // OpenRouter has no /images/generations endpoint, so generation must go openai-direct
    // (the user's saved OpenAI key, else the deployment's OPENAI_API_KEY).
    expect(TASKS["imageGen"]).toBeDefined();
    expect(TASKS["imageGen"].provider).toBe("openai");
  });
  it("is wired and names a real image model", () => {
    expect(TASKS["imageGen"].wired).toBe(true);
    expect(TASKS["imageGen"].model).toBe("gpt-image-1");
  });
});
