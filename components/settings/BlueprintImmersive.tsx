"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Plus, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { ImmersiveShell } from "@/components/today/ImmersiveReader";

// ============================================================================
// The Blueprint, full-screen: the structured doctrine rendered the way it reads
// best — the header block, then each pillar (number, name, subtitle) with EVERY
// line its own separated unit: the practice as its own card, its "why it pays
// off" reason directly beneath it as a distinct, visually-subordinate block.
// Never mashed into a paragraph — that was the free-text version's whole
// problem. Reuses ImmersiveShell (see ImmersiveReader.tsx / ADR 0013) for the
// overlay chrome, the top-X early exit, and the pinned red release button — the
// same "never auto-closes" behavior applies here.
//
// Edit mode (toggle at the top) is structured editing at the unit level: whole
// items and whole pillars are added/removed; an item's practice and why are two
// separate fields. There is no raw markdown/free-text editor anywhere in here —
// see convex/blueprintDoc.ts's "coach-editable surface" for the mutations this
// calls (the same ones a Coach agent would call later).
// ============================================================================

export type StructuredDoc = Doc<"blueprint"> & {
  header: NonNullable<Doc<"blueprint">["header"]>;
  pillars: NonNullable<Doc<"blueprint">["pillars"]>;
};

const FIELD =
  "w-full bg-paper border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-gold transition";

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
  const [editing, setEditing] = useState(false);
  const updateHeader = useMutation(api.blueprintDoc.updateHeader);
  const addPillar = useMutation(api.blueprintDoc.addPillar);
  const removePillar = useMutation(api.blueprintDoc.removePillar);
  const updatePillar = useMutation(api.blueprintDoc.updatePillar);
  const addItem = useMutation(api.blueprintDoc.addItem);
  const removeItem = useMutation(api.blueprintDoc.removeItem);
  const updateItem = useMutation(api.blueprintDoc.updateItem);

  const { header, pillars } = doc;

  return (
    <ImmersiveShell
      title="The Blueprint"
      onFinished={onFinished}
      onClose={onClose}
      maxWidthClassName="max-w-[680px]"
    >
      {/* edit toggle, at the top of the opened Blueprint */}
      <div className="mb-8 flex items-center justify-end">
        <button
          onClick={() => setEditing((e) => !e)}
          className={`rounded-full border px-4 py-1.5 text-[13px] transition ${
            editing
              ? "border-gold bg-gold/10 text-[#8A6A2E]"
              : "border-line text-ink-soft hover:border-gold"
          }`}
        >
          {editing ? "Done editing" : "Edit"}
        </button>
      </div>

      {/* header block */}
      <div className="mb-14">
        {header.kicker && (
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-gold">
            {header.kicker}
          </div>
        )}
        {editing ? (
          <input
            defaultValue={header.title}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== header.title) void updateHeader({ title: v });
            }}
            className="mb-3 w-full border-b border-line bg-transparent text-[28px] font-semibold tracking-tight text-ink outline-none focus:border-gold"
          />
        ) : (
          <h1 className="mb-3 text-[28px] font-semibold tracking-tight text-ink">
            {header.title}
          </h1>
        )}

        {editing ? (
          <textarea
            defaultValue={header.intro ?? ""}
            rows={3}
            placeholder="Intro"
            onBlur={(e) => {
              if (e.target.value !== (header.intro ?? "")) void updateHeader({ intro: e.target.value });
            }}
            className={`${FIELD} resize-none text-[16px] leading-relaxed text-ink-soft`}
          />
        ) : header.intro ? (
          <p className="text-[16px] leading-relaxed text-ink-soft">{header.intro}</p>
        ) : null}

        {(header.source || header.compiled || header.structure || editing) && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-ink-mute">
            {editing ? (
              <>
                <input
                  defaultValue={header.source ?? ""}
                  placeholder="Source"
                  onBlur={(e) => {
                    if (e.target.value !== (header.source ?? "")) void updateHeader({ source: e.target.value });
                  }}
                  className="w-40 border-b border-line bg-transparent outline-none focus:border-gold"
                />
                <input
                  defaultValue={header.compiled ?? ""}
                  placeholder="Compiled"
                  onBlur={(e) => {
                    if (e.target.value !== (header.compiled ?? ""))
                      void updateHeader({ compiled: e.target.value });
                  }}
                  className="w-32 border-b border-line bg-transparent outline-none focus:border-gold"
                />
                <input
                  defaultValue={header.structure ?? ""}
                  placeholder="Structure"
                  onBlur={(e) => {
                    if (e.target.value !== (header.structure ?? ""))
                      void updateHeader({ structure: e.target.value });
                  }}
                  className="w-28 border-b border-line bg-transparent outline-none focus:border-gold"
                />
              </>
            ) : (
              <>
                {header.source && <span>Source: {header.source}</span>}
                {header.compiled && <span>Compiled: {header.compiled}</span>}
                {header.structure && <span>Structure: {header.structure}</span>}
              </>
            )}
          </div>
        )}

        {editing ? (
          <textarea
            defaultValue={header.howToRead ?? ""}
            rows={3}
            placeholder="How to read this"
            onBlur={(e) => {
              if (e.target.value !== (header.howToRead ?? ""))
                void updateHeader({ howToRead: e.target.value });
            }}
            className={`${FIELD} mt-4 resize-none text-[14px] italic leading-relaxed text-ink-soft`}
          />
        ) : header.howToRead ? (
          <div className="mt-5 border-l-2 border-gold/50 pl-4 text-[14px] italic leading-relaxed text-ink-soft">
            {header.howToRead}
          </div>
        ) : null}
      </div>

      {/* pillars */}
      {pillars.map((pillar, i) => (
        <div key={pillar.id} className="mb-16">
          <div className="mb-1 flex items-start justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className="text-[13px] font-medium tracking-wide text-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
              {editing ? (
                <input
                  defaultValue={pillar.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== pillar.name)
                      void updatePillar({ pillarId: pillar.id, name: v });
                  }}
                  className="border-b border-line bg-transparent text-[20px] font-semibold tracking-tight text-ink outline-none focus:border-gold"
                />
              ) : (
                <h2 className="text-[20px] font-semibold tracking-tight text-ink">{pillar.name}</h2>
              )}
            </div>
            {editing && (
              <button
                onClick={() => removePillar({ pillarId: pillar.id })}
                className="p-1.5 text-ink-mute transition hover:text-red-600"
                aria-label={`Remove the ${pillar.name} pillar`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {editing ? (
            <input
              defaultValue={pillar.subtitle ?? ""}
              placeholder="Subtitle"
              onBlur={(e) => {
                if (e.target.value !== (pillar.subtitle ?? ""))
                  void updatePillar({ pillarId: pillar.id, subtitle: e.target.value });
              }}
              className="mb-6 w-full border-b border-line bg-transparent text-[14px] italic text-ink-mute outline-none focus:border-gold"
            />
          ) : pillar.subtitle ? (
            <div className="mb-6 text-[14px] italic text-ink-mute">{pillar.subtitle}</div>
          ) : null}

          {/* each line — the practice, and directly beneath it its "why it pays
              off" reason — is its own separated block, never a paragraph. */}
          <div className="space-y-4">
            {pillar.items.map((it) => (
              <div key={it.id} className="rounded-xl border border-line bg-card p-4">
                {editing ? (
                  <>
                    <textarea
                      defaultValue={it.practice}
                      rows={2}
                      placeholder="The practice"
                      onBlur={(e) => {
                        if (e.target.value !== it.practice)
                          void updateItem({ pillarId: pillar.id, itemId: it.id, practice: e.target.value });
                      }}
                      className={`${FIELD} resize-none text-[15px] leading-relaxed text-ink`}
                    />
                    <textarea
                      defaultValue={it.why}
                      rows={2}
                      placeholder="Why it pays off"
                      onBlur={(e) => {
                        if (e.target.value !== it.why)
                          void updateItem({ pillarId: pillar.id, itemId: it.id, why: e.target.value });
                      }}
                      className={`${FIELD} mt-2 resize-none text-[13px] italic leading-relaxed text-ink-soft`}
                    />
                    <button
                      onClick={() => removeItem({ pillarId: pillar.id, itemId: it.id })}
                      className="mt-2.5 inline-flex items-center gap-1 text-[12px] text-ink-mute transition hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" /> Remove this line
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-[15px] leading-relaxed text-ink">{it.practice}</div>
                    {it.why && (
                      <div className="mt-2.5 border-t border-dashed border-line pt-2.5 text-[13px] italic leading-relaxed text-ink-soft">
                        <span className="not-italic text-ink-mute">Why it pays off — </span>
                        {it.why}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {editing && (
            <button
              onClick={() => addItem({ pillarId: pillar.id, practice: "New practice", why: "" })}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[13px] text-ink-soft transition hover:border-gold"
            >
              <Plus className="h-3.5 w-3.5" /> Add a line
            </button>
          )}
        </div>
      ))}

      {editing && (
        <button
          onClick={() => addPillar({ name: "New pillar", subtitle: "" })}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold px-4 py-2 text-[13px] text-[#8A6A2E] transition hover:bg-gold/5"
        >
          <Plus className="h-4 w-4" /> Add a pillar
        </button>
      )}
    </ImmersiveShell>
  );
}
