"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BLUEPRINT } from "@/lib/blueprint";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { LayoutGrid, MessageSquare, Sparkles } from "lucide-react";

const OPENING_PROMPT =
  "Open the conversation now. Greet the person warmly in one short sentence, then continue " +
  "building their Life Blueprint together — ask about whatever is still open, or if everything " +
  "is already filled, invite them to reflect on or revise something. Calm and unhurried, one " +
  "thing at a time.";

type Phase = "starting" | "call" | "synthesizing" | "summary";

function detectDevice(): "desktop" | "phone" {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 768px)").matches ? "phone" : "desktop";
}

/**
 * ConversationalCore — the spoken/guided way to fill the Core (ARI-2, the engine).
 *
 * Built on the same voice spine as onboarding's VoiceInterview and the Listener's
 * SpeakSurface: `useRealtimeVoice` (the WebRTC call) over an `interviewSessions` row
 * (experienceId "core"), minted by `ai/voice.mintRealtimeSession`. Two things differ
 * from onboarding:
 *
 * 1. This session can start at ANY point — 0, some, or all 18 Blueprint answers may
 *    already exist. `mintRealtimeSession` builds a persona (`buildCoreInstructions`)
 *    that knows what's filled so it never re-asks a settled question.
 * 2. It never tags a turn to a specific blueprint key in real time — the conversation
 *    stays free-flowing. Mapping happens once the call ends: `synthesizeInterview`
 *    (the same action onboarding's voice interview already uses) reads the whole
 *    transcript, drafts an answer per key from what was actually said, and writes
 *    only the keys still empty — an existing answer is never silently overwritten,
 *    a spoken answer that conflicts with one on file is surfaced in the summary, not
 *    applied.
 *
 * All three Core modes (grid, Zen, here) read/write the same `coreResponses` via
 * `api.core.get`/`api.core.save` (synthesis writes through `api.core.save` too), so
 * switching modes — including switching away mid-call — never loses an answer: the
 * call is ended and synthesized before the mode switch completes locally, and since
 * Convex mutations/actions aren't tied to this component's lifecycle, synthesis keeps
 * running even if the switch unmounts this component first; the grid/Zen views pick
 * up the new answers reactively the moment they land. See
 * docs/decisions/0022-core-conversational-mode-engine.md.
 */
export function ConversationalCore({
  onExit,
  onZen,
}: {
  onExit: () => void;
  onZen: () => void;
}) {
  const stored = useQuery(api.core.get, {});
  const keys = useMemo(() => BLUEPRINT.flatMap((s) => s.questions.map((q) => q.key)), []);
  const val = (k: string) => stored?.[k] ?? "";
  const doneCount = keys.filter((k) => val(k).trim()).length;
  const loading = stored === undefined;

  const [sessionId, setSessionId] = useState<Id<"interviewSessions"> | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [result, setResult] = useState<{ filled: number; conflicts: string[] } | null>(null);
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const startSession = useMutation(api.interview.start);
  const endSession = useMutation(api.interview.end);
  const appendTurn = useMutation(api.interview.appendTurn);
  const mintSession = useAction(api.ai.voice.index.mintRealtimeSession);
  const synth = useAction(api.ai.synthesizeInterview.synthesizeInterview);

  function openSession() {
    setPhase("starting");
    setResult(null);
    void startSession({ experienceId: "core", device: detectDevice() }).then((id) => {
      if (!mountedRef.current) return;
      setSessionId(id);
      setPhase("call");
    });
  }

  // Open a fresh conversational session the moment this mode is entered.
  useEffect(() => {
    openSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session = useQuery(api.interview.get, sessionId ? { sessionId } : "skip");
  const turns = session?.transcript ?? [];
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

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
      if (!sessionId) return;
      if (mountedRef.current) setPhase("synthesizing");
      await endSession({ sessionId, status: "completed" }).catch(() => {});
      const r = await synth({ sessionId }).catch(() => null);
      if (mountedRef.current) {
        setResult(r ? { filled: r.filled, conflicts: r.conflicts } : null);
        setPhase("summary");
      }
    },
  });

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, voice.coachLive, voice.userLive]);

  // Gracefully end a live call before switching modes — see the class doc above for
  // why this never loses what was said even though the switch is immediate.
  function switchTo(target: () => void) {
    if (voice.micState === "live") void voice.end();
    target();
  }

  return (
    <div className="relative h-full bg-paper overflow-hidden">
      {/* Header — exit + the way back to Zen; always available, even mid-call */}
      <div className="absolute top-0 left-0 right-0 h-[54px] z-30 flex items-center justify-between px-6 bg-card border-b border-line">
        <div className="text-ink font-semibold tracking-tight flex items-center gap-2">
          <span className="text-gold">◆</span> Core
          <span className="text-[12.5px] font-normal text-ink-mute ml-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Conversational
          </span>
        </div>
        <div className="text-[12.5px] text-ink-mute tracking-wide">
          {loading ? " " : `${doneCount} / ${keys.length} answered`}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => switchTo(onZen)}
            className="text-[12.5px] text-ink-mute hover:text-ink flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-4 h-4" /> Zen
          </button>
          <button
            onClick={() => switchTo(onExit)}
            className="text-[12.5px] text-ink-mute hover:text-ink flex items-center gap-1.5 transition"
          >
            <LayoutGrid className="w-4 h-4" /> Grid
          </button>
        </div>
      </div>

      <div className="h-full pt-[54px]">
        {/* Post-call: mapping the conversation into the Blueprint */}
        {phase === "synthesizing" && (
          <Centered>
            <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse mb-4" />
            <p className="text-[15px] text-ink-soft">Weaving what you said into your Blueprint…</p>
          </Centered>
        )}

        {/* Post-call: what landed */}
        {phase === "summary" && (
          <Centered>
            <div className="w-[46px] h-[46px] rounded-full border border-line bg-card flex items-center justify-center mb-5">
              <MessageSquare className="w-5 h-5 text-gold" />
            </div>
            <h1
              className="text-[26px] leading-[1.25] text-ink mb-3 text-center"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {loading ? "…" : `${doneCount} of ${keys.length} answered`}
            </h1>
            <p className="text-[15px] text-ink-soft leading-relaxed max-w-[440px] text-center mb-2">
              {result && result.filled > 0
                ? `I filled in ${result.filled} new answer${result.filled === 1 ? "" : "s"} from what you said.`
                : "Nothing new to fill from that conversation, but it's all still here."}
            </p>
            {result && result.conflicts.length > 0 && (
              <p className="text-[13px] text-ink-mute leading-relaxed max-w-[440px] text-center mb-2">
                Some of what you said touched answers you&apos;d already written — those were left
                as-is; open the grid to compare and edit if you want to update them.
              </p>
            )}
            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={openSession}
                className="rounded-full px-7 py-2.5 text-[15px] bg-ink text-white hover:bg-[#2a2f3a] transition"
              >
                Talk more
              </button>
              <button
                onClick={() => switchTo(onZen)}
                className="text-[14px] text-ink-mute underline underline-offset-2 hover:text-ink transition"
              >
                Continue in Zen
              </button>
              <button
                onClick={() => switchTo(onExit)}
                className="text-[14px] text-ink-mute underline underline-offset-2 hover:text-ink transition"
              >
                Done
              </button>
            </div>
          </Centered>
        )}

        {/* Waiting on the session row before a call can start */}
        {phase === "starting" && (
          <Centered>
            <p className="text-[14px] text-ink-mute animate-pulse">Opening a quiet space…</p>
          </Centered>
        )}

        {/* Everything below is the live-call phase, mirroring VoiceInterview's states */}
        {phase === "call" && voice.micState === "error" && (
          <Centered>
            <p className="text-[14.5px] text-ink-soft max-w-[420px] leading-relaxed text-center mb-6">
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
                onClick={() => switchTo(onZen)}
                className="text-[14px] text-ink-mute underline underline-offset-2 hover:text-ink transition"
              >
                Type it out instead
              </button>
            </div>
          </Centered>
        )}

        {phase === "call" && voice.micState !== "error" && (voice.micState === "live" || turns.length > 0) && (
          <div className="h-full flex justify-center min-h-0 px-5 sm:px-8 py-5 sm:py-8">
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
        )}

        {phase === "call" && voice.micState !== "error" && voice.micState !== "live" && turns.length === 0 && (
          <Centered>
            <div className="w-[46px] h-[46px] rounded-full border border-line bg-card flex items-center justify-center mb-5">
              <MessageSquare className="w-5 h-5 text-gold" />
            </div>
            <h1
              className="text-[28px] leading-[1.25] text-ink mb-3 text-center"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Talk it through
            </h1>
            <p className="text-[15px] text-ink-soft leading-relaxed max-w-[440px] text-center mb-8">
              Say whatever&apos;s on your mind about who you are and where you&apos;re going. I&apos;ll
              ask about what&apos;s still open in your Blueprint and weave what you say into the
              same answers — {loading ? "…" : `${doneCount} of ${keys.length}`} filled so far.
            </p>
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
                Start talking
              </button>
            )}
          </Centered>
        )}
      </div>
    </div>
  );
}

/** Centers its children, filling the space beneath the header. */
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-[9%] text-center">{children}</div>
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
