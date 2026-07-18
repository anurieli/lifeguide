"use client";

import { useEffect, useState } from "react";

export type TourRect = { top: number; left: number; width: number; height: number };

function sameRect(a: TourRect | null, b: TourRect | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

// Tracks the bounding box of the element carrying `data-tour="<selector>"`,
// re-measuring on every animation frame while a selector is active. A polling
// loop (rather than ResizeObserver/scroll listeners) is deliberate: the
// Whiteboard canvas moves its content via a CSS transform on pan/zoom, which
// fires neither a resize nor a scroll event, and a step's target can appear a
// render after the shell navigates to its view. The loop only runs while the
// tour has an active step, so the cost is bounded to that window.
//
// A display:none element (e.g. the Coach talk button, hidden below the `md`
// breakpoint) reports a zero-size rect; that's treated as "not found" so the
// caller can fall back to a centered coachmark instead of anchoring to
// nothing.
export function useTourTarget(selector: string | null): TourRect | null {
  const [rect, setRect] = useState<TourRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    let raf = 0;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${selector}"]`);
      const box = el?.getBoundingClientRect();
      const next =
        box && (box.width > 0 || box.height > 0)
          ? { top: box.top, left: box.left, width: box.width, height: box.height }
          : null;
      setRect((prev) => (sameRect(prev, next) ? prev : next));
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [selector]);

  return rect;
}
