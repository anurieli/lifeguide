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
  it("declares a transcription task pinned to the openai provider", () => {
    // Audio has no OpenRouter endpoint, so VoiceField transcription must go openai-direct.
    // Model: gpt-4o-transcribe (replaced whisper-1, 2026-07-13 — higher accuracy).
    expect(TASKS["voiceTranscribe"]).toBeDefined();
    expect(TASKS["voiceTranscribe"].provider).toBe("openai");
    expect(TASKS["voiceTranscribe"].model).toMatch(/transcribe|whisper/);
    expect(TASKS["voiceTranscribe"].wired).toBe(true);
  });
  it("declares the cleanVoice node (renamed from voiceShape)", () => {
    expect(TASKS["cleanVoice"]).toBeDefined();
    expect(TASKS["voiceShape"]).toBeUndefined();
  });
});
