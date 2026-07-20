"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DailyExercise, journalPromptFor, questionForDay } from "@/lib/questions";
import { mantraForDay } from "@/lib/mantras";
import { DailyTidbit } from "@/components/today/DailyTidbit";
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
    label: "Morning scroll",
    done: "Every step done. The day is yours.",
    seal: "Seal the morning",
    sealed: "Morning sealed",
  },
  night: {
    label: "Night scroll",
    done: "Every step done. Nothing left to carry.",
    seal: "Close the day",
    sealed: "Day closed",
  },
};

const KIND_LABEL: Record<string, string> = {
  do: "ritual",
  read: "read",
  mantra: "mantra",
  question: "question",
  roadmap: "roadmap",
  tidbit: "tidbit",
};

const EDIT_FIELD =
  "w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] text-ink outline-none focus:border-gold transition";
const FIELD_CLASS =
  "w-full border border-line-2 rounded-xl p-3 pr-12 text-[14.5px] resize-none outline-none bg-paper text-ink placeholder:text-ink-mute focus:border-gold transition";

type Item = {
  _id: Id<"ritualItems">;
  ritual: RitualType;
  kind: "do" | "read" | "mantra" | "question" | "roadmap" | "tidbit";
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
// One field, always live: type or speak, and the answer saves the moment you
// click out (or when a voice take lands). No Save button — VoiceField's onCommit
// fires on blur and after shaping, so an answer is never stranded behind a click.

function QuestionStep({
  item,
  question,
  answer,
  sealed,
  onAnswer,
  promptControl,
}: {
  item: Item;
  question: string;
  answer: string | null;
  sealed: boolean;
  onAnswer: (answer: string) => Promise<void>;
  // The morning journal's inline prompt picker (Intention / Gratitude / Free),
  // shown under the question so the person can retune the day's prompt in place.
  promptControl?: ReactNode;
}) {
  const [draft, setDraft] = useState(answer ?? "");
  // While the person is mid-edit we hold their draft; otherwise we mirror the
  // persisted answer (it loads in async, or another device answers).
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!dirtyRef.current) setDraft(answer ?? "");
  }, [answer]);

  const commit = useCallback(
    async (next: string) => {
      const trimmed = next.trim();
      dirtyRef.current = false;
      // Nothing meaningful, or unchanged → don't log an empty/duplicate answer.
      if (!trimmed || trimmed === (answer ?? "").trim()) return;
      await onAnswer(trimmed);
    },
    [answer, onAnswer],
  );

  if (sealed) {
    return (
      <div className="min-w-0 flex-1">
        <div className="text-[15px] text-ink mb-1">{question}</div>
        {answer ? (
          <div className="text-[14.5px] text-ink-soft leading-relaxed">{answer}</div>
        ) : (
          <div className="text-[13.5px] text-ink-mute">Not answered.</div>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="text-[15px] text-ink mb-1">{question}</div>
      {promptControl}
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
          onChange={(next) => {
            dirtyRef.current = true;
            setDraft(next);
          }}
          onCommit={commit}
          rows={2}
          inputClassName={FIELD_CLASS}
        />
      </div>
    </div>
  );
}

// --- The daily-prompt picker: the journal's setting, editable in the scroll ---
// The morning journal's prompt follows the person's Daily Exercise (Settings →
// "What the check-in asks you"). Rather than send them to Settings, this changes
// it right here: three chips write settings.dailyExercise, and the prompt above
// re-resolves live. (Ariel, 2026-07-15.)

const EXERCISE_LABEL: Record<DailyExercise, string> = {
  intention: "Intention",
  gratitude: "Gratitude",
  free: "Free",
};

function DailyPromptPicker({
  exercise,
  onChange,
}: {
  exercise: DailyExercise;
  onChange: (e: DailyExercise) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className="text-[11px] tracking-[0.1em] uppercase text-ink-mute mr-0.5">Prompt</span>
      {(Object.keys(EXERCISE_LABEL) as DailyExercise[]).map((e) => {
        const active = e === exercise;
        return (
          <button
            key={e}
            onClick={() => !active && onChange(e)}
            className={`rounded-full px-2.5 py-0.5 text-[12px] border transition ${
              active
                ? "bg-ink text-white border-ink"
                : "text-ink-mute border-line hover:border-gold"
            }`}
          >
            {EXERCISE_LABEL[e]}
          </button>
        );
      })}
    </div>
  );
}

// --- The note to morning-you: the hinge between the two scrolls -----------
// Written (and rewritten) freely at night, addressed to the next morning; the
// morning scroll opens with it. Saves on blur, empty tears it up (morningNote.set).

function NoteToMorning({ targetDay, sealed }: { targetDay: string; sealed: boolean }) {
  const note = useQuery(api.morningNote.forDay, { day: targetDay });
  const set = useMutation(api.morningNote.set);
  const [draft, setDraft] = useState("");
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!dirtyRef.current) setDraft(note?.text ?? "");
  }, [note]);

  if (note === undefined) return null;

  if (sealed) {
    if (!note?.text) return null;
    return (
      <div className="mt-4 pt-3 border-t border-dashed border-line">
        <div className="text-[12px] text-ink-mute mb-1">
          <span className="text-gold">✳</span> Left for the morning
        </div>
        <div className="text-[14px] text-ink-soft leading-relaxed whitespace-pre-wrap">
          {note.text}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-3 border-t border-dashed border-line">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-mute mb-1.5">
        <span className="text-gold text-[14px] leading-none">✳</span>
        A note for morning-you
        <span className="text-ink-mute/60">— it opens tomorrow&apos;s scroll</span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => {
          dirtyRef.current = true;
          setDraft(e.target.value);
        }}
        onBlur={() => {
          dirtyRef.current = false;
          if (draft.trim() !== (note?.text ?? "")) void set({ day: targetDay, text: draft });
        }}
        rows={2}
        placeholder="Anything you want to wake up to — a reminder, a warning, a word."
        className={`${EDIT_FIELD} resize-none leading-relaxed`}
      />
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
            ? "Left by last-night you. Walk it, top to bottom."
            : "What does today start with? Set the first thing:"}
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
      {building && <NoteToMorning targetDay={targetDay} sealed={sealed} />}
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
  // The Daily Exercise steers the morning journal prompt, editable inline below.
  const settings = useQuery(api.settings.get, {});
  const updateSettings = useMutation(api.settings.update);
  const exercise = (settings?.dailyExercise ?? "intention") as DailyExercise;
  // The note last-night you left for this morning — it opens the morning scroll.
  const morningNote = useQuery(
    api.morningNote.forDay,
    ritual === "morning" ? { day: dayKey } : "skip",
  );

  const seed = useMutation(api.rituals.seedDefaults);
  const upgrade = useMutation(api.rituals.upgradeToSeedVersion);
  const setChecked = useMutation(api.rituals.setChecked);
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
  // upgrade + reconcile once (v4: fold duplicate mantras, settings-drive the journal;
  // one-shot via settings.ritualsSeedVersion).
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

  // A content-less morning question IS the morning journal: its prompt follows the
  // Daily Exercise setting (editable inline). The night's content-less question keeps
  // the rotating evening bank. A question with its own fixed words always wins.
  const isMorningJournal = (item: Item) =>
    ritual === "morning" && item.kind === "question" && !item.content?.trim();

  const questionFor = (item: Item) =>
    item.content?.trim() ||
    (ritual === "morning" ? journalPromptFor(exercise) : questionForDay("evening", dayKey));

  // A mantra's inline words: the person's own fixed line, or one drawn from the
  // rotating pool (differing by the day). Shown in place — no reader, no Read tap.
  const mantraFor = (item: Item) => item.content?.trim() || mantraForDay(dayKey);

  const readContent = (item: Item) =>
    item.source === "blueprint" ? blueprint?.content ?? "" : item.content ?? "";

  const hasBlueprintRead = mine.some((i) => i.kind === "read" && i.source === "blueprint");

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
                  {item.kind === "question" ? (
                    // A question step's one editable thing IS the question. Editing
                    // it writes `content` (the fixed prompt); the title tracks it so
                    // the step's label stays meaningful. Empty → rotate the bank.
                    <input
                      defaultValue={item.content ?? ""}
                      placeholder="The question asked here — leave empty to rotate through the bank"
                      onBlur={(e) => {
                        const q = e.target.value;
                        if (q !== (item.content ?? ""))
                          void updateItem({
                            itemId: item._id,
                            content: q,
                            title: q.trim() || "Reflection question",
                          });
                      }}
                      className={EDIT_FIELD}
                    />
                  ) : (
                    <input
                      defaultValue={item.title}
                      onBlur={(e) => {
                        const title = e.target.value.trim();
                        if (title && title !== item.title)
                          void updateItem({ itemId: item._id, title });
                      }}
                      className={EDIT_FIELD}
                    />
                  )}
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
                {item.kind === "question" && !item.content?.trim() && (
                  <div className="text-[12.5px] text-ink-mute mt-1.5 pl-1">
                    {ritual === "morning" ? (
                      <>
                        The morning journal — follows your Daily Exercise ({exercise}):{" "}
                        <span className="text-ink-soft">“{journalPromptFor(exercise)}”</span>
                      </>
                    ) : (
                      <>
                        Rotating through the bank — tonight:{" "}
                        <span className="text-ink-soft">
                          “{questionForDay("evening", dayKey)}”
                        </span>
                      </>
                    )}
                  </div>
                )}
                {item.kind === "mantra" && (
                  <>
                    <textarea
                      defaultValue={item.content ?? ""}
                      rows={2}
                      placeholder="Your own line to read each time — leave empty to rotate through the pool…"
                      onBlur={(e) => {
                        if (e.target.value !== (item.content ?? ""))
                          void updateItem({ itemId: item._id, content: e.target.value });
                      }}
                      className={`${EDIT_FIELD} mt-1.5 resize-none leading-relaxed`}
                    />
                    {!item.content?.trim() && (
                      <div className="text-[12.5px] text-ink-mute mt-1.5 pl-1">
                        Rotating through the pool — today:{" "}
                        <span className="text-ink-soft">“{mantraForDay(dayKey)}”</span>
                      </div>
                    )}
                  </>
                )}
                {item.kind === "tidbit" && (
                  <>
                    <textarea
                      defaultValue={item.content ?? ""}
                      rows={2}
                      placeholder="Your own line — leave empty for a daily quote from your Coach…"
                      onBlur={(e) => {
                        if (e.target.value !== (item.content ?? ""))
                          void updateItem({ itemId: item._id, content: e.target.value });
                      }}
                      className={`${EDIT_FIELD} mt-1.5 resize-none leading-relaxed`}
                    />
                    {!item.content?.trim() && (
                      <div className="text-[12.5px] text-ink-mute mt-1.5 pl-1">
                        A fresh inspirational quote each day, chosen for you from your Core.
                      </div>
                    )}
                  </>
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
              onClick={() => addItem({ ritual, kind: "mantra", title: "Read the mantra" })}
              className="inline-flex items-center gap-1 border border-line rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold"
            >
              <Plus className="w-3.5 h-3.5" /> mantra
            </button>
            <button
              onClick={() => addItem({ ritual, kind: "tidbit", title: "Today's quote" })}
              className="inline-flex items-center gap-1 border border-line rounded-full px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold"
            >
              <Plus className="w-3.5 h-3.5" /> daily quote
            </button>
            <button
              onClick={() =>
                addItem({ ritual, kind: "read", title: "Something to read", content: "" })
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
            {!hasBlueprintRead && (
              <button
                onClick={() => adoptBlueprint({ ritual })}
                className="inline-flex items-center gap-1 border border-gold rounded-full px-3.5 py-1.5 text-[13px] text-[#8A6A2E] hover:bg-gold/5"
              >
                <BookOpen className="w-3.5 h-3.5" /> read from the Blueprint
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {ritual === "morning" && morningNote?.text && (
            <div className="mt-2 mb-1.5 rounded-xl border border-gold/50 bg-gold/[0.06] px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-[#8A6A2E] mb-1.5">
                <span className="text-[13px] tracking-normal leading-none">✳</span>
                From last-night you
              </div>
              <div className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap">
                {morningNote.text}
              </div>
            </div>
          )}
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
                {item.kind === "mantra" && (
                  // Shown inline — the mantra IS the step. No Read button: it is
                  // short, read in a breath. The circle is the acknowledgment.
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] tracking-[0.14em] uppercase text-ink-mute mb-1">
                      {item.title}
                    </div>
                    <div
                      className={`text-[16px] leading-relaxed ${
                        isChecked ? "text-ink-mute" : "text-ink"
                      }`}
                    >
                      {mantraFor(item)}
                    </div>
                  </div>
                )}
                {item.kind === "tidbit" && (
                  <DailyTidbit
                    fixedContent={item.content}
                    dayKey={dayKey}
                    checked={isChecked}
                  />
                )}
                {item.kind === "question" && (
                  <QuestionStep
                    item={item}
                    question={questionFor(item)}
                    answer={answers.get(item._id)?.answer ?? null}
                    sealed={sealed}
                    promptControl={
                      isMorningJournal(item) ? (
                        <DailyPromptPicker
                          exercise={exercise}
                          onChange={(e) => void updateSettings({ dailyExercise: e })}
                        />
                      ) : undefined
                    }
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

          {/* The seal (done + "seal the morning", or the sealed stamp) no longer
              lives at the foot of this card. It renders as <RitualSeal> at the very
              bottom of Today — after the Horizons ladder — so the last act of the
              scroll is: walk the steps, set your horizons, THEN seal the day. */}
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

// --- The seal, lifted out of the sequence card ----------------------------
// The "seal the morning / close the day" act sits at the very bottom of Today,
// below the Horizons ladder, so the day's spine reads top to bottom: walk the
// scroll → set your horizons → seal. It reads the same reactive queries the
// sequence does (Convex dedupes identical subscriptions, so this is free), and
// only appears once every step of the ritual is checked. Empty until then.
export function RitualSeal({ ritual }: { ritual: RitualType }) {
  const items = useQuery(api.rituals.list, {}) as Item[] | undefined;
  const dayKey = useMemo(() => ritualDayKey(new Date()), []);
  const dayState = useQuery(api.rituals.day, { ritual, day: dayKey });
  const complete = useMutation(api.rituals.complete);

  if (items === undefined) return null;
  const mine = items.filter((i) => i.ritual === ritual);
  if (mine.length === 0) return null;

  const checkedIds = dayState?.checkedIds ?? [];
  const completedAt = dayState?.completedAt;
  const allChecked = isRitualComplete(
    mine.map((i) => i._id),
    checkedIds,
  );
  const copy = COPY[ritual];

  if (completedAt) {
    return (
      <div className="mb-[18px] rounded-xl bg-gold/10 border border-gold px-4 py-3 flex items-center justify-center gap-2 text-[14px] text-[#8A6A2E]">
        <Check className="w-4 h-4" strokeWidth={2.5} />
        {copy.sealed} ·{" "}
        {new Date(completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </div>
    );
  }

  if (!allChecked) return null;

  return (
    <div className="mb-[18px] rounded-xl border border-gold bg-gold/5 p-4 text-center">
      <div className="text-[15px] text-ink mb-3">{copy.done}</div>
      <button
        onClick={() => void complete({ ritual, day: dayKey })}
        className="bg-ink text-white rounded-xl px-6 py-2.5 text-sm w-full sm:w-auto"
      >
        {copy.seal}
      </button>
    </div>
  );
}
