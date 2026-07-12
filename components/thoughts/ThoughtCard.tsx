"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import {
  AudioLines,
  ChevronDown,
  File as FileIcon,
  Image as ImageIcon,
  Link2,
  Trash2,
  Type,
} from "lucide-react";
import { formatRelativeTime, parseMeta } from "./utils";

export type ThoughtCapture = Doc<"captures"> & { fileUrl: string | null };

const ARRIVAL_ICON: Record<Doc<"captures">["rawType"], typeof Type> = {
  audio: AudioLines,
  image: ImageIcon,
  link: Link2,
  video_link: Link2,
  file: FileIcon,
  text: Type,
  quote: Type,
};

const PROCESSING_LABEL: Record<string, string> = {
  audio: "Listening back…",
  link: "Reading the link…",
  video_link: "Reading the link…",
  image: "Looking at the image…",
  file: "Reading the file…",
};

export function ThoughtCard({ capture }: { capture: ThoughtCapture }) {
  const [showHeard, setShowHeard] = useState(false);
  const reprocess = useMutation(api.captures.reprocess);
  const softDelete = useMutation(api.captures.softDelete);

  const ArrivalIcon = ARRIVAL_ICON[capture.rawType] ?? Type;
  const status = capture.extraction?.status;
  const meta = parseMeta(capture.extraction?.meta);
  const hasHeard =
    !!capture.extractedText && capture.extractedText.trim() !== (capture.rawText ?? "").trim();
  const thinking = !capture.distilled && (status === "done" || status === "skipped");

  return (
    <div className="group relative bg-card border border-line rounded-2xl px-4 py-3.5 md:px-5 md:py-4">
      <button
        type="button"
        onClick={() => void softDelete({ captureId: capture._id })}
        aria-label="Delete thought"
        title="Delete"
        className="absolute top-3 right-3 w-7 h-7 rounded-full grid place-items-center text-ink-mute/0 group-hover:text-ink-mute hover:!text-ink hover:bg-paper-2 transition opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-[15px] h-[15px]" />
      </button>

      {/* header */}
      <div className="flex items-center gap-1.5 text-[11.5px] text-ink-mute mb-2.5 pr-8">
        <ArrivalIcon className="w-3.5 h-3.5" strokeWidth={2} />
        <span>{formatRelativeTime(capture.createdAt)}</span>
      </div>

      {/* raw layer */}
      <RawLayer capture={capture} meta={meta} />

      {/* processing layer */}
      {status === "pending" && (
        <p className="mt-2.5 text-[13px] text-ink-mute animate-pulse">
          {PROCESSING_LABEL[capture.rawType] ?? "Taking a look…"}
        </p>
      )}
      {status === "error" && (
        <div className="mt-2.5 flex items-center gap-2.5 text-[13px]">
          <span className="text-ink-mute">
            {capture.extraction?.error ?? "Something went wrong reading this."}
          </span>
          <button
            type="button"
            onClick={() => void reprocess({ captureId: capture._id })}
            className="text-gold hover:underline"
          >
            Try again
          </button>
        </div>
      )}
      {hasHeard && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setShowHeard((v) => !v)}
            className="flex items-center gap-1 text-[12px] text-ink-mute hover:text-ink-soft transition"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showHeard ? "rotate-180" : ""}`}
            />
            What I heard
          </button>
          {showHeard && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-mute whitespace-pre-wrap">
              {capture.extractedText}
            </p>
          )}
        </div>
      )}

      {/* receipt layer */}
      {capture.distilled && (
        <div className="mt-3 rounded-xl border border-gold/30 bg-gold/[0.06] px-3.5 py-3">
          <p className="text-[10.5px] uppercase tracking-[0.12em] text-gold/80 mb-1.5">
            What I took from it
          </p>
          <p className="text-[14px] font-medium text-ink mb-1">{capture.distilled.title}</p>
          <p className="text-[13px] leading-relaxed text-ink-soft mb-2">
            {capture.distilled.essence}
          </p>
          {capture.distilled.pillars.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {capture.distilled.pillars.map((p) => (
                <span
                  key={p}
                  className="text-[11px] text-ink-mute bg-paper-2 rounded-full px-2 py-0.5"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {thinking && (
        <p className="mt-2.5 text-[13px] text-ink-mute animate-pulse">Thinking…</p>
      )}
    </div>
  );
}

function RawLayer({
  capture,
  meta,
}: {
  capture: ThoughtCapture;
  meta: Record<string, unknown> | null;
}) {
  switch (capture.rawType) {
    case "audio":
      return capture.fileUrl ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls preload="metadata" src={capture.fileUrl} className="w-full h-10" />
      ) : (
        <p className="text-[13px] text-ink-mute">Processing audio…</p>
      );
    case "image":
      return capture.fileUrl ? (
        <img
          src={capture.fileUrl}
          alt=""
          onClick={() => window.open(capture.fileUrl!, "_blank", "noopener,noreferrer")}
          className="max-h-[240px] rounded-lg object-cover cursor-pointer"
        />
      ) : null;
    case "link":
    case "video_link": {
      const title = (meta?.title as string | undefined) ?? capture.rawUrl ?? "";
      let domain = "";
      try {
        domain = capture.rawUrl ? new URL(capture.rawUrl).hostname.replace(/^www\./, "") : "";
      } catch {
        /* leave blank */
      }
      return (
        <a
          href={capture.rawUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block group/link"
        >
          <p className="text-[14px] text-ink group-hover/link:text-gold transition leading-snug">
            {title}
          </p>
          {domain && <p className="text-[12px] text-ink-mute mt-0.5">{domain}</p>}
        </a>
      );
    }
    case "file":
      return capture.fileUrl ? (
        <a
          href={capture.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[14px] text-ink hover:text-gold transition"
        >
          <FileIcon className="w-4 h-4" strokeWidth={2} />
          View file
        </a>
      ) : (
        <p className="text-[13px] text-ink-mute">Processing file…</p>
      );
    case "quote":
    case "text":
    default:
      return (
        <p className="text-[14.5px] leading-relaxed text-ink whitespace-pre-wrap">
          {capture.rawText}
        </p>
      );
  }
}
