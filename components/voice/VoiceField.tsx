"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Mic, Square } from "lucide-react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useWhisperRecorder } from "@/lib/useWhisperRecorder";
import type { FieldMeta } from "@/lib/voiceField";

type Phase = "idle" | "listening" | "analyzing";

const BAR_COUNT = { default: 11, compact: 9 } as const;
const PROMPT_ROTATE_MS = 3800; // how long each single prompt holds before the next one fades in

/**
 * VoiceField — one voice-capable input for any field in LifeGuide.
 *
 * Drop-in replacement for a controlled `<textarea>`: same `value` / `onChange`
 * contract, plus a mic. Transcription runs two layers at once: chunked server-side
 * Whisper (the accurate, cross-browser transcript that becomes the answer) and the
 * browser's Web Speech API (the instant live caption, and the fallback if Whisper
 * is unavailable or its chunks drop). An AI pass then shapes the raw transcript into
 * what the field is asking for. Prompt Mode surfaces ONE AI-generated suggestion at
 * a time, inside the recording surface, related to what's being said (field metadata
 * + the Mirror).
 *
 * The host still renders the field's label/question; `meta` carries that same
 * info to the AI so shaping + prompts are about THIS field. See
 * docs/product/features/voice-field.md and components/voice/README.md.
 */
export function VoiceField({
  meta,
  value,
  onChange,
  onCommit,
  variant = "default",
  rows = 2,
  className = "",
  inputClassName = "",
  ctaTooltip = "Speak it, I'll shape it",
}: {
  meta: FieldMeta;
  value: string;
  onChange: (next: string) => void;
  /** Called when an edit should be persisted: on blur, and after a voice answer is shaped. */
  onCommit?: (next: string) => void;
  variant?: "default" | "compact";
  rows?: number;
  className?: string;
  /** Extra classes for the textarea itself, so each surface keeps its own field styling. */
  inputClassName?: string;
  /** Hover tooltip on the idle mic — tell the person where this takes them. */
  ctaTooltip?: string;
}) {
  const shape = useAction(api.voice.shape);
  const fetchPrompts = useAction(api.voice.prompts);
  const speech = useSpeechRecognition();
  const whisper = useWhisperRecorder();

  // We can offer the mic if EITHER transcriber works: Whisper covers browsers with
  // no Web Speech (Firefox/Safari), Web Speech covers the live caption + fallback.
  const canSpeak = whisper.supported || speech.supported;
  // Live caption source: Web Speech is instant; when it's absent, show Whisper's
  // text as segments confirm (a few seconds behind, but real).
  const liveFinal = speech.supported ? speech.finalText : whisper.text;
  const liveInterim = speech.supported ? speech.interim : "";

  const [phase, setPhase] = useState<Phase>("idle");
  const [prompts, setPrompts] = useState<string[]>([]);
  const [pIdx, setPIdx] = useState(0); // which single prompt is currently showing

  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const baseRef = useRef(""); // value present before this voice take (so voice appends, never destroys)
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow the idle textarea to fit its content (no inner scrollbar). Runs whenever
  // the value changes (typed or filled by voice) and on mount.
  const autosize = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);
  useEffect(() => {
    if (phase === "idle") autosize();
  }, [value, phase, autosize]);

  const isCompact = variant === "compact";
  const aiMeta = { question: meta.question, intent: meta.intent, descriptor: meta.descriptor };

  // --- live waveform: lerp each bar toward a moving target while listening ---
  useEffect(() => {
    if (phase !== "listening") return;
    const id = window.setInterval(() => {
      const n = barsRef.current.length;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const center = 1 - Math.abs(i - n / 2) / (n / 2); // louder in the middle
        const t = 0.14 + Math.random() * 0.9 * center + 0.06;
        bar.style.transform = `scaleY(${t.toFixed(2)})`;
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [phase]);

  // --- Prompt Mode: fetch on start, then refresh ~2.5s after they pause talking ---
  const loadPrompts = useCallback(
    (partial: string) => {
      void fetchPrompts({ partial, ...aiMeta })
        .then((p) => {
          if (Array.isArray(p) && p.length) {
            setPrompts(p);
            setPIdx(0); // newest, most-relevant suggestion shows first
          }
        })
        .catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meta.question, meta.intent, meta.descriptor],
  );

  useEffect(() => {
    if (phase !== "listening") return;
    const t = window.setTimeout(() => loadPrompts(liveFinal), liveFinal ? 2500 : 0);
    return () => window.clearTimeout(t);
  }, [phase, liveFinal, loadPrompts]);

  // Show exactly ONE prompt at a time; rotate through the set so it stays gentle.
  useEffect(() => {
    if (phase !== "listening" || prompts.length < 2) return;
    const id = window.setInterval(() => setPIdx((i) => i + 1), PROMPT_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [phase, prompts.length]);

  const currentPrompt = prompts.length ? prompts[pIdx % prompts.length] : null;

  const begin = () => {
    baseRef.current = value.trim();
    setPrompts([]);
    setPIdx(0);
    speech.reset();
    speech.start(); // instant live caption + fallback transcript
    void whisper.start(); // chunked Whisper — the accurate transcript (no-op if unsupported)
    setPhase("listening");
  };

  const finish = async () => {
    const local = speech.stop(); // on-device transcript (instant, the fallback)
    setPhase("analyzing");
    // Whisper is the source of truth; await its final segments. Fall back to the
    // on-device transcript if Whisper produced nothing (unsupported, or every chunk dropped).
    let raw = local;
    try {
      const w = (await whisper.stop()).trim();
      if (w) raw = w;
    } catch {
      raw = local;
    }
    let clean = raw;
    try {
      clean = (await shape({ raw, ...aiMeta })) || raw;
    } catch {
      clean = raw; // if shaping fails, keep their raw words — never lose the answer
    }
    const base = baseRef.current;
    // Land the shaped words as plain, regular text — no special "shaped" state.
    const next = base ? `${base}\n${clean}` : clean;
    onChange(next);
    onCommit?.(next);
    setPhase("idle");
    requestAnimationFrame(() => taRef.current?.focus());
  };

  // Escape mid-recording cancels: drop the audio, keep whatever text was
  // already there, and put the cursor back in the box to keep typing.
  const cancel = useCallback(() => {
    speech.stop(); // discard the transcript
    void whisper.stop().catch(() => {}); // release the mic; ignore the result
    whisper.reset();
    setPrompts([]);
    setPIdx(0);
    setPhase("idle");
    requestAnimationFrame(() => taRef.current?.focus());
  }, [speech, whisper]);

  useEffect(() => {
    if (phase !== "listening") return;
    const onKey = (e: KeyboardEvent) => {
      // Only Escape cancels a recording. Backspace is intentionally not handled
      // here — during the listening phase the UI shows a waveform (no editable
      // field is focused), so Backspace has no default text-editing target; by
      // not calling preventDefault/cancel() we leave the key to do nothing
      // destructive. The recording continues uninterrupted.
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, cancel]);

  // ---------------------------------------------------------------- idle view
  if (phase === "idle") {
    return (
      <div className={className}>
        {/* mic is anchored to the textarea itself, so it always sits in its corner */}
        <div className="relative">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              autosize(); // grow to fit as they type (no inner scrollbar)
            }}
            onBlur={() => onCommit?.(value)}
            rows={rows}
            placeholder={meta.placeholder ?? "Type, or tap the mic to speak…"}
            className={`overflow-hidden ${
              inputClassName ||
              `w-full bg-paper border border-line-2 rounded-xl p-3 pr-12 text-[14.5px] leading-relaxed text-ink resize-none outline-none focus:border-gold transition placeholder:text-ink-mute ${
                isCompact ? "min-h-[44px]" : ""
              }`
            }`}
          />
          {canSpeak && (
            <span className="vf-tipwrap absolute right-2.5 bottom-2.5">
              <button
                type="button"
                onClick={begin}
                aria-label="Speak your answer"
                className="vf-mic w-8 h-8 rounded-full grid place-items-center text-ink-mute hover:text-gold"
              >
                <Mic className="w-[17px] h-[17px]" />
              </button>
              <span className="vf-tip">{ctaTooltip}</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------- listening / analyzing view
  // No box, no border — just an open, centered, minimal column. Feels like stepping
  // onto a different path rather than typing in a field.
  const barCount = BAR_COUNT[variant];
  const analyzing = phase === "analyzing";
  return (
    <div className={`vf-rise flex flex-col items-center gap-3 py-3 ${className}`}>
      {/* minimalist waveform (tap it to finish) + a quiet finish button with a tooltip */}
      <div className="flex items-center gap-3.5">
        <div
          className={`vf-wave justify-center ${analyzing ? "vf-settling" : ""}`}
          onClick={() => !analyzing && void finish()}
          role="button"
          title="Tap to finish"
        >
          {Array.from({ length: barCount }).map((_, i) => (
            <span
              key={i}
              ref={(el) => {
                barsRef.current[i] = el;
              }}
            />
          ))}
        </div>
        <span className="vf-tipwrap relative">
          <button
            type="button"
            onClick={() => !analyzing && void finish()}
            disabled={analyzing}
            aria-label="Finish"
            className="vf-mic w-8 h-8 rounded-full grid place-items-center text-ink-mute hover:text-ink"
          >
            {analyzing ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-ink-mute/30 border-t-ink-mute animate-spin" />
            ) : (
              <Square className="w-3 h-3" fill="currentColor" strokeWidth={0} />
            )}
          </button>
          {!analyzing && <span className="vf-tip">Tap to finish</span>}
        </span>
      </div>

      {/* live transcript */}
      <div
        className={`vf-script text-center text-[15px] leading-relaxed text-ink-soft max-w-[460px] ${analyzing ? "vf-blurring" : ""}`}
      >
        {liveFinal || (!liveInterim && <span className="text-ink-mute">listening…</span>)}
        {liveInterim && <span className="vf-interim"> {liveInterim}</span>}
        {!analyzing && <span className="vf-caret" />}
      </div>

      {/* Prompt Mode — exactly ONE suggestion at a time, related to what's said */}
      <div className="h-5 flex items-center justify-center text-center">
        {!analyzing && currentPrompt && (
          <span
            key={currentPrompt}
            className="vf-prompt vf-show text-[13px] italic leading-snug text-[#8A6A2E] max-w-[90%]"
          >
            <span className="not-italic text-gold text-[10px] mr-1.5 align-[1px]">✦</span>
            {currentPrompt}
          </span>
        )}
      </div>

      {/* status line */}
      <div className="flex items-center justify-center gap-2 text-[11.5px] text-ink-mute">
        {analyzing ? (
          <span className="text-[#8A6A2E]">understanding what you mean…</span>
        ) : speech.error === "not-allowed" || whisper.error === "not-allowed" ? (
          "I can't hear the mic — check the browser's mic permission."
        ) : (
          <>
            <span className="vf-pulse" /> tap the wave when you&apos;re done · esc to cancel
          </>
        )}
      </div>
    </div>
  );
}
