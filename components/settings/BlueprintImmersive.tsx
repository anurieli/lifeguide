"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Check, Plus, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { ImmersiveShell } from "@/components/today/ImmersiveReader";

// ============================================================================
// The Blueprint, full-screen. Two rules govern this surface:
//
// 1. THERE IS NO EDIT MODE. The document reads as a clean document at rest —
//    no toggle, no chrome, nothing to "enter". Editing affordances are latent
//    and appear only under the cursor, then vanish. Reading is the default
//    state and it is never dressed up as a form.
//
// 2. EVERY UNIT IS A COMPONENT. A section (pillar) is a component: a name, a
//    purpose in subtext, and its rules. A rule is a component: the practice and
//    its "why it pays off". A rule without a why cannot be saved — the why is
//    the whole point of the doctrine, not an optional note.
//
// The two gestures:
//   ADD    — hovering the dead space under a section's last rule reveals a
//            ghost slot. Clicking it opens an inline draft (practice + why)
//            with X to cancel and ✓ to save, resolved in the same breath.
//   REMOVE — hovering a rule reveals a minimal X on its right. It removes
//            immediately; Convex's reactivity makes the UI follow at once.
//
// The store is plain JSON (see convex/schema.ts's `blueprint.pillars`), and the
// mutations this calls ARE the documented contract an agent uses to append to
// the Blueprint — see "the coach-editable surface" in convex/blueprintDoc.ts.
// A human hovering a ghost slot and an agent calling `addItem` travel the same
// path and obey the same required-why rule.
// ============================================================================

export type StructuredDoc = Doc<"blueprint"> & {
  header: NonNullable<Doc<"blueprint">["header"]>;
  pillars: NonNullable<Doc<"blueprint">["pillars"]>;
};

const FIELD =
  "w-full bg-paper border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-gold transition resize-none";

// A latent affordance: invisible at rest, revealed by the cursor, gone when it
// leaves. Used for both "add a rule" and "add a section" so the two gestures
// feel like one idea.
function GhostSlot({
  label,
  fields,
  onSave,
}: {
  label: string;
  fields: { key: string; placeholder: string; rows: number; required: boolean }[];
  onSave: (values: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const canSave = fields.every((f) => !f.required || (values[f.key] ?? "").trim().length > 0);

  const close = () => {
    setOpen(false);
    setValues({});
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-transparent text-ink-mute opacity-0 transition hover:border-line hover:opacity-100 focus:opacity-100 focus:outline-none"
      >
        <Plus className="h-4 w-4" />
        <span className="text-[13px]">{label}</span>
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-dashed border-gold/60 bg-card p-4">
      {fields.map((f, i) => (
        <textarea
          key={f.key}
          autoFocus={i === 0}
          rows={f.rows}
          placeholder={f.placeholder}
          value={values[f.key] ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSave) {
              onSave(values);
              close();
            }
          }}
          className={`${FIELD} ${i === 0 ? "text-[15px] leading-relaxed text-ink" : "mt-2 text-[13px] italic leading-relaxed text-ink-soft"}`}
        />
      ))}
      <div className="mt-2.5 flex items-center justify-end gap-1">
        <button
          onClick={close}
          aria-label="Cancel"
          className="rounded-full p-1.5 text-ink-mute transition hover:bg-line/50 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            onSave(values);
            close();
          }}
          disabled={!canSave}
          aria-label="Save"
          className="rounded-full p-1.5 text-ink-mute transition hover:bg-line/50 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Check className="h-4 w-4" />
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

  const { header, pillars } = doc;

  return (
    <ImmersiveShell
      title="The Blueprint"
      onFinished={onFinished}
      onClose={onClose}
      maxWidthClassName="max-w-[680px]"
    >
      {/* The header reads as a document title page — never editable chrome. */}
      <div className="mb-14">
        {header.kicker && (
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-gold">
            {header.kicker}
          </div>
        )}
        <h1 className="mb-3 text-[28px] font-semibold tracking-tight text-ink">{header.title}</h1>
        {header.intro && (
          <p className="text-[16px] leading-relaxed text-ink-soft">{header.intro}</p>
        )}
        {(header.source || header.compiled || header.structure) && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-ink-mute">
            {header.source && <span>Source: {header.source}</span>}
            {header.compiled && <span>Compiled: {header.compiled}</span>}
            {header.structure && <span>Structure: {header.structure}</span>}
          </div>
        )}
        {header.howToRead && (
          <div className="mt-5 border-l-2 border-gold/50 pl-4 text-[14px] italic leading-relaxed text-ink-soft">
            {header.howToRead}
          </div>
        )}
      </div>

      {/* Each section: a number, a name, its purpose in subtext, then its rules. */}
      {pillars.map((pillar, i) => (
        <section key={pillar.id} className="group/section mb-16">
          <div className="mb-1 flex items-baseline gap-3">
            <span className="text-[13px] font-medium tracking-wide text-gold">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2 className="text-[20px] font-semibold tracking-tight text-ink">{pillar.name}</h2>
            <button
              onClick={() => removePillar({ pillarId: pillar.id })}
              aria-label={`Remove the ${pillar.name} section`}
              className="ml-auto rounded-full p-1.5 text-ink-mute opacity-0 transition hover:bg-line/50 hover:text-ink focus:opacity-100 group-hover/section:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {pillar.subtitle && (
            <div className="mb-6 text-[14px] italic text-ink-mute">{pillar.subtitle}</div>
          )}

          {/* Each rule is its own component: the practice, then why it pays off. */}
          <div className="space-y-4">
            {pillar.items.map((it) => (
              <article
                key={it.id}
                className="group/rule relative rounded-xl border border-line bg-card p-4"
              >
                <button
                  onClick={() => removeItem({ pillarId: pillar.id, itemId: it.id })}
                  aria-label="Remove this rule"
                  className="absolute right-2 top-2 rounded-full p-1.5 text-ink-mute opacity-0 transition hover:bg-line/50 hover:text-ink focus:opacity-100 group-hover/rule:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="pr-7 text-[15px] leading-relaxed text-ink">{it.practice}</div>
                {it.why && (
                  <div className="mt-2.5 border-t border-dashed border-line pt-2.5 text-[13px] italic leading-relaxed text-ink-soft">
                    <span className="not-italic text-ink-mute">Why it pays off — </span>
                    {it.why}
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* The dead space under the last rule: a ghost slot, latent until hovered. */}
          <GhostSlot
            label="Add a rule"
            fields={[
              { key: "practice", placeholder: "The rule", rows: 2, required: true },
              { key: "why", placeholder: "Why it pays off", rows: 2, required: true },
            ]}
            onSave={(v) =>
              addItem({
                pillarId: pillar.id,
                practice: v.practice.trim(),
                why: v.why.trim(),
              })
            }
          />
        </section>
      ))}

      {/* The same gesture, one level up: a new section. */}
      <GhostSlot
        label="Add a section"
        fields={[
          { key: "name", placeholder: "Section name", rows: 1, required: true },
          { key: "subtitle", placeholder: "What this section is about", rows: 2, required: false },
        ]}
        onSave={(v) => addPillar({ name: v.name.trim(), subtitle: (v.subtitle ?? "").trim() })}
      />
    </ImmersiveShell>
  );
}
