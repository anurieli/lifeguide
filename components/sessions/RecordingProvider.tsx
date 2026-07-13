"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { RecordedAudio, useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import { currentDevice } from "@/components/thoughts/utils";

const MIN_RECORDING_MS = 1000;

export type PendingTake = RecordedAudio & {
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
  /** The entry the live take will land in; null when idle (or still being created). */
  sessionId: Id<"sessions"> | null;
  uploading: boolean;
  /** Finished takes whose save is in flight: already on the page, upload behind them. */
  pendingTakes: PendingTake[];
  /** Finished takes whose save failed stay here, so retry never re-records. */
  failedTakes: PendingTake[];
  /** Arm the mic for an entry. A promise target starts the mic immediately,
      before the server has answered with the new entry's id (quick record). */
  start: (target: Id<"sessions"> | Promise<Id<"sessions">>) => Promise<void>;
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
 * session document survives that document unmounting. Saves are optimistic:
 * finishing a take puts it on the page at once (pendingTakes) and uploads behind
 * it, so the mic is free again immediately.
 */
export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const recorder = useAudioRecorder();
  const uploadBlob = useBlobUpload();
  const createCapture = useMutation(api.captures.create);

  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [pendingTakes, setPendingTakes] = useState<PendingTake[]>([]);
  const [failedTakes, setFailedTakes] = useState<PendingTake[]>([]);
  // The live take's target entry. Held as a promise so quick record can arm the
  // mic while the entry is still being created server-side; finish() awaits it.
  const targetRef = useRef<Promise<Id<"sessions">> | null>(null);
  const startedAtRef = useRef(0);

  const save = useCallback(
    async (take: PendingTake) => {
      setPendingTakes((prev) => [...prev, take]);
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
      } catch {
        // The audio must never be lost: keep the blob for a retry without re-recording.
        setFailedTakes((prev) => [...prev, take]);
      } finally {
        setPendingTakes((prev) => prev.filter((t) => t !== take));
      }
    },
    [uploadBlob, createCapture],
  );

  const finish = useCallback(async () => {
    const target = targetRef.current;
    targetRef.current = null;
    setSessionId(null);
    const result = await recorder.stop();
    if (!target || !result || result.durationMs < MIN_RECORDING_MS) return;
    const id = await target.catch(() => null);
    if (!id) return;
    // Fire-and-forget: the take shows in its entry immediately (pendingTakes);
    // the upload runs behind it and a failure lands in failedTakes.
    void save({ ...result, startedAt: startedAtRef.current, sessionId: id });
  }, [recorder.stop, save]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = useCallback(async () => {
    targetRef.current = null;
    setSessionId(null);
    await recorder.cancel();
  }, [recorder.cancel]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(
    async (target: Id<"sessions"> | Promise<Id<"sessions">>) => {
      // One live take at a time: starting a new one saves the current one first.
      if (targetRef.current) await finish();
      const promise = Promise.resolve(target);
      targetRef.current = promise;
      startedAtRef.current = Date.now();
      if (typeof target === "string") {
        setSessionId(target);
      } else {
        // Bind the entry the moment the server answers; if creation failed
        // the take has nowhere to land, so drop it right away.
        void promise.then(
          (id) => {
            if (targetRef.current === promise) setSessionId(id);
          },
          () => {
            if (targetRef.current === promise) void cancel();
          },
        );
      }
      const ok = await recorder.start();
      if (!ok && targetRef.current === promise) {
        targetRef.current = null;
        setSessionId(null);
      }
    },
    [finish, cancel, recorder.start], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const retryFailed = useCallback(async () => {
    const takes = failedTakes;
    if (takes.length === 0) return;
    setFailedTakes([]);
    await Promise.all(takes.map((t) => save(t)));
  }, [failedTakes, save]);

  return (
    <RecordingContext.Provider
      value={{
        supported: recorder.supported,
        error: recorder.error,
        recording: recorder.recording,
        paused: recorder.paused,
        elapsedMs: recorder.elapsedMs,
        sessionId,
        uploading: pendingTakes.length > 0,
        pendingTakes,
        failedTakes,
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
