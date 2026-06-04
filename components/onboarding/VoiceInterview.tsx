"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { QrHandoff } from "./QrHandoff";

type MicState = "idle" | "connecting" | "live" | "error";

const WAVE_BARS = 32;
// One color per party — the waveform tells you who is speaking at a glance.
const AI_COLOR = "#B8945A"; // gold — the Coach
const USER_COLOR = "#3A5C86"; // blue — you
const IDLE_COLOR = "#C7BEAC"; // ghost — silence
// Below this average level a party is considered quiet (so silence reads as idle).
const SPEAK_FLOOR = 0.012;

export function VoiceInterview({
  sessionId,
  onComplete,
  onFallback,
}: {
  sessionId: Id<"interviewSessions">;
  onComplete: () => void;
  onFallback: () => void;
}) {
  const [micState, setMicState] = useState<MicState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [ending, setEnding] = useState(false);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);

  // Live (not-yet-committed) transcription for the turn currently being spoken,
  // accumulated from the realtime delta events so the words appear as they're said.
  const [coachLive, setCoachLive] = useState("");
  const [userLive, setUserLive] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const tracksRef = useRef<MediaStreamTrack[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const barsRef = useRef<(HTMLElement | null)[]>([]);

  // Real audio analysis — one analyser per party, so each bar reacts to the
  // amplitude of whoever is actually talking.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const mintSession = useAction(api.ai.voice.index.mintRealtimeSession);
  const appendTurn = useMutation(api.interview.appendTurn);
  const endSession = useMutation(api.interview.end);

  const session = useQuery(api.interview.get, { sessionId });
  const turns = session?.transcript ?? [];

  // Auto-scroll to the newest words — committed turns and live partials alike.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, coachLive, userLive]);

  // Drive the waveform from real audio. Each frame we read both analysers,
  // pick whoever is louder, and shape the bars to that party's spectrum in
  // their color. Silence settles to a calm ghost line.
  useEffect(() => {
    if (micState !== "live") return;

    let userFreq: Uint8Array<ArrayBuffer> | null = null;
    let aiFreq: Uint8Array<ArrayBuffer> | null = null;

    const avg = (arr: Uint8Array<ArrayBuffer>) => {
      let sum = 0;
      for (let i = 0; i < arr.length; i++) sum += arr[i];
      return sum / (arr.length * 255);
    };

    const tick = () => {
      const ua = userAnalyserRef.current;
      const aa = aiAnalyserRef.current;

      if (ua && !userFreq) userFreq = new Uint8Array(new ArrayBuffer(ua.frequencyBinCount));
      if (aa && !aiFreq) aiFreq = new Uint8Array(new ArrayBuffer(aa.frequencyBinCount));

      let userLevel = 0;
      let aiLevel = 0;
      if (ua && userFreq) {
        ua.getByteFrequencyData(userFreq);
        userLevel = avg(userFreq);
      }
      if (aa && aiFreq) {
        aa.getByteFrequencyData(aiFreq);
        aiLevel = avg(aiFreq);
      }

      const loudest = Math.max(userLevel, aiLevel);
      const userActive = userLevel >= aiLevel;
      const speaking = loudest >= SPEAK_FLOOR;
      const color = !speaking ? IDLE_COLOR : userActive ? USER_COLOR : AI_COLOR;
      const src = userActive ? userFreq : aiFreq;

      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const raw = speaking && src ? src[i] / 255 : 0;
        // Gentle floor so the line is always alive, capped at full height.
        const scale = Math.min(1, 0.08 + raw * 1.15);
        bar.style.transform = `scaleY(${scale.toFixed(3)})`;
        bar.style.background = color;
      });

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [micState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardownAudio();
      pcRef.current?.close();
      tracksRef.current.forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function teardownAudio() {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    userAnalyserRef.current = null;
    aiAnalyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }

  function ensureAudioCtx(): AudioContext | null {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    audioCtxRef.current = ctx;
    return ctx;
  }

  function makeAnalyser(stream: MediaStream): AnalyserNode | null {
    const ctx = ensureAudioCtx();
    if (!ctx) return null;
    try {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // 32 bins → one per bar
      analyser.smoothingTimeConstant = 0.6; // responsive, not jittery
      source.connect(analyser);
      return analyser;
    } catch {
      return null;
    }
  }

  async function startVoice() {
    setMicState("connecting");
    setErrorMsg("");
    setCoachLive("");
    setUserLive("");
    setMuted(false);
    setPaused(false);

    try {
      // 1. Mint ephemeral token (model is bound to the ephemeral key, not passed in the SDP URL)
      const { clientSecret } = await mintSession({ sessionId });

      // 2. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tracksRef.current = stream.getTracks();

      // Tap the mic for the "you" half of the waveform.
      userAnalyserRef.current = makeAnalyser(stream);
      await audioCtxRef.current?.resume().catch(() => {});

      // 3. WebRTC handshake with OpenAI Realtime
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Play assistant audio + tap it for the "Coach" half of the waveform.
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        aiAnalyserRef.current = makeAnalyser(e.streams[0]);
      };

      // Data channel for events — stream deltas live, commit full turns on done.
      const dc = pc.createDataChannel("oai-events");

      // The Coach leads: as soon as the line is open, ask it to greet and pose
      // the first question instead of waiting for the user to speak first.
      dc.addEventListener("open", () => {
        try {
          dc.send(
            JSON.stringify({
              type: "response.create",
              response: {
                instructions:
                  "Open the conversation now. Greet the person warmly in one short sentence, then ask your first question to begin filling their blueprint. One question at a time, calm and unhurried.",
              },
            }),
          );
        } catch {
          /* if the channel isn't ready the model will still respond on first speech */
        }
      });

      dc.addEventListener("message", (e: MessageEvent) => {
        let evt: Record<string, unknown>;
        try {
          evt = JSON.parse(e.data as string) as Record<string, unknown>;
        } catch {
          return;
        }
        const type = evt.type as string | undefined;
        const delta = (evt.delta as string | undefined) ?? "";
        const transcript = (evt.transcript as string | undefined)?.trim();

        switch (type) {
          // Coach (assistant) speech → text. The GA API renamed these to
          // `response.output_audio_transcript.*`; we accept both so the
          // Coach's words always stream in as they're spoken.
          case "response.audio_transcript.delta":
          case "response.output_audio_transcript.delta":
            if (delta) setCoachLive((c) => c + delta);
            break;
          case "response.audio_transcript.done":
          case "response.output_audio_transcript.done":
            if (transcript) appendTurn({ sessionId, role: "coach", text: transcript }).catch(() => {});
            setCoachLive("");
            break;
          // Human speech → text (requires input transcription enabled on the session)
          case "conversation.item.input_audio_transcription.delta":
            if (delta) setUserLive((u) => u + delta);
            break;
          case "conversation.item.input_audio_transcription.completed":
            if (transcript) appendTurn({ sessionId, role: "user", text: transcript }).catch(() => {});
            setUserLive("");
            break;
        }
      });

      // SDP offer → GA WebRTC exchange (Beta `/v1/realtime?model=…` was retired 2026-05-12)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        const detail = await sdpResponse.text().catch(() => "");
        throw new Error(`OpenAI Realtime SDP error: ${sdpResponse.status} ${detail.slice(0, 200)}`);
      }

      const answerText = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerText });

      setMicState("live");
    } catch (err) {
      teardownAudio();
      pcRef.current?.close();
      tracksRef.current.forEach((t) => t.stop());
      pcRef.current = null;
      tracksRef.current = [];
      setMicState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong starting the session.");
    }
  }

  // Mute just your microphone — the Coach keeps talking, it just can't hear you.
  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      tracksRef.current.forEach((t) => {
        if (t.kind === "audio") t.enabled = !next;
      });
      return next;
    });
  }

  // Pause holds the whole exchange: mic off, Coach audio paused, waveform frozen.
  function togglePause() {
    setPaused((p) => {
      const next = !p;
      tracksRef.current.forEach((t) => {
        if (t.kind === "audio") t.enabled = next ? false : !muted;
      });
      if (audioRef.current) {
        if (next) audioRef.current.pause();
        else void audioRef.current.play().catch(() => {});
      }
      if (next) void audioCtxRef.current?.suspend().catch(() => {});
      else void audioCtxRef.current?.resume().catch(() => {});
      return next;
    });
  }

  async function endVoice() {
    if (ending) return;
    setEnding(true);
    try {
      teardownAudio();
      pcRef.current?.close();
      tracksRef.current.forEach((t) => t.stop());
      pcRef.current = null;
      tracksRef.current = [];
      await endSession({ sessionId, status: "completed" });
      onComplete();
    } catch {
      setEnding(false);
    }
  }

  const statusLabel = paused ? "Paused" : muted ? "Muted" : "Listening";

  // ── Error — calm, centered, with the reason and a graceful way out ──
  if (micState === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <p className="text-[14.5px] text-ink-soft max-w-[380px] leading-relaxed">
          {errorMsg || "Could not start the voice session."}
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setMicState("idle");
              setErrorMsg("");
            }}
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
  if (micState === "live" || turns.length > 0) {
    return (
      <div className="flex-1 flex justify-center min-h-0 px-5 sm:px-8 py-5 sm:py-8">
        <div className="flex flex-col h-full min-h-0 max-w-[680px] w-full">
          {/* Quiet header: one breathing dot + the current state */}
          <div className="flex items-center gap-2.5 pb-4 flex-shrink-0">
            <span className="vf-pulse" />
            <span className="text-[13px] text-ink-mute tracking-wide">{statusLabel}</span>
          </div>

          {/* The conversation — fills the space, scrolls up as it grows */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 px-0.5 py-2">
            {turns.map((turn, i) => (
              <Bubble key={i} role={turn.role} text={turn.text} />
            ))}
            {userLive && <Bubble role="user" text={userLive} live />}
            {coachLive && <Bubble role="coach" text={coachLive} live />}
            <div ref={transcriptEndRef} />
          </div>

          {/* Living waveform — gold for the Coach, blue for you, each reacting
              to its own audio. Below it: pause / mute / stop. */}
          <div className="flex-shrink-0 pt-6 flex flex-col items-center gap-5">
            <div className="vf-wave" style={{ height: 44, cursor: "default" }}>
              {Array.from({ length: WAVE_BARS }).map((_, i) => (
                <i
                  key={i}
                  ref={(el) => {
                    barsRef.current[i] = el;
                  }}
                  style={{
                    height: 44,
                    transition: "transform 0.07s linear, background 0.3s",
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <ControlButton onClick={togglePause} active={paused}>
                {paused ? "Resume" : "Pause"}
              </ControlButton>
              <ControlButton onClick={toggleMute} active={muted} disabled={paused}>
                {muted ? "Unmute" : "Mute"}
              </ControlButton>
              <button
                onClick={() => void endVoice()}
                disabled={ending}
                className="rounded-full px-5 py-2 text-[14px] bg-ink text-white hover:bg-[#2a2f3a] disabled:opacity-50 transition"
              >
                {ending ? "Ending…" : "End"}
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
      {micState === "connecting" ? (
        <div className="flex items-center gap-2.5 text-[15px] text-ink-mute">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          Connecting…
        </div>
      ) : (
        <button
          onClick={() => void startVoice()}
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
        active
          ? "bg-ink text-white border-ink"
          : "bg-card text-ink-soft border-line hover:border-gold"
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
          isCoach
            ? "bg-coach text-coach-ink rounded-bl-[6px]"
            : "bg-ink text-white rounded-br-[6px]"
        } ${live ? "vf-script opacity-80" : ""}`}
      >
        {text}
        {live && <span className="vf-caret" />}
      </div>
    </div>
  );
}
