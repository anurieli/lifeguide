"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Check, Moon, Sun } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  lastNRitualDayKeys,
  nextRitualDayKey,
  ritualDayKey,
  ritualDayRange,
  RitualType,
} from "@/lib/ritual";

// ============================================================================
// The Today log: the day's journal entry, assembled from what actually happened.
// Top: the parts of the day (morning ritual, one move, night ritual, tonight) as
// tasks — sun/moon icon, open circle not done, filled circle done, tap to jump.
// Middle: everything set down today (check-ins, seals) from `interactions`.
// Bottom: a quiet last-7-days strip. No score, no streak counter — just the record.
// ============================================================================

const HISTORY_DAYS = 7;

function timeOf(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function RitualIcon({ ritual, className }: { ritual: RitualType; className?: string }) {
  return ritual === "morning" ? (
    <Sun className={className ?? "w-4 h-4 text-gold"} strokeWidth={2.2} />
  ) : (
    <Moon className={className ?? "w-4 h-4 text-accent"} strokeWidth={2.2} />
  );
}

// A log entry's display shape, derived from the raw interaction row.
function entryView(e: { type: string; payload: string; at: number }): {
  ritual: RitualType;
  label: string;
  text?: string;
} | null {
  if (e.type === "checkin_morning")
    return { ritual: "morning", label: "Today's one move", text: e.payload };
  if (e.type === "checkin_evening")
    return { ritual: "night", label: "Tonight", text: e.payload };
  if (e.type === "ritual_question") {
    try {
      const p = JSON.parse(e.payload) as { ritual?: RitualType; question?: string; answer?: string };
      if (!p.answer) return null;
      return {
        ritual: p.ritual === "night" ? "night" : "morning",
        label: p.question || "A question",
        text: p.answer,
      };
    } catch {
      return null;
    }
  }
  if (e.type === "ritual_completed") {
    try {
      const p = JSON.parse(e.payload) as { ritual?: RitualType };
      const ritual: RitualType = p.ritual === "night" ? "night" : "morning";
      return { ritual, label: ritual === "morning" ? "Morning sealed" : "Day closed" };
    } catch {
      return { ritual: "morning", label: "Ritual sealed" };
    }
  }
  return null; // unknown event types stay out of the journal view
}

function PartRow({
  ritual,
  title,
  done,
  detail,
  onClick,
}: {
  ritual: RitualType;
  title: string;
  done: boolean;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 text-left border-b border-line last:border-b-0"
    >
      <span
        className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center flex-shrink-0 transition ${
          done ? "bg-accent border-accent text-white" : "border-line-2 bg-paper"
        }`}
      >
        {done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </span>
      <RitualIcon ritual={ritual} />
      <span className={`text-[15px] ${done ? "text-ink-mute" : "text-ink"}`}>{title}</span>
      {detail && <span className="ml-auto text-xs text-ink-mute">{detail}</span>}
    </button>
  );
}

export function DayLog({ onJump }: { onJump: (mode: "am" | "pm") => void }) {
  // Computed once per mount: the queries want stable args, and a page left open
  // across the 4am rollover simply refreshes on the next visit.
  const { dayKey, nextDayKey, range, weekKeys } = useMemo(() => {
    const now = new Date();
    return {
      dayKey: ritualDayKey(now),
      nextDayKey: nextRitualDayKey(now),
      range: ritualDayRange(now),
      weekKeys: lastNRitualDayKeys(now, HISTORY_DAYS),
    };
  }, []);

  const items = useQuery(api.rituals.list, {});
  const morningDay = useQuery(api.rituals.day, { ritual: "morning", day: dayKey });
  const nightDay = useQuery(api.rituals.day, { ritual: "night", day: dayKey });
  const history = useQuery(api.rituals.history, { sinceDay: weekKeys[0] });
  const todayRoadmap = useQuery(api.roadmap.forDay, { day: dayKey });
  const tomorrowRoadmap = useQuery(api.roadmap.forDay, { day: nextDayKey });
  const events = useQuery(api.interactions.forRange, {
    sinceMs: range.sinceMs,
    untilMs: range.untilMs,
  });

  if (items === undefined || events === undefined) return null;

  const counts = (ritual: RitualType) => {
    const mine = items.filter((i) => i.ritual === ritual);
    const checked = new Set(
      (ritual === "morning" ? morningDay : nightDay)?.checkedIds ?? [],
    );
    return { total: mine.length, done: mine.filter((i) => checked.has(i._id)).length };
  };
  const am = counts("morning");
  const pm = counts("night");
  const morningSealedAt = morningDay?.completedAt;
  const nightSealedAt = nightDay?.completedAt;
  const todayDone = (todayRoadmap ?? []).filter((r) => r.doneAt).length;
  const todayTotal = (todayRoadmap ?? []).length;
  const tomorrowTotal = (tomorrowRoadmap ?? []).length;

  const entries = events
    .slice()
    .sort((a, b) => a.at - b.at)
    .map((e) => ({ e, view: entryView(e) }))
    .filter((x): x is { e: (typeof events)[number]; view: NonNullable<ReturnType<typeof entryView>> } =>
      x.view !== null,
    );

  const sealedOn = new Set(
    (history ?? []).filter((h) => h.completedAt).map((h) => `${h.ritual}:${h.day}`),
  );

  return (
    <div className="bg-card border border-line rounded-[18px] p-[22px] mb-[18px]">
      <div className="text-[11px] tracking-[0.16em] uppercase text-ink-mute mb-1">
        Today&apos;s log
      </div>
      <div className="text-[14px] text-ink-mute mb-2.5">
        The parts of the day, and everything you set down. This is today&apos;s journal entry.
      </div>

      {/* the parts of the day */}
      <div className="mb-1">
        <PartRow
          ritual="morning"
          title="Morning ritual"
          done={!!morningSealedAt}
          detail={
            morningSealedAt
              ? `sealed · ${timeOf(morningSealedAt)}`
              : am.total > 0
                ? `${am.done}/${am.total}`
                : undefined
          }
          onClick={() => onJump("am")}
        />
        <PartRow
          ritual="morning"
          title="Today's roadmap"
          done={todayTotal > 0 && todayDone === todayTotal}
          detail={todayTotal > 0 ? `${todayDone}/${todayTotal}` : "none set"}
          onClick={() => onJump("am")}
        />
        <PartRow
          ritual="night"
          title="Night ritual"
          done={!!nightSealedAt}
          detail={
            nightSealedAt
              ? `closed · ${timeOf(nightSealedAt)}`
              : pm.total > 0
                ? `${pm.done}/${pm.total}`
                : undefined
          }
          onClick={() => onJump("pm")}
        />
        <PartRow
          ritual="night"
          title="Tomorrow's roadmap"
          done={tomorrowTotal > 0}
          detail={
            tomorrowTotal > 0
              ? `${tomorrowTotal} thing${tomorrowTotal === 1 ? "" : "s"}`
              : "not set"
          }
          onClick={() => onJump("pm")}
        />
      </div>

      {/* everything set down today */}
      <div className="border-t border-line pt-3.5 mt-2.5">
        {entries.length === 0 ? (
          <div className="text-[14px] text-ink-mute">
            Nothing set down yet today. It all lands here as you go.
          </div>
        ) : (
          entries.map(({ e, view }) => (
            <div key={e._id} className="flex items-start gap-3 py-2">
              <span className="text-xs text-ink-mute w-[62px] flex-shrink-0 pt-0.5">
                {timeOf(e.at)}
              </span>
              <span className="pt-0.5 flex-shrink-0">
                <RitualIcon ritual={view.ritual} className="w-3.5 h-3.5 text-ink-mute" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] text-ink-mute">{view.label}</span>
                {view.text && (
                  <span className="block text-[15px] text-ink leading-relaxed">{view.text}</span>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      {/* keeping up — the quiet last-7-days strip */}
      <div className="border-t border-line pt-3.5 mt-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-[0.16em] uppercase text-ink-mute">
            Keeping up
          </span>
          <div className="flex gap-2.5">
            {weekKeys.map((key) => {
              const isToday = key === dayKey;
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <span className={`text-[10px] ${isToday ? "text-ink" : "text-ink-mute"}`}>
                    {new Date(`${key}T12:00:00`).toLocaleDateString([], { weekday: "narrow" })}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sealedOn.has(`morning:${key}`) ? "bg-gold" : "border border-line-2"
                    }`}
                    title="Morning ritual"
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sealedOn.has(`night:${key}`) ? "bg-accent" : "border border-line-2"
                    }`}
                    title="Night ritual"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
