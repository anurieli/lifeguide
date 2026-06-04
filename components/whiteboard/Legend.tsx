"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

// Small, dismissable gesture legend. Calm by default — collapsed to a single
// icon button; expands to the full cheat-sheet of board interactions.
const ROWS: { keys: string; desc: string }[] = [
  { keys: "Drag empty", desc: "Box-select cards" },
  { keys: "Click card", desc: "Select one" },
  { keys: "Shift-click", desc: "Add to selection" },
  { keys: "⌘-Shift-click", desc: "Toggle / deselect" },
  { keys: "Drag selected", desc: "Move the whole group" },
  { keys: "⌫ / Delete", desc: "Delete selection" },
  { keys: "Shift-drag", desc: "Pan the board" },
  { keys: "Two-finger", desc: "Pan (trackpad)" },
  { keys: "⌘-scroll", desc: "Zoom in / out" },
];

export function Legend() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOpen(true)}
        title="Board gestures"
        className="fixed bottom-5 left-24 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-card border border-line text-ink-soft shadow hover:bg-paper-2 transition"
      >
        <HelpCircle className="w-[18px] h-[18px]" />
      </button>
    );
  }

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed bottom-5 left-24 z-20 w-56 rounded-xl bg-card border border-line shadow-lg p-3 text-xs"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-ink">Gestures</span>
        <button
          onClick={() => setOpen(false)}
          className="flex items-center justify-center w-5 h-5 rounded-md text-ink-mute hover:text-ink hover:bg-paper-2 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {ROWS.map((r) => (
          <li key={r.keys} className="flex items-center justify-between gap-3">
            <span className="text-ink-mute">{r.desc}</span>
            <kbd className="shrink-0 rounded bg-paper-2 border border-line px-1.5 py-0.5 text-[10px] text-ink-soft">
              {r.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}
