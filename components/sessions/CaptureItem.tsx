"use client";

import { useRef, useState } from "react";
import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChevronDown, FileText, ImageIcon, Link2, Mic, Pause, Play } from "lucide-react";

/**
 * ARI-122: the brain-dump box. Each capture added to a session (free text, a
 * voice recording, a photo) renders as its own itemized card — a one-line
 * preview by default, tapping the card expands it in place. A voice recording
 * carries its own play button so it can be replayed without expanding the card.
 * See docs/product/features/sessions.md ("The entry — itemized captures").
 */
export type CaptureDoc = NonNullable<
  FunctionReturnType<typeof api.sessions.get>
>["captures"][number];

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Audio captures stash their recorded length in sourceMeta JSON (see
// RecordingProvider.tsx / sessions.seedDemo) — not a schema field of its own.
function durationFromSourceMeta(sourceMeta?: string): number | undefined {
  if (!sourceMeta) return undefined;
  try {
    const parsed = JSON.parse(sourceMeta) as { durationMs?: number };
    return typeof parsed.durationMs === "number" ? parsed.durationMs : undefined;
  } catch {
    return undefined;
  }
}

// A play/pause control that replays a capture's stored audio. Stops propagation
// so pressing play never also toggles the item's expand/collapse.
function AudioPlayButton({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else void audio.play();
  };
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause recording" : "Play recording"}
        className="w-7 h-7 shrink-0 rounded-full bg-gold/15 border border-gold/50 text-gold flex items-center justify-center hover:bg-gold/25 active:scale-95 transition"
      >
        {playing ? (
          <Pause className="w-3 h-3" fill="currentColor" strokeWidth={0} />
        ) : (
          <Play className="w-3 h-3 ml-0.5" fill="currentColor" strokeWidth={0} />
        )}
      </button>
      {/* No visual chrome of its own — the button above is the only control. */}
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </>
  );
}

// The collapsed row's one-line summary: the transcript once it lands (or the
// transcription/status message while it doesn't), the text itself, the URL, or
// a plain label for a photo (which gets its own thumbnail alongside instead).
function previewOf(capture: CaptureDoc): string {
  if (capture.rawType === "audio") {
    if (capture.extractedText) return capture.extractedText;
    if (capture.extraction?.status === "error")
      return "Transcription failed — the recording is safe.";
    return "Listening back…";
  }
  if (capture.rawType === "text" || capture.rawType === "quote") return capture.rawText ?? "";
  if (capture.rawType === "link" || capture.rawType === "video_link") return capture.rawUrl ?? "";
  if (capture.rawType === "image") return "Photo";
  return capture.rawType;
}

function LeadingIcon({ capture }: { capture: CaptureDoc }) {
  if (capture.rawType === "image" && capture.fileUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={capture.fileUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" />;
  }
  const cls = "w-3.5 h-3.5 shrink-0 text-ink-mute";
  if (capture.rawType === "audio") return <Mic className={cls} />;
  if (capture.rawType === "image") return <ImageIcon className={cls} />;
  if (capture.rawType === "link" || capture.rawType === "video_link")
    return <Link2 className={cls} />;
  return <FileText className={cls} />;
}

export function CaptureItem({
  capture,
  onRetry,
}: {
  capture: CaptureDoc;
  onRetry: (captureId: Id<"captures">) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = previewOf(capture);
  const duration =
    capture.rawType === "audio" ? durationFromSourceMeta(capture.sourceMeta) : undefined;

  return (
    <div className="rounded-xl border border-line-2 bg-card/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left hover:bg-paper-2/60 transition"
      >
        <LeadingIcon capture={capture} />
        <span className="flex-1 min-w-0 text-[13px] text-ink-soft truncate">
          {preview || "(empty)"}
        </span>
        {duration !== undefined && (
          <span className="text-[11px] tabular-nums text-ink-mute shrink-0">
            {formatDuration(duration)}
          </span>
        )}
        {capture.rawType === "audio" && capture.fileUrl && <AudioPlayButton src={capture.fileUrl} />}
        <span className="text-[10.5px] text-ink-mute shrink-0 tabular-nums">
          {formatTime(capture.createdAt)}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-ink-mute transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0.5 border-t border-line/60">
          {capture.rawType === "audio" &&
            (capture.extractedText ? (
              <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
                {capture.extractedText}
              </p>
            ) : capture.extraction?.status === "error" ? (
              <p className="text-[13px] text-ink-mute">
                Transcription failed, the recording is safe.{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(capture._id);
                  }}
                  className="text-gold"
                >
                  Try again
                </button>
              </p>
            ) : (
              <p className="text-[13px] text-ink-mute animate-pulse">Listening back…</p>
            ))}
          {(capture.rawType === "text" || capture.rawType === "quote") && (
            <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
              {capture.rawText}
            </p>
          )}
          {(capture.rawType === "link" || capture.rawType === "video_link") && capture.rawUrl && (
            <a
              href={capture.rawUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[14px] text-gold underline underline-offset-2 break-all"
            >
              {capture.rawUrl}
            </a>
          )}
          {capture.rawType === "image" && capture.fileUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capture.fileUrl}
              alt=""
              className="rounded-xl max-h-80 object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}
