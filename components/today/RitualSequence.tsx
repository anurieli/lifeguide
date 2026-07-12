"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, BookOpen, Check, Plus, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  isRitualComplete,
  nextRitualDayKey,
  ritualDayKey,
  ritualDayRange,
  RitualType,
} from "@/lib/ritual";
import { questionForDay } from "@/lib/questions";
import { VoiceField } from "@/components/voice/VoiceField";
import { ImmersiveReader } from "@/components/today/ImmersiveReader";

// ============================================================================
// The ritual as an ORDERED PRIMER SEQUENCE (ADR 0011), not a checklist. The
// spine walks the typed components top to bottom — read, roadmap, question —
// with the first unwalked step held as "current". Plain "do" practices live on
// the rituals rail (RitualsRail) but morning/night ones still count toward the
// seal: the ritual is finished when every component of every kind is done.
// ============================================================================

const COPY: Record<RitualType, { label: string; done: string; seal: string; sealed: string }> = {
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

const KIND_LABEL: Record<string, string> = {
  do: "ritual",
  read: "read",
  question: "question",
  roadmap: "roadmap",
};

const EDIT_FIELD =
  "w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] text-ink outline-none focus:border-gold transition";
const FIELD_CLASS =
  "w-full border border-line-2 rounded-xl p-3 pr-12 text-[14.5px] resize-none outline-none bg-paper text-ink placeholder:text-ink-mute focus:border-gold transition";

type Item = {
  _id: Id<"ritualItems">;
  ritual: RitualType;
  kind: "do" | "read" | "question" | "roadmap";
  title: string;
  content?: string;
  source?: "inline" | "blueprint";
  order: number;
};

function StepCircle({
  checked,
  disabled,
  onToggle,
  label,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition disabled:cursor-default ${
        checked ? "bg-accent border-accent text-white" : "border-line-2 bg-paper"
      }`}
    >
      {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
    </button>
  );
}

// --- The question component: a prompt answered in place -------------------

function QuestionStep({
  item,
  question,
  answer,
  sealed,
  onAnswer,
}: {
  item: Item;
  question: string;
  answer: string | null;
  sealed: boolean;
  onAnswer: (answer: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const showInput = (!answer || rewriting) && !sealed;

  return (
    <div className="min-w-0 flex-1">
      <div className="text-[15px] text-ink mb-1">{question}</div>
      {showInput ? (
        <div className="mt-2">
          <VoiceField
            meta={{
              id: `ritual.question.${item._id}`,
              question,
              descriptor: "Say it however it comes out.",
              placeholder: "Say it however it comes out…",
              intent: "capture an honest, plain answer to this reflection question",
            }}
            value={draft}
            onChange={setDraft}
            rows={2}
            inputClassName={FIELD_CLASS}
          />
          <button
            onClick={async () => {
              await onAnswer(draft.trim());
              setDraft("");
              setRewriting(false);
            }}
            disabled={!draft.trim()}
            className="mt-2 bg-ink text-white rounded-xl px-4 py-2 text-sm disabled:opacity-40"
          >
            Save
          </button>
        </div>
      ) : answer ? (
        <div className="text-[14.5px] text-ink-soft leading-relaxed">
          {answer}
          {!sealed && (
            <button
              onClick={() => {
                setDraft(answer);
                setRewriting(true);
              }}
              className="ml-2 text-xs text-ink-mute hover:text-ink"
            >
              edit
            </button>
          )}
        </div>
      ) : (
        <div className="text-[13.5px] text-ink-mute">Not answered.</div>
      )}
    </div>
  );
}

// --- The roadmap component: evening builder, morning spine ----------------

function RoadmapStep({
  ritual,
  targetDay,
  sealed,
  onAllDone,
}: {
  ritual: RitualType;
  targetDay: string;
  sealed: boolean;
  onAllDone: () => void;
}) {
  const entries = useQuery(api.roadmap.forDay, { day: targetDay });
  const add = useMutation(api.roadmap.add);
  const update = useMutation(api.roadmap.update);
  const setDone = useMutation(api.roadmap.setDone);
  const remove = useMutation(api.roadmap.remove);
  const move = useMutation(api.roadmap.move);
  const [text, setText] = useState("");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const building = ritual === "night";

  if (entries === undefined) return <div className="flex-1" />;

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await add({ day: targetDay, text: t });
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="text-[13px] text-ink-mute mb-2">
        {building
          ? "What does tomorrow start with? Type it, hit enter, next."
          : entries.length > 0
            ? "Set last night. Walk it, top to bottom."
            : "No roadmap was set last night. Set the first thing now:"}
      </div>

      {entries.map((e, i) => (
        <div key={e._id} className="group flex items-start gap-2.5 py-1.5">
          {building ? (
            <span className="text-[12px] text-ink-mute w-5 pt-1 text-right flex-shrink-0">
              {i + 1}.
            </span>
          ) : (
            <button
              onClick={async () => {
                const done = !e.doneAt;
                await setDone({ entryId: e._id, done });
                if (done && entries.every((x) => x._id === e._id || x.doneAt)) onAllDone();
              }}
              disabled={sealed}
              aria-label={e.doneAt ? "Mark not done" : "Mark done"}
              className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center flex-shrink-0 mt-1 transition disabled:cursor-default ${
                e.doneAt ? "bg-gold border-gold text-white" : "border-line-2 bg-paper"
              }`}
            >
              {e.doneAt && <Check className="w-3 h-3" strokeWidth={3} />}
            </button>
          )}
          <div className="min-w-0 flex-1">
            <span
              className={`block text-[14.5px] ${e.doneAt && !building ? "text-ink-mute line-through decoration-line-2" : "text-ink"}`}
            >
              {e.text}
            </span>
            {noteFor === e._id ? (
              <input
                defaultValue={e.note ?? ""}
                autoFocus
                onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
                onBlur={(ev) => {
                  if (ev.target.value !== (e.note ?? ""))
                    void update({ entryId: e._id, note: ev.target.value });
                  setNoteFor(null);
                }}
                placeholder="Where / anything needed to just execute"
                className={`${EDIT_FIELD} mt-1 text-[12.5px]`}
              />
            ) : e.note ? (
              <button
                onClick={() => building && !sealed && setNoteFor(e._id)}
                className="block text-left text-[12.5px] text-ink-mute"
              >
                {e.note}
              </button>
            ) : building && !sealed ? (
              <button
                onClick={() => setNoteFor(e._id)}
                className="block text-[12px] text-ink-mute/70 hover:text-ink-mute transition"
              >
                + where / info
              </button>
            ) : null}
          </div>
          {building && !sealed && (
            <span className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
              <button
                onClick={() => move({ entryId: e._id, direction: "up" })}
                disabled={i === 0}
                className="p-1 text-ink-mute hover:text-ink disabled:opacity-30"
                aria-label="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => move({ entryId: e._id, direction: "down" })}
                disabled={i === entries.length - 1}
                className="p-1 text-ink-mute hover:text-ink disabled:opacity-30"
                aria-label="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => remove({ entryId: e._id })}
                className="p-1 text-ink-mute hover:text-ink"
                aria-label="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
        </div>
      ))}

      {!sealed && (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder={building ? "Then what? (enter to add)" : "Add to today… (enter)"}
          className={`${EDIT_FIELD} mt-2`}
        />
      )}
      {building && entries.length > 0 && (
        <div className="text-[12px] text-ink-mute mt-2">
          {entries.length} thing{entries.length === 1 ? "" : "s"} set for tomorrow morning.
        </div>
      )}
    </div>
  );
}

// --- The sequence card -----------------------------------------------------

export function RitualSequence({ ritual }: { ritual: RitualType }) {
  const items = useQuery(api.rituals.list, {}) as Item[] | undefined;
  const { dayKey, nextDayKey, sinceMs, untilMs } = useMemo(() => {
    const now = new Date();
    const range = ritualDayRange(now);
    return {
      dayKey: ritualDayKey(now),
      nextDayKey: nextRitualDayKey(now),
      sinceMs: range.sinceMs,
      untilMs: range.untilMs,
    };
  }, []);
  const dayState = useQuery(api.rituals.day, { ritual, day: dayKey });
  const events = useQuery(api.interactions.forRange, { sinceMs, untilMs });
  const blueprint = useQuery(api.blueprintDoc.get, {});

  const seed = useMutation(api.rituals.seedDefaults);
  const upgrade = useMutation(api.rituals.upgradeToSeedVersion);
  const setChecked = useMutation(api.rituals.setChecked);
  const complete = useMutation(api.rituals.complete);
  const addItem = useMutation(api.rituals.addItem);
  const updateItem = useMutation(api.rituals.updateItem);
  const removeItem = useMutation(api.rituals.removeItem);
  const moveItem = useMutation(api.rituals.moveItem);
  const adoptBlueprint = useMutation(api.rituals.adoptBlueprintRead);
  const adoptDoc = useMutation(api.blueprintDoc.adopt);
  const log = useMutation(api.interactions.log);

  const [editing, setEditing] = useState(false);
  const [readerItem, setReaderItem] = useState<Item | null>(null);
  const seededRef = useRef(false);
  const upgradedRef = useRef(false);

  // First open ever: seed the defaults (one-shot server-side). Existing accounts:
  // offer the v2 typed components once (one-shot via settings.ritualsSeedVersion).
  useEffect(() => {
    if (items && items.length === 0 && !seededRef.current) {
      seededRef.current = true;
      void seed({});
    }
    if (items && items.length > 0 && !upgradedRef.current) {
      upgradedRef.current = true;
      void upgrade({});
    }
  }, [items, seed, upgrade]);

  if (items === undefined) return null;

  const mine = items.filter((i) => i.ritual === ritual).sort((a, b) => a.order - b.order);
  const spine = mine.filter((i) => i.kind !== "do");
  const checkedIds = dayState?.checkedIds ?? [];
  const checked = new Set(checkedIds);
  const completedAt = dayState?.completedAt;
  const sealed = !!completedAt;
  const allChecked = isRitualComplete(
    mine.map((i) => i._id),
    checkedIds,
  );
  const copy = COPY[ritual];
  const currentId = sealed ? null : spine.find((i) => !checked.has(i._id))?._id ?? null;

  // Today's question answers, latest per step, from the day's event log.
  const answers = new Map<string, { question: string; answer: string }>();
  for (const e of events ?? []) {
    if (e.type !== "ritual_question") continue;
    try {
      const p = JSON.parse(e.payload) as { itemId?: string; question?: string; answer?: string };
      if (p.itemId && p.answer) answers.set(p.itemId, { question: p.question ?? "", answer: p.answer });
    } catch {
      // ignore malformed history
    }
  }

  const questionFor = (item: Item) =>
    item.content?.trim() ||
    questionForDay(ritual === "morning" ? "morning" : "evening", dayKey);

  const readContent = (item: Item) =>
    item.source === "blueprint" ? blueprint?.content ?? "" : item.content ?? "";

  const hasBlueprintRead = items.some((i) => i.kind === "read" && i.source === "blueprint");

  return (
    <div
      className={`bg-card border rounded-[18px] p-[22px] mb-[18px] transition-colors ${
        completedAt || allChecked ? "border-gold" : "border-line"
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tracking-[0.1em] uppercase text-ink-mute border border-line rounded-full px-2 py-0.5 flex-shrink-0">
                    {KIND_LABEL[item.kind]}
                  </span>
                  <input
                    defaultValue={item.title}
                    onBlur={(e) => {
                      const title = e.target.value.trim();
                      if (title && title !== item.title)
                        void updateItem({ itemId: item._id, title });
                    }}
                    className={EDIT_FIELD}
                  />
                </div>
                {item.kind === "read" &&
                  (item.source === "blueprint" ? (
                    <div className="text-[12.5px] text-ink-mute mt-1.5 pl-1">
                      The words come from your Blueprint — edit it in Settings.
                    </div>
                  ) : (
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
                  ))}
                {item.kind === "question" && (
                  <input
                    defaultValue={item.content ?? ""}
                    placeholder="A fixed question — or leave empty to rotate through the bank"
                    onBlur={(e) => {
                      if (e.target.value !== (item.content ?? ""))
                        void updateItem({ itemId: item._id, content: e.target.value });
                    }}
                    className={`${EDIT_FIELD} mt-1.5`}
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
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={() => addItem({ ritual, kind: "do", title: "New ritual" })}
              className="inline-flex items-center gap-1 border border-line rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold"
            >
              <Plus className="w-3.5 h-3.5" /> ritual
            </button>
            <button
              onClick={() =>
                addItem({ ritual, kind: "read", title: "Read the mantra", content: "" })
              }
              className="inline-flex items-center gap-1 border border-line rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold"
            >
              <Plus className="w-3.5 h-3.5" /> something to read
            </button>
            <button
              onClick={() => addItem({ ritual, kind: "question", title: "A question" })}
              className="inline-flex items-center gap-1 border border-line rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold"
            >
              <Plus className="w-3.5 h-3.5" /> question
            </button>
            {!mine.some((i) => i.kind === "roadmap") && (
              <button
                onClick={() =>
                  addItem({
                    ritual,
                    kind: "roadmap",
                    title: ritual === "night" ? "Set tomorrow's roadmap" : "Walk today's roadmap",
                  })
                }
                className="inline-flex items-center gap-1 border border-line rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold"
              >
                <Plus className="w-3.5 h-3.5" /> roadmap
              </button>
            )}
            {!hasBlueprintRead && ritual === "morning" && (
              <button
                onClick={() => adoptBlueprint({})}
                className="inline-flex items-center gap-1 border border-gold rounded-full px-3.5 py-1.5 text-[13px] text-[#8A6A2E] hover:bg-gold/5"
              >
                <BookOpen className="w-3.5 h-3.5" /> read from the Blueprint
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {spine.map((item) => {
            const isChecked = checked.has(item._id);
            const isCurrent = item._id === currentId;
            return (
              <div
                key={item._id}
                className={`flex items-start gap-3 py-3.5 border-b border-line last:border-b-0 ${
                  isCurrent ? "-mx-3 px-3 rounded-xl bg-gold/[0.04]" : ""
                }`}
              >
                <StepCircle
                  checked={isChecked}
                  disabled={sealed}
                  onToggle={() =>
                    void setChecked({ ritual, day: dayKey, itemId: item._id, checked: !isChecked })
                  }
                  label={item.title}
                />
                {item.kind === "read" && (
                  <div className="min-w-0 flex-1">
                    <div className={`text-[15px] ${isChecked ? "text-ink-mute" : "text-ink"}`}>
                      {item.title}
                    </div>
                    <div className="text-[13px] text-ink-mute truncate mt-0.5">
                      {(readContent(item) || "The words live in your Blueprint.").split("\n")[0]}
                    </div>
                    <button
                      onClick={() => {
                        if (item.source === "blueprint" && !blueprint) void adoptDoc({});
                        setReaderItem(item);
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 border border-line rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      {isChecked ? "Read again" : "Read"}
                    </button>
                  </div>
                )}
                {item.kind === "question" && (
                  <QuestionStep
                    item={item}
                    question={questionFor(item)}
                    answer={answers.get(item._id)?.answer ?? null}
                    sealed={sealed}
                    onAnswer={async (answer) => {
                      await log({
                        type: "ritual_question",
                        payload: JSON.stringify({
                          ritual,
                          day: dayKey,
                          itemId: item._id,
                          question: questionFor(item),
                          answer,
                        }),
                      });
                      if (!checked.has(item._id))
                        await setChecked({ ritual, day: dayKey, itemId: item._id, checked: true });
                    }}
                  />
                )}
                {item.kind === "roadmap" && (
                  <RoadmapStep
                    ritual={ritual}
                    targetDay={ritual === "night" ? nextDayKey : dayKey}
                    sealed={sealed}
                    onAllDone={() => {
                      if (!checked.has(item._id))
                        void setChecked({ ritual, day: dayKey, itemId: item._id, checked: true });
                    }}
                  />
                )}
              </div>
            );
          })}

          {spine.length === 0 && mine.length > 0 && (
            <div className="text-[14px] text-ink-mute py-2">
              Your practices for this bookend live on the rituals rail. Add a read, a question,
              or the roadmap here to give it a spine.
            </div>
          )}

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

      {readerItem && readContent(readerItem) && (
        <ImmersiveReader
          title={readerItem.title}
          content={readContent(readerItem)}
          onFinished={() => {
            if (!checked.has(readerItem._id) && !sealed)
              void setChecked({ ritual, day: dayKey, itemId: readerItem._id, checked: true });
          }}
          onClose={() => setReaderItem(null)}
        />
      )}
    </div>
  );
}
