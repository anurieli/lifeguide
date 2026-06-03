"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const CHIPS = [
  "A quiet life by the ocean",
  "Build something that's mine",
  "Be the man my father wasn't",
];

export function Onboarding() {
  const complete = useMutation(api.settings.completeOnboarding);
  const createCapture = useMutation(api.captures.create);
  const [step, setStep] = useState(1);
  const [first, setFirst] = useState("");
  const [rhythm, setRhythm] = useState<"both" | "am" | "pm">("both");
  const [tone, setTone] = useState(65);
  const [finishing, setFinishing] = useState(false);

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await complete({
        morningCheckin: rhythm !== "pm",
        eveningCheckin: rhythm !== "am",
        coachTone: tone < 33 ? "gentle" : tone > 66 ? "direct" : "balanced",
      });
      if (first.trim()) {
        await createCapture({ source: "paste", rawType: "text", rawText: first.trim() });
      }
      // Page swaps to the app once onboardedAt is set (reactive).
    } catch {
      setFinishing(false);
    }
  };

  const Eyebrow = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-3.5">{children}</div>
  );
  const H = ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-[34px] leading-tight tracking-tight text-ink mb-3.5">{children}</h1>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[17px] text-ink-soft leading-relaxed max-w-[460px] mx-auto">{children}</p>
  );
  const Next = ({ onClick, label, gold }: { onClick: () => void; label: string; gold?: boolean }) => (
    <div className="pt-7 flex justify-center">
      <button
        onClick={onClick}
        disabled={finishing}
        className={`rounded-xl px-[26px] py-[13px] text-[15px] disabled:opacity-50 ${
          gold ? "bg-gold text-[#231a08] hover:opacity-90" : "bg-ink text-white hover:bg-[#2a2f3a]"
        }`}
      >
        {label}
      </button>
    </div>
  );

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "radial-gradient(1000px 500px at 50% -10%, #FFFDF7, #FAF8F2)" }}
    >
      <div className="px-7 py-5 flex justify-between items-center">
        <div className="font-bold text-[17px] text-ink">LifeGuide</div>
        <div className="flex gap-[7px] justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <i
              key={i}
              className={`h-[7px] rounded-full transition-all ${
                i === step ? "w-[22px] bg-gold" : "w-[7px] bg-line"
              }`}
            />
          ))}
        </div>
        <button onClick={() => void finish()} className="text-[13px] text-ink-mute hover:text-ink">
          skip →
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-5">
        <div className="max-w-[560px] w-full text-center">
          {step === 1 && (
            <div>
              <Eyebrow>Welcome</Eyebrow>
              <H>
                You&apos;re not lost.
                <br />
                You just haven&apos;t said where you&apos;re going out loud yet.
              </H>
              <P>
                This is your space to figure it out, slowly, one piece at a time. No setup, no
                homework. We start where you are.
              </P>
              <Next onClick={() => setStep(2)} label="Begin" />
            </div>
          )}

          {step === 2 && (
            <div>
              <Eyebrow>First thing</Eyebrow>
              <H>Show me something that pulls at you.</H>
              <P>A line you can&apos;t shake. A life you saw and wanted. Anything. I&apos;ll take it from here.</P>
              <textarea
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                rows={2}
                placeholder="Paste or type anything…"
                className="w-full max-w-[440px] mx-auto mt-6 bg-card border border-line rounded-[14px] p-4 text-[15px] outline-none resize-none block text-ink"
              />
              <div className="flex gap-2 flex-wrap justify-center mt-3.5">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFirst(c)}
                    className="text-[13px] px-3.5 py-2 rounded-full bg-card border border-line text-ink-soft hover:border-gold hover:text-ink transition"
                  >
                    {c}
                  </button>
                ))}
              </div>
              <Next onClick={() => setStep(3)} label="Continue" />
            </div>
          )}

          {step === 3 && (
            <div>
              <Eyebrow>How should I show up?</Eyebrow>
              <H>Pick your rhythm.</H>
              <P>
                Most men check in twice, once when they wake, once before bed. Two minutes each. You
                can change this anytime.
              </P>
              <div className="flex flex-col gap-2.5 max-w-[420px] mx-auto mt-6 text-left">
                {[
                  { v: "both", ic: "🌅", t: "Morning + evening", d: "A direction to wake to, a moment to reflect at night" },
                  { v: "am", ic: "☀️", t: "Mornings only", d: "Just set the day" },
                  { v: "pm", ic: "🌙", t: "Evenings only", d: "Just reflect" },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setRhythm(o.v as "both" | "am" | "pm")}
                    className={`bg-card border rounded-[14px] px-[17px] py-[15px] flex items-center gap-3.5 text-left transition ${
                      rhythm === o.v ? "border-gold ring-1 ring-gold" : "border-line hover:border-gold"
                    }`}
                  >
                    <div className="text-[22px]">{o.ic}</div>
                    <div>
                      <div className="font-semibold text-[15px] text-ink">{o.t}</div>
                      <div className="text-[13px] text-ink-mute">{o.d}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="max-w-[420px] mx-auto mt-5">
                <div className="flex justify-between text-[12.5px] text-ink-mute mb-2">
                  <span>gentle</span>
                  <span>Coach tone</span>
                  <span>direct</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={tone}
                  onChange={(e) => setTone(Number(e.target.value))}
                  className="w-full accent-gold"
                />
              </div>
              <Next onClick={() => setStep(4)} label="Continue" />
            </div>
          )}

          {step === 4 && (
            <div>
              <Eyebrow>Meet your Coach</Eyebrow>
              <H>I&apos;ll be here the whole way.</H>
              <div className="flex gap-3.5 items-start max-w-[460px] mx-auto mt-1 text-left bg-coach rounded-2xl p-5 text-coach-ink">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-[#8A6A2E] flex items-center justify-center text-lg flex-shrink-0">
                  🧭
                </div>
                <p className="text-[15px] text-coach-ink leading-relaxed">
                  I keep what you tell me. I notice the patterns you can&apos;t see from the inside.
                  I&apos;ll never spam you or guilt you with streaks. Two check-ins a day, that&apos;s
                  the rhythm. The rest of the time, I&apos;m just here when you need me.
                </p>
              </div>
              <Next onClick={() => setStep(5)} label="Continue" />
            </div>
          )}

          {step === 5 && (
            <div>
              <Eyebrow>Ready</Eyebrow>
              <H>Your space is ready.</H>
              <P>
                {first.trim()
                  ? "I've already started a board from what you gave me. Add to it whenever something pulls at you. It grows as you do."
                  : "Add to your board whenever something pulls at you. It grows as you do."}
              </P>
              <Next onClick={() => void finish()} label="Enter your space →" gold />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
