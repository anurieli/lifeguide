import { describe, it, expect } from "vitest";
import { appendTranscriptTurn, type Turn } from "../convex/lib/transcript";

const coach = (text: string, at: number): Turn => ({ role: "coach", text, at });
const user = (text: string, at: number): Turn => ({ role: "user", text, at });

describe("appendTranscriptTurn", () => {
  it("appends to an empty transcript", () => {
    const out = appendTranscriptTurn([], coach("Hello there.", 1000));
    expect(out).toEqual([coach("Hello there.", 1000)]);
  });

  it("appends a coach turn when the last turn is a user turn", () => {
    const start = [user("Can you ask me some questions", 1000)];
    const out = appendTranscriptTurn(start, coach("Take your time.", 1500));
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual(coach("Take your time.", 1500));
  });

  it("replaces a back-to-back coach turn within the restart window (barge-in restart)", () => {
    const start = [user("hi", 0), coach("That's a great insight. So", 5000)];
    const out = appendTranscriptTurn(
      start,
      coach("That's a great insight. It sounds like you feel energized…", 6000),
    );
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual(coach("That's a great insight. It sounds like you feel energized…", 6000));
  });

  it("appends two coach turns when they are outside the restart window", () => {
    const start = [coach("First question?", 1000)];
    const out = appendTranscriptTurn(start, coach("Still there?", 1000 + 20_000));
    expect(out).toHaveLength(2);
  });

  it("appends a user turn after a coach turn (never collapses across roles)", () => {
    const start = [coach("What energizes you?", 1000)];
    const out = appendTranscriptTurn(start, user("Leading big things.", 2000));
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual(user("Leading big things.", 2000));
  });

  it("collapses a rapid restart chain down to the final coach turn", () => {
    let t: Turn[] = [user("hi", 0)];
    t = appendTranscriptTurn(t, coach("That's", 1000));
    t = appendTranscriptTurn(t, coach("That's a great", 1500));
    t = appendTranscriptTurn(t, coach("That's a great insight. Tell me more.", 2000));
    expect(t).toHaveLength(2);
    expect(t[1]).toEqual(coach("That's a great insight. Tell me more.", 2000));
  });

  it("does not mutate the input transcript", () => {
    const start = [user("hi", 0)];
    const out = appendTranscriptTurn(start, coach("hello", 100));
    expect(start).toHaveLength(1);
    expect(out).not.toBe(start);
  });
});
