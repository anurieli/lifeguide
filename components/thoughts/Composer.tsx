"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ImagePlus, Loader2, Mic, Send, Square } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import { deviceMeta, formatElapsed, isBareUrl, urlRawType } from "./utils";

// Anything shorter than this is almost certainly an accidental tap, not a thought.
const MIN_RECORDING_MS = 1000;

/**
 * The Thought Stream composer: type, paste a link, drop a photo/file, or record a
 * voice note. Every path lands as a `captures.create` row; the reactive stream query
 * (rendered by the parent) shows it the moment it exists and updates as processing
 * fills in.
 */
export function Composer() {
  const createCapture = useMutation(api.captures.create);
  const recorder = useAudioRecorder();
  const uploadBlob = useBlobUpload();

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autosize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);
  useEffect(() => autosize(), [text, autosize]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || uploading) return;
    setText(""); // optimistic: clear immediately, the reactive stream shows the new row
    requestAnimationFrame(() => textareaRef.current?.focus());
    const args = isBareUrl(trimmed)
      ? ({ source: "paste", rawType: urlRawType(trimmed), rawUrl: trimmed } as const)
      : ({ source: "paste", rawType: "text", rawText: trimmed } as const);
    void createCapture({ ...args, sourceMeta: deviceMeta() }).catch(() => {
      // A thought must never be silently lost: put it back in the box.
      setText(trimmed);
    });
  }, [text, uploading, createCapture]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicTap = useCallback(async () => {
    if (recorder.recording) {
      const result = await recorder.stop();
      if (!result || result.durationMs < MIN_RECORDING_MS) return;
      setUploading(true);
      try {
        const rawFileId = await uploadBlob(result.blob, result.mimeType);
        await createCapture({
          source: "audio",
          rawType: "audio",
          rawFileId,
          sourceMeta: deviceMeta(),
        });
      } catch {
        // Swallow: the recording is gone either way; nothing to recover here.
      } finally {
        setUploading(false);
      }
    } else {
      void recorder.start();
    }
  }, [recorder, uploadBlob, createCapture]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setUploading(true);
      try {
        const rawFileId = await uploadBlob(file, file.type);
        await createCapture({
          source: "upload",
          rawType: file.type.startsWith("image/") ? "image" : "file",
          rawFileId,
          sourceMeta: deviceMeta(),
        });
      } catch {
        // Swallow: the file picked is still on disk; the user can just try again.
      } finally {
        setUploading(false);
      }
    },
    [uploadBlob, createCapture],
  );

  return (
    <div className="sticky top-0 z-10 bg-paper/90 backdrop-blur-sm border-b border-line px-5 py-4 md:px-8">
      {recorder.recording ? (
        <div className="flex items-center justify-center gap-5 py-2">
          <div className="flex items-center gap-2.5 text-ink-soft">
            <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
            <span className="text-[14px] tabular-nums">{formatElapsed(recorder.elapsedMs)}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleMicTap()}
            disabled={uploading}
            aria-label="Stop recording"
            className="w-14 h-14 rounded-full bg-gold/15 border-[1.5px] border-gold text-gold flex items-center justify-center transition disabled:opacity-50 flex-shrink-0"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Square className="w-4 h-4" fill="currentColor" strokeWidth={0} />
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="What's on your mind?"
            className="flex-1 overflow-hidden resize-none bg-card border border-line-2 rounded-xl px-3.5 py-3 text-[14.5px] leading-relaxed text-ink placeholder:text-ink-mute outline-none focus:border-gold transition max-h-40"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Attach a photo or file"
            title="Attach a photo or file"
            className="w-11 h-11 rounded-full bg-card border border-line-2 text-ink-mute hover:text-gold hover:border-gold transition disabled:opacity-40 flex items-center justify-center flex-shrink-0"
          >
            {uploading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <ImagePlus className="w-[18px] h-[18px]" />}
          </button>
          <button
            type="button"
            onClick={() => void handleMicTap()}
            disabled={uploading || !recorder.supported}
            aria-label="Record a voice note"
            title={recorder.supported ? "Record a voice note" : "Microphone not available in this browser"}
            className="w-14 h-14 rounded-full bg-card border border-line-2 text-ink-mute hover:text-gold hover:border-gold transition disabled:opacity-40 flex items-center justify-center flex-shrink-0"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || uploading}
            aria-label="Send"
            title="Send (Cmd/Ctrl + Enter)"
            className="w-11 h-11 rounded-full bg-accent text-white flex items-center justify-center transition disabled:opacity-30 flex-shrink-0"
          >
            <Send className="w-[17px] h-[17px]" />
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />
      {recorder.error === "not-allowed" && (
        <p className="mt-2 text-[12px] text-ink-mute">
          I can't hear the mic — check the browser's mic permission.
        </p>
      )}
    </div>
  );
}
