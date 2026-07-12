"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, Square, X } from "lucide-react";
import { useAudioRecorder, type RecordedAudio } from "@/hooks/useAudioRecorder";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import { currentDevice, formatElapsed } from "@/components/thoughts/utils";

// Anything shorter than this is almost certainly an accidental tap, not a thought.
const MIN_RECORDING_MS = 1000;

/**
 * The one-tap take: opens recording immediately (no form, no chrome), stop creates
 * a session holding the take as its first capture and hands off to the document
 * view so the entry can be continued right away. Cancel (or a too-short take)
 * creates nothing.
 */
export function RecordTake({
  onDone,
  onClose,
}: {
  onDone: (sessionId: Id<"sessions">) => void;
  onClose: () => void;
}) {
  const recorder = useAudioRecorder();
  const uploadBlob = useBlobUpload();
  const createSession = useMutation(api.sessions.create);
  const createCapture = useMutation(api.captures.create);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const startedRef = useRef(false);
  // The finished take is held here so a failed save can retry without re-recording:
  // once the recorder stops, its blob is gone unless we keep it.
  const takenRef = useRef<RecordedAudio | null>(null);

  // Start listening the moment the surface opens; that is the whole point.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void recorder.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async () => {
    if (saving) return;
    if (!takenRef.current) {
      const result = await recorder.stop();
      if (!result || result.durationMs < MIN_RECORDING_MS) {
        onClose();
        return;
      }
      takenRef.current = result;
    }
    const result = takenRef.current;
    setSaving(true);
    setFailed(false);
    try {
      const device = currentDevice();
      const sessionId = await createSession({ device });
      const rawFileId = await uploadBlob(result.blob, result.mimeType);
      await createCapture({
        source: "audio",
        rawType: "audio",
        rawFileId,
        sessionId,
        sourceMeta: JSON.stringify({ device, durationMs: result.durationMs }),
      });
      onDone(sessionId);
    } catch {
      // The take could not be saved; say so instead of silently closing.
      setSaving(false);
      setFailed(true);
    }
  };

  const cancel = () => {
    void recorder.stop(); // releases the mic; result discarded
    onClose();
  };

  const typeInstead = async () => {
    void recorder.stop();
    const sessionId = await createSession({ device: currentDevice() });
    onDone(sessionId); // empty doc view, composer ready; deleteIfEmpty guards a bail
  };

  return (
    <div className="fixed inset-0 z-[80] bg-paper flex flex-col items-center justify-center gap-8">
      <button
        type="button"
        onClick={cancel}
        aria-label="Cancel"
        className="absolute top-5 right-5 w-10 h-10 rounded-full border border-line text-ink-mute hover:text-ink flex items-center justify-center"
      >
        <X className="w-5 h-5" />
      </button>

      {recorder.error ? (
        <div className="text-center px-8">
          <p className="text-[15px] text-ink-soft mb-4">
            I can't hear the mic. Check the browser's mic permission.
          </p>
          <button
            type="button"
            onClick={() => void typeInstead()}
            className="px-5 py-2.5 rounded-xl bg-accent text-white text-[14px]"
          >
            Type instead
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 text-ink-soft">
            <span className="w-3 h-3 rounded-full bg-gold animate-pulse" />
            <span className="text-[28px] tabular-nums font-light">
              {formatElapsed(recorder.elapsedMs)}
            </span>
          </div>
          <p className="text-[13px] text-ink-mute">Say what's on your mind. It all lands here.</p>
          <button
            type="button"
            onClick={() => void finish()}
            disabled={saving}
            aria-label="Stop and save"
            className="w-24 h-24 rounded-full bg-gold/15 border-2 border-gold text-gold flex items-center justify-center disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Square className="w-7 h-7" fill="currentColor" strokeWidth={0} />
            )}
          </button>
          {failed && (
            <p className="text-[13px] text-ink-mute px-8 text-center">
              Saving failed, the network may be down. Tap stop to retry.
            </p>
          )}
        </>
      )}
    </div>
  );
}
