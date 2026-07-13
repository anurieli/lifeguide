"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { EXPERIENCES } from "@/lib/experiences";
import { Door } from "./Door";
import { Interview } from "./Interview";
import { VoiceInterview } from "./VoiceInterview";
import { Synthesis } from "./Synthesis";

type Phase = "door" | "choose" | "interview" | "voice" | "synthesis";

export function Onboarding() {
  const [phase, setPhase] = useState<Phase>("door");
  const [sessionId, setSessionId] = useState<Id<"interviewSessions"> | null>(null);
  const [finishing, setFinishing] = useState(false);

  const completeOnboarding = useMutation(api.settings.completeOnboarding);
  const createCapture = useMutation(api.captures.create);
  const startSession = useMutation(api.interview.start);
  const updateSettings = useMutation(api.settings.update);

  // Called when the user writes something on the Door screen.
  const handleWrote = (text: string) => {
    if (text) {
      // Fire-and-forget: save north star + vision-board seed capture. The seed is
      // board-bound by design ("show me something that pulls at you"), so it carries
      // explicit intent and skips the vision sieve.
      void updateSettings({ northStar: text });
      void createCapture({ source: "paste", rawType: "text", rawText: text, target: "board" });
    }
    setPhase("choose");
  };

  // Called when the user picks an experience on the Choose screen.
  const handleChoose = async (exp: (typeof EXPERIENCES)[number]) => {
    const id = await startSession({ experienceId: exp.id, device: "desktop" });
    setSessionId(id);
    setPhase(exp.transport === "voice" ? "voice" : "interview");
  };

  // Final step: stamp onboardedAt; the reactive Gate in app/page.tsx swaps to AppShell.
  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await completeOnboarding({});
    } catch {
      setFinishing(false);
    }
  };

  const showSkip = phase === "door" || phase === "choose";

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "radial-gradient(1000px 500px at 50% -10%, #FFFDF7, #FAF8F2)" }}
    >
      {/* Header */}
      <div className="px-7 py-5 flex justify-between items-center flex-shrink-0">
        <div className="font-bold text-[17px] text-ink">LifeGuide</div>
        <div />
        {showSkip ? (
          <button
            onClick={() => void finish()}
            disabled={finishing}
            className="text-[13px] text-ink-mute hover:text-ink disabled:opacity-50 transition"
          >
            skip →
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Phase content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {phase === "door" && (
          <Door onWrote={handleWrote} onDontKnow={() => setPhase("choose")} />
        )}

        {phase === "choose" && (
          <div className="flex-1 flex items-center justify-center p-5">
            <div className="max-w-[560px] w-full text-center">
              <div className="text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-3.5">
                How would you like to begin?
              </div>
              <h1 className="text-[34px] leading-tight tracking-tight text-ink mb-3.5">
                Pick your path.
              </h1>
              <p className="text-[17px] text-ink-soft leading-relaxed max-w-[460px] mx-auto mb-8">
                Both arrive at the same place. Choose whatever feels right.
              </p>
              <div className="flex flex-col gap-3 max-w-[420px] mx-auto text-left">
                {EXPERIENCES.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => void handleChoose(exp)}
                    className="bg-card border border-line rounded-[14px] px-[17px] py-[15px] text-left transition hover:border-gold"
                  >
                    <div className="font-semibold text-[15px] text-ink mb-1">{exp.label}</div>
                    <div className="text-[13px] text-ink-mute">{exp.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === "interview" && sessionId && (
          <Interview sessionId={sessionId} onComplete={() => setPhase("synthesis")} />
        )}

        {phase === "voice" && sessionId && (
          <VoiceInterview
            sessionId={sessionId}
            onComplete={() => setPhase("synthesis")}
            onFallback={() => setPhase("interview")}
          />
        )}

        {phase === "synthesis" && sessionId && (
          <Synthesis sessionId={sessionId} onEnter={() => void finish()} />
        )}
      </div>
    </div>
  );
}
