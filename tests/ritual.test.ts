import { describe, it, expect } from "vitest";
import {
  activeRitual,
  ritualDayKey,
  isRitualComplete,
  DAY_ROLLOVER_HOUR,
  NIGHT_START_HOUR,
} from "../lib/ritual";

// Local-time construction: new Date(y, monthIndex, day, hour, minute).
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);

describe("activeRitual (time-of-day selection)", () => {
  it("selects morning through the day", () => {
    expect(activeRitual(at(2026, 7, 12, DAY_ROLLOVER_HOUR))).toBe("morning"); // 4:00 exactly
    expect(activeRitual(at(2026, 7, 12, 8, 30))).toBe("morning");
    expect(activeRitual(at(2026, 7, 12, NIGHT_START_HOUR - 1, 59))).toBe("morning"); // 16:59
  });

  it("selects night in the evening and through the small hours", () => {
    expect(activeRitual(at(2026, 7, 12, NIGHT_START_HOUR))).toBe("night"); // 17:00 exactly
    expect(activeRitual(at(2026, 7, 12, 22))).toBe("night");
    expect(activeRitual(at(2026, 7, 12, 0))).toBe("night"); // midnight
    expect(activeRitual(at(2026, 7, 12, DAY_ROLLOVER_HOUR - 1, 59))).toBe("night"); // 3:59
  });
});

describe("ritualDayKey (the day boundary)", () => {
  it("maps a normal daytime moment to its calendar day", () => {
    expect(ritualDayKey(at(2026, 7, 12, 9))).toBe("2026-07-12");
    expect(ritualDayKey(at(2026, 7, 12, 23))).toBe("2026-07-12");
  });

  it("counts the small hours as the previous day (4am rollover)", () => {
    expect(ritualDayKey(at(2026, 7, 13, 0, 30))).toBe("2026-07-12");
    expect(ritualDayKey(at(2026, 7, 13, 3, 59))).toBe("2026-07-12");
    expect(ritualDayKey(at(2026, 7, 13, 4, 0))).toBe("2026-07-13");
  });

  it("rolls correctly across month and year boundaries", () => {
    expect(ritualDayKey(at(2026, 8, 1, 1))).toBe("2026-07-31");
    expect(ritualDayKey(at(2026, 1, 1, 2))).toBe("2025-12-31");
  });

  it("zero-pads month and day", () => {
    expect(ritualDayKey(at(2026, 3, 5, 12))).toBe("2026-03-05");
  });
});

describe("isRitualComplete (completion detection)", () => {
  it("is complete only when every item is checked", () => {
    expect(isRitualComplete(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
    expect(isRitualComplete(["a", "b", "c"], ["a", "c"])).toBe(false);
    expect(isRitualComplete(["a"], [])).toBe(false);
  });

  it("an empty ritual is never complete", () => {
    expect(isRitualComplete([], [])).toBe(false);
    expect(isRitualComplete([], ["stale"])).toBe(false);
  });

  it("ignores stale checked ids from deleted items", () => {
    expect(isRitualComplete(["a", "b"], ["a", "b", "deleted-long-ago"])).toBe(true);
  });
});
