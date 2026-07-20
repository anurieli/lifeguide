"use client";

import { useEffect, useRef, useState } from "react";

// ============================================================================
// useRealtimeVoice — the shared brain of every LifeGuide voice call.
// ============================================================================
// Owns the OpenAI Realtime WebRTC handshake, the two-party live transcription
// (Coach/Listener vs you), the real-audio waveform (one analyser per party), and
// the mute / pause / end controls. The UI on top is just chrome. Both the onboarding
// interviewer (components/onboarding/VoiceInterview) and the Listener
// (components/voice/SpeakSurface) render their own surface around this hook.
// ============================================================================

export type MicState = "idle" | "connecting" | "live" | "error";

export const WAVE_BARS = 32;
// One color per party — the waveform tells you who is speaking at a glance.
const AI_COLOR = "#B8945A"; // gold — the Coach / Listener
const USER_COLOR = "#3A5C86"; // blue — you
const IDLE_COLOR = "#C7BEAC"; // ghost — silence
// Below this average level a party is considered quiet (so silence reads as idle).
const SPEAK_FLOOR = 0.012;

export type RealtimeVoiceConfig = {
  /** Mint an ephemeral realtime client secret (server-side; bound to the persona). */
  mint: () => Promise<{ clientSecret: string }>;
  /** A completed assistant (Coach/Listener) turn → persist it. */
  onCoachTurn: (text: string) => void;
  /** A completed human turn → persist it. */
  onUserTurn: (text: string) => void;
  /** Optional instruction to open the conversation as soon as the line is live. */
  openingPrompt?: string;
  /** Called when the user ends the call, after audio is torn down. */
  onEnd?: () => void | Promise<void>;
};

export function useRealtimeVoice(config: RealtimeVoiceConfig) {
  const [micState, setMicState] = useState<MicState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [ending, setEnding] = useState(false);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);

  // Live (not-yet-committed) transcription for the turn currently being spoken.
  const [coachLive, setCoachLive] = useState("");
  const [userLive, setUserLive] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const tracksRef = useRef<MediaStreamTrack[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barsRef = useRef<(HTMLElement | null)[]>([]);
  const orbRef = useRef<HTMLElement | null>(null);
  const orbLevelRef = useRef(0);

  // Real audio analysis — one analyser per party, so each bar reacts to the
  // amplitude of whoever is actually talking.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Keep the latest config (callbacks) without re-subscribing the data channel.
  const cfgRef = useRef(config);
  cfgRef.current = config;

  /** Register a waveform bar element by index (called from the UI's render). */
  function registerBar(i: number, el: HTMLElement | null) {
    barsRef.current[i] = el;
  }

  /** Register a single "orb" element: the tick loop drives `--voice-level` (0..1,
      smoothed) and `--voice-glow` (the speaking party's color) on it, so a CSS
      orb can swell and glow with whoever is talking. Used by CoachOrb. */
  function registerOrb(el: HTMLElement | null) {
    orbRef.current = el;
  }

  // Drive the waveform from real audio. Each frame we read both analysers, pick
  // whoever is louder, and shape the bars to that party's spectrum in their color.
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
        const scale = Math.min(1, 0.08 + raw * 1.15);
        bar.style.transform = `scaleY(${scale.toFixed(3)})`;
        bar.style.background = color;
      });

      const orb = orbRef.current;
      if (orb) {
        // Lerp toward the live level so the orb swells and settles instead of jittering.
        const target = speaking ? Math.min(1, loudest * 3.2) : 0;
        orbLevelRef.current += (target - orbLevelRef.current) * 0.18;
        orb.style.setProperty("--voice-level", orbLevelRef.current.toFixed(3));
        orb.style.setProperty("--voice-glow", color);
      }

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

  async function start() {
    setMicState("connecting");
    setErrorMsg("");
    setCoachLive("");
    setUserLive("");
    setMuted(false);
    setPaused(false);

    try {
      // 1. Mint ephemeral token (model + persona are bound server-side).
      const { clientSecret } = await cfgRef.current.mint();

      // 2. Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tracksRef.current = stream.getTracks();
      userAnalyserRef.current = makeAnalyser(stream);
      await audioCtxRef.current?.resume().catch(() => {});

      // 3. WebRTC handshake with OpenAI Realtime
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        aiAnalyserRef.current = makeAnalyser(e.streams[0]);
      };

      const dc = pc.createDataChannel("oai-events");

      // The assistant leads: as soon as the line is open, ask it to open the conversation.
      dc.addEventListener("open", () => {
        const opening = cfgRef.current.openingPrompt;
        try {
          dc.send(
            JSON.stringify({
              type: "response.create",
              ...(opening ? { response: { instructions: opening } } : {}),
            }),
          );
        } catch {
          /* if the channel isn't ready the model still responds on first speech */
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
          case "response.audio_transcript.delta":
          case "response.output_audio_transcript.delta":
            if (delta) setCoachLive((c) => c + delta);
            break;
          case "response.audio_transcript.done":
          case "response.output_audio_transcript.done":
            if (transcript) cfgRef.current.onCoachTurn(transcript);
            setCoachLive("");
            break;
          case "conversation.item.input_audio_transcription.delta":
            if (delta) setUserLive((u) => u + delta);
            break;
          case "conversation.item.input_audio_transcription.completed":
            if (transcript) cfgRef.current.onUserTurn(transcript);
            setUserLive("");
            break;
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" },
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

  // Mute just your microphone — the assistant keeps talking, it just can't hear you.
  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      tracksRef.current.forEach((t) => {
        if (t.kind === "audio") t.enabled = !next;
      });
      return next;
    });
  }

  // Pause holds the whole exchange: mic off, assistant audio paused, waveform frozen.
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

  async function end() {
    if (ending) return;
    setEnding(true);
    try {
      teardownAudio();
      pcRef.current?.close();
      tracksRef.current.forEach((t) => t.stop());
      pcRef.current = null;
      tracksRef.current = [];
      await cfgRef.current.onEnd?.();
    } catch {
      setEnding(false);
    }
  }

  /** Reset back to idle (used by the error screen's "try again"). */
  function reset() {
    setMicState("idle");
    setErrorMsg("");
  }

  const statusLabel = paused ? "Paused" : muted ? "Muted" : "Listening";

  return {
    micState,
    errorMsg,
    ending,
    muted,
    paused,
    coachLive,
    userLive,
    statusLabel,
    start,
    toggleMute,
    togglePause,
    end,
    reset,
    registerBar,
    registerOrb,
    WAVE_BARS,
  };
}
