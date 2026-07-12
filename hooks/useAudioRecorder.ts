"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Whole-file recording (no chunking, no live transcription): the Thought Stream
// composer is a long-form dump — one complete blob, uploaded on stop, transcribed
// async server-side. Contrast with lib/useWhisperRecorder.ts, which segments audio
// into short chunks for live server transcription.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function pickMime(): string {
  if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function") {
    for (const c of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "audio/webm";
}

export type RecordedAudio = { blob: Blob; mimeType: string; durationMs: number };

export type AudioRecorderState = {
  supported: boolean;
  recording: boolean;
  paused: boolean;
  /** Time actually recorded: paused stretches don't count. */
  elapsedMs: number;
  error: string | null;
  start: () => Promise<boolean>;
  pause: () => void;
  resume: () => void;
  /** Stop capture and release the mic. Resolves null if nothing was captured. */
  stop: () => Promise<RecordedAudio | null>;
  /** Stop capture, discard everything, release the mic. */
  cancel: () => Promise<void>;
};

/**
 * Records the mic as a single, complete file (start → speak → stop → one blob).
 * No chunking, no live transcript — the caller uploads the blob and the server
 * transcribes it in the background. Pause/resume ride MediaRecorder's own
 * pause(), so a paused stretch adds no audio and no elapsed time.
 */
export function useAudioRecorder(): AudioRecorderState {
  const [supported] = useState(
    () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
  );
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("audio/webm");
  // Recorded time = accumulated finished runs + the current run (if not paused).
  const accumulatedMsRef = useRef(0);
  const runStartedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);

  const releaseMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stopTicker = useCallback(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);

  const startTicker = useCallback(() => {
    stopTicker();
    tickRef.current = window.setInterval(() => {
      setElapsedMs(accumulatedMsRef.current + (Date.now() - runStartedAtRef.current));
    }, 250);
  }, [stopTicker]);

  const start = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setError(null);
    setElapsedMs(0);
    setPaused(false);
    const mime = pickMime();
    mimeRef.current = mime;
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      const name =
        err && typeof err === "object" && "name" in err && typeof err.name === "string"
          ? err.name
          : "";
      setError(name === "NotAllowedError" || name === "SecurityError" ? "not-allowed" : "unavailable");
      return false;
    }
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    } catch {
      try {
        rec = new MediaRecorder(streamRef.current);
      } catch {
        releaseMic();
        setError("unavailable");
        return false;
      }
    }
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      // A dead stream (mic yanked between getUserMedia and here) throws sync.
      recRef.current = null;
      releaseMic();
      setError("unavailable");
      return false;
    }
    accumulatedMsRef.current = 0;
    runStartedAtRef.current = Date.now();
    setRecording(true);
    startTicker();
    return true;
  }, [supported, releaseMic, startTicker]);

  const pause = useCallback(() => {
    const rec = recRef.current;
    if (!rec || rec.state !== "recording") return;
    try {
      rec.pause();
    } catch {
      return;
    }
    accumulatedMsRef.current += Date.now() - runStartedAtRef.current;
    stopTicker();
    setElapsedMs(accumulatedMsRef.current);
    setPaused(true);
  }, [stopTicker]);

  const resume = useCallback(() => {
    const rec = recRef.current;
    if (!rec || rec.state !== "paused") return;
    try {
      rec.resume();
    } catch {
      return;
    }
    runStartedAtRef.current = Date.now();
    setPaused(false);
    startTicker();
  }, [startTicker]);

  const stop = useCallback(async (): Promise<RecordedAudio | null> => {
    stopTicker();
    const rec = recRef.current;
    const wasPaused = rec?.state === "paused";
    setRecording(false);
    setPaused(false);
    if (!rec) return null;
    const durationMs =
      accumulatedMsRef.current + (wasPaused ? 0 : Date.now() - runStartedAtRef.current);
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: mimeRef.current }));
      if (rec.state !== "inactive") rec.stop();
      else resolve(new Blob(chunksRef.current, { type: mimeRef.current }));
    });
    recRef.current = null;
    releaseMic();
    if (!blob.size) return null;
    return { blob, mimeType: mimeRef.current, durationMs };
  }, [stopTicker, releaseMic]);

  const cancel = useCallback(async (): Promise<void> => {
    stopTicker();
    setRecording(false);
    setPaused(false);
    setElapsedMs(0);
    const rec = recRef.current;
    recRef.current = null;
    if (rec && rec.state !== "inactive") {
      await new Promise<void>((resolve) => {
        rec.onstop = () => resolve();
        try {
          rec.stop();
        } catch {
          resolve();
        }
      });
    }
    chunksRef.current = [];
    releaseMic();
  }, [stopTicker, releaseMic]);

  // Release the mic if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      stopTicker();
      try {
        if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
      } catch {
        /* noop */
      }
      releaseMic();
    };
  }, [stopTicker, releaseMic]);

  return { supported, recording, paused, elapsedMs, error, start, pause, resume, stop, cancel };
}
