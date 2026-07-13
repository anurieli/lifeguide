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
// cutoff, night from the cutoff through the small hours. This is the ONLY ritual
// you can reach right now — at 17:00 the morning locks, at 4:00 the night locks
// (Ariel, 2026-07-12): you only ever act on the beat you are actually in.
export function activeRitual(d: Date): RitualType {
  const h = d.getHours();
  return h >= NIGHT_START_HOUR || h < DAY_ROLLOVER_HOUR ? "night" : "morning";
}

// Format an hour (0–23) as a friendly local "h:00 AM/PM" for the locked-beat hint.
function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${hour < 12 ? "AM" : "PM"}`;
}

// When the OTHER (currently-locked) ritual opens, for the toggle's hint. The night
// unlocks at NIGHT_START_HOUR; the morning unlocks at the DAY_ROLLOVER_HOUR.
export function ritualOpensAtLabel(locked: RitualType): string {
  return hourLabel(locked === "night" ? NIGHT_START_HOUR : DAY_ROLLOVER_HOUR);
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

// The absolute local-time span of the ritual day this moment belongs to: from 4am
// to the next 4am. Used to pull the day's log entries (interactions) by timestamp.
// Built from calendar fields (not +24h) so DST days keep their true length.
export function ritualDayRange(d: Date): { sinceMs: number; untilMs: number } {
  const shifted = new Date(d.getTime() - DAY_ROLLOVER_HOUR * 60 * 60 * 1000);
  const y = shifted.getFullYear();
  const m = shifted.getMonth();
  const day = shifted.getDate();
  return {
    sinceMs: new Date(y, m, day, DAY_ROLLOVER_HOUR).getTime(),
    untilMs: new Date(y, m, day + 1, DAY_ROLLOVER_HOUR).getTime(),
  };
}

// The ritual day AFTER the one this moment belongs to — the upcoming morning the
// evening roadmap builder targets (ADR 0012). An entry added at 23:00 and one added
// at 1:30am both belong to the same evening (4am rollover), so both target the same
// next morning.
export function nextRitualDayKey(d: Date): string {
  const shifted = new Date(d.getTime() - DAY_ROLLOVER_HOUR * 60 * 60 * 1000);
  const next = new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate() + 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// The last n ritual-day keys ending on (and including) the day `d` belongs to,
// oldest first. Feeds the quiet "keeping up" strip on the Today log.
export function lastNRitualDayKeys(d: Date, n: number): string[] {
  const shifted = new Date(d.getTime() - DAY_ROLLOVER_HOUR * 60 * 60 * 1000);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate() - i);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, "0");
    const dd = String(day.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${dd}`);
  }
  return keys;
}

// A ritual is complete when every one of its items is checked. An empty ritual is
// never complete (nothing was done). Stale checked ids (items deleted after being
// checked) are ignored.
export function isRitualComplete(itemIds: string[], checkedIds: string[]): boolean {
  if (itemIds.length === 0) return false;
  const checked = new Set(checkedIds);
  return itemIds.every((id) => checked.has(id));
}
