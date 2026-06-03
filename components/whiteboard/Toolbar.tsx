"use client";

import { useRef } from "react";
import { Type, Quote, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

export function Toolbar({
  onAddNode,
  onUpload,
  onAddLink,
}: {
  onAddNode: (t: "text" | "quote") => void;
  onUpload: (file: File) => void;
  onAddLink: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const btn = "px-3 py-1.5 rounded-full hover:bg-paper-2 text-sm text-ink flex items-center gap-1.5 transition";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-line rounded-full px-2 py-2 flex items-center gap-1 shadow-md z-20">
      <button onClick={() => onAddNode("text")} className={btn}>
        <Type className="w-4 h-4" /> Text
      </button>
      <button onClick={() => onAddNode("quote")} className={btn}>
        <Quote className="w-4 h-4" /> Quote
      </button>
      <div className="w-px h-5 bg-line mx-1" />
      <button onClick={() => fileRef.current?.click()} className={btn}>
        <ImageIcon className="w-4 h-4" /> Image
      </button>
      <button
        onClick={() => {
          const u = window.prompt("Paste a link (article, video, post)…");
          if (u && u.trim()) onAddLink(u.trim());
        }}
        className={btn}
      >
        <LinkIcon className="w-4 h-4" /> Link
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
