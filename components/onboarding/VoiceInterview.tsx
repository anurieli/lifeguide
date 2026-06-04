"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { QrHandoff } from "./QrHandoff";

type MicState = "idle" | "connecting" | "live" | "error";

const WAVE_BARS = 34;

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

  // Live (not-yet-committed) transcription for the turn currently being spoken,
  // accumulated from the realtime delta events so the words appear as they're said.
  const [coachLive, setCoachLive] = useState("");
  const [userLive, setUserLive] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const tracksRef = useRef<MediaStreamTrack[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const barsRef = useRef<(HTMLElement | null)[]>([]);

  const mintSession = useAction(api.ai.voice.index.mintRealtimeSession);
  const appendTurn = useMutation(api.interview.appendTurn);
  const endSession = useMutation(api.interview.end);

  const session = useQuery(api.interview.get, { sessionId });
  const turns = session?.transcript ?? [];

  // Auto-scroll to the newest words — committed turns and live partials alike.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, coachLive, userLive]);

  // Living waveform while the line is open: each bar drifts toward a new target,
  // louder in the middle. Same visual language as the blueprint's VoiceField.
  useEffect(() => {
    if (micState !== "live") return;
    const id = window.setInterval(() => {
      const n = barsRef.current.length;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const center = 1 - Math.abs(i - n / 2) / (n / 2);
        const t = 0.12 + Math.random() * 0.85 * center + 0.06;
        bar.style.transform = `scaleY(${t.toFixed(2)})`;
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [micState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pcRef.current?.close();
      tracksRef.current.forEach((t) => t.stop());
    };
  }, []);

  async function startVoice() {
    setMicState("connecting");
    setErrorMsg("");
    setCoachLive("");
    setUserLive("");

    try {
      // 1. Mint ephemeral token (model is bound to the ephemeral key, not passed in the SDP URL)
      const { clientSecret } = await mintSession({ sessionId });

      // 2. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tracksRef.current = stream.getTracks();

      // 3. WebRTC handshake with OpenAI Realtime
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Play assistant audio
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // Data channel for events — stream deltas live, commit full turns on done.
      const dc = pc.createDataChannel("oai-events");
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
          // Coach (assistant) speech → text
          case "response.audio_transcript.delta":
            if (delta) setCoachLive((c) => c + delta);
            break;
          case "response.audio_transcript.done":
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
      pcRef.current?.close();
      tracksRef.current.forEach((t) => t.stop());
      pcRef.current = null;
      tracksRef.current = [];
      setMicState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong starting the session.");
    }
  }

  async function endVoice() {
    if (ending) return;
    setEnding(true);
    try {
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

  // ── Error — calm, centered, with the reason and a graceful way out ──
  if (micState === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
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
      <div className="flex flex-col h-full min-h-0 max-w-[760px] w-full mx-auto">
        {/* Quiet header: one breathing dot + a calm End */}
        <div className="flex items-center justify-between pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="vf-pulse" />
            <span className="text-[13px] text-ink-mute tracking-wide">
              {micState === "live" ? "Listening" : "Paused"}
            </span>
          </div>
          <button
            onClick={() => void endVoice()}
            disabled={ending}
            className="rounded-full px-5 py-2 text-[14px] bg-ink text-white hover:bg-[#2a2f3a] disabled:opacity-50 transition"
          >
            {ending ? "Ending…" : "End"}
          </button>
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

        {/* Living waveform */}
        <div className="flex-shrink-0 pt-4 flex justify-center">
          <div className="vf-wave" style={{ height: 40, cursor: "default" }}>
            {Array.from({ length: WAVE_BARS }).map((_, i) => (
              <i
                key={i}
                ref={(el) => {
                  barsRef.current[i] = el;
                }}
                style={{ height: 40 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Pre-start — the QR is the hero; one calm "Start" beneath it ──
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
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
