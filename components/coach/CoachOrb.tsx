"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { Check, Mic, MicOff, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { FilingReport } from "@/components/voice/FilingReport";
import type { ContextSource } from "@/lib/listenerMemory";

// The Coach orb: talking to the Coach happens right here, in place — no window.
// Idle, it's a small "Talk to Coach" pill in the corner row (CoachDock hosts the
// row and puts the chat toggle beside it). Tapped, a living gradient orb grows
// over the corner and swells with whoever is speaking. Under the orb: mute, a
// toss (✕ — discard the conversation, nothing files), and end-and-file (✓).
// Ending files through the Center and shows the report in a compact corner
// panel. Same session machinery as /speak (interview.start → mint → appendTurn
// → center.synthesizeSession); the full-screen /speak surface remains at its URL.

const OPENING_PROMPT =
  "Open the conversation now. Greet the person warmly in one short sentence and invite them to share whatever is on their mind right now. Then follow where they go.";

type Phase = "call" | "filing" | "report";

function clientLog(event: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  void fetch("/api/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, meta }),
  }).catch(() => {});
}

function detectDevice(): "desktop" | "phone" {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 768px)").matches ? "phone" : "desktop";
}

export function CoachOrb({
  stepAside,
  onBusyChange,
}: {
  /** The open thought document is pure capture: the idle pill yields there.
      A live call never vanishes mid-sentence, though — only idle hides. */
  stepAside: boolean;
  /** Lets the dock hide its chat toggle while the orb owns the corner. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("call");
  const [sessionId, setSessionId] = useState<Id<"interviewSessions"> | null>(null);
  const [startFailed, setStartFailed] = useState(false);
  // The live panel above the orb: the Coach's current/last line, and the exact
  // context the session was minted with ("what it knows"), shown on demand.
  const [lastCoach, setLastCoach] = useState("");
  const [contextSources, setContextSources] = useState<ContextSource[] | null>(null);
  const [showContext, setShowContext] = useState(false);
  // The mint/appendTurn closures need the id synchronously (before React re-renders).
  const sessionIdRef = useRef<Id<"interviewSessions"> | null>(null);
  const synthRan = useRef(false);
  // Set just before voice.end() when the person tosses: end the session as
  // "tossed" (the memory backbone still summarizes it — ADR 0023), skip the
  // Center and the report entirely, snap back to the pill.
  const tossRef = useRef(false);

  const startSession = useMutation(api.interview.start);
  const endSession = useMutation(api.interview.end);
  const appendTurn = useMutation(api.interview.appendTurn);
  const mintSession = useAction(api.ai.voice.index.mintRealtimeSession);
  const synthesize = useAction(api.center.synthesizeSession);

  const voice = useRealtimeVoice({
    mint: async () => {
      const minted = await mintSession({ sessionId: sessionIdRef.current! });
      setContextSources(minted.contextSources ?? null);
      return minted;
    },
    onCoachTurn: (text) => {
      setLastCoach(text);
      const id = sessionIdRef.current;
      if (id) void appendTurn({ sessionId: id, role: "coach", text }).catch(() => {});
    },
    onUserTurn: (text) => {
      const id = sessionIdRef.current;
      if (id) void appendTurn({ sessionId: id, role: "user", text }).catch(() => {});
    },
    openingPrompt: OPENING_PROMPT,
    onEnd: async () => {
      const id = sessionIdRef.current;
      if (tossRef.current) {
        tossRef.current = false;
        if (id) await endSession({ sessionId: id, status: "tossed" });
        resetAll();
        return;
      }
      if (id) await endSession({ sessionId: id, status: "completed" });
      setPhase("filing");
    },
  });

  // When the call ends (not tossed), run the Center, then show the report.
  useEffect(() => {
    if (phase !== "filing" || !sessionIdRef.current || synthRan.current) return;
    synthRan.current = true;
    void synthesize({ sessionId: sessionIdRef.current })
      .catch(() => {})
      .finally(() => setPhase("report"));
  }, [phase, synthesize]);

  const busy = voice.micState !== "idle" || phase !== "call" || startFailed;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const begin = async () => {
    if (voice.micState !== "idle") return;
    clientLog("talk.orb.start");
    setStartFailed(false);
    synthRan.current = false;
    try {
      const id = await startSession({ experienceId: "listen", device: detectDevice() });
      sessionIdRef.current = id;
      setSessionId(id);
    } catch {
      setStartFailed(true);
      return;
    }
    await voice.start();
  };

  const toss = () => {
    tossRef.current = true;
    void voice.end();
  };

  const resetAll = () => {
    sessionIdRef.current = null;
    setSessionId(null);
    setPhase("call");
    setStartFailed(false);
    setLastCoach("");
    setContextSources(null);
    setShowContext(false);
    voice.reset();
  };

  // ── Report: a small panel above the corner, same resolution flow as /speak ──
  if (phase === "report" && sessionId) {
    return (
      <div className="fixed bottom-6 right-6 z-[76] flex w-[400px] max-w-[calc(100vw-48px)] max-h-[70vh] rounded-[18px] bg-paper border border-line shadow-2xl flex-col overflow-hidden">
        <FilingReport sessionId={sessionId} onDone={resetAll} />
      </div>
    );
  }

  // ── Filing: the orb settles while the Center files the call ──
  if (phase === "filing") {
    return (
      <div className="coach-cta relative flex items-center gap-2 px-3.5 py-2 text-[12.5px] text-[#2a2417] shadow-md">
        <span className="coach-cta-dot coach-cta-dot-fast" />
        Filing what you shared…
      </div>
    );
  }

  // ── Error: quiet, in place ──
  if (voice.micState === "error" || startFailed) {
    return (
      <div className="fixed bottom-6 right-6 z-[76] flex w-[320px] rounded-[18px] bg-card border border-line shadow-xl flex-col gap-3 p-4">
        <p className="text-[13.5px] text-ink-soft leading-relaxed">
          {startFailed
            ? "Could not open the line just now."
            : voice.errorMsg || "Could not start the voice session."}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetAll();
              void begin();
            }}
            className="rounded-full px-4 py-1.5 text-[13px] bg-ink text-white hover:bg-[#2a2f3a] transition"
          >
            Try again
          </button>
          <button
            onClick={resetAll}
            className="text-[13px] text-ink-mute underline underline-offset-2 hover:text-ink transition"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  // ── Live: the orb, right where the pill was ──
  if (voice.micState === "live") {
    const liveText = voice.coachLive || lastCoach;
    return (
      <div className="fixed bottom-6 right-6 z-[75] flex flex-col items-end gap-3">
        {/* The minimalist window above the orb: what the Coach is saying as it
            streams, what it heard you say, and (on demand) the exact context
            the session opened with. Transparent, calm, never required. */}
        {(liveText || voice.userLive || showContext) && (
          <div className="w-[320px] max-h-[40vh] overflow-y-auto rounded-[14px] bg-paper/75 backdrop-blur-md border border-line/60 shadow-lg px-4 py-3 flex flex-col gap-2">
            {showContext && contextSources && contextSources.length > 0 && (
              <div className="pb-2 border-b border-line/60 flex flex-col gap-2">
                <div className="text-[10.5px] uppercase tracking-[0.08em] text-ink-mute mb-1">
                  What your Coach opened with
                </div>
                {contextSources.map((source) => (
                  <div key={source.label}>
                    <div className="text-[10.5px] font-medium text-ink-soft mb-0.5">{source.label}</div>
                    <p className="text-[11.5px] text-ink-mute leading-relaxed whitespace-pre-wrap">
                      {source.detail}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {voice.userLive && (
              <p className="text-[12.5px] text-ink-mute italic leading-relaxed">
                “{voice.userLive}”
              </p>
            )}
            {liveText && (
              <p className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
                {liveText}
                {voice.coachLive && <span className="vf-caret" />}
              </p>
            )}
          </div>
        )}
        <div className="self-center flex flex-col items-center gap-3">
        <div className="coach-orb" ref={voice.registerOrb}>
          <span className="coach-orb-blob coach-orb-b1" />
          <span className="coach-orb-blob coach-orb-b2" />
          <span className="coach-orb-blob coach-orb-b3" />
          <span className="coach-orb-core" />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] text-ink-mute tracking-wide">{voice.statusLabel}</span>
          {contextSources && contextSources.length > 0 && (
            <button
              onClick={() => setShowContext((s) => !s)}
              className="text-[11px] text-ink-mute underline underline-offset-2 hover:text-ink transition"
            >
              {showContext ? "hide context" : "what it knows"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <OrbControl
            title={voice.muted ? "Unmute" : "Mute"}
            active={voice.muted}
            onClick={voice.toggleMute}
            disabled={voice.paused}
          >
            {voice.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </OrbControl>
          <OrbControl title="Toss this conversation" onClick={toss} disabled={voice.ending}>
            <X className="w-4 h-4" />
          </OrbControl>
          <OrbControl
            title="End and file"
            primary
            onClick={() => void voice.end()}
            disabled={voice.ending}
          >
            <Check className="w-4 h-4" />
          </OrbControl>
        </div>
        </div>
      </div>
    );
  }

  // ── Idle / connecting: a small pill, sitting in the dock's corner row ──
  if (stepAside) return null;
  const connecting = voice.micState === "connecting";
  return (
    <button
      onClick={() => void begin()}
      disabled={connecting}
      data-tour="tour-coach"
      title="Talk to your Coach"
      className="coach-cta relative flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-medium text-[#2a2417] shadow-md hover:scale-[1.04] transition-transform"
    >
      <span className={`coach-cta-dot ${connecting ? "coach-cta-dot-fast" : ""}`} />
      {connecting ? "Connecting…" : "Talk to Coach"}
    </button>
  );
}

function OrbControl({
  title,
  onClick,
  children,
  active = false,
  primary = false,
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`w-9 h-9 rounded-full border flex items-center justify-center transition disabled:opacity-40 ${
        primary
          ? "bg-ink text-white border-ink hover:bg-[#2a2f3a]"
          : active
            ? "bg-ink text-white border-ink"
            : "bg-card text-ink-soft border-line hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}
