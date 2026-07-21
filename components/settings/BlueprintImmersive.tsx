"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Check, Plus, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { ImmersiveShell } from "@/components/today/ImmersiveReader";

// ============================================================================
// The Blueprint, full-screen. Three rules govern this surface:
//
// 1. THERE IS NO EDIT MODE. The document reads as a document at rest — no
//    toggle, no chrome. Editing affordances are latent: they appear under the
//    cursor and vanish when it leaves. Reading is the default state.
//
// 2. EVERY UNIT IS A COMPONENT. A section is a name, a purpose in subtext, and
//    its rules. A rule is the practice and its reason. A rule without a reason
//    cannot be saved — the why IS the doctrine, not an optional note.
//
// 3. SPARE, NOT DECORATED. Tight padding, small gaps, no rules-between-things.
//    The reason sits under its practice as quieter, smaller text; it needs no
//    "Why it pays off" label and no dividing line, because the type scale
//    already says which is which. Chrome competes with the words.
//
// The three gestures:
//   ADD    — hovering the dead space under a section's last rule reveals a
//            ghost slot; clicking opens an inline draft (practice + why).
//   EDIT   — clicking an existing rule opens it in place, the practice and the
//            reason as two separate fields. Blur or ⌘/Ctrl+Enter saves each
//            independently; Escape reverts.
//   REMOVE — hovering a rule reveals a minimal X on its right.
//
// The store is plain JSON (`blueprint.pillars`), and the mutations this calls
// ARE the contract an agent appends through — see "the coach-editable surface"
// in convex/blueprintDoc.ts. A human clicking a ghost slot and an agent calling
// `addItem` travel the same path and obey the same required-why rule.
// ============================================================================

export type StructuredDoc = Doc<"blueprint"> & {
  header: NonNullable<Doc<"blueprint">["header"]>;
  pillars: NonNullable<Doc<"blueprint">["pillars"]>;
};

const FIELD =
  "w-full bg-paper border border-line rounded-md px-2.5 py-1.5 text-ink outline-none focus:border-gold transition resize-none overflow-hidden";

// Grows to fit its content so an editing card never scrolls internally or
// jumps in height when it opens.
function useAutoSize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

function AutoTextarea({
  value,
  onChange,
  onCommit,
  onCancel,
  className,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  className: string;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const ref = useAutoSize(value);
  return (
    <textarea
      ref={ref}
      rows={1}
      autoFocus={autoFocus}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onCommit();
        }
      }}
      className={`${FIELD} ${className}`}
    />
  );
}

// One rule: the practice, and beneath it, quieter and smaller, the reason.
// Clicking anywhere opens it for editing in place.
function RuleCard({
  practice,
  why,
  onSave,
  onRemove,
}: {
  practice: string;
  why: string;
  onSave: (next: { practice?: string; why?: string }) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [p, setP] = useState(practice);
  const [w, setW] = useState(why);

  const cancel = () => {
    setP(practice);
    setW(why);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-gold/50 bg-card px-3 py-2.5">
        <AutoTextarea
          autoFocus
          value={p}
          onChange={setP}
          onCommit={() => {
            const v = p.trim();
            if (v && v !== practice) onSave({ practice: v });
            else if (!v) setP(practice);
          }}
          onCancel={cancel}
          placeholder="The rule"
          className="text-[15px] leading-snug text-ink"
        />
        <AutoTextarea
          value={w}
          onChange={setW}
          onCommit={() => {
            const v = w.trim();
            if (v && v !== why) onSave({ why: v });
            else if (!v) setW(why);
          }}
          onCancel={cancel}
          placeholder="Why it pays off"
          className="mt-1.5 text-[12px] leading-snug text-ink-mute"
        />
        <div className="mt-1.5 flex justify-end">
          <button
            onClick={() => setEditing(false)}
            aria-label="Done editing this rule"
            className="rounded-full p-1 text-ink-mute transition hover:bg-line/50 hover:text-ink"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="group/rule relative cursor-text rounded-lg border border-line bg-card px-3 py-2.5 transition hover:border-line/80"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove this rule"
        className="absolute right-1.5 top-1.5 rounded-full p-1 text-ink-mute opacity-0 transition hover:bg-line/50 hover:text-ink focus:opacity-100 group-hover/rule:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="pr-6 text-[15px] leading-snug text-ink">{practice}</div>
      {why && <div className="mt-1 text-[12px] leading-snug text-ink-mute">{why}</div>}
    </div>
  );
}

// A latent affordance: invisible at rest, revealed by the cursor. Used for both
// "add a rule" and "add a section" so the two gestures feel like one idea.
function GhostSlot({
  label,
  fields,
  onSave,
}: {
  label: string;
  fields: { key: string; placeholder: string; required: boolean; className: string }[];
  onSave: (values: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const canSave = fields.every((f) => !f.required || (values[f.key] ?? "").trim().length > 0);
  const close = () => {
    setOpen(false);
    setValues({});
  };
  const save = () => {
    if (!canSave) return;
    onSave(values);
    close();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 flex h-7 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-transparent text-ink-mute opacity-0 transition hover:border-line hover:opacity-100 focus:opacity-100 focus:outline-none"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="text-[12px]">{label}</span>
      </button>
    );
  }

  return (
    <div className="mt-1 rounded-lg border border-dashed border-gold/60 bg-card px-3 py-2.5">
      {fields.map((f, i) => (
        <AutoTextarea
          key={f.key}
          autoFocus={i === 0}
          value={values[f.key] ?? ""}
          onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
          onCommit={() => {}}
          onCancel={close}
          placeholder={f.placeholder}
          className={`${i > 0 ? "mt-1.5 " : ""}${f.className}`}
        />
      ))}
      <div className="mt-1.5 flex items-center justify-end gap-0.5">
        <button
          onClick={close}
          aria-label="Cancel"
          className="rounded-full p-1 text-ink-mute transition hover:bg-line/50 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={save}
          disabled={!canSave}
          aria-label="Save"
          className="rounded-full p-1 text-ink-mute transition hover:bg-line/50 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function BlueprintImmersive({
  doc,
  onFinished,
  onClose,
}: {
  doc: StructuredDoc;
  /** Fired once, when the reader is scrolled to the end (or the short-content pause fires). */
  onFinished: () => void;
  onClose: () => void;
}) {
  const addPillar = useMutation(api.blueprintDoc.addPillar);
  const removePillar = useMutation(api.blueprintDoc.removePillar);
  const addItem = useMutation(api.blueprintDoc.addItem);
  const removeItem = useMutation(api.blueprintDoc.removeItem);
  const updateItem = useMutation(api.blueprintDoc.updateItem);

  const { header, pillars } = doc;

  return (
    <ImmersiveShell
      title="The Blueprint"
      onFinished={onFinished}
      onClose={onClose}
      maxWidthClassName="max-w-[620px]"
    >
      {/* Spare title block: what this is, and nothing about itself. */}
      <div className="mb-9">
        {header.kicker && (
          <div className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-gold">
            {header.kicker}
          </div>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">
          {header.title}
        </h1>
        {header.intro && (
          <p className="mt-1.5 text-[14px] leading-snug text-ink-mute">{header.intro}</p>
        )}
      </div>

      {pillars.map((pillar, i) => (
        <section key={pillar.id} className="group/section mb-8">
          <div className="mb-0.5 flex items-baseline gap-2.5">
            <span className="text-[12px] font-medium tracking-wide text-gold">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2 className="text-[18px] font-semibold tracking-tight text-ink">{pillar.name}</h2>
            <button
              onClick={() => removePillar({ pillarId: pillar.id })}
              aria-label={`Remove the ${pillar.name} section`}
              className="ml-auto rounded-full p-1 text-ink-mute opacity-0 transition hover:bg-line/50 hover:text-ink focus:opacity-100 group-hover/section:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {pillar.subtitle && (
            <div className="mb-2.5 text-[13px] leading-snug text-ink-mute">{pillar.subtitle}</div>
          )}

          <div className="space-y-1.5">
            {pillar.items.map((it) => (
              <RuleCard
                key={it.id}
                practice={it.practice}
                why={it.why}
                onSave={(next) => updateItem({ pillarId: pillar.id, itemId: it.id, ...next })}
                onRemove={() => removeItem({ pillarId: pillar.id, itemId: it.id })}
              />
            ))}
          </div>

          <GhostSlot
            label="Add a rule"
            fields={[
              {
                key: "practice",
                placeholder: "The rule",
                required: true,
                className: "text-[15px] leading-snug text-ink",
              },
              {
                key: "why",
                placeholder: "Why it pays off",
                required: true,
                className: "text-[12px] leading-snug text-ink-mute",
              },
            ]}
            onSave={(v) =>
              addItem({ pillarId: pillar.id, practice: v.practice.trim(), why: v.why.trim() })
            }
          />
        </section>
      ))}

      <GhostSlot
        label="Add a section"
        fields={[
          {
            key: "name",
            placeholder: "Section name",
            required: true,
            className: "text-[18px] font-semibold tracking-tight text-ink",
          },
          {
            key: "subtitle",
            placeholder: "What this section is about",
            required: false,
            className: "text-[13px] leading-snug text-ink-mute",
          },
        ]}
        onSave={(v) => addPillar({ name: v.name.trim(), subtitle: (v.subtitle ?? "").trim() })}
      />
    </ImmersiveShell>
  );
}
