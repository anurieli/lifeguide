"use client";

// ============================================================================
// WHAT'S NEW FEED — the bottom-of-shell feed of shipped features.
// ============================================================================
// A small pill docked near the bottom of the shell, shown only while unseen
// entries exist (convex/whatsNew.ts `feed`). Expands into a short list; clicking
// an entry is the ONLY way it leaves the feed — it navigates to the entry's linked
// view and marks it seen for this user in the same action (no generic X-dismiss).
// See docs/product/features/whats-new.md.
// ============================================================================

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { View } from "@/components/shell/Rail";

export function WhatsNewFeed({ onNavigate }: { onNavigate: (v: View) => void }) {
  const entries = useQuery(api.whatsNew.feed);
  const markSeen = useMutation(api.whatsNew.markSeen);
  const [open, setOpen] = useState(false);

  if (!entries || entries.length === 0) return null;

  // The click-through IS the acknowledgment: navigate, then mark seen. Order
  // doesn't matter for correctness (both fire), but nav first keeps the tap feeling
  // instant even while markSeen is still in flight.
  const openEntry = (id: Id<"whatsNew">, view: View) => {
    onNavigate(view);
    void markSeen({ id });
    setOpen(false);
  };

  return (
    <div className="fixed z-[55] bottom-[76px] left-3 md:bottom-4 md:left-[100px]">
      {open && (
        <div className="mb-2 w-[300px] max-w-[calc(100vw-24px)] bg-card border border-line rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
            <div className="text-[11px] tracking-[0.14em] uppercase text-ink-mute">
              What&rsquo;s new
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-ink-mute hover:text-ink transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-[280px] overflow-y-auto divide-y divide-line">
            {entries.map((e) => (
              <button
                key={e._id}
                type="button"
                onClick={() => openEntry(e._id, e.view as View)}
                className="w-full text-left px-3.5 py-3 hover:bg-paper-2 transition flex items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-ink">{e.title}</div>
                  <div className="text-[12.5px] text-ink-mute mt-0.5 line-clamp-2">{e.body}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-mute flex-shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="What's new"
        className="flex items-center gap-1.5 bg-ink text-white rounded-full pl-2.5 pr-3 py-2 shadow-lg hover:opacity-90 active:scale-95 transition"
      >
        <Sparkles className="w-3.5 h-3.5 text-gold" />
        <span className="text-[12px] font-medium">What&rsquo;s new</span>
        <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gold text-ink text-[10px] font-bold flex items-center justify-center">
          {entries.length}
        </span>
      </button>
    </div>
  );
}
