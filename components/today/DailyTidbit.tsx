"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { RefreshCw } from "lucide-react";
import { api } from "@/convex/_generated/api";

// The daily tidbit step, shown inline in the morning scroll: a real inspirational
// quote surfaced for the person from their Core by the cheap Haiku `dailyQuote` agent
// (convex/ai/dailyQuote.ts). Lazily generated + cached per day: on first render we
// `ensureForDay`, then stream the row reactively. A fixed line the person typed
// themselves overrides the agent (like a mantra). "↻" asks the agent for another.
// See docs/product/features/daily-tidbit.md.

export function DailyTidbit({
  fixedContent,
  dayKey,
  checked,
}: {
  fixedContent?: string;
  dayKey: string;
  checked: boolean;
}) {
  const own = fixedContent?.trim();
  const row = useQuery(api.dailyTidbits.forDay, own ? "skip" : { day: dayKey, kind: "quote" });
  const ensure = useMutation(api.dailyTidbits.ensureForDay);
  const refresh = useMutation(api.dailyTidbits.refresh);

  // Kick generation once, when this day has no tidbit yet and the person hasn't
  // pinned their own line. `ensureForDay` is idempotent, so a re-render never double-fires.
  useEffect(() => {
    if (own) return;
    if (row === null) void ensure({ day: dayKey, kind: "quote" });
  }, [own, row, ensure, dayKey]);

  const label = <div className="text-[11px] tracking-[0.14em] uppercase text-ink-mute mb-1">Today&apos;s quote</div>;
  const tone = checked ? "text-ink-mute" : "text-ink";

  // The person's own fixed tidbit wins.
  if (own) {
    return (
      <div className="min-w-0 flex-1">
        {label}
        <div className={`text-[16px] leading-relaxed ${tone}`}>{own}</div>
      </div>
    );
  }

  const status = row?.status;
  return (
    <div className="min-w-0 flex-1">
      {label}
      {status === "done" && row?.text ? (
        <div>
          <div className={`text-[16px] leading-relaxed ${tone}`}>“{row.text}”</div>
          <div className="mt-1 flex items-center gap-2">
            {row.attribution && (
              <span className="text-[12.5px] text-ink-mute">— {row.attribution}</span>
            )}
            <button
              onClick={() => void refresh({ day: dayKey, kind: "quote" })}
              className="inline-flex items-center gap-1 text-[12px] text-ink-mute hover:text-ink transition"
              aria-label="Find another quote"
              title="Find another"
            >
              <RefreshCw className="w-3 h-3" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      ) : status === "error" ? (
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-ink-mute">Couldn&apos;t find one just now.</span>
          <button
            onClick={() => void refresh({ day: dayKey, kind: "quote" })}
            className="inline-flex items-center gap-1 text-[12.5px] text-ink-soft hover:text-ink transition"
          >
            <RefreshCw className="w-3 h-3" strokeWidth={2.2} /> Try again
          </button>
        </div>
      ) : (
        <div className="text-[15px] text-ink-mute italic">Finding today&apos;s words…</div>
      )}
    </div>
  );
}
