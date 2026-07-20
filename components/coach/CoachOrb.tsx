"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { FilingReport } from "@/components/voice/FilingReport";

// The Coach orb: talking to the Coach happens right here, in place — no window.
// Idle, it's the "Talk to Coach" pill in the corner. Tapped, the pill becomes a
// living gradient orb that swells with whoever is speaking; ending the call
// files it and shows the report in a small panel above the same corner. The
// session machinery is identical to /speak (interview.start → mint →
// appendTurn → center.synthesizeSession) — only the chrome differs. The
// full-screen /speak surface remains for its own URL.

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
  /** Lets the dock hide its "type instead" button while the orb owns the corner. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("call");
  const [sessionId, setSessionId] = useState<Id<"interviewSessions"> | null>(null);
  const [startFailed, setStartFailed] = useState(false);
  // The mint/appendTurn closures need the id synchronously (before React re-renders).
  const sessionIdRef = useRef<Id<"interviewSessions"> | null>(null);
  const synthRan = useRef(false);

  const startSession = useMutation(api.interview.start);
  const endSession = useMutation(api.interview.end);
  const appendTurn = useMutation(api.interview.appendTurn);
  const mintSession = useAction(api.ai.voice.index.mintRealtimeSession);
  const synthesize = useAction(api.center.synthesizeSession);

  const voice = useRealtimeVoice({
    mint: () => mintSession({ sessionId: sessionIdRef.current! }),
    onCoachTurn: (text) => {
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
      if (id) await endSession({ sessionId: id, status: "completed" });
      setPhase("filing");
    },
  });

  // When the call ends, run the Center, then show the report.
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

  const resetAll = () => {
    sessionIdRef.current = null;
    setSessionId(null);
    setPhase("call");
    setStartFailed(false);
    voice.reset();
  };

  // ── Report: a small panel above the corner, same resolution flow as /speak ──
  if (phase === "report" && sessionId) {
    return (
      <div className="hidden md:flex fixed bottom-6 right-6 z-[76] w-[400px] max-w-[calc(100vw-48px)] max-h-[70vh] rounded-[18px] bg-paper border border-line shadow-2xl flex-col overflow-hidden">
        <FilingReport sessionId={sessionId} onDone={resetAll} />
      </div>
    );
  }

  // ── Filing: the orb settles while the Center files the call ──
  if (phase === "filing") {
    return (
      <div className="coach-cta hidden md:flex fixed bottom-6 right-6 z-[75] items-center gap-2.5 px-5 py-3 text-[14px] text-[#2a2417] shadow-lg">
        <span className="coach-cta-dot coach-cta-dot-fast" />
        Filing what you shared…
      </div>
    );
  }

  // ── Error: quiet, in place ──
  if (voice.micState === "error" || startFailed) {
    return (
      <div className="hidden md:flex fixed bottom-6 right-6 z-[76] w-[320px] rounded-[18px] bg-card border border-line shadow-xl flex-col gap-3 p-4">
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

  // ── Live: the orb, right where the button was ──
  if (voice.micState === "live") {
    return (
      <div className="hidden md:flex fixed bottom-6 right-6 z-[75] flex-col items-center gap-3">
        <div className="coach-orb" ref={voice.registerOrb}>
          <span className="coach-orb-blob coach-orb-b1" />
          <span className="coach-orb-blob coach-orb-b2" />
          <span className="coach-orb-blob coach-orb-b3" />
          <span className="coach-orb-core" />
        </div>
        <span className="text-[12px] text-ink-mute tracking-wide">{voice.statusLabel}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={voice.toggleMute}
            disabled={voice.paused}
            className={`rounded-full px-4 py-1.5 text-[12.5px] border transition disabled:opacity-40 ${
              voice.muted
                ? "bg-ink text-white border-ink"
                : "bg-card text-ink-soft border-line hover:border-gold"
            }`}
          >
            {voice.muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={() => void voice.end()}
            disabled={voice.ending}
            className="rounded-full px-4 py-1.5 text-[12.5px] bg-ink text-white hover:bg-[#2a2f3a] disabled:opacity-50 transition"
          >
            {voice.ending ? "Ending…" : "End"}
          </button>
        </div>
      </div>
    );
  }

  // ── Idle / connecting: the pill ──
  if (stepAside) return null;
  const connecting = voice.micState === "connecting";
  return (
    <button
      onClick={() => void begin()}
      disabled={connecting}
      data-tour="tour-coach"
      title="Talk to your Coach"
      className="coach-cta hidden md:flex fixed bottom-6 right-6 z-[75] items-center gap-2.5 px-5 py-3 text-[14px] font-medium text-[#2a2417] shadow-lg hover:scale-[1.04] transition-transform"
    >
      <span className={`coach-cta-dot ${connecting ? "coach-cta-dot-fast" : ""}`} />
      {connecting ? "Connecting…" : "Talk to Coach"}
    </button>
  );
}
