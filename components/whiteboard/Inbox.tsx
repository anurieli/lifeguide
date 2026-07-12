"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CaptureDoc } from "@/lib/types";
import { Sparkles, Plus, X, ChevronDown, ChevronUp } from "lucide-react";

const PEEK_LIMIT = 5;

export function Inbox({
  captures,
  onPlace,
  onDismiss,
}: {
  captures: CaptureDoc[];
  onPlace: (c: CaptureDoc) => void;
  onDismiss: (c: CaptureDoc) => void;
}) {
  const [open, setOpen] = useState(false);
  const [peeking, setPeeking] = useState(false);

  if (captures.length === 0) return null;

  if (!open) {
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onMouseEnter={() => setPeeking(true)}
        onMouseLeave={() => setPeeking(false)}
        className="fixed top-5 right-5 z-20 flex flex-col items-end"
      >
        <button
          onClick={() => {
            setPeeking(false);
            setOpen(true);
          }}
          className="flex items-center gap-2 bg-card/95 backdrop-blur border border-line rounded-full shadow-lg px-4 py-2 text-sm font-medium text-ink hover:shadow-xl transition-shadow"
        >
          <Sparkles className="w-4 h-4 text-gold" />
          Inbox
          <span className="text-ink-mute font-normal">
            · {captures.length} {captures.length === 1 ? "idea" : "ideas"} to place
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-ink-mute" />
        </button>

        {peeking && (
          <div className="mt-2 w-72 bg-card/95 backdrop-blur border border-line rounded-2xl shadow-lg p-2 pointer-events-none">
            {captures.slice(0, PEEK_LIMIT).map((c) => (
              <PeekRow key={c._id} capture={c} />
            ))}
            {captures.length > PEEK_LIMIT && (
              <div className="px-2 py-1 text-[11px] text-ink-mute">
                +{captures.length - PEEK_LIMIT} more
              </div>
            )}
            <div className="mt-1 pt-1.5 px-2 border-t border-line text-[11px] text-ink-mute">
              Click to open and place
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onMouseLeave={() => setOpen(false)}
      className="fixed top-5 right-5 w-80 max-h-[80vh] overflow-y-auto z-20 bg-card/95 backdrop-blur border border-line rounded-2xl shadow-lg p-3"
    >
      <button
        onClick={() => setOpen(false)}
        className="w-full flex items-center gap-2 px-1 pb-2 text-sm font-medium text-ink"
        title="Collapse"
      >
        <Sparkles className="w-4 h-4 text-gold" />
        Inbox
        <span className="text-ink-mute font-normal">· {captures.length} to place</span>
        <ChevronUp className="w-3.5 h-3.5 text-ink-mute ml-auto" />
      </button>
      <div className="flex flex-col gap-2">
        {captures.map((c) => (
          <CaptureRow key={c._id} capture={c} onPlace={() => onPlace(c)} onDismiss={() => onDismiss(c)} />
        ))}
      </div>
    </div>
  );
}

function PeekRow({ capture }: { capture: CaptureDoc }) {
  const label =
    capture.distilled?.title ??
    (capture.rawType === "image" ? "Image" : (capture.rawText ?? capture.rawUrl ?? "Capture"));
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
      <span className="text-xs text-ink truncate">{label}</span>
    </div>
  );
}

function CaptureRow({
  capture,
  onPlace,
  onDismiss,
}: {
  capture: CaptureDoc;
  onPlace: () => void;
  onDismiss: () => void;
}) {
  const fileUrl = useQuery(
    api.files.getUrl,
    capture.rawFileId ? { fileId: capture.rawFileId } : "skip",
  );
  const d = capture.distilled;
  const pending = !d && capture.rawType !== "image";

  return (
    <div className="group relative rounded-xl border border-line bg-paper/60 p-3">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 w-5 h-5 rounded-full hover:bg-line text-ink-mute opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
        title="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>

      {capture.rawFileId && fileUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
      )}

      {d ? (
        <>
          <div className="text-sm font-medium text-ink pr-5">{d.title}</div>
          <div className="text-xs text-ink-soft mt-0.5 line-clamp-3">{d.essence}</div>
          {d.pillars.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {d.pillars.map((p) => (
                <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-paper-2 text-ink-mute">
                  {p}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-ink pr-5">
          {capture.rawType === "image" ? (
            <span className="text-ink-soft">Image</span>
          ) : (
            <span className="line-clamp-2">{capture.rawText ?? capture.rawUrl}</span>
          )}
          {pending && (
            <div className="text-[11px] text-ink-mute mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" /> distilling…
            </div>
          )}
        </div>
      )}

      <button
        onClick={onPlace}
        className="mt-2 w-full text-xs bg-ink text-paper rounded-lg py-1.5 flex items-center justify-center gap-1 hover:opacity-90 transition"
      >
        <Plus className="w-3 h-3" /> Place on board
      </button>
    </div>
  );
}
