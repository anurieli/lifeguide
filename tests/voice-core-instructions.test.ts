import { describe, it, expect } from "vitest";
import { buildCoreInstructions } from "../convex/ai/voice/index";
import { ALL_KEYS } from "../lib/levels";

describe("buildCoreInstructions (Core Conversational mode persona, ADR 0022)", () => {
  it("tells the model this is a first pass when nothing is filled", () => {
    const instructions = buildCoreInstructions({});
    expect(instructions).toContain("haven't answered any Blueprint questions yet");
    // With nothing filled, every key should be listed as still open.
    for (const key of ALL_KEYS) expect(instructions).toContain(key);
  });

  it("tells the model what's already filled and omits those keys from the open list", () => {
    const existing = { s1q0: "my note to self", s1q1: "the role I embody" };
    const instructions = buildCoreInstructions(existing);
    expect(instructions).toContain(`already answered ${Object.keys(existing).length} of ${ALL_KEYS.length}`);
    expect(instructions).not.toMatch(/Still open:[^.]*\bs1q0\b/);
    expect(instructions).not.toMatch(/Still open:[^.]*\bs1q1\b/);
    // A key that's still empty should still appear in the open list.
    expect(instructions).toMatch(/Still open:[^.]*\bs1q2\b/);
  });

  it("switches to a reflect-and-revise framing once every key is filled", () => {
    const existing = Object.fromEntries(ALL_KEYS.map((k) => [k, "answered"]));
    const instructions = buildCoreInstructions(existing);
    expect(instructions).toContain("Every Blueprint question already has an answer");
    expect(instructions).not.toContain("Still open:");
  });

  it("treats a blank/whitespace-only answer as unfilled", () => {
    const instructions = buildCoreInstructions({ s1q0: "   " });
    expect(instructions).toContain("haven't answered any Blueprint questions yet");
  });
});
