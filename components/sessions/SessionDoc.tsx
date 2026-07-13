"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, ImagePlus, Mic, Pause, Play, Square, X } from "lucide-react";
import { useRecording } from "./RecordingProvider";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import {
  currentDevice,
  formatElapsed,
  isBareUrl,
  urlRawType,
} from "@/components/thoughts/utils";
import { caretPosition, CaretPos } from "./caret";

/**
 * The living entry: one continuous document. Captures render in the order they
 * were added (spoken passages, typed text, photos); a borderless editor trails
 * the content, so tapping anywhere on the page just starts typing (committed as
 * a text capture on blur). On desktop the mic + photo pair rides the text caret
 * (a horizontal row just right of where you're writing; with no caret it rests
 * below the last content); on the phone the controls float bottom-right. The
 * live take itself belongs to RecordingProvider, so it keeps recording if the
 * person navigates away. Leaving an entry with no content deletes it.
 */
export function SessionDoc({
  sessionId,
  onBack,
}: {
  sessionId: Id<"sessions">;
  onBack: () => void;
}) {
  const doc = useQuery(api.sessions.get, { sessionId });
  const createCapture = useMutation(api.captures.create);
  const reprocess = useMutation(api.captures.reprocess);
  const setDoing = useMutation(api.sessions.setDoing);
  const setTitle = useMutation(api.sessions.setTitle);
  const refreshDigest = useMutation(api.sessions.refreshDigest);
  const deleteIfEmpty = useMutation(api.sessions.deleteIfEmpty);
  const touchOpened = useMutation(api.sessions.touchOpened);
  const uploadBlob = useBlobUpload();
  const rec = useRecording();
  // This entry is the one the live take is landing in.
  const isLive = rec.sessionId === sessionId;
  // Finished takes still saving into this entry: rendered on the page at once,
  // the upload running behind them.
  const pendingHere = rec.pendingTakes.filter((t) => t.sessionId === sessionId);
  const failedHere = rec.failedTakes.some((t) => t.sessionId === sessionId);

  const [text, setText] = useState("");
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [doingDraft, setDoingDraft] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Where the text caret sits inside the trailing editor (desktop: the capture
  // pair rides it). null = no caret; the pair rests below the last content.
  const [caret, setCaret] = useState<CaretPos | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Every visit re-anchors the entry: stamp lastOpenedAt, and refresh the digest
  // so the name + living description cover whatever landed since last time
  // (the server skips when they already do).
  useEffect(() => {
    void touchOpened({ sessionId });
    void refreshDigest({ sessionId });
  }, [touchOpened, refreshDigest, sessionId]);

  // The discard confirmation is a two-tap guard; let it disarm on its own.
  useEffect(() => {
    if (!confirmDiscard) return;
    const t = window.setTimeout(() => setConfirmDiscard(false), 2500);
    return () => window.clearTimeout(t);
  }, [confirmDiscard]);

  // No husks: leaving an entry that never got content removes it. This runs on the
  // explicit back action, not effect cleanup — StrictMode's dev double-mount would
  // fire an unmount cleanup immediately and delete a just-opened empty entry.
  // The server re-checks emptiness, so this never races an in-flight append.
  const goBack = () => {
    const trimmed = text.trim();
    if (trimmed) {
      // A typed thought must never be lost: commit it instead of husk-checking.
      setText("");
      void append(textCaptureArgs(trimmed));
    } else if (!isLive && pendingHere.length === 0 && !failedHere) {
      // A live, saving, or save-failed take is still landing here; not a husk.
      void deleteIfEmpty({ sessionId });
    }
    // Leaving re-updates the name + description over whatever this sitting added
    // (no-ops on an entry that was just husk-deleted or is already covered).
    void refreshDigest({ sessionId });
    onBack();
  };

  const append = useCallback(
    async (
      args: Omit<Parameters<typeof createCapture>[0], "sessionId" | "sourceMeta"> & {
        sourceMeta?: Record<string, unknown>;
      },
    ) => {
      const { sourceMeta, ...rest } = args;
      await createCapture({
        ...rest,
        sessionId,
        sourceMeta: JSON.stringify({ device: currentDevice(), ...sourceMeta }),
      });
    },
    [createCapture, sessionId],
  );

  // A pasted bare URL becomes a link capture (ingest fetches and reads it),
  // exactly as the old Thought Stream composer treated it.
  const textCaptureArgs = (trimmed: string) =>
    isBareUrl(trimmed)
      ? ({ source: "paste", rawType: urlRawType(trimmed), rawUrl: trimmed } as const)
      : ({ source: "paste", rawType: "text", rawText: trimmed } as const);

  // Typing commits on blur: the page itself is the input, no send button.
  const commitText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    if (editorRef.current) editorRef.current.style.height = "auto";
    void append(textCaptureArgs(trimmed)).catch(() =>
      // A thought must never be silently lost: put it back on the page.
      setText(trimmed),
    );
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const rawFileId = await uploadBlob(file, file.type);
      await append({
        source: "upload",
        rawType: file.type.startsWith("image/") ? "image" : "file",
        rawFileId,
      });
    } catch {
      // Swallow: the file picked is still on disk; the user can just try again.
    } finally {
      setUploading(false);
    }
  };

  const discardTake = () => {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    setConfirmDiscard(false);
    void rec.cancel();
  };

  const focusEditor = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) editorRef.current?.focus();
  };

  const trackCaret = () => {
    const ta = editorRef.current;
    if (ta) setCaret(caretPosition(ta));
  };

  if (doc === undefined) {
    return <p className="text-center text-[13px] text-ink-mute py-10">Loading…</p>;
  }
  if (doc === null) {
    return (
      <div className="text-center py-16">
        <p className="text-[14px] text-ink-mute">This entry is gone.</p>
        <button type="button" onClick={onBack} className="mt-3 text-[13px] text-gold">
          Back to thoughts
        </button>
      </div>
    );
  }

  const { session, captures } = doc;
  const started = new Date(session.startedAt);

  // The live-take pill — discard · pause/resume · save — shared by the desktop
  // caret row and the phone's floating corner.
  const takePill = (
    <div className="flex items-center gap-1 bg-card border border-line-2 rounded-full shadow-lg p-1">
      <button
        type="button"
        onClick={discardTake}
        aria-label={confirmDiscard ? "Tap again to discard" : "Discard recording"}
        className={`h-10 rounded-full flex items-center justify-center transition ${
          confirmDiscard
            ? "px-3 text-[12px] font-medium text-red-500"
            : "w-10 text-ink-mute hover:text-red-500"
        }`}
      >
        {confirmDiscard ? "Sure?" : <X className="w-[18px] h-[18px]" />}
      </button>
      <button
        type="button"
        onClick={() => (rec.paused ? rec.resume() : rec.pause())}
        aria-label={rec.paused ? "Resume recording" : "Pause recording"}
        className="w-10 h-10 rounded-full text-ink-soft hover:text-ink flex items-center justify-center"
      >
        {rec.paused ? (
          <Play className="w-[18px] h-[18px]" fill="currentColor" strokeWidth={0} />
        ) : (
          <Pause className="w-[18px] h-[18px]" fill="currentColor" strokeWidth={0} />
        )}
      </button>
      <button
        type="button"
        onClick={() => void rec.finish()}
        aria-label="Save recording"
        className="w-11 h-11 rounded-full bg-gold/15 border-[1.5px] border-gold text-gold flex items-center justify-center active:scale-95 transition"
      >
        <Square className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line md:px-8">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="text-ink-mute hover:text-ink"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          {/* The name is yours: typing here locks it against the AI (titleEditedAt);
              left blank, the digest keeps naming the entry. */}
          <input
            value={titleDraft ?? session.title ?? ""}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              if (titleDraft !== null) {
                void setTitle({ sessionId, title: titleDraft });
                setTitleDraft(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder={started.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })}
            aria-label="Name this thought"
            className="w-full bg-transparent text-[14px] text-ink font-medium outline-none placeholder:text-ink-mute"
          />
          <div className="text-[11.5px] text-ink-mute">
            {started.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
          {/* The living description: re-synthesized as content lands and on every
              open/leave. This line is what an agent traversing entries pulls. */}
          {session.summary && (
            <div className="text-[11.5px] text-ink-mute italic truncate">
              {session.summary}
            </div>
          )}
        </div>
        <input
          value={doingDraft ?? session.doing ?? ""}
          onChange={(e) => setDoingDraft(e.target.value)}
          onBlur={() => {
            if (doingDraft !== null) void setDoing({ sessionId, doing: doingDraft });
          }}
          placeholder="What were you doing?"
          className="w-40 bg-transparent text-right text-[12px] text-ink-soft placeholder:text-ink-mute outline-none"
        />
      </div>

      {/* The page: content in order, then the trailing editor. Clicking empty
          space anywhere lands the caret, like a notes document. */}
      <div
        className="flex-1 overflow-y-auto px-5 py-5 pb-36 md:px-8 cursor-text"
        onClick={focusEditor}
      >
        <div className="max-w-[680px] mx-auto flex flex-col gap-5" onClick={focusEditor}>
          {captures.length === 0 && !isLive && !text && pendingHere.length === 0 && (
            <p className="text-[13.5px] text-ink-mute py-2 pointer-events-none select-none">
              Speak, or tap anywhere and write.
            </p>
          )}
          {captures.map((c) => (
            <div key={c._id}>
              {c.rawType === "audio" && (
                <div>
                  {c.extractedText ? (
                    <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
                      {c.extractedText}
                    </p>
                  ) : c.extraction?.status === "error" ? (
                    <p className="text-[13px] text-ink-mute">
                      Transcription failed, the recording is safe.{" "}
                      <button
                        type="button"
                        onClick={() => void reprocess({ captureId: c._id })}
                        className="text-gold"
                      >
                        Try again
                      </button>
                    </p>
                  ) : (
                    <p className="text-[13px] text-ink-mute animate-pulse">Listening back…</p>
                  )}
                  {c.fileUrl && (
                    <audio
                      controls
                      preload="none"
                      src={c.fileUrl}
                      className="mt-2 h-9 w-full max-w-[320px]"
                    />
                  )}
                </div>
              )}
              {(c.rawType === "text" || c.rawType === "quote") && (
                <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
                  {c.rawText}
                </p>
              )}
              {(c.rawType === "link" || c.rawType === "video_link") && c.rawUrl && (
                <a
                  href={c.rawUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[14px] text-gold underline underline-offset-2 break-all"
                >
                  {c.rawUrl}
                </a>
              )}
              {c.rawType === "image" && c.fileUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.fileUrl} alt="" className="rounded-xl max-h-80 object-contain" />
              )}
            </div>
          ))}
          {/* Takes saving right now: on the page the instant recording stops,
              upload + transcription running behind them. The real capture row
              replaces this the moment the server has it. */}
          {pendingHere.map((t) => (
            <div
              key={t.startedAt}
              className="flex items-center gap-2.5 pointer-events-none select-none"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
              <span className="text-[14px] tabular-nums text-ink-soft">
                {formatElapsed(t.durationMs)}
              </span>
              <span className="text-[12.5px] text-ink-mute">Processing…</span>
            </div>
          ))}
          {failedHere && !isLive && (
            <p className="text-[13px] text-ink-mute">
              That take didn&apos;t save; it&apos;s still here.{" "}
              <button
                type="button"
                onClick={() => void rec.retryFailed()}
                className="text-gold"
              >
                Try again
              </button>
            </p>
          )}
          {/* A live take renders in-flow, part of the document as it happens. */}
          {isLive && rec.recording && (
            <div className="flex items-center gap-2.5 pointer-events-none select-none">
              <span
                className={`w-2.5 h-2.5 rounded-full bg-gold ${rec.paused ? "" : "animate-pulse"}`}
              />
              <span className="text-[14px] tabular-nums text-ink-soft">
                {formatElapsed(rec.elapsedMs)}
              </span>
              <span className="text-[12.5px] text-ink-mute">
                {rec.paused ? "Paused" : "Listening…"}
              </span>
            </div>
          )}
          <div className="relative">
            <textarea
              ref={editorRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
                trackCaret();
              }}
              onFocus={trackCaret}
              onSelect={trackCaret}
              onBlur={() => {
                setCaret(null);
                commitText();
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  commitText();
                }
              }}
              rows={2}
              aria-label="Write in this entry"
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none overflow-hidden"
            />
            {/* Desktop: mic + photo ride the caret — a horizontal pair just right
                of where the person is writing, one click from the thought. With no
                caret the pair rests here in flow, below the last content. mousedown
                is swallowed so tapping a button doesn't blur the editor and move
                the row out from under the click. */}
            <div
              className="hidden md:flex items-center gap-2"
              style={
                caret
                  ? {
                      position: "absolute",
                      left: Math.max(
                        0,
                        Math.min(
                          caret.left + 12,
                          (editorRef.current?.clientWidth ?? 680) - 96,
                        ),
                      ),
                      top: caret.top + caret.lineHeight / 2 - 18,
                    }
                  : undefined
              }
              onMouseDown={(e) => e.preventDefault()}
            >
              {isLive && rec.recording ? (
                takePill
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void rec.start(sessionId)}
                    disabled={!rec.supported}
                    aria-label="Record"
                    className="w-9 h-9 rounded-full bg-accent text-white shadow-md flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Add a photo"
                    className="w-9 h-9 rounded-full bg-card border border-line-2 shadow-sm text-ink-mute hover:text-gold flex items-center justify-center disabled:opacity-40"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  {rec.error && !rec.recording && (
                    <span className="text-[11px] text-ink-mute whitespace-nowrap">
                      Mic unavailable — just write.
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Phone: the controls float bottom-right (there's no caret to ride on a
          touch keyboard flow). Idle: photo + mic. Live: the shared slim pill. */}
      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2.5 md:hidden">
        {rec.error && !rec.recording && (
          <span className="text-[11px] text-ink-mute bg-card border border-line rounded-full px-2.5 py-1">
            Mic unavailable. Tap the page and type.
          </span>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Add a photo"
          className="w-11 h-11 rounded-full bg-card border border-line-2 shadow-md text-ink-mute hover:text-gold flex items-center justify-center disabled:opacity-40"
        >
          <ImagePlus className="w-[18px] h-[18px]" />
        </button>
        {isLive && rec.recording ? (
          takePill
        ) : (
          <button
            type="button"
            onClick={() => void rec.start(sessionId)}
            disabled={!rec.supported}
            aria-label="Record"
            className="w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center disabled:opacity-50 active:scale-95 transition"
          >
            <Mic className="w-6 h-6" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e)}
      />
    </div>
  );
}
