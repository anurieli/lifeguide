"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, ImagePlus, Loader2, Mic, Send, Square } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import { currentDevice, formatElapsed } from "@/components/thoughts/utils";

const MIN_RECORDING_MS = 1000;

/**
 * The living entry: the session's captures rendered as one flowing document
 * (spoken passages, typed text, photos, in order), with a pinned strip at the
 * bottom to keep adding to it. Leaving an entry that has no content deletes it.
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
  const deleteIfEmpty = useMutation(api.sessions.deleteIfEmpty);
  const uploadBlob = useBlobUpload();
  const recorder = useAudioRecorder();

  const [text, setText] = useState("");
  const [doingDraft, setDoingDraft] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No husks: leaving an entry that never got content removes it. This runs on the
  // explicit back action, not effect cleanup — StrictMode's dev double-mount would
  // fire an unmount cleanup immediately and delete a just-opened empty entry.
  // The server re-checks emptiness, so this never races an in-flight append.
  const goBack = () => {
    void deleteIfEmpty({ sessionId });
    onBack();
  };

  const append = useCallback(
    async (args: Omit<Parameters<typeof createCapture>[0], "sessionId" | "sourceMeta">) => {
      await createCapture({
        ...args,
        sessionId,
        sourceMeta: JSON.stringify({ device: currentDevice() }),
      });
    },
    [createCapture, sessionId],
  );

  const sendText = () => {
    const trimmed = text.trim();
    if (!trimmed || uploading) return;
    setText("");
    void append({ source: "paste", rawType: "text", rawText: trimmed }).catch(() =>
      // A thought must never be silently lost: put it back in the box.
      setText(trimmed),
    );
  };

  const micTap = async () => {
    if (recorder.recording) {
      const result = await recorder.stop();
      if (!result || result.durationMs < MIN_RECORDING_MS) return;
      setUploading(true);
      try {
        const rawFileId = await uploadBlob(result.blob, result.mimeType);
        await append({ source: "audio", rawType: "audio", rawFileId });
      } catch {
        // Swallow: matches the stream composer; the take could not be saved.
      } finally {
        setUploading(false);
      }
    } else {
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

  if (doc === undefined) {
    return <p className="text-center text-[13px] text-ink-mute py-10">Loading…</p>;
  }
  if (doc === null) {
    return (
      <div className="text-center py-16">
        <p className="text-[14px] text-ink-mute">This entry is gone.</p>
        <button type="button" onClick={goBack} className="mt-3 text-[13px] text-gold">
          Back to sessions
        </button>
      </div>
    );
  }

  const { session, captures } = doc;
  const started = new Date(session.startedAt);

  return (
    <div className="h-full flex flex-col">
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

      <div className="flex-1 overflow-y-auto px-5 py-5 md:px-8">
        <div className="max-w-[680px] mx-auto flex flex-col gap-5">
          {captures.length === 0 && (
            <p className="text-[13.5px] text-ink-mute text-center py-8">
              An empty page. Speak or write below.
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
        </div>
      </div>

      <div className="border-t border-line px-5 py-3.5 md:px-8 bg-paper">
        <div className="max-w-[680px] mx-auto flex items-end gap-2">
          {recorder.recording ? (
            <div className="flex-1 flex items-center justify-center gap-4 py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
              <span className="text-[14px] tabular-nums text-ink-soft">
                {formatElapsed(recorder.elapsedMs)}
              </span>
              <button
                type="button"
                onClick={() => void micTap()}
                disabled={uploading}
                aria-label="Stop recording"
                className="w-12 h-12 rounded-full bg-gold/15 border-[1.5px] border-gold text-gold flex items-center justify-center disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Square className="w-4 h-4" fill="currentColor" strokeWidth={0} />
                )}
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    sendText();
                  }
                }}
                rows={1}
                placeholder="Write here…"
                className="flex-1 resize-none bg-card border border-line-2 rounded-xl px-3.5 py-2.5 text-[14.5px] text-ink placeholder:text-ink-mute outline-none focus:border-gold max-h-40"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Add a photo"
                className="w-10 h-10 rounded-full bg-card border border-line-2 text-ink-mute hover:text-gold flex items-center justify-center disabled:opacity-40"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void micTap()}
                disabled={uploading || !recorder.supported}
                aria-label="Continue with voice"
                className="w-12 h-12 rounded-full bg-card border border-line-2 text-ink-mute hover:text-gold flex items-center justify-center disabled:opacity-40"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={sendText}
                disabled={!text.trim() || uploading}
                aria-label="Send"
                className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-30"
              >
                <Send className="w-4 h-4" />
              </button>
            </>
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
    </div>
  );
}
