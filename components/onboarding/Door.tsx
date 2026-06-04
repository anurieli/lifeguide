"use client";

import { useState } from "react";
import { VoiceField } from "@/components/voice/VoiceField";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-3.5">{children}</div>
);
const H = ({ children }: { children: React.ReactNode }) => (
  <h1 className="text-[34px] leading-tight tracking-tight text-ink mb-3.5">{children}</h1>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[17px] text-ink-soft leading-relaxed max-w-[460px] mx-auto">{children}</p>
);

export function Door({
  onWrote,
  onDontKnow,
}: {
  onWrote: (text: string) => void;
  onDontKnow: () => void;
}) {
  const [text, setText] = useState("");
  const [dontKnowClicked, setDontKnowClicked] = useState(false);

  const trimmed = text.trim();

  const handleDontKnow = () => {
    if (!dontKnowClicked) {
      setDontKnowClicked(true);
    } else {
      onDontKnow();
    }
  };

  return (
    <div
      className="h-screen flex flex-col items-center justify-center p-5"
      style={{ background: "radial-gradient(1000px 500px at 50% -10%, #FFFDF7, #FAF8F2)" }}
    >
      <div className="max-w-[560px] w-full text-center">
        <Eyebrow>Welcome</Eyebrow>
        <H>What do you want out of life?</H>
        <P>There&apos;s no wrong answer. Just start anywhere.</P>

        <VoiceField
          meta={{
            id: "onboarding.door",
            question: "What do you want out of life?",
            descriptor: "There's no wrong answer. Just start anywhere.",
            placeholder: "Start writing… anything.",
            intent: "capture, in their own words, what they want out of life — direction, aspirations, a felt sense",
          }}
          value={text}
          onChange={setText}
          rows={4}
          className="max-w-[440px] mx-auto mt-6 text-left"
          inputClassName="w-full bg-card border border-line rounded-[14px] p-4 pr-12 text-[15px] outline-none resize-none block text-ink focus:border-gold transition placeholder:text-ink-mute"
        />

        <div className="pt-7 flex flex-col items-center gap-3">
          <button
            onClick={() => onWrote(trimmed)}
            disabled={trimmed.length === 0}
            className="rounded-xl px-[26px] py-[13px] text-[15px] bg-ink text-white hover:bg-[#2a2f3a] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Continue →
          </button>

          <div className="flex flex-col items-center gap-2">
            {dontKnowClicked && (
              <p className="text-[14px] text-ink-soft max-w-[340px] leading-relaxed">
                Most people don&apos;t. Let&apos;s sort it out, one question at a time.
              </p>
            )}
            <span className="vf-halo vf-tipwrap inline-flex rounded-full">
              <button
                onClick={handleDontKnow}
                className="relative rounded-full bg-card px-5 py-2.5 text-[14px] text-ink-soft hover:text-ink transition"
              >
                {dontKnowClicked ? "Begin →" : "I don't know"}
              </button>
              <span className="vf-tip-side">I&apos;ll guide you</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
