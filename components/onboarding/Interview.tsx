"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { nextQuestion } from "@/lib/interview/policy";
import { filledCount } from "@/lib/levels";
import { VoiceField } from "@/components/voice/VoiceField";

// ─── Orientation helpers ──────────────────────────────────────────────────────

/** Section index of a question key: s1* = 0, s2* = 1, s3* = 2 */
function sectionOf(key: string): number {
  if (key.startsWith("s1")) return 0;
  if (key.startsWith("s2")) return 1;
  return 2;
}

const SECTION_LABELS = [
  { label: "What was before", range: "Persona" },
  { label: "What's next", range: "Goals" },
  { label: "What's next", range: "Mindset" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Interview({
  sessionId,
  onComplete,
}: {
  sessionId: Id<"interviewSessions">;
  onComplete: () => void;
}) {
  const session = useQuery(api.interview.get, { sessionId });
  const appendTurn = useMutation(api.interview.appendTurn);
  const skipMutation = useMutation(api.interview.skip);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  // Track keys the user has skipped a second time (already-deferred and skipped again).
  // These are passed as `circledBack` to `nextQuestion` so the policy returns null.
  const [doubleSkipped, setDoubleSkipped] = useState<string[]>([]);

  // Derive answered map from transcript
  const answered: Record<string, string> = {};
  if (session) {
    for (const turn of session.transcript) {
      if (turn.role === "user" && turn.questionKey) {
        answered[turn.questionKey] = turn.text;
      }
    }
  }

  const skipped = session?.skipped ?? [];

  const state = {
    answered,
    skipped,
    circledBack: doubleSkipped,
  };

  const q = session ? nextQuestion(state) : undefined;

  // Clear textarea when the question changes
  const prevKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (q && q.key !== prevKeyRef.current) {
      setDraft("");
      prevKeyRef.current = q.key;
    }
  }, [q]);

  // Fire onComplete once when q becomes null (all done)
  const completedRef = useRef(false);
  useEffect(() => {
    if (session !== undefined && q === null && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [session, q, onComplete]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (session === undefined || q === undefined) {
    return (
      <div className="h-screen flex items-center justify-center text-ink-mute text-[15px]">
        …
      </div>
    );
  }

  // q === null means done — onComplete fires via effect; show nothing while it resolves
  if (q === null) {
    return null;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (busy || !draft.trim()) return;
    setBusy(true);
    try {
      await appendTurn({
        sessionId,
        role: "user",
        questionKey: q.key,
        text: draft.trim(),
      });
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const alreadyDeferred = skipped.includes(q.key);
      await skipMutation({ sessionId, questionKey: q.key });

      if (alreadyDeferred) {
        // This is a second skip of a deferred question — treat it as circled-back.
        // The policy will then return null if nothing else is left.
        setDoubleSkipped((prev) => (prev.includes(q.key) ? prev : [...prev, q.key]));
      }
    } finally {
      setBusy(false);
    }
  };

  // ── Orientation bar ───────────────────────────────────────────────────────

  const currentSection = sectionOf(q.key);
  const filled = filledCount(answered);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "radial-gradient(1000px 500px at 50% -10%, #FFFDF7, #FAF8F2)" }}
    >
      {/* Orientation row */}
      <div className="px-7 py-4 flex items-center justify-between gap-4 border-b border-line">
        {SECTION_LABELS.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-1 justify-center">
            <span
              className={`text-[11.5px] tracking-wide ${
                currentSection === i ? "text-ink font-semibold" : "text-ink-mute"
              }`}
            >
              {seg.label}
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                currentSection === i
                  ? "border-gold text-gold"
                  : "border-line text-ink-mute"
              }`}
            >
              {seg.range}
            </span>
          </div>
        ))}
        {/* Progress counter */}
        <div className="text-[11.5px] text-ink-mute whitespace-nowrap">
          {filled}/18
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center px-5 py-8 overflow-y-auto">
        <div className="max-w-[560px] w-full">
          {/* Question title */}
          <h1 className="text-[28px] leading-tight tracking-tight text-ink mb-3">
            {q.title}
          </h1>

          {/* Description */}
          {q.description && (
            <p className="text-[15px] text-ink-soft leading-relaxed mb-4 max-w-[500px] whitespace-pre-wrap">
              {q.description}
            </p>
          )}

          {/* Example block */}
          {q.example && (
            <div className="mb-5 bg-card border border-line rounded-xl p-3.5">
              <p className="text-[12.5px] text-ink-mute leading-relaxed whitespace-pre-wrap">
                {q.example}
              </p>
            </div>
          )}

          {/* Textarea (voice-capable) */}
          <VoiceField
            meta={{
              id: q.key,
              question: q.title,
              descriptor: q.description || undefined,
              placeholder: "Write yours…",
              intent: `a clear, honest, first-person answer about: ${q.title.toLowerCase()}`,
            }}
            value={draft}
            onChange={setDraft}
            rows={5}
            className="mb-4"
            inputClassName="w-full bg-card border border-line rounded-[14px] p-4 pr-12 text-[15px] text-ink leading-relaxed outline-none resize-y focus:border-gold transition placeholder:text-ink-mute/70"
          />

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleSave()}
              disabled={busy || !draft.trim()}
              className="rounded-xl px-[22px] py-[12px] text-[15px] bg-ink text-white hover:bg-[#2a2f3a] disabled:opacity-40 transition"
            >
              Save &amp; continue
            </button>
            <button
              onClick={() => void handleSkip()}
              disabled={busy}
              className="text-[14px] text-ink-mute hover:text-ink transition disabled:opacity-40"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
