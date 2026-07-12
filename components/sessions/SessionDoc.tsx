"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, ImagePlus, Loader2, Mic, Square } from "lucide-react";
import { RecordedAudio, useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import { currentDevice, formatElapsed } from "@/components/thoughts/utils";

const MIN_RECORDING_MS = 1000;

/**
 * The living entry: one continuous document. Captures render in the order they
 * were added (spoken passages, typed text, photos); a borderless editor trails
 * the content, so tapping anywhere on the page just starts typing (committed as
 * a text capture on blur). The mic and photo controls float bottom-right; a take
 * records inline while the rest of the page stays usable. Opened via ➕, the
 * document starts recording on arrival. Leaving an entry with no content deletes it.
 */
export function SessionDoc({
  sessionId,
  onBack,
  autoRecord,
  onAutoRecordConsumed,
}: {
  sessionId: Id<"sessions">;
  onBack: () => void;
  autoRecord: boolean;
  onAutoRecordConsumed: () => void;
}) {
  const doc = useQuery(api.sessions.get, { sessionId });
  const createCapture = useMutation(api.captures.create);
  const reprocess = useMutation(api.captures.reprocess);
  const setDoing = useMutation(api.sessions.setDoing);
  const deleteIfEmpty = useMutation(api.sessions.deleteIfEmpty);
  const touchOpened = useMutation(api.sessions.touchOpened);
  const uploadBlob = useBlobUpload();
  const recorder = useAudioRecorder();

  const [text, setText] = useState("");
  const [doingDraft, setDoingDraft] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // A finished take whose save failed stays here, so retry never re-records.
  const [failedTake, setFailedTake] = useState<(RecordedAudio & { startedAt: number }) | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const recordStartedAtRef = useRef(0);

  // Visit metadata: stamp lastOpenedAt whenever the document is opened.
  useEffect(() => {
    void touchOpened({ sessionId });
  }, [touchOpened, sessionId]);

  // The ➕ flow: this document was created to be spoken into, so recording starts
  // on arrival. The ref guards StrictMode's dev double-invoke (refs survive it).
  const autoStartRef = useRef(false);
  useEffect(() => {
    if (!autoRecord || autoStartRef.current) return;
    autoStartRef.current = true;
    onAutoRecordConsumed();
    recordStartedAtRef.current = Date.now();
    void recorder.start();
  }, [autoRecord, onAutoRecordConsumed, recorder.start]); // eslint-disable-line react-hooks/exhaustive-deps

  // No husks: leaving an entry that never got content removes it. This runs on the
  // explicit back action, not effect cleanup — StrictMode's dev double-mount would
  // fire an unmount cleanup immediately and delete a just-opened empty entry.
  // The server re-checks emptiness, so this never races an in-flight append.
  const goBack = () => {
    const trimmed = text.trim();
    if (trimmed) {
      // A typed thought must never be lost: commit it instead of husk-checking.
      setText("");
      void append({ source: "paste", rawType: "text", rawText: trimmed });
    } else {
      void deleteIfEmpty({ sessionId });
    }
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

  // Typing commits on blur: the page itself is the input, no send button.
  const commitText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    if (editorRef.current) editorRef.current.style.height = "auto";
    void append({ source: "paste", rawType: "text", rawText: trimmed }).catch(() =>
      // A thought must never be silently lost: put it back on the page.
      setText(trimmed),
    );
  };

  const saveTake = async (take: RecordedAudio & { startedAt: number }) => {
    setUploading(true);
    try {
      const rawFileId = await uploadBlob(take.blob, take.mimeType);
      await append({
        source: "audio",
        rawType: "audio",
        rawFileId,
        sourceMeta: {
          durationMs: take.durationMs,
          recordingStartedAt: take.startedAt || undefined,
        },
      });
      setFailedTake(null);
    } catch {
      // The audio must never be lost: keep the blob for a retry without re-recording.
      setFailedTake(take);
    } finally {
      setUploading(false);
    }
  };

  const micTap = async () => {
    if (recorder.recording) {
      const result = await recorder.stop();
      if (!result || result.durationMs < MIN_RECORDING_MS) return;
      await saveTake({ ...result, startedAt: recordStartedAtRef.current });
    } else {
      recordStartedAtRef.current = Date.now();
      void recorder.start();
    }
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

  const focusEditor = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) editorRef.current?.focus();
  };

  if (doc === undefined) {
    return <p className="text-center text-[13px] text-ink-mute py-10">Loading…</p>;
  }
  if (doc === null) {
    return (
      <div className="text-center py-16">
        <p className="text-[14px] text-ink-mute">This entry is gone.</p>
        <button type="button" onClick={onBack} className="mt-3 text-[13px] text-gold">
          Back to sessions
        </button>
      </div>
    );
  }

  const { session, captures } = doc;
  const started = new Date(session.startedAt);

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
          <div className="text-[14px] text-ink font-medium truncate">
            {session.title ??
              started.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
          </div>
          <div className="text-[11.5px] text-ink-mute">
            {started.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
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
          {captures.length === 0 && !recorder.recording && !text && (
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
              {c.rawType === "image" && c.fileUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.fileUrl} alt="" className="rounded-xl max-h-80 object-contain" />
              )}
            </div>
          ))}
          {failedTake && !recorder.recording && !uploading && (
            <p className="text-[13px] text-ink-mute">
              That take didn&apos;t save; it&apos;s still here.{" "}
              <button
                type="button"
                onClick={() => void saveTake(failedTake)}
                className="text-gold"
              >
                Try again
              </button>
            </p>
          )}
          {/* A live take renders in-flow, part of the document as it happens. */}
          {recorder.recording && (
            <div className="flex items-center gap-2.5 pointer-events-none select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
              <span className="text-[14px] tabular-nums text-ink-soft">
                {formatElapsed(recorder.elapsedMs)}
              </span>
              <span className="text-[12.5px] text-ink-mute">Listening…</span>
            </div>
          )}
          <textarea
            ref={editorRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onBlur={commitText}
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
        </div>
      </div>

      {/* The controls: floating, out of the document's way. Mic is the primary. */}
      <div className="absolute bottom-5 right-5 md:bottom-8 md:right-8 flex flex-col items-center gap-2.5">
        {recorder.error && !recorder.recording && (
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
        <button
          type="button"
          onClick={() => void micTap()}
          disabled={uploading || !recorder.supported}
          aria-label={recorder.recording ? "Stop recording" : "Record"}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center disabled:opacity-50 active:scale-95 transition ${
            recorder.recording
              ? "bg-gold/15 border-[1.5px] border-gold text-gold"
              : "bg-accent text-white"
          }`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : recorder.recording ? (
            <Square className="w-4 h-4" fill="currentColor" strokeWidth={0} />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
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
