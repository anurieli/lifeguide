"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Mic, Square } from "lucide-react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import type { FieldMeta } from "@/lib/voiceField";

type Phase = "idle" | "listening" | "analyzing";

const BAR_COUNT = { default: 28, compact: 20 } as const;
const PROMPT_ROTATE_MS = 3800; // how long each single prompt holds before the next one fades in

/**
 * VoiceField — one voice-capable input for any field in LifeGuide.
 *
 * Drop-in replacement for a controlled `<textarea>`: same `value` / `onChange`
 * contract, plus a mic that does live (Web Speech) transcription and an AI pass
 * that shapes the raw transcript into what the field is asking for. Prompt Mode
 * surfaces ONE AI-generated suggestion at a time, inside the recording surface,
 * related to what's being said (field metadata + the Mirror).
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
}) {
  const shape = useAction(api.voice.shape);
  const fetchPrompts = useAction(api.voice.prompts);
  const speech = useSpeechRecognition();

  const [phase, setPhase] = useState<Phase>("idle");
  const [prompts, setPrompts] = useState<string[]>([]);
  const [pIdx, setPIdx] = useState(0); // which single prompt is currently showing
  // After a voice answer is shaped, offer a one-tap revert to the exact raw words.
  const [shaped, setShaped] = useState<{ raw: string; clean: string; base: string } | null>(null);
  const [showingRaw, setShowingRaw] = useState(false);

  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const baseRef = useRef(""); // value present before this voice take (so voice appends, never destroys)

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
    const t = window.setTimeout(() => loadPrompts(speech.finalText), speech.finalText ? 2500 : 0);
    return () => window.clearTimeout(t);
  }, [phase, speech.finalText, loadPrompts]);

  // Show exactly ONE prompt at a time; rotate through the set so it stays gentle.
  useEffect(() => {
    if (phase !== "listening" || prompts.length < 2) return;
    const id = window.setInterval(() => setPIdx((i) => i + 1), PROMPT_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [phase, prompts.length]);

  const currentPrompt = prompts.length ? prompts[pIdx % prompts.length] : null;

  const begin = () => {
    baseRef.current = value.trim();
    setShaped(null);
    setShowingRaw(false);
    setPrompts([]);
    setPIdx(0);
    speech.reset();
    speech.start();
    setPhase("listening");
  };

  const finish = async () => {
    const raw = speech.stop();
    setPhase("analyzing");
    let clean = raw;
    try {
      clean = (await shape({ raw, ...aiMeta })) || raw;
    } catch {
      clean = raw; // if shaping fails, keep their raw words — never lose the answer
    }
    const base = baseRef.current;
    const next = base ? `${base}\n${clean}` : clean;
    setShaped({ raw, clean, base });
    setShowingRaw(false);
    onChange(next);
    onCommit?.(next);
    setPhase("idle");
  };

  const toggleRaw = () => {
    if (!shaped) return;
    const useRaw = !showingRaw;
    const next = shaped.base
      ? `${shaped.base}\n${useRaw ? shaped.raw : shaped.clean}`
      : useRaw
        ? shaped.raw
        : shaped.clean;
    setShowingRaw(useRaw);
    onChange(next);
    onCommit?.(next);
  };

  // ---------------------------------------------------------------- idle view
  if (phase === "idle") {
    return (
      <div className={`relative ${className}`}>
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (shaped) setShaped(null); // a manual edit ends the "shaped" relationship
          }}
          onBlur={() => onCommit?.(value)}
          rows={rows}
          placeholder={meta.placeholder ?? "Type, or tap the mic to speak…"}
          className={
            inputClassName ||
            `w-full bg-paper border border-line-2 rounded-xl p-3 pr-12 text-[14.5px] leading-relaxed text-ink resize-none outline-none focus:border-gold transition placeholder:text-ink-mute ${
              isCompact ? "min-h-[44px]" : ""
            }`
          }
        />
        {speech.supported && (
          <button
            type="button"
            onClick={begin}
            title="Speak your answer"
            aria-label="Speak your answer"
            className="vf-mic absolute right-2.5 bottom-2.5 w-8 h-8 rounded-full grid place-items-center text-ink-mute hover:text-gold"
          >
            <Mic className="w-[18px] h-[18px]" />
          </button>
        )}
        {shaped && (
          <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-ink-mute">
            <span className="text-green">✓ shaped from what you said</span>
            <button type="button" onClick={toggleRaw} className="underline underline-offset-2 hover:text-ink">
              {showingRaw ? "show shaped" : "show raw"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------- listening / analyzing view
  const barCount = BAR_COUNT[variant];
  const analyzing = phase === "analyzing";
  return (
    <div
      className={`vf-rise relative border border-gold rounded-[14px] px-4 py-3.5 ${className}`}
      style={{ background: "linear-gradient(180deg,#FFFDF7,#FBF6EC)" }}
    >
      {/* waveform (tap anywhere on it to finish) + an explicit, obvious finish button */}
      <div className="flex items-center gap-3">
        <div
          className={`vf-wave flex-1 justify-center ${analyzing ? "vf-settling" : ""}`}
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
        <button
          type="button"
          onClick={() => !analyzing && void finish()}
          disabled={analyzing}
          title="Finish"
          aria-label="Finish"
          className="vf-mic w-9 h-9 rounded-full grid place-items-center bg-gold text-[#231a08] shrink-0 shadow-sm hover:brightness-105"
        >
          {analyzing ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#231a08]/30 border-t-[#231a08] animate-spin" />
          ) : (
            <Square className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
          )}
        </button>
      </div>

      {/* live transcript */}
      <div
        className={`vf-script mt-3 text-center text-[15px] leading-relaxed text-ink-soft ${analyzing ? "vf-blurring" : ""}`}
      >
        {speech.finalText || (!speech.interim && <span className="text-ink-mute">listening…</span>)}
        {speech.interim && <span className="vf-interim"> {speech.interim}</span>}
        {!analyzing && <span className="vf-caret" />}
      </div>

      {/* Prompt Mode — exactly ONE suggestion at a time, inside the surface, related to what's said */}
      <div className="mt-2.5 h-5 flex items-center justify-center text-center">
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
      <div className="mt-1 flex items-center justify-center gap-2 text-[11.5px] text-ink-mute">
        {analyzing ? (
          <span className="text-[#8A6A2E]">understanding what you mean…</span>
        ) : speech.error === "not-allowed" ? (
          "I can't hear the mic — check the browser's mic permission."
        ) : (
          <>
            <span className="vf-pulse" /> tap the wave or ■ to finish
          </>
        )}
      </div>
    </div>
  );
}
