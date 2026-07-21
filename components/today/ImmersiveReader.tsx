"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { DailyRead } from "@/components/today/DailyRead";

// ============================================================================
// The immersive reader shell: a full-screen in-page overlay (ADR 0013 — an
// overlay with natural inner scroll, not scroll-pinning, so mobile Safari
// behaves). The page behind holds still; the words scroll inside.
//
// Reaching the end marks the content read (a "Read ✓" confirmation) and reveals
// a pinned, explicit red release button — it does NOT auto-close (ADR 0013,
// revised 2026-07-20: the original design auto-closed 1.1s after the bottom was
// reached; Ariel wants the reader to stay open until he explicitly says he's
// done). Only clicking that button, or the always-visible top X, closes it.
// Closing via the top X early neither marks nor blocks anything — "Read again"
// is always offered elsewhere.
//
// `ImmersiveShell` is the reusable piece (overlay, scroll detection, the
// top-X / bottom-red-button chrome); `ImmersiveReader` wraps it with the
// markdown `DailyRead` renderer for ritual "read" steps. The Blueprint's own
// immersive view (components/settings/BlueprintImmersive.tsx) reuses the same
// shell with structured pillar/item content instead.
// ============================================================================

export function ImmersiveShell({
  title,
  onFinished,
  onClose,
  maxWidthClassName = "max-w-[560px]",
  finishLabel = "Done",
  children,
}: {
  title: string;
  /** Reached the end: mark the content read. Fired once. */
  onFinished: () => void;
  onClose: () => void;
  maxWidthClassName?: string;
  finishLabel?: string;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const firedRef = useRef(false);

  const finish = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    setDone(true);
    onFinished();
    // No auto-close: the person releases the reader themselves (below).
  }, [onFinished]);

  // The page behind holds still while the reader is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Content shorter than the viewport has no end to scroll to: it counts as
  // read after a considered pause. Still requires the explicit button to close.
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

      {/* the content */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className={`${maxWidthClassName} mx-auto px-6 py-10 md:py-14 text-[17px]`}>
          {children}
          <div className="h-24" />
        </div>
      </div>

      {/* the explicit release — the ONLY thing that closes the reader once the
          end is reached. Pinned at the bottom, never auto-triggered. */}
      {done && (
        <div className="flex items-center justify-center border-t border-line bg-paper/95 px-5 py-4 md:px-8">
          <button
            onClick={onClose}
            className="rounded-full bg-ink px-8 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {finishLabel}
          </button>
        </div>
      )}
    </div>
  );
}

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
  return (
    <ImmersiveShell title={title} onFinished={onFinished} onClose={onClose}>
      <DailyRead content={content} />
    </ImmersiveShell>
  );
}
