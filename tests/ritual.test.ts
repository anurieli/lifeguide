import { describe, it, expect } from "vitest";
import {
  activeRitual,
  ritualDayKey,
  ritualDayRange,
  nextRitualDayKey,
  lastNRitualDayKeys,
  ritualOpensAtLabel,
  isRitualComplete,
  msUntilRollover,
  formatCountdown,
  currentStreak,
  keepingUpStatus,
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

  it("locks the OTHER beat with the hour it opens (the toggle hint)", () => {
    // At any morning moment, the night is locked and opens at 5:00 PM.
    expect(ritualOpensAtLabel("night")).toBe("5:00 PM"); // NIGHT_START_HOUR = 17
    // At any night moment, the morning is locked and opens at 4:00 AM.
    expect(ritualOpensAtLabel("morning")).toBe("4:00 AM"); // DAY_ROLLOVER_HOUR = 4
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

describe("ritualDayRange (the day's absolute span)", () => {
  it("spans 4am to the next 4am for a daytime moment", () => {
    const { sinceMs, untilMs } = ritualDayRange(at(2026, 7, 12, 9));
    expect(sinceMs).toBe(at(2026, 7, 12, DAY_ROLLOVER_HOUR).getTime());
    expect(untilMs).toBe(at(2026, 7, 13, DAY_ROLLOVER_HOUR).getTime());
  });

  it("keeps the small hours inside the previous day's span", () => {
    const { sinceMs, untilMs } = ritualDayRange(at(2026, 7, 13, 1, 30));
    expect(sinceMs).toBe(at(2026, 7, 12, DAY_ROLLOVER_HOUR).getTime());
    expect(untilMs).toBe(at(2026, 7, 13, DAY_ROLLOVER_HOUR).getTime());
  });

  it("agrees with ritualDayKey at both edges", () => {
    const d = at(2026, 7, 12, 15);
    const { sinceMs, untilMs } = ritualDayRange(d);
    expect(ritualDayKey(new Date(sinceMs))).toBe(ritualDayKey(d));
    expect(ritualDayKey(new Date(untilMs - 1))).toBe(ritualDayKey(d));
    expect(ritualDayKey(new Date(untilMs))).not.toBe(ritualDayKey(d));
  });
});

describe("nextRitualDayKey (the roadmap's target morning, ADR 0012)", () => {
  it("an entry at 23:00 and one at 1:30am target the SAME upcoming morning", () => {
    // Monday 23:00 and Tuesday 1:30am are the same evening (4am rollover):
    // both roadmaps land on Tuesday.
    expect(nextRitualDayKey(at(2026, 7, 13, 23))).toBe("2026-07-14");
    expect(nextRitualDayKey(at(2026, 7, 14, 1, 30))).toBe("2026-07-14");
  });

  it("after the 4am rollover, the target moves to the following day", () => {
    expect(nextRitualDayKey(at(2026, 7, 14, DAY_ROLLOVER_HOUR))).toBe("2026-07-15");
  });

  it("crosses month and year boundaries", () => {
    expect(nextRitualDayKey(at(2026, 7, 31, 22))).toBe("2026-08-01");
    expect(nextRitualDayKey(at(2026, 12, 31, 23))).toBe("2027-01-01");
  });

  it("is always exactly one day after ritualDayKey", () => {
    for (const d of [at(2026, 7, 13, 9), at(2026, 7, 13, 23), at(2026, 7, 14, 2)]) {
      const [y, m, day] = ritualDayKey(d).split("-").map(Number);
      const plusOne = new Date(y, m - 1, day + 1);
      const expected = `${plusOne.getFullYear()}-${String(plusOne.getMonth() + 1).padStart(2, "0")}-${String(plusOne.getDate()).padStart(2, "0")}`;
      expect(nextRitualDayKey(d)).toBe(expected);
    }
  });
});

describe("lastNRitualDayKeys (the keeping-up strip)", () => {
  it("ends on today's key, oldest first", () => {
    expect(lastNRitualDayKeys(at(2026, 7, 12, 9), 3)).toEqual([
      "2026-07-10",
      "2026-07-11",
      "2026-07-12",
    ]);
  });

  it("respects the 4am rollover and month boundaries", () => {
    expect(lastNRitualDayKeys(at(2026, 8, 1, 2), 2)).toEqual(["2026-07-30", "2026-07-31"]);
  });
});

describe("msUntilRollover / formatCountdown (the rituals-rail reset timer)", () => {
  it("counts down to the next 4am rollover within the ritual day", () => {
    // 9:00 on the 12th → next rollover is 4:00 on the 13th, 19h away.
    expect(msUntilRollover(at(2026, 7, 12, 9))).toBe(19 * 60 * 60 * 1000);
    // 23:30 → 4:30 away.
    expect(msUntilRollover(at(2026, 7, 12, 23, 30))).toBe(4.5 * 60 * 60 * 1000);
  });

  it("in the small hours still points at this ritual day's 4am end", () => {
    // 1:00am on the 13th belongs to the 12th; rollover is 4:00 the same morning, 3h away.
    expect(msUntilRollover(at(2026, 7, 13, 1))).toBe(3 * 60 * 60 * 1000);
  });

  it("is a full day at the boundary and always positive", () => {
    expect(msUntilRollover(at(2026, 7, 12, DAY_ROLLOVER_HOUR))).toBe(24 * 60 * 60 * 1000);
    expect(msUntilRollover(at(2026, 7, 12, 3, 59))).toBeGreaterThan(0);
  });

  it("formats a friendly countdown, hours only while any remain", () => {
    expect(formatCountdown(6 * 60 * 60 * 1000 + 12 * 60 * 1000)).toBe("6h 12m");
    expect(formatCountdown(43 * 60 * 1000)).toBe("43m");
    expect(formatCountdown(30 * 1000)).toBe("under a minute");
    expect(formatCountdown(0)).toBe("under a minute");
    expect(formatCountdown(2 * 60 * 60 * 1000)).toBe("2h 0m");
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

describe("currentStreak (the gentle keeping-up run, ADR 0018)", () => {
  // Oldest→newest, the shape RitualsRail passes (lastNRitualDayKeys + a kept set).
  const week = ["d1", "d2", "d3", "d4", "d5"]; // d5 is "today"

  it("counts consecutive kept days ending at today", () => {
    expect(currentStreak(week, new Set(["d3", "d4", "d5"]))).toBe(3);
    expect(currentStreak(week, new Set(week))).toBe(5);
  });

  it("today unfinished does not break the run — it counts back from yesterday", () => {
    // Today (d5) not yet kept, but the four before it were: the run still reads 4.
    expect(currentStreak(week, new Set(["d1", "d2", "d3", "d4"]))).toBe(4);
  });

  it("a gap ends the run at the most recent kept stretch", () => {
    // d3 missed: only d4+d5 count, d1/d2 are stranded behind the gap.
    expect(currentStreak(week, new Set(["d1", "d2", "d4", "d5"]))).toBe(2);
  });

  it("is 0 when neither today nor yesterday was kept (no penalty, just a reset)", () => {
    expect(currentStreak(week, new Set(["d1", "d2", "d3"]))).toBe(0);
    expect(currentStreak(week, new Set())).toBe(0);
    expect(currentStreak([], new Set())).toBe(0);
  });

  it("a single kept today is a run of one", () => {
    expect(currentStreak(week, new Set(["d5"]))).toBe(1);
  });
});

describe("keepingUpStatus (the calendar's three day states)", () => {
  const kept = new Set(["d1"]);
  const started = new Set(["d1", "d2"]); // a kept day is necessarily started too

  it("reads finished when both bookends sealed (kept wins over started)", () => {
    expect(keepingUpStatus("d1", kept, started)).toBe("finished");
  });

  it("reads started when touched but not fully sealed", () => {
    expect(keepingUpStatus("d2", kept, started)).toBe("started");
  });

  it("reads empty when the day was never touched", () => {
    expect(keepingUpStatus("d3", kept, started)).toBe("empty");
  });
});
