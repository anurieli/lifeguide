// The Horizons ladder: the object-oriented backbone of a person's plan. One nested
// ladder from the far North Star down to today — every rung a small, editable object.
//
//   North Star   (settings.northStar — the crown, standing)
//   5-year       ┐
//   1-year       ├ standing horizons: revised occasionally, one line each
//   1-month      ┘
//   This week    ┐ time-boxed goals: reset each period, up to MAX_PER_PERIOD each,
//   Today        ┘ checkable — "the most important thing, plus two more"
//
// The near rungs (this week, today) are crafted in the morning scroll and reviewed at
// night; all rungs surface at the top of Today under the North Star. This module is
// pure logic + metadata (no I/O), so the shapes and the cadence are testable and the
// keys are timezone-stable, exactly like lib/ritual.ts. See docs/product/features/horizons.md.

// The rungs below the North Star. North Star itself lives in settings (referenced
// widely) and is rendered as the ladder's crown, not stored here.
export type HorizonScope = "five_year" | "one_year" | "one_month" | "weekly" | "daily";

// How a rung is time-boxed. "standing" rungs (5yr/1yr/1mo) are one evolving line;
// "weekly"/"daily" rungs are small ordered lists that reset with their period.
export type HorizonCadence = "standing" | "weekly" | "daily";

export type HorizonMeta = {
  scope: HorizonScope;
  label: string; // full label for the ladder ("5-year vision")
  short: string; // compact chip label ("5 yr")
  cadence: HorizonCadence;
  icon: string; // a lucide icon name, resolved to a component in the UI
  prompt: string; // the crafting prompt shown when the rung is empty
};

// Up to three goals per time-boxed period: "the most important thing, plus two more."
export const MAX_PER_PERIOD = 3;

// The ladder, far → near. Order here IS the display order under the North Star.
export const HORIZON_SCOPES: HorizonMeta[] = [
  {
    scope: "five_year",
    label: "5-year vision",
    short: "5 yr",
    cadence: "standing",
    icon: "Mountain",
    prompt: "Where do you want to be in five years?",
  },
  {
    scope: "one_year",
    label: "1-year goal",
    short: "1 yr",
    cadence: "standing",
    icon: "Telescope",
    prompt: "What would make this year a win?",
  },
  {
    scope: "one_month",
    label: "This month",
    short: "1 mo",
    cadence: "standing",
    icon: "CalendarRange",
    prompt: "What is this month about?",
  },
  {
    scope: "weekly",
    label: "This week",
    short: "Week",
    cadence: "weekly",
    icon: "CalendarDays",
    prompt: "What are this week's most important things?",
  },
  {
    scope: "daily",
    label: "Today",
    short: "Today",
    cadence: "daily",
    icon: "Target",
    prompt: "What's the most important thing today? Add up to two more.",
  },
];

export const HORIZON_META: Record<HorizonScope, HorizonMeta> = Object.fromEntries(
  HORIZON_SCOPES.map((h) => [h.scope, h]),
) as Record<HorizonScope, HorizonMeta>;

export function cadenceOf(scope: HorizonScope): HorizonCadence {
  return HORIZON_META[scope].cadence;
}

// The period key a rung belongs to for a given ritual day key:
//   standing → "std" (one shared bucket, never resets)
//   weekly   → the Monday of that day's ISO week ("YYYY-MM-DD")
//   daily    → the ritual day key itself
// So the right row is addressable from a day key alone, timezone-stable.
export function periodKeyFor(scope: HorizonScope, dayKey: string): string {
  const cadence = cadenceOf(scope);
  if (cadence === "standing") return "std";
  if (cadence === "daily") return dayKey;
  return weekKeyFor(dayKey);
}

// The Monday (ISO week start) of the week containing `dayKey`, as a "YYYY-MM-DD" key.
// UTC math on the key itself, so it is independent of the running machine's timezone.
export function weekKeyFor(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay(); // 0=Sun … 6=Sat
  const isoDow = dow === 0 ? 7 : dow; // 1=Mon … 7=Sun
  date.setUTCDate(date.getUTCDate() - (isoDow - 1)); // step back to Monday
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Sunday is the natural "plan the week" day — the ladder nudges weekly crafting then.
// (The week still belongs to its Monday; Sunday just gets the gentle prompt.)
export function isWeekPlanningDay(dayKey: string): boolean {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}
