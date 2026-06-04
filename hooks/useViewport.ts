import { useState, useCallback, useRef } from "react";
import { Viewport } from "@/lib/types";

// Duration for animated pan/center transitions in milliseconds.
const ANIM_MS = 260;

export function useViewport() {
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, scale: 1 });

  // Stable ref so animation callbacks can read the latest vp without
  // capturing a stale closure.
  const vpRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 });
  const animRef = useRef<number | null>(null);

  // Keep the ref in sync whenever state updates.
  const setVpSync = useCallback((updater: (v: Viewport) => Viewport) => {
    setVp((v) => {
      const next = updater(v);
      vpRef.current = next;
      return next;
    });
  }, []);

  const pan = useCallback(
    (dx: number, dy: number) =>
      setVpSync((v) => ({ ...v, x: v.x + dx, y: v.y + dy })),
    [setVpSync],
  );

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) =>
      setVpSync((v) => {
        const scale = Math.max(0.25, Math.min(2.5, v.scale * factor));
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      }),
    [setVpSync],
  );

  // Animate viewport so that world coordinate (wx, wy) lands at the center of
  // the screen. Cancels any in-progress animation first.
  const panTo = useCallback(
    (wx: number, wy: number, screenW: number, screenH: number) => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);

      const startVp = { ...vpRef.current };
      // Target viewport offset so that world point (wx, wy) sits at screen center.
      const targetX = screenW / 2 - wx * startVp.scale;
      const targetY = screenH / 2 - wy * startVp.scale;
      const startX = startVp.x;
      const startY = startVp.y;
      const t0 = performance.now();

      const step = (now: number) => {
        const raw = (now - t0) / ANIM_MS;
        // Cubic ease-out: t = 1 - (1 - raw)^3
        const t = Math.min(1, 1 - Math.pow(1 - Math.min(raw, 1), 3));
        const x = startX + (targetX - startX) * t;
        const y = startY + (targetY - startY) * t;
        setVpSync((v) => ({ ...v, x, y }));
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          animRef.current = null;
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [setVpSync],
  );

  // Snap viewport to a specific (x, y, scale) triple without animation.
  // Used by the minimap click handler which already knows the target offset.
  const jumpTo = useCallback(
    (x: number, y: number, scale: number) =>
      setVpSync(() => ({ x, y, scale })),
    [setVpSync],
  );

  return { vp, pan, zoomAt, panTo, jumpTo };
}
