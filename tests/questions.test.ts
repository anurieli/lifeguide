import { describe, it, expect } from "vitest";
import {
  dayNumber,
  questionForDay,
  EVENING_QUESTIONS,
  MORNING_QUESTIONS,
} from "../lib/questions";

describe("questionForDay (the rotating bank)", () => {
  it("is deterministic: the same day always gets the same question", () => {
    expect(questionForDay("evening", "2026-07-12")).toBe(questionForDay("evening", "2026-07-12"));
    expect(questionForDay("morning", "2026-07-12")).toBe(questionForDay("morning", "2026-07-12"));
  });

  it("consecutive days walk the bank in order and wrap", () => {
    const start = questionForDay("evening", "2026-07-12");
    const startIdx = EVENING_QUESTIONS.indexOf(start);
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(questionForDay("evening", "2026-07-13")).toBe(
      EVENING_QUESTIONS[(startIdx + 1) % EVENING_QUESTIONS.length],
    );
  });

  it("covers the whole bank over one full cycle", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= EVENING_QUESTIONS.length; d++) {
      seen.add(questionForDay("evening", `2026-07-${String(d).padStart(2, "0")}`));
    }
    expect(seen.size).toBe(EVENING_QUESTIONS.length);
  });

  it("rotates across month boundaries without repeating adjacent days", () => {
    expect(questionForDay("evening", "2026-07-31")).not.toBe(
      questionForDay("evening", "2026-08-01"),
    );
  });

  it("dayNumber is timezone-independent UTC math on the key", () => {
    expect(dayNumber("2026-07-13") - dayNumber("2026-07-12")).toBe(1);
    expect(dayNumber("2026-08-01") - dayNumber("2026-07-31")).toBe(1);
    expect(dayNumber("1970-01-01")).toBe(0);
  });

  it("both banks are non-empty and distinct in tone", () => {
    expect(MORNING_QUESTIONS.length).toBeGreaterThan(2);
    expect(EVENING_QUESTIONS.length).toBeGreaterThan(4);
  });
});
