import { describe, it, expect } from "vitest";
import { nextQuestion, type InterviewState } from "../lib/interview/policy";

const base: InterviewState = { answered: {}, skipped: [], circledBack: [] };

describe("nextQuestion", () => {
  it("starts at the first unanswered key", () => {
    expect(nextQuestion(base)?.key).toBe("s1q0");
  });
  it("skips answered keys", () => {
    expect(nextQuestion({ ...base, answered: { s1q0: "x" } })?.key).toBe("s1q1");
  });
  it("defers a skipped key until all fresh keys are exhausted, then circles back once", () => {
    const answered = Object.fromEntries(
      ["s1q1","s1q2","s1q3","s1q4","s1q5","s1q6","s2q0","s2q1","s2q2","s2q3","s2q4","s2q5","s3q0","s3q1","s3q2","s3q3","s3q4"].map((k) => [k, "x"]),
    );
    const q = nextQuestion({ answered, skipped: ["s1q0"], circledBack: [] });
    expect(q?.key).toBe("s1q0");
  });
  it("returns null when answered or skipped-and-already-circled covers everything", () => {
    const answered = Object.fromEntries(
      ["s1q1","s1q2","s1q3","s1q4","s1q5","s1q6","s2q0","s2q1","s2q2","s2q3","s2q4","s2q5","s3q0","s3q1","s3q2","s3q3","s3q4"].map((k) => [k, "x"]),
    );
    expect(nextQuestion({ answered, skipped: ["s1q0"], circledBack: ["s1q0"] })).toBeNull();
  });
});
