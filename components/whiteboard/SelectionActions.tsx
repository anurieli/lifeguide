"use client";

import { Trash2, X } from "lucide-react";

// Floating bar shown whenever the board selection is non-empty. Surfaces the
// count and mass actions (delete). Sits top-center, above the board.
export function SelectionActions({
  count,
  onDelete,
  onClear,
}: {
  count: number;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed top-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full bg-ink text-paper pl-4 pr-1.5 py-1.5 shadow-lg"
    >
      <span className="text-xs font-medium tabular-nums">
        {count} selected
      </span>
      <button
        onClick={onDelete}
        title="Delete selected (⌫)"
        className="ml-1 flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-red-500/80 transition px-3 py-1 text-xs"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      <button
        onClick={onClear}
        title="Clear selection (Esc)"
        className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-white/10 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
