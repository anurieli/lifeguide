"use client";

import { Rect } from "@/lib/geometry";

// The marquee rubber-band, drawn in screen space: a bright "laser" blue border
// with a faint translucent fill. Rendered only while the user is dragging on
// empty canvas.
export function SelectionLayer({ rect }: { rect: Rect | null }) {
  if (!rect) return null;
  return (
    <div
      className="pointer-events-none fixed z-30 rounded-[2px]"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        border: "1.5px solid #3b82f6",
        background: "rgba(59, 130, 246, 0.12)",
        boxShadow: "0 0 0 1px rgba(59,130,246,0.25), 0 0 12px rgba(59,130,246,0.45)",
      }}
    />
  );
}
