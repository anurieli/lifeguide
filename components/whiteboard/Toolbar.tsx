"use client";

import { Plus } from "lucide-react";

// One element to add anything: creates a blank card you can type into, paste an image into,
// or drop a link into. The card decides what it is from what you put in it.
export function Toolbar({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed bottom-7 left-1/2 -translate-x-1/2 z-20"
    >
      <button
        onClick={onAdd}
        className="bg-ink text-paper rounded-full pl-4 pr-5 py-3 flex items-center gap-2 shadow-lg hover:bg-[#2a2f3a] transition text-sm font-medium"
      >
        <Plus className="w-[18px] h-[18px]" /> Add anything
      </button>
    </div>
  );
}
