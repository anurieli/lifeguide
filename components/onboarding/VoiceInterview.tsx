"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { QrHandoff } from "./QrHandoff";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";

const OPENING_PROMPT =
  "Open the conversation now. Greet the person warmly in one short sentence, then ask your first question to begin filling their blueprint. One question at a time, calm and unhurried.";

export function VoiceInterview({
  sessionId,
  onComplete,
  onFallback,
}: {
  sessionId: Id<"interviewSessions">;
  onComplete: () => void;
  onFallback: () => void;
}) {
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const mintSession = useAction(api.ai.voice.index.mintRealtimeSession);
  const appendTurn = useMutation(api.interview.appendTurn);
  const endSession = useMutation(api.interview.end);

  const session = useQuery(api.interview.get, { sessionId });
  const turns = session?.transcript ?? [];

  const voice = useRealtimeVoice({
    mint: () => mintSession({ sessionId }),
    onCoachTurn: (text) => void appendTurn({ sessionId, role: "coach", text }).catch(() => {}),
    onUserTurn: (text) => void appendTurn({ sessionId, role: "user", text }).catch(() => {}),
    openingPrompt: OPENING_PROMPT,
    onEnd: async () => {
      await endSession({ sessionId, status: "completed" });
      onComplete();
    },
  });

  // Auto-scroll to the newest words — committed turns and live partials alike.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, voice.coachLive, voice.userLive]);

  // ── Error — calm, centered, with the reason and a graceful way out ──
  if (voice.micState === "error") {
    return (
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
            onClick={onFallback}
            className="text-[14px] text-ink-mute underline underline-offset-2 hover:text-ink transition"
          >
            Type it out instead
          </button>
        </div>
      </div>
    );
  }

  // ── Live conversation — bubbles + real-time words + a living waveform ──
  if (voice.micState === "live" || turns.length > 0) {
    return (
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
    );
  }

  // ── Pre-start — the QR is the hero; one calm "Start" beneath it ──
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-10">
      <QrHandoff sessionId={sessionId} />
      {voice.micState === "connecting" ? (
        <div className="flex items-center gap-2.5 text-[15px] text-ink-mute">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          Connecting…
        </div>
      ) : (
        <button
          onClick={() => void voice.start()}
          className="rounded-full px-12 py-3.5 text-[17px] tracking-[0.04em] text-ink bg-card border border-line shadow-sm hover:border-gold hover:shadow-md transition-all"
        >
          Start
        </button>
      )}
    </div>
  );
}

/** A calm pill control (Pause / Mute). `active` marks the engaged state. */
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

/** One turn in the conversation. `live` turns are the in-progress words (ghosted, with a caret). */
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
