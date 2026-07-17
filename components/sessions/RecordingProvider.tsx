"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { RecordedAudio, useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import { currentDevice } from "@/components/thoughts/utils";
import { withRetry } from "@/lib/withRetry";

const MIN_RECORDING_MS = 1000;
// How long to wait before auto-retrying a take that couldn't save.
const FAILED_RETRY_MS = 8000;

export type PendingTake = RecordedAudio & {
  startedAt: number;
  // The entry this take belongs to. `null` means "no entry yet" — the one it was
  // started for never got created (a cold-start failure), so save() mints a fresh
  // entry for it. Never a reason to drop the audio.
  sessionId: Id<"sessions"> | null;
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
  const createSession = useMutation(api.sessions.create);

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
        // Give the take a home. If the entry it was started for never got created
        // (cold-start / stale-auth failure), mint one now — the whole recording has
        // given auth time to settle, so this all but always lands on retry. We stamp
        // the id back onto the take so a *later* retry reuses the same entry instead
        // of spawning a fresh empty one each time (no orphan husks).
        if (!take.sessionId) {
          take.sessionId = await withRetry(() => createSession({ device: currentDevice() }));
        }
        const rawFileId = await uploadBlob(take.blob, take.mimeType);
        await withRetry(() =>
          createCapture({
            source: "audio",
            rawType: "audio",
            rawFileId,
            sessionId: take.sessionId ?? undefined,
            sourceMeta: JSON.stringify({
              device: currentDevice(),
              durationMs: take.durationMs,
              recordingStartedAt: take.startedAt || undefined,
            }),
          }),
        );
      } catch {
        // The audio must never be lost: keep the blob for a retry without re-recording.
        setFailedTakes((prev) => [...prev, take]);
      } finally {
        setPendingTakes((prev) => prev.filter((t) => t !== take));
      }
    },
    [uploadBlob, createCapture, createSession],
  );

  const finish = useCallback(async () => {
    const target = targetRef.current;
    targetRef.current = null;
    setSessionId(null);
    const result = await recorder.stop();
    // Nothing captured, or an accidental sub-second tap: genuinely nothing to save.
    if (!result || result.durationMs < MIN_RECORDING_MS) return;
    // Resolve the entry the take was started for. If creation failed (cold start),
    // `id` is null — we still save: save() mints a fresh entry rather than dropping
    // the audio. This is the fix for whole ramble getting lost on first open.
    const id = target ? await target.catch(() => null) : null;
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
        // Bind the entry the moment the server answers. If creation FAILS we keep
        // recording anyway — the take is never thrown away for want of an entry;
        // finish()/save() give it a home at stop. (The old code cancelled the mic
        // here, which is exactly how a cold-start ramble got lost: createSession
        // rejects fast on a stale token, killing the recorder mid-sentence.)
        void promise.then(
          (id) => {
            if (targetRef.current === promise) setSessionId(id);
          },
          () => {
            /* keep recording; the entry is minted when the take is saved */
          },
        );
      }
      const ok = await recorder.start();
      if (!ok && targetRef.current === promise) {
        targetRef.current = null;
        setSessionId(null);
      }
    },
    [finish, recorder.start], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const retryFailed = useCallback(async () => {
    const takes = failedTakes;
    if (takes.length === 0) return;
    setFailedTakes([]);
    await Promise.all(takes.map((t) => save(t)));
  }, [failedTakes, save]);

  // Self-healing: a take that couldn't save (offline, or auth still settling on a
  // cold resume) is retried on a gentle cadence until it lands — the person never
  // has to notice or tap "Try again" for the guarantee to hold. Each failed retry
  // re-enters failedTakes, which reschedules this; spaced by FAILED_RETRY_MS, so
  // it's bounded, never a tight loop.
  useEffect(() => {
    if (failedTakes.length === 0) return;
    const t = window.setTimeout(() => void retryFailed(), FAILED_RETRY_MS);
    return () => window.clearTimeout(t);
  }, [failedTakes, retryFailed]);

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
