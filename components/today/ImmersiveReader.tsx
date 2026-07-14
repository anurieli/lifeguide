"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { DailyRead } from "@/components/today/DailyRead";

// ============================================================================
// The immersive reader for "read" ritual steps: a full-screen in-page overlay
// (ADR 0013 — an overlay with natural inner scroll, not scroll-pinning, so
// mobile Safari behaves). The page behind holds still; the words scroll inside;
// reaching the end marks the step read with a subtle confirmation and releases.
// A visible close affordance means it is never a trap: closing early neither
// marks nor blocks anything.
// ============================================================================

export function ImmersiveReader({
  title,
  content,
  onFinished,
  onClose,
}: {
  title: string;
  content: string;
  /** Reached the end: mark the step read. Fired once. */
  onFinished: () => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const firedRef = useRef(false);

  const finish = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    setDone(true);
    onFinished();
    // A beat for the confirmation to land, then release the page.
    setTimeout(onClose, 1100);
  }, [onFinished, onClose]);

  // The page behind holds still while the reader is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Content shorter than the viewport has no end to scroll to: it counts as
  // read after a considered pause.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 4) {
      const t = setTimeout(finish, 2600);
      return () => clearTimeout(t);
    }
  }, [finish]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || firedRef.current) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) finish();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-paper flex flex-col" role="dialog" aria-modal="true">
      {/* header: always-visible exit, never a scroll trap */}
      <div className="flex items-center justify-between px-5 py-4 md:px-8 border-b border-line bg-paper/95">
        <div className="text-[11px] tracking-[0.16em] uppercase text-ink-mute">{title}</div>
        <button
          onClick={onClose}
          aria-label="Close the reader"
          className="p-2 -m-1 text-ink-mute hover:text-ink transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* the words */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="max-w-[560px] mx-auto px-6 py-10 md:py-14 text-[17px]">
          <DailyRead content={content} />
          <div className="h-16" />
        </div>
      </div>

      {/* the release */}
      {done && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-ink text-white rounded-full px-5 py-2.5 text-sm flex items-center gap-2 shadow-lg">
          <Check className="w-4 h-4" strokeWidth={2.5} /> Read
        </div>
      )}
    </div>
  );
}
