"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BookOpen, Check } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { BlueprintImmersive, type StructuredDoc } from "@/components/settings/BlueprintImmersive";

// ============================================================================
// The Blueprint for Living card: opens the structured conduct doctrine into the
// immersive full-screen view (BlueprintImmersive) — the knowledge-base document
// the morning's "read" step resolves from. Editing there is the single source of
// truth: change a line tonight, and it is what tomorrow morning reads (the
// derived `content` markdown is regenerated server-side on every structured
// edit — see convex/blueprintDoc.ts). The Core (who you are) lives elsewhere;
// this is how the day is lived.
// ============================================================================

export function BlueprintCard() {
  const doc = useQuery(api.blueprintDoc.get, {});
  const items = useQuery(api.rituals.list, {});
  const adopt = useMutation(api.blueprintDoc.adopt);
  const adoptRead = useMutation(api.rituals.adoptBlueprintRead);
  const [open, setOpen] = useState(false);

  const inMorning = (items ?? []).some(
    (i) => i.kind === "read" && i.source === "blueprint" && i.ritual === "morning",
  );

  const structured =
    doc && doc.header && doc.pillars ? (doc as StructuredDoc) : null;

  return (
    <div className="bg-card border border-line rounded-2xl px-5 mb-[18px]">
      <div className="text-[11px] tracking-[0.16em] uppercase text-ink-mute pt-3.5 pb-0.5">
        The Blueprint
      </div>
      <div className="flex items-center justify-between py-4 gap-4">
        <div>
          <div className="text-[15px] font-medium text-ink">
            {doc?.title ?? "The Blueprint for Living"}
          </div>
          <div className="text-[13px] text-ink-mute mt-0.5">
            Your conduct doctrine — how a day is lived, pillar by pillar. The morning read draws
            from this, so an edit here changes what you read tomorrow.
          </div>
        </div>
        <button
          onClick={async () => {
            // Unconditional, not `if (!doc)`: `adopt` is idempotent AND carries
            // the v1 → v2 structured upgrade. Gating it on a missing document
            // made the upgrade unreachable for everyone who already had one.
            await adopt({});
            setOpen(true);
          }}
          className="border border-line rounded-full px-4 py-1.5 text-[13px] text-ink-soft hover:border-gold transition flex-shrink-0"
        >
          {doc ? "Open" : "Adopt it"}
        </button>
      </div>

      <div className="pb-4">
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

      {open && structured && (
        <BlueprintImmersive
          doc={structured}
          onFinished={() => {}}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
