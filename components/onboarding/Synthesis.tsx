"use client";

import { useEffect, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { filledCount } from "@/lib/levels";

export function Synthesis({
  sessionId,
  onEnter,
}: {
  sessionId: Id<"interviewSessions">;
  onEnter: () => void;
}) {
  const synth = useAction(api.ai.synthesizeInterview.synthesizeInterview);
  const [synthesizing, setSynthesizing] = useState(true);

  // Always subscribe — we need the live values once synthesis writes to core.
  const settings = useQuery(api.settings.get, {});
  const coreMap = useQuery(api.core.get, {});

  useEffect(() => {
    let cancelled = false;
    synth({ sessionId })
      .catch(() => {
        // Action failed — still let user enter (do not block).
      })
      .finally(() => {
        if (!cancelled) setSynthesizing(false);
      });
    return () => {
      cancelled = true;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count =
    coreMap && typeof coreMap === "object" ? filledCount(coreMap as Record<string, string>) : 0;
  const isComplete = settings?.blueprintStatus === "complete";

  // Wait for synthesis to finish AND for reactive queries to settle.
  const loading = synthesizing || settings === undefined || coreMap === undefined;

  const Eyebrow = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-3.5">{children}</div>
  );

  if (loading) {
    return (
      <div
        className="h-screen flex flex-col items-center justify-center"
        style={{ background: "radial-gradient(1000px 500px at 50% -10%, #FFFDF7, #FAF8F2)" }}
      >
        <div className="max-w-[560px] w-full text-center px-8">
          <Eyebrow>A moment</Eyebrow>
          <h1 className="text-[32px] leading-tight tracking-tight text-ink mb-4">
            Weaving what you told me
            <br />
            into your blueprint&hellip;
          </h1>
          <p className="text-[16px] text-ink-soft leading-relaxed">
            This takes just a second.
          </p>
          <div className="mt-10 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-gold animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(1000px 500px at 50% -10%, #FFFDF7, #FAF8F2)" }}
    >
      <div className="max-w-[560px] w-full text-center px-8">
        <Eyebrow>Your blueprint</Eyebrow>
        {isComplete ? (
          <h1 className="text-[34px] leading-tight tracking-tight text-ink mb-4">
            Your blueprint is locked.
            <br />
            Welcome to Level 1.
          </h1>
        ) : (
          <h1 className="text-[34px] leading-tight tracking-tight text-ink mb-4">
            Your blueprint is open
            <br />
            <span className="text-ink-soft font-normal text-[28px]">
              {count}/18 so far. Finish it anytime.
            </span>
          </h1>
        )}

        <p className="text-[16px] text-ink-soft leading-relaxed max-w-[420px] mx-auto">
          {isComplete
            ? "Everything you shared has been woven in. Your space knows who you are."
            : "I've taken what you told me and started your blueprint. You can always go deeper later."}
        </p>

        <div className="pt-9 flex justify-center">
          <button
            onClick={onEnter}
            className="rounded-xl px-[26px] py-[13px] text-[15px] bg-gold text-[#231a08] hover:opacity-90"
          >
            Enter your space &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
