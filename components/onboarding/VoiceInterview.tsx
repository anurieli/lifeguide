"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type MicState = "idle" | "connecting" | "live" | "error";

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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const tracksRef = useRef<MediaStreamTrack[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mintSession = useAction((api as any).ai.voice.index.mintRealtimeSession);
  const appendTurn = useMutation(api.interview.appendTurn);
  const endSession = useMutation(api.interview.end);

  const session = useQuery(api.interview.get, { sessionId });

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.transcript]);

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

    try {
      // 1. Mint ephemeral token
      const { clientSecret, model } = await mintSession({ sessionId });

      // 2. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tracksRef.current = stream.getTracks();

      // 3. WebRTC handshake with OpenAI Realtime
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Add mic track
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Play assistant audio
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // Data channel for events
      const dc = pc.createDataChannel("oai-events");

      dc.addEventListener("message", (e: MessageEvent) => {
        let evt: Record<string, unknown>;
        try {
          evt = JSON.parse(e.data as string) as Record<string, unknown>;
        } catch {
          return;
        }

        const type = evt.type as string | undefined;

        if (type === "response.audio_transcript.done") {
          const text = (evt.transcript as string | undefined)?.trim();
          if (text) {
            appendTurn({ sessionId, role: "coach", text }).catch(() => {});
          }
        } else if (type === "conversation.item.input_audio_transcription.completed") {
          const text = (evt.transcript as string | undefined)?.trim();
          if (text) {
            appendTurn({ sessionId, role: "user", text }).catch(() => {});
          }
        }
      });

      // SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI Realtime SDP error: ${sdpResponse.status}`);
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

  const micStateLabel: Record<MicState, string> = {
    idle: "Ready to talk",
    connecting: "Connecting…",
    live: "Live",
    error: "Error",
  };

  const micStateDot: Record<MicState, string> = {
    idle: "bg-line",
    connecting: "bg-gold animate-pulse",
    live: "bg-emerald-400 animate-pulse",
    error: "bg-red-400",
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Mic state indicator */}
      <div className="flex items-center gap-2.5">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${micStateDot[micState]}`} />
        <span className="text-[13px] text-ink-mute tracking-wide">{micStateLabel[micState]}</span>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto rounded-[14px] bg-card border border-line p-4 flex flex-col gap-3 min-h-0">
        {session?.transcript && session.transcript.length > 0 ? (
          session.transcript.map((turn, i) => (
            <div
              key={i}
              className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-[12px] px-3.5 py-2.5 text-[14px] leading-relaxed ${
                  turn.role === "coach"
                    ? "bg-coach text-coach-ink"
                    : "bg-ink text-white"
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))
        ) : (
          <p className="text-[14px] text-ink-mute text-center mt-auto mb-auto">
            {micState === "idle"
              ? "Press \"Start talking\" to begin your interview."
              : micState === "connecting"
              ? "Connecting…"
              : "The conversation will appear here."}
          </p>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Error state */}
      {micState === "error" && (
        <div className="rounded-[12px] bg-card border border-line px-4 py-3 text-[14px] text-ink-soft">
          <p className="mb-2">{errorMsg || "Could not start the voice session."}</p>
          <button
            onClick={onFallback}
            className="text-[13px] text-ink underline hover:no-underline"
          >
            Type it out instead
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center flex-wrap">
        {micState === "idle" && (
          <button
            onClick={() => void startVoice()}
            className="rounded-xl px-[26px] py-[13px] text-[15px] bg-ink text-white hover:bg-[#2a2f3a]"
          >
            Start talking
          </button>
        )}

        {micState === "connecting" && (
          <button
            disabled
            className="rounded-xl px-[26px] py-[13px] text-[15px] bg-ink text-white opacity-50 cursor-not-allowed"
          >
            Connecting…
          </button>
        )}

        {micState === "live" && (
          <button
            onClick={() => void endVoice()}
            disabled={ending}
            className="rounded-xl px-[26px] py-[13px] text-[15px] bg-ink text-white hover:bg-[#2a2f3a] disabled:opacity-50"
          >
            {ending ? "Ending…" : "End interview"}
          </button>
        )}

        {micState === "error" && (
          <button
            onClick={() => {
              setMicState("idle");
              setErrorMsg("");
            }}
            className="rounded-xl px-[26px] py-[13px] text-[15px] bg-card border border-line text-ink hover:border-gold"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
