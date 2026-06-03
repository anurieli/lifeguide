"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CaptureDoc } from "@/lib/types";
import { Sparkles, Plus, X } from "lucide-react";

export function Inbox({
  captures,
  onPlace,
  onDismiss,
}: {
  captures: CaptureDoc[];
  onPlace: (c: CaptureDoc) => void;
  onDismiss: (c: CaptureDoc) => void;
}) {
  if (captures.length === 0) return null;
  return (
    <div className="fixed top-5 right-5 w-80 max-h-[80vh] overflow-y-auto z-20 bg-card/95 backdrop-blur border border-line rounded-2xl shadow-lg p-3">
      <div className="flex items-center gap-2 px-1 pb-2 text-sm font-medium text-ink">
        <Sparkles className="w-4 h-4 text-gold" />
        Inbox
        <span className="text-ink-mute font-normal">· {captures.length} to place</span>
      </div>
      <div className="flex flex-col gap-2">
        {captures.map((c) => (
          <CaptureRow key={c._id} capture={c} onPlace={() => onPlace(c)} onDismiss={() => onDismiss(c)} />
        ))}
      </div>
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
