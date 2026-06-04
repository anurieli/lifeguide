"use client";

import { Type, Sparkles, ImagePlus } from "lucide-react";

type Props = {
  x: number;
  y: number;
  onAddText: () => void;
  onGenerate: () => void;
  onUpload: () => void;
  onClose: () => void;
};

// Right-click menu for empty canvas: add a text card, start an AI image generation,
// or upload an image — each placed where the click landed. A full-screen transparent
// backdrop closes it on any outside press (or a second right-click).
export function CanvasMenu({ x, y, onAddText, onGenerate, onUpload, onClose }: Props) {
  // Keep the menu on-screen if the click was near the right/bottom edge.
  const left = typeof window !== "undefined" ? Math.min(x, window.innerWidth - 210) : x;
  const top = typeof window !== "undefined" ? Math.min(y, window.innerHeight - 140) : y;

  const item = "w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-ink hover:bg-paper-2 transition";
  const icon = "w-4 h-4 text-ink-mute";

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onPointerDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 min-w-[196px] rounded-xl border border-line bg-card shadow-lg py-1 text-sm"
        style={{ left, top }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button className={item} onClick={onAddText}>
          <Type className={icon} /> Add text
        </button>
        <button className={item} onClick={onGenerate}>
          <Sparkles className={icon} /> Generate image with AI
        </button>
        <button className={item} onClick={onUpload}>
          <ImagePlus className={icon} /> Upload image
        </button>
      </div>
    </>
  );
}
