"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Moon, Plus, RotateCcw, Sun, SunMoon, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  formatCountdown,
  currentStreak,
  lastNRitualDayKeys,
  msUntilRollover,
  ritualDayKey,
} from "@/lib/ritual";

// ============================================================================
// The Rituals rail: the person's permanent ritual practices (kind "do"), one
// flat list — no morning/night sections. Each practice carries a time marker
// instead (sun = morning, moon = night, sun-moon = indifferent to the time of
// day), is checked fresh each day, and belongs to the profile until deliberately
// deleted: hover ✕ → an explicit warning, because deleting removes it from every
// day. One add affordance at the bottom, closable, with the time-of-day picker
// on the right. Checking shares the ritual's own check state, so morning/night
// practices still count toward their seal; "any" practices belong to neither.
// ============================================================================

type RailRitual = "morning" | "night" | "any";

const HISTORY_DAYS = 7;
// How far back the gentle keeping-up run looks (ADR 0018). A run longer than the
// window reads as "N+" rather than lying with a smaller exact count.
const STREAK_WINDOW = 120;

const EDIT_FIELD =
  "w-full bg-paper border border-line rounded-lg px-3 py-2 text-[13.5px] text-ink outline-none focus:border-gold transition";

const TIME_META: Record<RailRitual, { label: string; Icon: typeof Sun; tint: string }> = {
  morning: { label: "Morning", Icon: Sun, tint: "text-gold" },
  night: { label: "Night", Icon: Moon, tint: "text-accent" },
  any: { label: "Anytime", Icon: SunMoon, tint: "text-ink-mute" },
};

// One flat order: the day flows morning → anytime → night.
const GROUP_ORDER: RailRitual[] = ["morning", "any", "night"];

export function RitualsRail() {
  const dayKey = useMemo(() => ritualDayKey(new Date()), []);
  // One history window feeds both the 7-day dot strip (its tail) and the run.
  const streakKeys = useMemo(() => lastNRitualDayKeys(new Date(), STREAK_WINDOW), []);
  const weekKeys = useMemo(() => streakKeys.slice(-HISTORY_DAYS), [streakKeys]);
  const items = useQuery(api.rituals.list, {});
  const morningDay = useQuery(api.rituals.day, { ritual: "morning", day: dayKey });
  const nightDay = useQuery(api.rituals.day, { ritual: "night", day: dayKey });
  const anyDay = useQuery(api.rituals.day, { ritual: "any", day: dayKey });
  const history = useQuery(api.rituals.history, { sinceDay: streakKeys[0] });
  const setChecked = useMutation(api.rituals.setChecked);
  const addItem = useMutation(api.rituals.addItem);
  const removeItem = useMutation(api.rituals.removeItem);

  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [when, setWhen] = useState<RailRitual>("any");
  const [confirming, setConfirming] = useState<Id<"ritualItems"> | null>(null);

  // The daily reset countdown: every check clears at the 4am rollover (a fresh
  // ritual-day row), so the rail shows how long the day's checks still stand.
  // Ticks each minute — enough for a minute-granular "resets in 6h 12m".
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const resetsIn = formatCountdown(msUntilRollover(new Date(nowMs)));

  const practices = (items ?? [])
    .filter((i) => i.kind === "do")
    .sort(
      (a, b) =>
        GROUP_ORDER.indexOf(a.ritual as RailRitual) - GROUP_ORDER.indexOf(b.ritual as RailRitual) ||
        a.order - b.order,
    );

  const dayState: Record<RailRitual, { checked: Set<string>; sealed: boolean }> = {
    morning: {
      checked: new Set(morningDay?.checkedIds ?? []),
      sealed: !!morningDay?.completedAt,
    },
    night: { checked: new Set(nightDay?.checkedIds ?? []), sealed: !!nightDay?.completedAt },
    any: { checked: new Set(anyDay?.checkedIds ?? []), sealed: false }, // "any" is never sealed
  };

  // The quiet last-7-days strip: did the morning and night rituals get sealed?
  const sealedOn = new Set(
    (history ?? []).filter((h) => h.completedAt).map((h) => `${h.ritual}:${h.day}`),
  );

  // The gentle keeping-up run (ADR 0018): a "kept" day is one where BOTH bookends
  // were sealed — the streak just counts the ritual's own completion. Penalty-free
  // and reset-silently; a run past the window reads as "N+".
  const keptDays = new Set(
    streakKeys.filter((k) => sealedOn.has(`morning:${k}`) && sealedOn.has(`night:${k}`)),
  );
  const streak = currentStreak(streakKeys, keptDays);
  const streakLabel = streak >= STREAK_WINDOW ? `${streak}+` : `${streak}`;

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await addItem({ ritual: when, kind: "do", title: t });
  };

  return (
    <div className="bg-card border border-line rounded-[18px] p-[18px]">
      <div className="text-[11px] tracking-[0.16em] uppercase text-ink-mute mb-1">Rituals</div>
      <div className="text-[12.5px] text-ink-mute mb-1.5">
        Permanent to your profile. Checked fresh each day.
      </div>
      <div
        className="flex items-center gap-1.5 text-[12px] text-ink-mute mb-2"
        title="Every check clears at the 4:00 AM rollover"
      >
        <RotateCcw className="w-3 h-3" strokeWidth={2.2} />
        Resets in {resetsIn}
      </div>

      {practices.map((item) => {
        const r = item.ritual as RailRitual;
        const { Icon, tint, label } = TIME_META[r];
        const isChecked = dayState[r].checked.has(item._id);
        const sealed = dayState[r].sealed;
        const isConfirming = confirming === item._id;
        return (
          <div key={item._id} className="group border-b border-line last:border-b-0">
            <div className="flex items-start gap-2.5 py-2">
              <button
                onClick={() =>
                  void setChecked({ ritual: r, day: dayKey, itemId: item._id, checked: !isChecked })
                }
                disabled={sealed}
                className="flex items-start gap-2.5 flex-1 min-w-0 text-left disabled:cursor-default"
              >
                <span
                  className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                    isChecked ? "bg-accent border-accent text-white" : "border-line-2 bg-paper"
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className={`text-[14px] ${isChecked ? "text-ink-mute" : "text-ink"}`}>
                  {item.title}
                </span>
              </button>
              <span title={label} className="flex-shrink-0 mt-1">
                <Icon className={`w-3.5 h-3.5 ${tint}`} strokeWidth={2.2} />
              </span>
              <button
                onClick={() => setConfirming(isConfirming ? null : item._id)}
                aria-label={`Delete ${item.title}`}
                className="flex-shrink-0 mt-0.5 p-0.5 text-ink-mute opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-ink transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {isConfirming && (
              <div className="mb-2.5 -mt-0.5 rounded-lg border border-line bg-paper px-3 py-2.5 text-[12.5px] text-ink-soft">
                Delete this ritual? It&apos;ll be removed from all rituals — every day, not just
                today.
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={async () => {
                      setConfirming(null);
                      await removeItem({ itemId: item._id });
                    }}
                    className="bg-ink text-white rounded-lg px-3 py-1.5 text-[12.5px]"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="text-ink-mute px-2 text-[12.5px]"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {practices.length === 0 && (
        <div className="text-[12.5px] text-ink-mute py-1.5">
          No rituals yet. Add the small practices your days are made of.
        </div>
      )}

      {/* one add, at the bottom, closable */}
      {adding ? (
        <div className="mt-3 rounded-xl border border-line bg-paper/60 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] tracking-[0.14em] uppercase text-ink-mute">
              Add a ritual
            </span>
            <button
              onClick={() => setAdding(false)}
              aria-label="Close"
              className="p-0.5 text-ink-mute hover:text-ink transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            placeholder="The practice… (enter to add)"
            className={EDIT_FIELD}
          />
          <div className="flex items-center gap-1 mt-2">
            {GROUP_ORDER.map((r) => {
              const { Icon, label } = TIME_META[r];
              const active = when === r;
              return (
                <button
                  key={r}
                  onClick={() => setWhen(r)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] border transition ${
                    active
                      ? "bg-ink text-white border-ink"
                      : "text-ink-mute border-line hover:border-gold"
                  }`}
                >
                  <Icon className="w-3 h-3" strokeWidth={2.2} /> {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 border border-line rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add a ritual
        </button>
      )}

      {/* keeping up — the quiet last-7-days strip plus a gentle run count (ADR
          0018): the record of which mornings and nights got sealed, and how many
          days in a row both bookends closed. No penalty, no shaming — a gap just
          starts the run over at today. */}
      <div className="border-t border-line pt-3.5 mt-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] tracking-[0.16em] uppercase text-ink-mute">Keeping up</span>
            {streak > 0 && (
              <span className="text-[11px] text-gold" title="Days in a row both scrolls closed">
                {streakLabel} in a row
              </span>
            )}
          </div>
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
                    title="Morning scroll"
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sealedOn.has(`night:${key}`) ? "bg-accent" : "border border-line-2"
                    }`}
                    title="Night scroll"
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
