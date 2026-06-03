import { useState, useCallback } from "react";
import { Viewport } from "@/lib/types";

export function useViewport() {
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, scale: 1 });

  const pan = useCallback(
    (dx: number, dy: number) => setVp((v) => ({ ...v, x: v.x + dx, y: v.y + dy })),
    [],
  );

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) =>
      setVp((v) => {
        const scale = Math.max(0.25, Math.min(2.5, v.scale * factor));
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      }),
    [],
  );

  return { vp, pan, zoomAt };
}
