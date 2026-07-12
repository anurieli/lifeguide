"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Camera, Mic } from "lucide-react";
import { formatRelativeTime } from "@/components/thoughts/utils";

/** Chronological entries, newest first: date/time, AI title + subtext (or fallback). */
export function SessionsList({ onOpen }: { onOpen: (id: Id<"sessions">) => void }) {
  const rows = useQuery(api.sessions.list, {});
  const deleteIfEmpty = useMutation(api.sessions.deleteIfEmpty);

  // Husk sweep: an empty entry can survive if the person left it without the back
  // action (e.g. switched rail tabs mid-"Type instead"). The server re-checks
  // emptiness before deleting, so this never removes an entry with content.
  useEffect(() => {
    if (!rows) return;
    for (const s of rows) {
      if (s.counts.voice + s.counts.text + s.counts.photo === 0) {
        void deleteIfEmpty({ sessionId: s._id });
      }
    }
  }, [rows, deleteIfEmpty]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[680px] mx-auto px-5 py-6 md:px-8">
        <h1 className="text-[19px] font-semibold text-ink mb-4">Sessions</h1>
        {rows === undefined ? (
          <p className="text-center text-[13px] text-ink-mute py-10">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] text-ink-soft mb-1">No entries yet.</p>
            <p className="text-[13px] text-ink-mute">
              Tap record and talk. Every session lands here, kept forever.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {rows.map((s) => (
              <button
                key={s._id}
                type="button"
                onClick={() => onOpen(s._id)}
                className="text-left bg-card border border-line rounded-2xl px-4 py-3.5 hover:border-gold transition"
              >
                <div className="flex items-center gap-2 text-[11.5px] text-ink-mute mb-1">
                  <span>{formatRelativeTime(s.startedAt)}</span>
                  {s.counts.voice > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Mic className="w-3 h-3" /> {s.counts.voice}
                    </span>
                  )}
                  {s.counts.photo > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Camera className="w-3 h-3" /> {s.counts.photo}
                    </span>
                  )}
                  {s.doing && <span className="truncate">· {s.doing}</span>}
                </div>
                <div className="text-[15px] text-ink font-medium leading-snug">
                  {s.title ?? s.preview}
                </div>
                {s.summary && (
                  <div className="text-[13px] text-ink-soft leading-relaxed mt-0.5">
                    {s.summary}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
