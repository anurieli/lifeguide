"use client";

import { Plus, Layers, Crosshair, Mic } from "lucide-react";

interface ToolbarProps {
  onAdd: () => void;
  onGather: () => void;
  onCenterBoard: () => void;
  onBrainDump: () => void;
  // True while the gather animation / mutation is in flight.
  gathering?: boolean;
}

// Board toolbar: one primary action (add) + navigation aids (gather, center) +
// brain dump (speak to populate the board).
// Stays bottom-center, stops pointer events from falling through to the pan layer.
export function Toolbar({ onAdd, onGather, onCenterBoard, onBrainDump, gathering }: ToolbarProps) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
    >
      {/* Gather — compact all nodes into a no-overlap grid */}
      <button
        onClick={onGather}
        disabled={gathering}
        title="Gather all cards"
        className="bg-card border border-line text-ink-soft rounded-full w-11 h-11 flex items-center justify-center shadow hover:bg-paper-2 transition disabled:opacity-50"
      >
        <Layers className="w-[18px] h-[18px]" />
      </button>

      {/* Primary: add a new card */}
      <button
        onClick={onAdd}
        className="bg-ink text-paper rounded-full pl-4 pr-5 py-3 flex items-center gap-2 shadow-lg hover:bg-[#2a2f3a] transition text-sm font-medium"
      >
        <Plus className="w-[18px] h-[18px]" /> Add anything
      </button>

      {/* Center on the whole board (the average of every card's center) */}
      <button
        onClick={onCenterBoard}
        title="Center the board"
        className="bg-card border border-line text-ink-soft rounded-full w-11 h-11 flex items-center justify-center shadow hover:bg-paper-2 transition"
      >
        <Crosshair className="w-[18px] h-[18px]" />
      </button>

      {/* Brain dump — speak freely and it populates the board */}
      <button
        onClick={onBrainDump}
        title="Brain dump — speak to fill the board"
        className="bg-card border border-line text-ink-soft rounded-full w-11 h-11 flex items-center justify-center shadow hover:bg-paper-2 transition"
      >
        <Mic className="w-[18px] h-[18px]" />
      </button>
    </div>
  );
}
