"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Moon, Sun } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ritualDayKey, RitualType } from "@/lib/ritual";

// ============================================================================
// The day's to-dos: every plain "do" step of both rituals, lifted out of the
// page's spine onto its own rail (right-hand panel on desktop, a card below the
// sequence on the phone). Checking here is the same check state as the ritual —
// one source of truth in ritualDays — so the seal still counts these.
// ============================================================================

const EDIT_FIELD =
  "w-full bg-paper border border-line rounded-lg px-3 py-2 text-[13.5px] text-ink outline-none focus:border-gold transition";

function Section({ ritual, dayKey }: { ritual: RitualType; dayKey: string }) {
  const items = useQuery(api.rituals.list, {});
  const dayState = useQuery(api.rituals.day, { ritual, day: dayKey });
  const setChecked = useMutation(api.rituals.setChecked);
  const addItem = useMutation(api.rituals.addItem);
  const [text, setText] = useState("");

  const dos = (items ?? [])
    .filter((i) => i.ritual === ritual && i.kind === "do")
    .sort((a, b) => a.order - b.order);
  const checked = new Set(dayState?.checkedIds ?? []);
  const sealed = !!dayState?.completedAt;

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await addItem({ ritual, kind: "do", title: t });
  };

  return (
    <div className="py-3 border-b border-line last:border-b-0">
      <div className="flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-ink-mute mb-1.5">
        {ritual === "morning" ? (
          <Sun className="w-3.5 h-3.5 text-gold" strokeWidth={2.2} />
        ) : (
          <Moon className="w-3.5 h-3.5 text-accent" strokeWidth={2.2} />
        )}
        {ritual === "morning" ? "Morning" : "Night"}
      </div>
      {dos.map((item) => {
        const isChecked = checked.has(item._id);
        return (
          <button
            key={item._id}
            onClick={() =>
              void setChecked({ ritual, day: dayKey, itemId: item._id, checked: !isChecked })
            }
            disabled={sealed}
            className="w-full flex items-start gap-2.5 py-1.5 text-left disabled:cursor-default"
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
        );
      })}
      {dos.length === 0 && (
        <div className="text-[12.5px] text-ink-mute py-1">Nothing here yet.</div>
      )}
      {!sealed && (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="Add a to-do… (enter)"
          className={`${EDIT_FIELD} mt-1.5`}
        />
      )}
    </div>
  );
}

export function TodoPanel() {
  const dayKey = useMemo(() => ritualDayKey(new Date()), []);
  return (
    <div className="bg-card border border-line rounded-[18px] p-[18px]">
      <div className="text-[11px] tracking-[0.16em] uppercase text-ink-mute mb-1">
        The day&apos;s to-dos
      </div>
      <div className="text-[12.5px] text-ink-mute mb-1">
        Small steps carried alongside the ritual. Reorder or remove them in the ritual&apos;s
        edit.
      </div>
      <Section ritual="morning" dayKey={dayKey} />
      <Section ritual="night" dayKey={dayKey} />
    </div>
  );
}
