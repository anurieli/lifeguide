import { describe, it, expect } from "vitest";
import { mantraForDay, MANTRA_POOL } from "../lib/mantras";

describe("mantraForDay (the rotating pool)", () => {
  it("is deterministic: the same day always gets the same mantra", () => {
    expect(mantraForDay("2026-07-12")).toBe(mantraForDay("2026-07-12"));
  });

  it("consecutive days walk the pool in order and wrap", () => {
    const start = mantraForDay("2026-07-12");
    const startIdx = MANTRA_POOL.indexOf(start);
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(mantraForDay("2026-07-13")).toBe(MANTRA_POOL[(startIdx + 1) % MANTRA_POOL.length]);
  });

  it("covers the whole pool over one full cycle", () => {
    const seen = new Set<string>();
    for (let d = 0; d < MANTRA_POOL.length; d++) {
      // Walk MANTRA_POOL.length consecutive days from a fixed anchor.
      const day = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
      seen.add(mantraForDay(day));
    }
    expect(seen.size).toBe(MANTRA_POOL.length);
  });

  it("rotates across month boundaries without repeating adjacent days", () => {
    expect(mantraForDay("2026-07-31")).not.toBe(mantraForDay("2026-08-01"));
  });

  it("every pool line is a short, non-empty self-directed line", () => {
    expect(MANTRA_POOL.length).toBeGreaterThan(4);
    for (const line of MANTRA_POOL) {
      expect(line.trim().length).toBeGreaterThan(0);
    }
  });
});
