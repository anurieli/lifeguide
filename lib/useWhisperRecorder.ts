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
const SEGMENT_MS = 4000;
const MIN_SEGMENT_BYTES = 1200; // a bare container header with ~no audio
const FLUSH_TIMEOUT_MS = 15000; // hard cap on how long stop() waits for the tail

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
  /** Ordered, confirmed transcript assembled from the segments returned so far. */
  text: string;
  /** Segments still being transcribed (drives an optional "transcribing…" hint). */
  pending: number;
  /** Count of segments that failed to transcribe — a signal the caller may prefer the local fallback. */
  failures: number;
  /** Actionable error code (currently just "not-allowed" when mic permission is denied). */
  error: string | null;
  /** Begin capture. Resolves false if it couldn't start (unsupported, or mic denied). */
  start: () => Promise<boolean>;
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
  const [text, setText] = useState("");
  const [pending, setPending] = useState(0);
  const [failures, setFailures] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
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

  const sendSegment = useCallback(
    (blob: Blob, idx: number) => {
      if (blob.size < MIN_SEGMENT_BYTES) {
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
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      const idx = seqRef.current++;
      sendSegment(new Blob(chunks, { type: mimeRef.current }), idx);
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

  const teardownStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

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
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("not-allowed");
      return false;
    }
    wantRef.current = true;
    setRecording(true);
    startSegment();
    return true;
  }, [supported, startSegment]);

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
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return { supported, recording, text, pending, failures, error, start, stop, reset };
}
