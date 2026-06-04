"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BLUEPRINT, type Malleability } from "@/lib/blueprint";
import { VoiceField } from "@/components/voice/VoiceField";

const MALL: Record<Malleability, { dot: string; label: string }> = {
  green: { dot: "#4F7A4A", label: "freely changeable" },
  yellow: { dot: "#B8945A", label: "change with weight" },
  red: { dot: "#B5524A", label: "core · change rarely" },
};

function Question({
  qKey,
  title,
  malleability,
  description,
  example,
  value,
  onSave,
}: {
  qKey: string;
  title: string;
  malleability: Malleability;
  description: string;
  example: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  // Keep the local draft in sync when the stored value arrives/changes from the server.
  useEffect(() => setDraft(value), [value]);
  const m = MALL[malleability];

  return (
    <div className="bg-card border border-line rounded-2xl p-5 mb-3.5">
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.dot }} />
        <h3 className="text-[17px] text-ink font-semibold">{title}</h3>
        <span className="text-[11px] tracking-wide uppercase text-ink-mute ml-auto">{m.label}</span>
      </div>
      {description && (
        <p className="text-[13.5px] text-ink-soft leading-relaxed mb-3 whitespace-pre-wrap">
          {description}
        </p>
      )}
      <VoiceField
        meta={{
          id: qKey,
          question: title,
          descriptor: description || undefined,
          placeholder: example ? `e.g. ${example}` : "Write yours…",
          intent: `a clear, honest, first-person answer about: ${title.toLowerCase()}`,
        }}
        value={draft}
        onChange={(v) => {
          setDraft(v);
          setSaved(false);
        }}
        onCommit={(v) => {
          if (v !== value) {
            onSave(v);
            setSaved(true);
          }
        }}
        rows={Math.min(10, Math.max(3, draft.split("\n").length + 1))}
        inputClassName="w-full bg-paper-2 border border-line rounded-xl p-3.5 pr-12 text-[14.5px] text-ink leading-relaxed outline-none resize-y focus:border-gold transition placeholder:text-ink-mute/70"
      />
      {saved && <div className="text-[11.5px] text-green mt-1.5">Saved ✓</div>}
    </div>
  );
}

export function Core() {
  const stored = useQuery(api.core.get, {});
  const save = useMutation(api.core.save);
  const responses = stored ?? {};
  const loadingRef = useRef(stored === undefined);
  loadingRef.current = stored === undefined;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[760px] mx-auto px-8 py-10">
        <div className="text-[11px] tracking-[0.16em] uppercase text-gold mb-2">
          The Blueprint · who you are
        </div>
        <h1 className="text-[30px] tracking-tight text-ink mb-2">Your Core</h1>
        <p className="text-[15px] text-ink-soft leading-relaxed mb-8 max-w-[560px]">
          The enduring layer beneath your days: who you are, who you&apos;re becoming, and what you
          stand for. Edit anything, anytime. The colored dot shows how settled each piece should be.
        </p>

        {BLUEPRINT.map((section) => (
          <div key={section.title} className="mb-9">
            <h2 className="text-[20px] text-ink font-semibold mb-1">{section.title}</h2>
            {section.description && (
              <p className="text-[13.5px] text-ink-mute leading-relaxed mb-4 max-w-[600px]">
                {section.description}
              </p>
            )}
            {section.questions.map((q) => (
              <Question
                key={q.key}
                qKey={q.key}
                title={q.title}
                malleability={q.malleability}
                description={q.description}
                example={q.example}
                value={responses[q.key] ?? ""}
                onSave={(v) => void save({ questionKey: q.key, content: v })}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
