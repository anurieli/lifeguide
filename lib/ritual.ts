// The Daily Ritual's pure logic: time-of-day cutoffs, the ritual-day boundary, and
// completion detection. Centralized here so the cutoffs can become user-adjustable
// settings later without touching the surfaces (see docs/product/features/daily-ritual.md
// and ADR 0009).

export type RitualType = "morning" | "night";
export type RitualItemKind = "do" | "read";

// The ritual day rolls over at 4am local, not midnight: a night ritual finished at
// 12:30am still belongs to the evening it closes (ADR 0009).
export const DAY_ROLLOVER_HOUR = 4;

// The night ritual takes over at 17:00, matching the Today screen's am/pm flip.
export const NIGHT_START_HOUR = 17;

// Which ritual the moment calls for: morning from the rollover until the evening
// cutoff, night from the cutoff through the small hours.
export function activeRitual(d: Date): RitualType {
  const h = d.getHours();
  return h >= NIGHT_START_HOUR || h < DAY_ROLLOVER_HOUR ? "night" : "morning";
}

// The ritual day this moment belongs to, as a local "YYYY-MM-DD" key. Hours before
// the rollover count as the previous day, so check state survives past midnight.
export function ritualDayKey(d: Date): string {
  const shifted = new Date(d.getTime() - DAY_ROLLOVER_HOUR * 60 * 60 * 1000);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const day = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// A ritual is complete when every one of its items is checked. An empty ritual is
// never complete (nothing was done). Stale checked ids (items deleted after being
// checked) are ignored.
export function isRitualComplete(itemIds: string[], checkedIds: string[]): boolean {
  if (itemIds.length === 0) return false;
  const checked = new Set(checkedIds);
  return itemIds.every((id) => checked.has(id));
}
