"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// We record in short segments and transcribe each one independently. A single
// MediaRecorder with a timeslice emits chunks that are NOT individually decodable
// (only the first carries the container header), so instead we stop+restart the
// recorder every SEGMENT_MS — each segment is then a complete, self-contained file
// Whisper can decode on its own. The tiny gap between segments is inaudible for
// dictation, and Web Speech runs alongside as the live display + fallback.
const SEGMENT_MS = 1800;
const MIN_SEGMENT_BYTES = 240; // a bare container header with ~no audio
const FLUSH_TIMEOUT_MS = 15000; // hard cap on how long stop() waits for the tail
const SPEECH_LEVEL = 0.06;
const MIN_SPEECH_FRAMES = 4;

// Whisper accepts webm/ogg/mp4/wav. We pick the first the browser can record.
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return null;
  }
  for (const c of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(c)) return c;
  return null;
}

export type WhisperRecorderState = {
  /** Whether this browser can record + segment audio at all. False → caller should rely on Web Speech / typing. */
  supported: boolean;
  recording: boolean;
  devices: MediaDeviceInfo[];
  deviceId: string;
  activeDeviceLabel: string;
  /** Ordered, confirmed transcript assembled from the segments returned so far. */
  text: string;
  /** Segments still being transcribed (drives an optional "transcribing…" hint). */
  pending: number;
  /** Count of segments that failed to transcribe — a signal the caller may prefer the local fallback. */
  failures: number;
  /** Live microphone input level from the browser audio stream (0..1). */
  level: number;
  /** Actionable error code (currently just "not-allowed" when mic permission is denied). */
  error: string | null;
  /** Begin capture. Resolves false if it couldn't start (unsupported, or mic denied). */
  start: () => Promise<boolean>;
  setDeviceId: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
  /** Stop capture, flush the final segment, and resolve with the full ordered transcript. */
  stop: () => Promise<string>;
  reset: () => void;
};

/**
 * Chunked server-side transcription for VoiceField. Records the mic in ~4s
 * segments and ships each to the Convex `voice.transcribe` (Whisper) action,
 * reassembling the results in order. Designed to run *beside* `useSpeechRecognition`:
 * Web Speech gives the instant live display and the disconnect fallback; this gives
 * the accurate, cross-browser transcript that becomes the answer.
 */
export function useWhisperRecorder(): WhisperRecorderState {
  const transcribe = useAction(api.voice.transcribe);

  const [supported] = useState(
    () =>
      pickMime() !== null &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia,
  );
  const [recording, setRecording] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("default");
  const [activeDeviceLabel, setActiveDeviceLabel] = useState("");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(0);
  const [failures, setFailures] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const segmentSpeechFramesRef = useRef(0);
  const mimeRef = useRef<string>("audio/webm");
  const wantRef = useRef(false); // true while the user means to keep recording
  const segTimerRef = useRef<number | null>(null);
  const seqRef = useRef(0); // next segment index to assign (also the count of segments started)
  const resultsRef = useRef<Map<number, string>>(new Map());
  const inflightRef = useRef(0);

  const assemble = useCallback((): string => {
    const parts: string[] = [];
    for (let i = 0; i < seqRef.current; i++) {
      const t = resultsRef.current.get(i);
      if (t) parts.push(t);
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((device) => device.kind === "audioinput"));
    } catch {
      // Some browsers only allow enumeration after permission; start() retries.
    }
  }, []);

  const sendSegment = useCallback(
    (blob: Blob, idx: number, speechFrames: number) => {
      if (blob.size < MIN_SEGMENT_BYTES || speechFrames < MIN_SPEECH_FRAMES) {
        resultsRef.current.set(idx, "");
        return;
      }
      inflightRef.current += 1;
      setPending(inflightRef.current);
      blob
        .arrayBuffer()
        .then((buf) => transcribe({ audio: buf, mimeType: mimeRef.current }))
        .then((t) => {
          resultsRef.current.set(idx, (t ?? "").trim());
          setText(assemble());
        })
        .catch(() => {
          resultsRef.current.set(idx, "");
          setFailures((f) => f + 1);
        })
        .finally(() => {
          inflightRef.current = Math.max(0, inflightRef.current - 1);
          setPending(inflightRef.current);
        });
    },
    [transcribe, assemble],
  );

  // Record exactly one segment. Its onstop ships the blob and, if we still want to
  // be recording, immediately starts the next segment.
  const startSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !wantRef.current) return;
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { mimeType: mimeRef.current });
    } catch {
      try {
        rec = new MediaRecorder(stream);
      } catch {
        return;
      }
    }
    recRef.current = rec;
    const chunks: BlobPart[] = [];
    segmentSpeechFramesRef.current = 0;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      const idx = seqRef.current++;
      sendSegment(new Blob(chunks, { type: mimeRef.current }), idx, segmentSpeechFramesRef.current);
      if (wantRef.current) startSegment();
    };
    try {
      rec.start();
    } catch {
      return;
    }
    segTimerRef.current = window.setTimeout(() => {
      if (recRef.current && recRef.current.state === "recording") recRef.current.stop();
    }, SEGMENT_MS);
  }, [sendSegment]);

  const stopLevelMeter = useCallback(() => {
    if (levelRafRef.current) window.cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = null;
    analyserRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  const startLevelMeter = useCallback((stream: MediaStream) => {
    stopLevelMeter();
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) {
          const centered = (buf[i] - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / buf.length);
        const nextLevel = Math.min(1, rms * 8);
        if (nextLevel >= SPEECH_LEVEL) segmentSpeechFramesRef.current += 1;
        setLevel(nextLevel);
        levelRafRef.current = window.requestAnimationFrame(tick);
      };
      void ctx.resume().catch(() => {});
      tick();
    } catch {
      stopLevelMeter();
    }
  }, [stopLevelMeter]);

  const teardownStream = useCallback(() => {
    stopLevelMeter();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActiveDeviceLabel("");
  }, [stopLevelMeter]);

  const start = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    const mime = pickMime();
    if (!mime) return false;
    mimeRef.current = mime;
    setError(null);
    setFailures(0);
    setText("");
    resultsRef.current = new Map();
    seqRef.current = 0;
    inflightRef.current = 0;
    setPending(0);
    setLevel(0);
    setActiveDeviceLabel("");
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: deviceId
          ? {
              deviceId: { exact: deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
      });
    } catch (err) {
      const name =
        err && typeof err === "object" && "name" in err && typeof err.name === "string"
          ? err.name
          : "";
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "not-allowed"
          : name === "NotFoundError"
            ? "not-found"
            : name === "NotReadableError"
              ? "not-readable"
              : "unavailable",
      );
      return false;
    }
    const track = streamRef.current.getAudioTracks()[0];
    setActiveDeviceLabel(track?.label || "");
    void refreshDevices();
    startLevelMeter(streamRef.current);
    wantRef.current = true;
    setRecording(true);
    startSegment();
    return true;
  }, [deviceId, refreshDevices, supported, startLevelMeter, startSegment]);

  const stop = useCallback(async (): Promise<string> => {
    wantRef.current = false;
    setRecording(false);
    if (segTimerRef.current) {
      window.clearTimeout(segTimerRef.current);
      segTimerRef.current = null;
    }
    // Flush the final partial segment (onstop won't restart now that wantRef is false).
    if (recRef.current && recRef.current.state === "recording") {
      try {
        recRef.current.stop();
      } catch {
        /* already stopping */
      }
    }
    teardownStream();
    // Wait for the tail segment's onstop to fire and all in-flight transcriptions to land.
    await new Promise<void>((resolve) => {
      const startedAt = performance.now();
      const tick = () => {
        const settled =
          inflightRef.current === 0 && (!recRef.current || recRef.current.state === "inactive");
        if (settled || performance.now() - startedAt > FLUSH_TIMEOUT_MS) resolve();
        else window.setTimeout(tick, 120);
      };
      // Give the just-issued onstop a beat to enqueue the final segment before we poll.
      window.setTimeout(tick, 160);
    });
    const full = assemble();
    setText(full);
    return full;
  }, [teardownStream, assemble]);

  const reset = useCallback(() => {
    resultsRef.current = new Map();
    seqRef.current = 0;
    inflightRef.current = 0;
    setText("");
    setPending(0);
    setFailures(0);
    setLevel(0);
    setActiveDeviceLabel("");
    setError(null);
  }, []);

  // Release the mic if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      wantRef.current = false;
      if (segTimerRef.current) window.clearTimeout(segTimerRef.current);
      try {
        if (recRef.current && recRef.current.state === "recording") recRef.current.stop();
      } catch {
        /* noop */
      }
      stopLevelMeter();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [stopLevelMeter]);

  useEffect(() => {
    void refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
    };
  }, [refreshDevices]);

  return {
    supported,
    recording,
    devices,
    deviceId,
    activeDeviceLabel,
    text,
    pending,
    failures,
    level,
    error,
    start,
    setDeviceId,
    refreshDevices,
    stop,
    reset,
  };
}
