# 0009. The ritual day: client-local key with a 4am rollover

**Status:** accepted (live) · **Date:** 2026-07-12

## Context

The Daily Ritual ([feature doc](../product/features/daily-ritual.md)) needs a "day" for two jobs: check state must reset each day, and completions must be recorded per day per ritual. Convex functions run in UTC and have no reliable notion of the user's local time, but the ritual is an intensely local-time thing: a night ritual is often finished after midnight, and a UTC (or even local-midnight) boundary would yank a half-checked night ritual out from under the person at 12:00, or file a 12:30am completion under the wrong day.

## Decision

1. **The day is a string key, `"YYYY-MM-DD"`, computed on the client** from the device's local clock (`lib/ritual.ts: ritualDayKey`) and passed as an argument to the ritual queries and mutations. The server validates the shape but never computes it.
2. **The day rolls over at 4:00 local, not midnight** (`DAY_ROLLOVER_HOUR = 4`): hours 0:00 through 3:59 belong to the *previous* calendar day. A night ritual sealed at 12:30am lands on the evening it closes.
3. **Check state lives in per-day rows** (`ritualDays`, keyed `[userId, ritual, day]`), so the daily reset is structural: a new day simply has no row yet. Nothing is ever wiped; rows with `completedAt` are the completion history.
4. **The time-of-day cutoffs are centralized** in `lib/ritual.ts` (`NIGHT_START_HOUR = 17`, `DAY_ROLLOVER_HOUR = 4`) so they can become per-user settings later without touching the surfaces.

## Consequences

- No cron, no reset job, no migration when the boundary changes: old rows keep their keys, new rows get new ones.
- The completion history is queryable by plain string equality/range on the key.
- **Trusting the client clock:** a wrong device clock writes to a wrong day. Accepted: this is personal data about your own conduct; there is no cross-user integrity concern.
- **Timezone travel / two devices in different zones** can disagree on "today" near the boundary. Accepted for now; a per-user home timezone in `settings` is the escape hatch if it ever matters.
- **DST:** `ritualDayKey` shifts the timestamp by a fixed 4 hours before reading local date parts, so within an hour of a DST jump the boundary lands at 3:00 or 5:00 local once a year. Harmless for this use.
- The 4am rollover means `activeRitual` and `ritualDayKey` agree: the small hours are the previous day's *night*, never a new day's morning.
