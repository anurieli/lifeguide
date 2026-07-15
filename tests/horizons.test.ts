import { describe, it, expect } from "vitest";
import {
  HORIZON_SCOPES,
  HORIZON_META,
  cadenceOf,
  isWeekPlanningDay,
  periodKeyFor,
  weekKeyFor,
} from "../lib/horizons";

describe("horizon scopes (the ladder metadata)", () => {
  it("has the five rungs far → near, each with an icon and a prompt", () => {
    expect(HORIZON_SCOPES.map((h) => h.scope)).toEqual([
      "five_year",
      "one_year",
      "one_month",
      "weekly",
      "daily",
    ]);
    for (const h of HORIZON_SCOPES) {
      expect(h.icon.length).toBeGreaterThan(0);
      expect(h.prompt.length).toBeGreaterThan(0);
    }
  });

  it("classifies cadence: 5yr/1yr/1mo standing, weekly + daily time-boxed", () => {
    expect(cadenceOf("five_year")).toBe("standing");
    expect(cadenceOf("one_year")).toBe("standing");
    expect(cadenceOf("one_month")).toBe("standing");
    expect(cadenceOf("weekly")).toBe("weekly");
    expect(cadenceOf("daily")).toBe("daily");
    expect(HORIZON_META.daily.short).toBe("Today");
  });
});

describe("periodKeyFor (which row a rung belongs to)", () => {
  it("standing rungs share the 'std' bucket", () => {
    expect(periodKeyFor("five_year", "2026-07-15")).toBe("std");
    expect(periodKeyFor("one_year", "2026-07-15")).toBe("std");
    expect(periodKeyFor("one_month", "2026-07-15")).toBe("std");
  });

  it("daily is keyed by the day, weekly by that week's Monday", () => {
    expect(periodKeyFor("daily", "2026-07-15")).toBe("2026-07-15");
    // 2026-07-15 is a Wednesday; its week's Monday is 2026-07-13.
    expect(periodKeyFor("weekly", "2026-07-15")).toBe("2026-07-13");
  });
});

describe("weekKeyFor (the Monday of the ISO week)", () => {
  it("maps every day of a week to the same Monday", () => {
    // Mon 2026-07-13 … Sun 2026-07-19 all belong to the week of the 13th.
    for (const d of [
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-18",
      "2026-07-19",
    ]) {
      expect(weekKeyFor(d)).toBe("2026-07-13");
    }
  });

  it("a Monday is its own week key", () => {
    expect(weekKeyFor("2026-07-13")).toBe("2026-07-13");
  });

  it("crosses month and year boundaries onto the right Monday", () => {
    // Fri 2026-01-01 (2026 starts on a Thursday) → its Monday is 2025-12-29.
    expect(weekKeyFor("2026-01-01")).toBe("2025-12-29");
  });
});

describe("isWeekPlanningDay (Sunday is the plan-the-week nudge)", () => {
  it("is true only on Sundays", () => {
    expect(isWeekPlanningDay("2026-07-19")).toBe(true); // Sunday
    expect(isWeekPlanningDay("2026-07-13")).toBe(false); // Monday
    expect(isWeekPlanningDay("2026-07-15")).toBe(false); // Wednesday
  });
});
