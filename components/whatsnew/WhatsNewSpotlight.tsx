"use client";

// ============================================================================
// WHAT'S NEW SPOTLIGHT: a one-step coachmark for a component-targeted entry.
// ============================================================================
// When a What's New entry points at a single component (not just a page), clicking
// it navigates to that page and then this draws a dismissable spotlight around the
// mapped `data-tour` anchor, "like a tiny tutorial." It deliberately REUSES the
// guided tour's geometry primitives (useTourTarget for measurement, isSpotlightable
// + cardPosition + the box-shadow spotlight trick) but has NONE of the tour's step
// controls: no Back/Next, no progress dots, no "Step X of Y", just the copy and a
// single "Got it" dismiss, plus click-outside to close. See
// docs/product/features/whats-new.md and components/whatsnew/targets.ts.
// ============================================================================

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { useTourTarget } from "@/components/tour/useTourTarget";
import { isSpotlightable, cardPosition, CARD_W, PAD } from "@/components/tour/TourCoachmark";
import type { Placement } from "./targets";

export type WhatsNewSpotlightState = {
  selector: string;
  placement: Placement;
  title: string;
  body: string;
};

export function WhatsNewSpotlight({
  selector,
  placement,
  title,
  body,
  onDismiss,
}: WhatsNewSpotlightState & { onDismiss: () => void }) {
  const rect = useTourTarget(selector);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  // Keyboard access without a full focus trap: move focus to the primary dismiss
  // on mount, close on Escape, and restore the previously focused element on
  // unmount. onDismiss changes identity every render (and useTourTarget re-renders
  // on scroll/resize), so it's read through a ref to keep this a mount-once effect
  // that never re-grabs focus. Click-outside and the dialog role are left intact.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dismissRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismissRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, []);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  // Spotlight only a compact, on-screen target; otherwise center the card over a
  // plain dim (the same rule the tour uses, so a full-page anchor never cuts a hole
  // over the whole screen). Either way the card carries the copy and a dismiss.
  const spotlight = rect !== null && isSpotlightable(rect, vw, vh);
  const cardStyle = spotlight
    ? cardPosition(rect!, placement, vw, vh)
    : ({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" } as React.CSSProperties);

  // Click anywhere outside the card dismisses: an escape hatch that can never trap.
  return (
    <div
      className="fixed inset-0 z-[190]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClick={onDismiss}
    >
      {spotlight ? (
        <div
          className="fixed rounded-2xl pointer-events-none transition-all duration-200"
          style={{
            top: rect!.top - PAD,
            left: rect!.left - PAD,
            width: rect!.width + PAD * 2,
            height: rect!.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(20,18,12,0.55)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(20,18,12,0.55)]" />
      )}

      <div
        className="fixed bg-card border border-line rounded-2xl shadow-2xl p-5 flex flex-col gap-3"
        style={{ width: CARD_W, ...cardStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-[0.16em] uppercase text-gold">What&rsquo;s new</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="text-ink-mute hover:text-ink transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <div id={titleId} className="text-[16px] font-semibold text-ink mb-1">{title}</div>
          <p id={bodyId} className="text-[13.5px] text-ink-soft leading-relaxed">{body}</p>
        </div>

        <div className="flex justify-end mt-1">
          <button
            ref={dismissRef}
            type="button"
            onClick={onDismiss}
            className="bg-accent text-white rounded-lg px-3.5 py-1.5 text-[13px] font-medium hover:opacity-90 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
