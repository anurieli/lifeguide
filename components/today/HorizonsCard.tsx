"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarDays,
  CalendarRange,
  Check,
  Layers,
  Mountain,
  Plus,
  Target,
  Telescope,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ritualDayKey } from "@/lib/ritual";
import {
  HORIZON_SCOPES,
  HorizonScope,
  MAX_PER_PERIOD,
  isWeekPlanningDay,
  periodKeyFor,
  weekKeyFor,
} from "@/lib/horizons";

// ============================================================================
// The Horizons ladder card: a person's nested plan, from the far 5-year vision
// down to today, shown at the top of Today under the North Star. Each rung is a
// small editable object (convex/horizons.ts): standing rungs (5yr/1yr/1mo) hold
// one evolving line; time-boxed rungs (this week / today) hold up to three
// checkable goals — "the most important thing, plus two more." Beat-aware: the
// morning is for crafting the near rungs, the night for reviewing what got done.
// See docs/product/features/horizons.md.
// ============================================================================

const ICONS: Record<string, typeof Target> = {
  Mountain,
  Telescope,
  CalendarRange,
  CalendarDays,
  Target,
};

type Rows = Record<
  string,
  { _id: Id<"horizons">; text: string; order: number; doneAt?: number }[]
>;

const EDIT_FIELD =
  "w-full bg-paper border border-line rounded-lg px-2.5 py-1.5 text-[13.5px] text-ink outline-none focus:border-gold transition";

// A standing rung: one evolving line, click to edit, blur to save (empty clears it).
function StandingRung({
  scope,
  label,
  Icon,
  prompt,
  row,
}: {
  scope: HorizonScope;
  label: string;
  Icon: typeof Target;
  prompt: string;
  row?: { _id: Id<"horizons">; text: string };
}) {
  const setStanding = useMutation(api.horizons.setStanding);
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 text-ink-mute mt-0.5 flex-shrink-0" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] tracking-[0.12em] uppercase text-ink-mute">{label}</div>
        {editing ? (
          <input
            defaultValue={row?.text ?? ""}
            autoFocus
            placeholder={prompt}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== (row?.text ?? "")) void setStanding({ scope, text: v });
              setEditing(false);
            }}
            className={`${EDIT_FIELD} mt-0.5`}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="block text-left w-full text-[14px] text-ink hover:text-accent transition"
          >
            {row?.text || <span className="text-ink-mute italic">{prompt}</span>}
          </button>
        )}
      </div>
    </div>
  );
}

// A time-boxed rung (this week / today): up to three checkable goals + one add row.
function GoalList({
  scope,
  label,
  Icon,
  prompt,
  period,
  rows,
  emphasize,
}: {
  scope: HorizonScope;
  label: string;
  Icon: typeof Target;
  prompt: string;
  period: string;
  rows: Rows[string];
  emphasize?: boolean;
}) {
  const addGoal = useMutation(api.horizons.addGoal);
  const update = useMutation(api.horizons.update);
  const remove = useMutation(api.horizons.remove);
  const setDone = useMutation(api.horizons.setDone);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<Id<"horizons"> | null>(null);

  const submit = async () => {
    const t = text.trim();
    if (!t || rows.length >= MAX_PER_PERIOD) return;
    setText("");
    await addGoal({ scope, period, text: t });
  };

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon
        className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${emphasize ? "text-gold" : "text-ink-mute"}`}
        strokeWidth={2.2}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] tracking-[0.12em] uppercase text-ink-mute mb-0.5">{label}</div>
        {rows.map((g) => (
          <div key={g._id} className="group flex items-start gap-2 py-0.5">
            <button
              onClick={() => void setDone({ id: g._id, done: !g.doneAt })}
              aria-label={g.doneAt ? "Mark not done" : "Mark done"}
              className={`w-[16px] h-[16px] rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                g.doneAt ? "bg-gold border-gold text-white" : "border-line-2 bg-paper"
              }`}
            >
              {g.doneAt && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
            </button>
            {editingId === g._id ? (
              <input
                defaultValue={g.text}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                onBlur={(e) => {
                  if (e.target.value !== g.text) void update({ id: g._id, text: e.target.value });
                  setEditingId(null);
                }}
                className={EDIT_FIELD}
              />
            ) : (
              <button
                onClick={() => setEditingId(g._id)}
                className={`min-w-0 flex-1 text-left text-[14px] ${
                  g.doneAt ? "text-ink-mute line-through decoration-line-2" : "text-ink"
                }`}
              >
                {g.text}
              </button>
            )}
            <button
              onClick={() => void remove({ id: g._id })}
              aria-label="Remove"
              className="p-0.5 text-ink-mute opacity-0 group-hover:opacity-100 hover:text-ink transition flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {rows.length < MAX_PER_PERIOD && (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            placeholder={rows.length === 0 ? prompt : "Add another… (enter)"}
            className={`${EDIT_FIELD} mt-1`}
          />
        )}
      </div>
    </div>
  );
}

export function HorizonsCard({ mode }: { mode: "am" | "pm" }) {
  const { dayKey, weekKey, planningWeek } = useMemo(() => {
    const day = ritualDayKey(new Date());
    return { dayKey: day, weekKey: weekKeyFor(day), planningWeek: isWeekPlanningDay(day) };
  }, []);
  const ladder = useQuery(api.horizons.ladder, { week: weekKey, day: dayKey }) as Rows | null | undefined;
  const [open, setOpen] = useState(false);

  if (ladder === undefined) return null;
  const rows: Rows = ladder ?? {};

  const standing = HORIZON_SCOPES.filter((h) => h.cadence === "standing");
  const weekly = HORIZON_SCOPES.find((h) => h.scope === "weekly")!;
  const daily = HORIZON_SCOPES.find((h) => h.scope === "daily")!;

  return (
    <div className="bg-card border border-line rounded-[18px] p-[20px] mb-[18px]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-ink-mute">
          <Layers className="w-3.5 h-3.5" strokeWidth={2.2} />
          Horizons
        </div>
        <button onClick={() => setOpen(!open)} className="text-xs text-ink-mute hover:text-ink">
          {open ? "hide the ladder" : "the whole ladder"}
        </button>
      </div>

      {/* The near rungs lead — today first, then this week — since they are what the
          morning crafts and the night reviews. Today is emphasized. */}
      <GoalList
        scope="daily"
        label={mode === "pm" ? "Today — what got done?" : daily.label}
        Icon={ICONS[daily.icon]}
        prompt={daily.prompt}
        period={periodKeyFor("daily", dayKey)}
        rows={rows.daily ?? []}
        emphasize
      />
      <div className="border-t border-line" />
      <GoalList
        scope="weekly"
        label={planningWeek ? "This week — Sunday, set it" : weekly.label}
        Icon={ICONS[weekly.icon]}
        prompt={weekly.prompt}
        period={periodKeyFor("weekly", dayKey)}
        rows={rows.weekly ?? []}
      />

      {/* The far rungs (5yr/1yr/1mo) fold away — standing direction, revised rarely. */}
      {open && (
        <div className="border-t border-line mt-1 pt-1">
          {standing.map((h) => (
            <StandingRung
              key={h.scope}
              scope={h.scope}
              label={h.label}
              Icon={ICONS[h.icon]}
              prompt={h.prompt}
              row={rows[h.scope]?.[0]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
