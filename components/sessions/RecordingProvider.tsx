"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { RecordedAudio, useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import { currentDevice } from "@/components/thoughts/utils";

const MIN_RECORDING_MS = 1000;

export type FailedTake = RecordedAudio & {
  startedAt: number;
  sessionId: Id<"sessions">;
};

type RecordingValue = {
  supported: boolean;
  error: string | null;
  /** The mic is live (or paused mid-take). */
  recording: boolean;
  paused: boolean;
  elapsedMs: number;
  /** The entry the live take will land in; null when idle. */
  sessionId: Id<"sessions"> | null;
  uploading: boolean;
  /** A finished take whose save failed stays here, so retry never re-records. */
  failedTake: FailedTake | null;
  start: (sessionId: Id<"sessions">) => Promise<void>;
  pause: () => void;
  resume: () => void;
  /** Stop and save the take into the entry it was started for. */
  finish: () => Promise<void>;
  /** Stop and discard the take. */
  cancel: () => Promise<void>;
  retryFailed: () => Promise<void>;
};

const RecordingContext = createContext<RecordingValue | null>(null);

export function useRecording(): RecordingValue {
  const value = useContext(RecordingContext);
  if (!value) throw new Error("useRecording must be used inside RecordingProvider");
  return value;
}

/**
 * Owns the one live voice take, above the view switch: a recording keeps running
 * while the person navigates anywhere in the app (the whole point of "add things
 * while it records"). The save pipeline lives here too, so a take started in a
 * session document survives that document unmounting.
 */
export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const recorder = useAudioRecorder();
  const uploadBlob = useBlobUpload();
  const createCapture = useMutation(api.captures.create);

  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [failedTake, setFailedTake] = useState<FailedTake | null>(null);
  // Refs mirror the target so finish() reads the truth even from stale closures.
  const sessionRef = useRef<Id<"sessions"> | null>(null);
  const startedAtRef = useRef(0);

  const save = useCallback(
    async (take: FailedTake) => {
      setUploading(true);
      try {
        const rawFileId = await uploadBlob(take.blob, take.mimeType);
        await createCapture({
          source: "audio",
          rawType: "audio",
          rawFileId,
          sessionId: take.sessionId,
          sourceMeta: JSON.stringify({
            device: currentDevice(),
            durationMs: take.durationMs,
            recordingStartedAt: take.startedAt || undefined,
          }),
        });
        setFailedTake(null);
      } catch {
        // The audio must never be lost: keep the blob for a retry without re-recording.
        setFailedTake(take);
      } finally {
        setUploading(false);
      }
    },
    [uploadBlob, createCapture],
  );

  const finish = useCallback(async () => {
    const target = sessionRef.current;
    sessionRef.current = null;
    setSessionId(null);
    const result = await recorder.stop();
    if (!target || !result || result.durationMs < MIN_RECORDING_MS) return;
    await save({ ...result, startedAt: startedAtRef.current, sessionId: target });
  }, [recorder.stop, save]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(
    async (target: Id<"sessions">) => {
      // One live take at a time: starting a new one saves the current one first.
      if (sessionRef.current) await finish();
      sessionRef.current = target;
      setSessionId(target);
      startedAtRef.current = Date.now();
      const ok = await recorder.start();
      if (!ok) {
        sessionRef.current = null;
        setSessionId(null);
      }
    },
    [finish, recorder.start], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const cancel = useCallback(async () => {
    sessionRef.current = null;
    setSessionId(null);
    await recorder.cancel();
  }, [recorder.cancel]); // eslint-disable-line react-hooks/exhaustive-deps

  const retryFailed = useCallback(async () => {
    if (failedTake) await save(failedTake);
  }, [failedTake, save]);

  return (
    <RecordingContext.Provider
      value={{
        supported: recorder.supported,
        error: recorder.error,
        recording: recorder.recording,
        paused: recorder.paused,
        elapsedMs: recorder.elapsedMs,
        sessionId,
        uploading,
        failedTake,
        start,
        pause: recorder.pause,
        resume: recorder.resume,
        finish,
        cancel,
        retryFailed,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}
