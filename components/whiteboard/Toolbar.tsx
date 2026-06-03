"use client";

import { Type, Quote } from "lucide-react";

export function Toolbar({ onAdd }: { onAdd: (t: "text" | "quote") => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-line rounded-full px-2 py-2 flex gap-1 shadow-md z-20">
      <button
        onClick={() => onAdd("text")}
        className="px-3 py-1.5 rounded-full hover:bg-paper-2 text-sm text-ink flex items-center gap-1.5 transition"
      >
        <Type className="w-4 h-4" /> Text
      </button>
      <button
        onClick={() => onAdd("quote")}
        className="px-3 py-1.5 rounded-full hover:bg-paper-2 text-sm text-ink flex items-center gap-1.5 transition"
      >
        <Quote className="w-4 h-4" /> Quote
      </button>
    </div>
  );
}
