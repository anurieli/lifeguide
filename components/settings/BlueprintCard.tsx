"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BookOpen, Check } from "lucide-react";
import { api } from "@/convex/_generated/api";

// ============================================================================
// The Blueprint for Life card: opens, reads, and edits the person's conduct
// doctrine — the knowledge-base document the morning's "read" step resolves
// from. Editing HERE is the single source of truth: save it tonight, and it is
// what tomorrow morning reads. The Core (who you are) lives elsewhere; this is
// how the day is lived.
// ============================================================================

export function BlueprintCard() {
  const doc = useQuery(api.blueprintDoc.get, {});
  const items = useQuery(api.rituals.list, {});
  const adopt = useMutation(api.blueprintDoc.adopt);
  const update = useMutation(api.blueprintDoc.update);
  const adoptRead = useMutation(api.rituals.adoptBlueprintRead);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const inMorning = (items ?? []).some(
    (i) => i.kind === "read" && i.source === "blueprint" && i.ritual === "morning",
  );

  return (
    <div className="bg-card border border-line rounded-2xl px-5 mb-[18px]">
      <div className="text-[11px] tracking-[0.16em] uppercase text-ink-mute pt-3.5 pb-0.5">
        The Blueprint
      </div>
      <div className="flex items-center justify-between py-4 gap-4">
        <div>
          <div className="text-[15px] font-medium text-ink">
            {doc?.title ?? "The Blueprint for Life"}
          </div>
          <div className="text-[13px] text-ink-mute mt-0.5">
            Your conduct doctrine — how a day is lived. The morning read draws from this, so an
            edit here changes what you read tomorrow.
          </div>
        </div>
        <button
          onClick={async () => {
            if (!doc) await adopt({});
            setOpen(!open);
            setDraft(null);
          }}
          className="border border-line rounded-full px-4 py-1.5 text-[13px] text-ink-soft hover:border-gold transition flex-shrink-0"
        >
          {open ? "Close" : doc ? "Open" : "Adopt it"}
        </button>
      </div>

      {open && doc && (
        <div className="pb-5">
          <textarea
            value={draft ?? doc.content}
            onChange={(e) => {
              setDraft(e.target.value);
              setSaved(false);
            }}
            rows={18}
            className="w-full bg-paper border border-line rounded-xl p-4 text-[14px] leading-relaxed text-ink outline-none focus:border-gold transition resize-y font-mono"
          />
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <button
              onClick={async () => {
                if (draft !== null && draft !== doc.content) {
                  await update({ content: draft });
                }
                setSaved(true);
              }}
              disabled={draft === null || draft === doc.content}
              className="bg-ink text-white rounded-xl px-5 py-2 text-sm disabled:opacity-40"
            >
              {saved ? "Saved ✓" : "Save"}
            </button>
            {inMorning ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-mute">
                <Check className="w-3.5 h-3.5" /> Read each morning
              </span>
            ) : (
              <button
                onClick={() => adoptRead({ ritual: "morning" })}
                className="inline-flex items-center gap-1.5 border border-gold rounded-full px-4 py-1.5 text-[13px] text-[#8A6A2E] hover:bg-gold/5 transition"
              >
                <BookOpen className="w-3.5 h-3.5" /> Read it each morning
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
