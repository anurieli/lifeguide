"use client";

import { useRef } from "react";

// How far the pointer must travel upward, while pressed, to commit the gesture.
// Kept short: on a phone the ➕ sits near the home-indicator zone, and iOS can
// cancel the pointer stream if the finger travels far — commit early instead.
const SWIPE_UP_PX = 24;

/**
 * Press-and-swipe-up on a button. onSwipeUp fires the moment the pointer has
 * moved SWIPE_UP_PX upward while still down — not on release; the whole point
 * is acting mid-gesture (arming the mic) — and a plain press stays an ordinary
 * click. The click browsers synthesize after the swipe's release is suppressed.
 * Spread the returned handlers onto the button and keep its onClick for the tap.
 */
export function usePressSwipeUp(onSwipeUp: () => void) {
  const startRef = useRef<{ id: number; y: number } | null>(null);
  const firedRef = useRef(false);

  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      startRef.current = { id: e.pointerId, y: e.clientY };
      firedRef.current = false;
      // Keep receiving moves even when the finger drifts off the button.
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const start = startRef.current;
      if (!start || start.id !== e.pointerId || firedRef.current) return;
      if (start.y - e.clientY >= SWIPE_UP_PX) {
        firedRef.current = true;
        onSwipeUp();
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (startRef.current?.id === e.pointerId) startRef.current = null;
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      if (startRef.current?.id === e.pointerId) startRef.current = null;
    },
    onClickCapture: (e: React.MouseEvent<HTMLElement>) => {
      // A committed swipe must not double as a tap.
      if (firedRef.current) {
        firedRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
    // Without this a touch swipe scrolls the page instead of feeding pointermove.
    style: { touchAction: "none" } as const,
  };
}
