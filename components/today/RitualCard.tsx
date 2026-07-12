"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { isRitualComplete, ritualDayKey, RitualType } from "@/lib/ritual";

const COPY: Record<
  RitualType,
  { label: string; done: string; seal: string; sealed: string }
> = {
  morning: {
    label: "Morning ritual",
    done: "Every step done. The day is yours.",
    seal: "Seal the morning",
    sealed: "Morning sealed",
  },
  night: {
    label: "Night ritual",
    done: "Every step done. Nothing left to carry.",
    seal: "Close the day",
    sealed: "Day closed",
  },
};

const EDIT_FIELD =
  "w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] text-ink outline-none focus:border-gold transition";

export function RitualCard({ ritual }: { ritual: RitualType }) {
  const items = useQuery(api.rituals.list, {});
  const dayKey = ritualDayKey(new Date());
  const dayState = useQuery(api.rituals.day, { ritual, day: dayKey });
  const seed = useMutation(api.rituals.seedDefaults);
  const setChecked = useMutation(api.rituals.setChecked);
  const complete = useMutation(api.rituals.complete);
  const addItem = useMutation(api.rituals.addItem);
  const updateItem = useMutation(api.rituals.updateItem);
  const removeItem = useMutation(api.rituals.removeItem);
  const moveItem = useMutation(api.rituals.moveItem);
  const [editing, setEditing] = useState(false);
  const seededRef = useRef(false);

  // First open ever: a user with no items gets the small default set (one-shot
  // server-side via settings.ritualsSeededAt, so a deliberate delete-all sticks).
  useEffect(() => {
    if (items && items.length === 0 && !seededRef.current) {
      seededRef.current = true;
      void seed({});
    }
  }, [items, seed]);

  if (items === undefined) return null;

  const mine = items.filter((i) => i.ritual === ritual).sort((a, b) => a.order - b.order);
  const checkedIds = dayState?.checkedIds ?? [];
  const checked = new Set(checkedIds);
  const completedAt = dayState?.completedAt;
  const allChecked = isRitualComplete(
    mine.map((i) => i._id),
    checkedIds,
  );
  const copy = COPY[ritual];
  const glowing = completedAt || allChecked;

  return (
    <div
      className={`bg-card border rounded-[18px] p-[22px] mb-[18px] transition-colors ${
        glowing ? "border-gold" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] tracking-[0.16em] uppercase text-ink-mute">
          {copy.label}
          {mine.length > 0 && !completedAt && (
            <span className="ml-2 normal-case tracking-normal">
              {mine.filter((i) => checked.has(i._id)).length}/{mine.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-ink-mute hover:text-ink"
        >
          {editing ? "done" : "edit"}
        </button>
      </div>

      {mine.length === 0 && (
        <div className="text-[14px] text-ink-mute py-2">
          This ritual is empty. Tap edit to add a step.
        </div>
      )}

      {editing ? (
        <div>
          {mine.map((item, i) => (
            <div key={item._id} className="flex items-start gap-2 py-2">
              <div className="flex flex-col gap-0.5 pt-1">
                <button
                  onClick={() => moveItem({ itemId: item._id, direction: "up" })}
                  disabled={i === 0}
                  className="p-1 text-ink-mute hover:text-ink disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveItem({ itemId: item._id, direction: "down" })}
                  disabled={i === mine.length - 1}
                  className="p-1 text-ink-mute hover:text-ink disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1">
                <input
                  defaultValue={item.title}
                  onBlur={(e) => {
                    const title = e.target.value.trim();
                    if (title && title !== item.title) void updateItem({ itemId: item._id, title });
                  }}
                  className={EDIT_FIELD}
                />
                {item.kind === "read" && (
                  <textarea
                    defaultValue={item.content ?? ""}
                    rows={3}
                    placeholder="The words to read each time…"
                    onBlur={(e) => {
                      if (e.target.value !== (item.content ?? ""))
                        void updateItem({ itemId: item._id, content: e.target.value });
                    }}
                    className={`${EDIT_FIELD} mt-1.5 resize-none leading-relaxed`}
                  />
                )}
              </div>
              <button
                onClick={() => removeItem({ itemId: item._id })}
                className="p-2 text-ink-mute hover:text-ink"
                aria-label="Delete step"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => addItem({ ritual, kind: "do", title: "New step" })}
              className="inline-flex items-center gap-1 border border-line rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold"
            >
              <Plus className="w-3.5 h-3.5" /> step
            </button>
            <button
              onClick={() =>
                addItem({ ritual, kind: "read", title: "Read the mantra", content: "" })
              }
              className="inline-flex items-center gap-1 border border-line rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold"
            >
              <Plus className="w-3.5 h-3.5" /> something to read
            </button>
          </div>
        </div>
      ) : (
        <div>
          {mine.map((item) => {
            const isChecked = checked.has(item._id);
            return (
              <button
                key={item._id}
                onClick={() =>
                  void setChecked({ ritual, day: dayKey, itemId: item._id, checked: !isChecked })
                }
                disabled={!!completedAt}
                className="w-full flex items-start gap-3 py-3 text-left border-b border-line last:border-b-0 disabled:cursor-default"
              >
                <span
                  className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                    isChecked ? "bg-accent border-accent text-white" : "border-line-2 bg-paper"
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-[15px] transition ${
                      isChecked ? "text-ink-mute" : "text-ink"
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.kind === "read" && item.content && (
                    <span
                      className={`block text-[14px] leading-relaxed italic border-l-2 border-gold/50 pl-3 mt-1.5 ${
                        isChecked ? "text-ink-mute" : "text-ink-soft"
                      }`}
                    >
                      {item.content}
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          {completedAt ? (
            <div className="mt-3.5 rounded-xl bg-gold/10 border border-gold px-4 py-3 flex items-center justify-center gap-2 text-[14px] text-[#8A6A2E]">
              <Check className="w-4 h-4" strokeWidth={2.5} />
              {copy.sealed} ·{" "}
              {new Date(completedAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          ) : allChecked ? (
            <div className="mt-3.5 rounded-xl border border-gold bg-gold/5 p-4 text-center">
              <div className="text-[15px] text-ink mb-3">{copy.done}</div>
              <button
                onClick={() => void complete({ ritual, day: dayKey })}
                className="bg-ink text-white rounded-xl px-6 py-2.5 text-sm w-full sm:w-auto"
              >
                {copy.seal}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
