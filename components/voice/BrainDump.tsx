"use client";

/**
 * BrainDump — a voice-first modal for the Vision Board.
 *
 * The user speaks freely. Their spoken thoughts are:
 *   1. Transcribed (Whisper server-side + Web Speech live caption fallback).
 *   2. Split by an AI pass into distinct, atomic thoughts (server action).
 *   3. Each thought becomes a capture, distilled in the background.
 *   4. Once a capture is distilled (or the timeout fires), it is placed on
 *      the board with no-overlap spiral placement.
 *
 * The modal is self-contained. Mount it anywhere; pass the surface ID and an
 * onClose callback. Does NOT touch Whiteboard.tsx, Toolbar.tsx, NodeCard.tsx,
 * or useViewport.ts.
 *
 * See docs/product/features/voice-field.md §brain-dump for the feature spec.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X, Mic, Square, Loader2 } from "lucide-react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useWhisperRecorder } from "@/lib/useWhisperRecorder";

// ── Phase machine ─────────────────────────────────────────────────────────────
// idle       → mic not started yet (modal just opened)
// recording  → mic is live, Whisper + Web Speech both running
// processing → mic stopped; AI split + capture creation in flight
// placing    → captures created; watching distillation, placing as each finishes
// done       → all nodes placed; brief success state before auto-close
// error      → unrecoverable failure; shows the message, lets them retry
type Phase = "idle" | "recording" | "processing" | "placing" | "done" | "error";

const BAR_COUNT = 13;
const DONE_AUTO_CLOSE_MS = 1800;
const DISTILL_TIMEOUT_MS = 28_000; // max wait for distill before placing anyway

function statusLabel(phase: Phase, nodeCount: number): string {
  switch (phase) {
    case "idle":
      return "tap the mic to start";
    case "recording":
      return "listening… tap the wave or stop to finish";
    case "processing":
      return "splitting your thoughts…";
    case "placing":
      return nodeCount > 1 ? `placing ${nodeCount} ideas…` : "placing your idea…";
    case "done":
      return nodeCount > 1
        ? `${nodeCount} ideas added to your board`
        : "idea added to your board";
    case "error":
      return "something went wrong — try again";
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BrainDump({
  open,
  surfaceId,
  onClose,
}: {
  open: boolean;
  surfaceId: Id<"surfaces"> | null;
  onClose: () => void;
}) {
  const brainDump = useAction(api.voice.brainDump);
  const placeCapture = useMutation(api.placement.placeCapture);

  const speech = useSpeechRecognition();
  const whisper = useWhisperRecorder();
  const canSpeak = whisper.supported || speech.supported;

  const liveFinal = speech.supported ? speech.finalText : whisper.text;
  const liveInterim = speech.supported ? speech.interim : "";

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [captureIds, setCaptureIds] = useState<Id<"captures">[]>([]);
  const [nodeCount, setNodeCount] = useState(0);

  // Reactive watch of our batch's captures. Convex re-renders whenever any of them
  // is patched (including when distillCapture writes the distilled field).
  // We pass an empty array when there are no capture IDs to avoid unnecessary queries.
  const batchCaptures = useQuery(
    api.captures.getMany,
    captureIds.length > 0 ? { captureIds } : "skip",
  );

  // Placement guard: we only place each capture once per modal session.
  const placedRef = useRef<Set<string>>(new Set());
  const placeStartedAtRef = useRef<number>(0);

  // Waveform bar refs.
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setPhase("idle");
      setErrorMsg(null);
      setCaptureIds([]);
      setNodeCount(0);
      placedRef.current = new Set();
      placeStartedAtRef.current = 0;
      speech.reset();
      whisper.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Waveform animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => {
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const center = 1 - Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
        const t = 0.12 + Math.random() * 0.9 * center + 0.06;
        bar.style.transform = `scaleY(${t.toFixed(2)})`;
      });
    }, 110);
    return () => window.clearInterval(id);
  }, [phase]);

  // ── Watch captures; place each one as soon as it's distilled ─────────────
  useEffect(() => {
    if (phase !== "placing" || !batchCaptures || !surfaceId) return;

    const unplaced = batchCaptures.filter(
      (c) => c !== null && !placedRef.current.has(c._id),
    );

    // Captures that are now distilled (or that have timed out waiting).
    const elapsed = Date.now() - placeStartedAtRef.current;
    const timedOut = elapsed > DISTILL_TIMEOUT_MS;
    const ready = unplaced.filter((c) => c !== null && (c.distilled || timedOut));

    for (const c of ready) {
      if (!c) continue;
      placedRef.current.add(c._id);
      void placeCapture({ captureId: c._id, surfaceId }).catch(() => {
        // placeCapture is idempotent (returns existing nodeId if already placed).
        // Swallow errors so a single failure doesn't abort the batch.
      });
    }

    // Done when all captures have been attempted.
    if (placedRef.current.size >= captureIds.length) {
      setPhase("done");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchCaptures, phase, surfaceId]);

  // ── Fallback: if distillation never completes, force-place after timeout ──
  useEffect(() => {
    if (phase !== "placing" || !surfaceId || captureIds.length === 0) return;
    const id = window.setTimeout(() => {
      // Place any remaining unplaced captures with whatever data exists.
      const remaining = captureIds.filter((cid) => !placedRef.current.has(cid));
      for (const captureId of remaining) {
        placedRef.current.add(captureId);
        void placeCapture({ captureId, surfaceId }).catch(() => {});
      }
      setPhase("done");
    }, DISTILL_TIMEOUT_MS + 2000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, captureIds, surfaceId]);

  // ── Auto-close after done ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "done") return;
    const id = window.setTimeout(onClose, DONE_AUTO_CLOSE_MS);
    return () => window.clearTimeout(id);
  }, [phase, onClose]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (phase === "recording") {
        e.preventDefault();
        speech.stop();
        void whisper.stop().catch(() => {});
        whisper.reset();
        setPhase("idle");
      } else if (["idle", "error", "done"].includes(phase)) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, speech, whisper, onClose]);

  // ── Start recording ───────────────────────────────────────────────────────
  const begin = useCallback(async () => {
    if (!surfaceId) return;
    speech.reset();
    speech.start();
    await whisper.start();
    setPhase("recording");
  }, [surfaceId, speech, whisper]);

  // ── Stop + run pipeline ───────────────────────────────────────────────────
  const finish = useCallback(async () => {
    if (phase !== "recording") return;

    const local = speech.stop();
    setPhase("processing");

    let transcript = local;
    try {
      const w = (await whisper.stop()).trim();
      if (w) transcript = w;
    } catch {
      transcript = local;
    }

    if (!transcript.trim() || !surfaceId) {
      setPhase("idle");
      return;
    }

    let ids: Id<"captures">[] = [];
    try {
      ids = await brainDump({ transcript: transcript.trim(), surfaceId });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "brain dump failed");
      setPhase("error");
      return;
    }

    if (ids.length === 0) {
      setPhase("idle");
      return;
    }

    placeStartedAtRef.current = Date.now();
    setCaptureIds(ids);
    setNodeCount(ids.length);
    setPhase("placing");
  }, [phase, speech, whisper, surfaceId, brainDump]);

  // ────────────────────────────────────────────────────────────────────────────

  if (!open) return null;

  const isRecording = phase === "recording";
  const isBusy = phase === "processing" || phase === "placing";
  const isDone = phase === "done";
  const isError = phase === "error";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(10,12,18,0.72)", backdropFilter: "blur(6px)" }}
      onPointerDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (phase === "idle" || phase === "error" || isDone)
        ) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #13151f 0%, #0e1018 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* close */}
        <button
          onClick={onClose}
          aria-label="Close brain dump"
          disabled={isBusy}
          className="absolute top-4 right-4 w-7 h-7 rounded-full grid place-items-center text-white/30 hover:text-white/70 transition disabled:opacity-30"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-8 pt-8 pb-7 flex flex-col items-center gap-6">
          {/* header */}
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/30 mb-1">
              brain dump
            </p>
            <h2 className="text-[18px] font-medium text-white/90 leading-snug">
              {isDone ? "done." : "speak freely."}
            </h2>
          </div>

          {/* waveform + mic/stop button */}
          <div className="flex items-center justify-center gap-4">
            <div
              className="flex items-center gap-[3px] h-10"
              style={{
                opacity: isRecording ? 1 : 0.2,
                cursor: isRecording ? "pointer" : "default",
              }}
              onClick={() => isRecording && void finish()}
              role={isRecording ? "button" : undefined}
              title={isRecording ? "Tap to finish" : undefined}
            >
              {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    barsRef.current[i] = el;
                  }}
                  style={{
                    display: "inline-block",
                    width: 3,
                    height: 28,
                    borderRadius: 2,
                    background:
                      "linear-gradient(to top, rgba(200,168,84,0.9), rgba(200,168,84,0.4))",
                    transformOrigin: "center",
                    transform: "scaleY(0.18)",
                    transition: "transform 0.1s ease",
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (phase === "idle") void begin();
                else if (isRecording) void finish();
              }}
              disabled={isBusy || isDone || !canSpeak}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              className="w-12 h-12 rounded-full grid place-items-center transition"
              style={{
                background: isRecording
                  ? "rgba(200,168,84,0.15)"
                  : isDone
                    ? "rgba(100,200,120,0.12)"
                    : "rgba(255,255,255,0.06)",
                border: isRecording
                  ? "1.5px solid rgba(200,168,84,0.6)"
                  : "1.5px solid rgba(255,255,255,0.1)",
              }}
            >
              {isBusy ? (
                <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
              ) : isRecording ? (
                <Square className="w-4 h-4" fill="rgba(200,168,84,0.9)" strokeWidth={0} />
              ) : (
                <Mic
                  className="w-5 h-5"
                  style={{
                    color: isDone
                      ? "rgba(100,200,120,0.9)"
                      : "rgba(255,255,255,0.55)",
                  }}
                />
              )}
            </button>
          </div>

          {/* live transcript / status body */}
          <div
            className="w-full flex items-center justify-center text-center px-2"
            style={{ minHeight: 56 }}
          >
            {(isRecording || isBusy) && !isError ? (
              <p className="text-[14.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                {liveFinal}
                {liveInterim && (
                  <span style={{ color: "rgba(255,255,255,0.3)" }}> {liveInterim}</span>
                )}
                {!liveFinal && !liveInterim && (
                  <span style={{ color: "rgba(255,255,255,0.25)" }}>
                    {isBusy
                      ? phase === "processing"
                        ? "splitting thoughts…"
                        : "placing on the board…"
                      : "listening…"}
                  </span>
                )}
                {isBusy && (liveFinal || liveInterim) && (
                  <span
                    className="block mt-1"
                    style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}
                  >
                    {phase === "processing" ? "splitting thoughts…" : "placing on the board…"}
                  </span>
                )}
              </p>
            ) : isError ? (
              <p className="text-[13px]" style={{ color: "rgba(230,100,80,0.85)" }}>
                {errorMsg ?? "something went wrong"}
              </p>
            ) : isDone ? (
              <p className="text-[14px]" style={{ color: "rgba(100,200,120,0.8)" }}>
                {nodeCount > 1 ? `${nodeCount} ideas` : "1 idea"} added to your board
              </p>
            ) : (
              <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                {!canSpeak
                  ? "mic not available in this browser"
                  : "speak anything — ideas, goals, worries, things you want…"}
              </p>
            )}
          </div>

          {/* status footer */}
          <p className="text-[11px] tracking-wide" style={{ color: "rgba(255,255,255,0.22)" }}>
            {statusLabel(phase, nodeCount)}
            {(phase === "idle" || isError) && " · esc to close"}
            {isRecording && " · esc to cancel"}
          </p>
        </div>
      </div>
    </div>
  );
}
