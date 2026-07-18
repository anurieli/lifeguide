"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// ============================================================================
// The thought map's steering memo (ARI-18 teachable map): plain-language
// guidance the person writes once, saved to `settings.thoughtMapMemo`, and
// folded into every future `thoughtMap` generation's system prompt
// (convex/ai/thoughtMap.ts, via lib/thoughtMap.ts's buildMapSystemPrompt).
// One shared field, used in two places so the memo is findable and editable
// both mid-session and outside one:
//   - the "Teach it" panel in components/sessions/ThoughtMapView.tsx, which
//     wraps this with a combined "Save & remap" action via `actions`
//   - this Settings row (components/settings/Settings.tsx), plain "Save"
// ============================================================================

export function ThoughtMapMemoField({
  rows = 4,
  actions,
}: {
  rows?: number;
  /** Extra buttons rendered next to Save (e.g. session's "Save & remap"). */
  actions?: (ctx: { save: () => Promise<void>; saved: boolean; value: string }) => React.ReactNode;
}) {
  const settings = useQuery(api.settings.get, {});
  const update = useMutation(api.settings.update);
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const value = draft ?? settings?.thoughtMapMemo ?? "";

  const save = async () => {
    await update({ thoughtMapMemo: value });
    setSaved(true);
  };

  return (
    <div>
      <p className="text-[12px] text-ink-mute mb-2 leading-snug">
        Tell the engine how you want your thinking mapped — fewer bigger nodes, what counts as
        the root, what to ignore. It follows this every time.
      </p>
      <textarea
        value={value}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        rows={rows}
        placeholder="e.g. Keep it to 5 nodes or fewer. The root is always the underlying want, not the surface complaint."
        className="w-full bg-paper border border-line rounded-lg p-2.5 text-[13px] leading-relaxed text-ink outline-none focus:border-gold transition resize-y"
      />
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <button
          type="button"
          onClick={() => void save()}
          className="h-8 px-3 rounded-full border border-line-2 text-[12px] text-ink-mute hover:text-gold hover:border-gold transition"
        >
          {saved ? "Saved ✓" : "Save"}
        </button>
        {actions?.({ save, saved, value })}
      </div>
    </div>
  );
}
