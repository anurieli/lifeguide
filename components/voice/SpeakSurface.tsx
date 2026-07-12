"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { FilingReport } from "./FilingReport";

// The Listener surface: always-available /speak voice. The person talks; the Listener
// thinks with them; when the call ends the Center files what was heard and the report
// shows what landed where. See agents/listener/ and agents/center/.

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

export function SpeakSurface({ onClose }: { onClose: () => void }) {
  const [sessionId, setSessionId] = useState<Id<"interviewSessions"> | null>(null);
  const [phase, setPhase] = useState<Phase>("call");
  const synthRan = useRef(false);

  const startSession = useMutation(api.interview.start);
  const endSession = useMutation(api.interview.end);
  const mintSession = useAction(api.ai.voice.index.mintRealtimeSession);
  const synthesize = useAction(api.center.synthesizeSession);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Spin up the listening session once on mount.
  useEffect(() => {
    let live = true;
    void startSession({ experienceId: "listen", device: detectDevice() }).then((id) => {
      if (live) setSessionId(id);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendTurn = useMutation(api.interview.appendTurn);

  const session = useQuery(api.interview.get, sessionId ? { sessionId } : "skip");
  const turns = session?.transcript ?? [];

  const voice = useRealtimeVoice({
    mint: () => mintSession({ sessionId: sessionId! }),
    onCoachTurn: (text) => {
      if (sessionId) void appendTurn({ sessionId, role: "coach", text }).catch(() => {});
    },
    onUserTurn: (text) => {
      if (sessionId) void appendTurn({ sessionId, role: "user", text }).catch(() => {});
    },
    openingPrompt: OPENING_PROMPT,
    onEnd: async () => {
      if (sessionId) await endSession({ sessionId, status: "completed" });
      setPhase("filing");
    },
  });

  // When the call ends, run the Center, then show the report.
  useEffect(() => {
    if (phase !== "filing" || !sessionId || synthRan.current) return;
    synthRan.current = true;
    void synthesize({ sessionId })
      .catch(() => {})
      .finally(() => setPhase("report"));
  }, [phase, sessionId, synthesize]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, voice.coachLive, voice.userLive]);

  // ── Report ──
  if (phase === "report" && sessionId) {
    return (
      <Shell onClose={onClose}>
        <FilingReport sessionId={sessionId} onDone={onClose} />
      </Shell>
    );
  }

  // ── Filing ──
  if (phase === "filing") {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
          <p className="text-[15px] text-ink-soft">Filing what you shared…</p>
        </div>
      </Shell>
    );
  }

  // ── Preparing the session ──
  if (!sessionId) {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex items-center justify-center text-ink-mute text-[15px]">
          Opening a quiet space…
        </div>
      </Shell>
    );
  }

  // ── Error ──
  if (voice.micState === "error") {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-10 text-center">
          <p className="text-[14.5px] text-ink-soft max-w-[380px] leading-relaxed">
            {voice.errorMsg || "Could not start the voice session."}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={voice.reset}
              className="rounded-full px-7 py-2.5 text-[15px] bg-ink text-white hover:bg-[#2a2f3a] transition"
            >
              Try again
            </button>
            <button
              onClick={onClose}
              className="text-[14px] text-ink-mute underline underline-offset-2 hover:text-ink transition"
            >
              Not now
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Live conversation ──
  if (voice.micState === "live" || turns.length > 0) {
    return (
      <Shell onClose={onClose}>
        <div className="flex-1 flex justify-center min-h-0 px-5 sm:px-8 py-5 sm:py-8">
          <div className="flex flex-col h-full min-h-0 max-w-[680px] w-full">
            <div className="flex items-center gap-2.5 pb-4 flex-shrink-0">
              <span className="vf-pulse" />
              <span className="text-[13px] text-ink-mute tracking-wide">{voice.statusLabel}</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 px-0.5 py-2">
              {turns.map((turn, i) => (
                <Bubble key={i} role={turn.role} text={turn.text} />
              ))}
              {voice.userLive && <Bubble role="user" text={voice.userLive} live />}
              {voice.coachLive && <Bubble role="coach" text={voice.coachLive} live />}
              <div ref={transcriptEndRef} />
            </div>

            <div className="flex-shrink-0 pt-6 flex flex-col items-center gap-5">
              <div className="vf-wave" style={{ height: 44, cursor: "default" }}>
                {Array.from({ length: voice.WAVE_BARS }).map((_, i) => (
                  <i
                    key={i}
                    ref={(el) => voice.registerBar(i, el)}
                    style={{ height: 44, transition: "transform 0.07s linear, background 0.3s" }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <ControlButton onClick={voice.togglePause} active={voice.paused}>
                  {voice.paused ? "Resume" : "Pause"}
                </ControlButton>
                <ControlButton onClick={voice.toggleMute} active={voice.muted} disabled={voice.paused}>
                  {voice.muted ? "Unmute" : "Mute"}
                </ControlButton>
                <button
                  onClick={() => void voice.end()}
                  disabled={voice.ending}
                  className="rounded-full px-5 py-2 text-[14px] bg-ink text-white hover:bg-[#2a2f3a] disabled:opacity-50 transition"
                >
                  {voice.ending ? "Ending…" : "End"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Pre-start ──
  return (
    <Shell onClose={onClose}>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-10 text-center">
        <div className="flex flex-col gap-3 max-w-[440px]">
          <h2 className="text-[24px] text-ink font-semibold tracking-tight">Talk it through</h2>
          <p className="text-[15px] text-ink-soft leading-relaxed">
            Say whatever is on your mind. I'll listen and think with you. When we're done, I'll file
            what matters into who you are.
          </p>
        </div>
        {voice.micState === "connecting" ? (
          <div className="flex items-center gap-2.5 text-[15px] text-ink-mute">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            Connecting…
          </div>
        ) : (
          <button
            onClick={() => {
              clientLog("talk.start", { sessionId });
              void voice.start();
            }}
            className="rounded-full px-12 py-3.5 text-[17px] tracking-[0.04em] text-ink bg-card border border-line shadow-sm hover:border-gold hover:shadow-md transition-all"
          >
            Start talking
          </button>
        )}
      </div>
    </Shell>
  );
}

/** Full-bleed calm container with a quiet way out. */
function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] bg-paper flex flex-col">
      <div className="flex justify-end p-4">
        <button
          onClick={onClose}
          className="text-ink-mute hover:text-ink text-[14px] rounded-full px-4 py-1.5 hover:bg-card transition"
        >
          Close
        </button>
      </div>
      {children}
    </div>
  );
}

function ControlButton({
  onClick,
  active = false,
  disabled = false,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-5 py-2 text-[14px] border transition disabled:opacity-40 ${
        active ? "bg-ink text-white border-ink" : "bg-card text-ink-soft border-line hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}

function Bubble({
  role,
  text,
  live = false,
}: {
  role: "coach" | "user";
  text: string;
  live?: boolean;
}) {
  const isCoach = role === "coach";
  return (
    <div className={`flex ${isCoach ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-[16px] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
          isCoach ? "bg-coach text-coach-ink rounded-bl-[6px]" : "bg-ink text-white rounded-br-[6px]"
        } ${live ? "vf-script opacity-80" : ""}`}
      >
        {text}
        {live && <span className="vf-caret" />}
      </div>
    </div>
  );
}
