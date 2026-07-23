"use client";

// ============================================================================
// WHAT'S NEW FEED: the bottom-of-shell feed of shipped features.
// ============================================================================
// A small pill docked near the bottom of the shell. It reads `whatsNew.history`
// (every published entry with a per-user `seen` flag) and is shown whenever ANY
// published entry exists, so "See All" stays reachable even after everything is
// cleared. The count badge appears only when there are unread entries.
//
// The panel defaults to the UNREAD list. Clicking an entry is the acknowledgment:
// it navigates to the entry's linked view (and, if the entry targets a component,
// asks the shell to spotlight it), marks it seen for this user, and drops it from
// the unread scroll; the others stay. Two controls sit at the bottom: "See all"
// toggles the full history (seen items shown, dimmed, still revisitable), and
// "Clear all" marks every published entry seen at once. See
// docs/product/features/whats-new.md.
// ============================================================================

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Sparkles, X, ChevronRight, Check } from "lucide-react";
import { View } from "@/components/shell/Rail";
import { resolveTarget } from "./targets";
import type { WhatsNewSpotlightState } from "./WhatsNewSpotlight";

type FeedEntry = FunctionReturnType<typeof api.whatsNew.history>[number];

export function WhatsNewFeed({
  onNavigate,
  onSpotlight,
}: {
  onNavigate: (v: View) => void;
  onSpotlight: (s: WhatsNewSpotlightState | null) => void;
}) {
  const entries = useQuery(api.whatsNew.history);
  const markSeen = useMutation(api.whatsNew.markSeen);
  const clearAll = useMutation(api.whatsNew.clearAll);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // No published history at all → nothing to reach, hide entirely. (Also covers
  // the unauthenticated case: `history` returns [] server-side.)
  if (!entries || entries.length === 0) return null;

  const unread = entries.filter((e) => !e.seen);
  const list = showAll ? entries : unread;

  // Every close resets to the unread default, so reopening the pill (or clicking an
  // entry, which also closes the panel) always starts in unread mode rather than
  // lingering in the full-history "See all" view.
  const closePanel = () => {
    setOpen(false);
    setShowAll(false);
  };

  // The click-through IS the acknowledgment: navigate (to the component's page if
  // the entry targets one, else its own view), mark seen, and, for a targeted
  // entry, hand the shell a spotlight to draw once the component mounts. Marking
  // seen is idempotent, so revisiting an already-seen entry from "See all" is safe.
  const openEntry = (entry: FeedEntry) => {
    const target = resolveTarget(entry.componentTarget);
    onNavigate(target ? target.view : (entry.view as View));
    void markSeen({ id: entry._id });
    closePanel();
    onSpotlight(
      target
        ? { selector: target.selector, placement: target.placement, title: entry.title, body: entry.body }
        : null,
    );
  };

  return (
    <div className="fixed z-[55] bottom-[76px] left-3 md:bottom-4 md:left-[100px]">
      {open && (
        <div className="mb-2 w-[300px] max-w-[calc(100vw-24px)] bg-card border border-line rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
            <div className="text-[11px] tracking-[0.14em] uppercase text-ink-mute">
              {showAll ? "All updates" : "What’s new"}
            </div>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close"
              className="text-ink-mute hover:text-ink transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-[280px] overflow-y-auto divide-y divide-line">
            {list.length === 0 ? (
              <div className="px-3.5 py-6 text-center text-[12.5px] text-ink-mute">
                You&rsquo;re all caught up.
              </div>
            ) : (
              list.map((e) => (
                <button
                  key={e._id}
                  type="button"
                  onClick={() => openEntry(e)}
                  className={`w-full text-left px-3.5 py-3 hover:bg-paper-2 transition flex items-start gap-2 ${
                    e.seen ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium text-ink flex items-center gap-1.5">
                      {e.seen && <Check className="w-3 h-3 text-ink-mute flex-shrink-0" />}
                      <span className="truncate">{e.title}</span>
                    </div>
                    <div className="text-[12.5px] text-ink-mute mt-0.5 line-clamp-2">{e.body}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-mute flex-shrink-0 mt-0.5" />
                </button>
              ))
            )}
          </div>
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-line">
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="text-[12px] font-medium text-ink-soft hover:text-ink transition"
            >
              {showAll ? "Show unread" : "See all"}
            </button>
            <button
              type="button"
              onClick={() => void clearAll({})}
              disabled={unread.length === 0}
              className="text-[12px] font-medium text-ink-mute hover:text-ink transition disabled:opacity-40 disabled:hover:text-ink-mute"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => (open ? closePanel() : setOpen(true))}
        aria-label="What's new"
        className="flex items-center gap-1.5 bg-ink text-white rounded-full pl-2.5 pr-3 py-2 shadow-lg hover:opacity-90 active:scale-95 transition"
      >
        <Sparkles className="w-3.5 h-3.5 text-gold" />
        <span className="text-[12px] font-medium">What&rsquo;s new</span>
        {unread.length > 0 && (
          <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gold text-ink text-[10px] font-bold flex items-center justify-center">
            {unread.length}
          </span>
        )}
      </button>
    </div>
  );
}
