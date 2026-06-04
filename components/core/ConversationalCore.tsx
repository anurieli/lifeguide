"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BLUEPRINT } from "@/lib/blueprint";
import { LayoutGrid, MessageSquare, Sparkles } from "lucide-react";

/**
 * ConversationalCore — the spoken/guided way to fill the Core.
 *
 * SCAFFOLD (ARI-2, Slice 0). This is the structural seam only: it shares the
 * same Core data as the grid and Zen views (reads `core.get`, shows the same
 * answered-count and per-question state) and owns the mode affordances (exit to
 * grid, switch to Zen). The real conversational engine — the voice/chat loop
 * that maps a free-flowing conversation onto the 18 blueprint keys — plugs in
 * where marked below, as a thin surface over the merged `voice-field` work.
 * Until then this renders a calm placeholder so the mode switch is real and the
 * data binding is proven. See Linear ARI-2.
 */
export function ConversationalCore({
  onExit,
  onZen,
}: {
  onExit: () => void;
  onZen: () => void;
}) {
  const stored = useQuery(api.core.get, {});
  const keys = useMemo(
    () => BLUEPRINT.flatMap((s) => s.questions.map((q) => q.key)),
    [],
  );

  // Shared data binding: the same Core answers that grid + Zen read/write.
  const val = (k: string) => stored?.[k] ?? "";
  const doneCount = keys.filter((k) => val(k).trim()).length;
  const loading = stored === undefined;

  return (
    <div className="relative h-full bg-paper overflow-hidden">
      {/* Header — exit + the way back to Zen */}
      <div className="absolute top-0 left-0 right-0 h-[54px] z-30 flex items-center justify-between px-6 bg-card border-b border-line">
        <div className="text-ink font-semibold tracking-tight flex items-center gap-2">
          <span className="text-gold">◆</span> Core
          <span className="text-[12.5px] font-normal text-ink-mute ml-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Conversational
          </span>
        </div>
        <div className="text-[12.5px] text-ink-mute tracking-wide">
          {loading ? " " : `${doneCount} / ${keys.length} answered`}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onZen}
            className="text-[12.5px] text-ink-mute hover:text-ink flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-4 h-4" /> Zen
          </button>
          <button
            onClick={onExit}
            className="text-[12.5px] text-ink-mute hover:text-ink flex items-center gap-1.5 transition"
          >
            <LayoutGrid className="w-4 h-4" /> Grid
          </button>
        </div>
      </div>

      {/* Scene — placeholder until the conversational engine lands */}
      <div className="h-full flex flex-col items-center justify-center px-[9%] text-center">
        <div className="w-[46px] h-[46px] rounded-full border border-line bg-card flex items-center justify-center mb-5">
          <MessageSquare className="w-5 h-5 text-gold" />
        </div>
        <h1
          className="text-[28px] leading-[1.25] text-ink mb-3"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Talk it through
        </h1>
        <p className="text-[15px] text-ink-soft leading-relaxed max-w-[440px]">
          Conversational mode lets you build your Core by talking, not typing — a
          guided back-and-forth that fills the same Blueprint underneath. The
          conversation engine is being wired in next.
        </p>
        <p className="text-[12.5px] text-ink-mute mt-5">
          {/* CONVERSATIONAL ENGINE PLUGS IN HERE (voice-field). It writes the
              same Core answers via api.core.save, keyed by the 18 blueprint
              question keys, so switching to Zen or Grid shows the same data. */}
          Your progress carries across all three modes — {loading ? "…" : `${doneCount} of ${keys.length}`} so far.
        </p>
      </div>
    </div>
  );
}
