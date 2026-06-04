"use client";

import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// The close of a Listener call: "here's what I heard, and here's what got filed where."
// Reads the files this session touched (coreFiles.bySession) and lets the person resolve
// any change that contradicts what was already held.

export function FilingReport({
  sessionId,
  onDone,
}: {
  sessionId: Id<"interviewSessions">;
  onDone: () => void;
}) {
  const rows = useQuery(api.coreFiles.bySession, { sessionId });
  const resolve = useMutation(api.coreFiles.resolvePending);

  const { byPillar, filedCount, pendingCount } = useMemo(() => {
    const map = new Map<string, typeof rows>();
    let filed = 0;
    let pending = 0;
    for (const r of rows ?? []) {
      if (r.status === "pending") pending++;
      else filed++;
      const list = map.get(r.pillarName) ?? [];
      list.push(r);
      map.set(r.pillarName, list);
    }
    return { byPillar: [...map.entries()], filedCount: filed, pendingCount: pending };
  }, [rows]);

  if (rows === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-mute text-[15px]">
        Reading what was filed…
      </div>
    );
  }

  return (
    <div className="flex-1 flex justify-center min-h-0 overflow-y-auto px-5 sm:px-8 py-8">
      <div className="w-full max-w-[680px] flex flex-col gap-7">
        <header className="flex flex-col gap-2">
          <h2 className="text-[22px] text-ink font-semibold tracking-tight">What I heard</h2>
          <p className="text-[14.5px] text-ink-soft leading-relaxed">
            {filedCount === 0 && pendingCount === 0
              ? "Nothing landed in your file this time — sometimes a conversation is just for thinking. It's all still here when you want it."
              : `Filed ${filedCount} ${filedCount === 1 ? "note" : "notes"} across ${byPillar.length} ${
                  byPillar.length === 1 ? "pillar" : "pillars"
                }${pendingCount > 0 ? `, with ${pendingCount} to decide on` : ""}.`}
          </p>
        </header>

        {byPillar.map(([pillarName, files]) => (
          <section key={pillarName} className="flex flex-col gap-3">
            <div className="text-[12.5px] uppercase tracking-[0.08em] text-ink-mute">{pillarName}</div>
            <div className="flex flex-col gap-2.5">
              {(files ?? []).map((f) => (
                <div
                  key={f._id}
                  className={`rounded-2xl border px-4 py-3 ${
                    f.status === "pending" ? "border-gold bg-gold/5" : "border-line bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-medium text-ink">{f.name}</span>
                    <span className="text-[10.5px] uppercase tracking-wide text-ink-mute bg-paper rounded-full px-2 py-0.5">
                      {f.kind}
                    </span>
                  </div>
                  <p className="text-[14px] text-ink-soft leading-relaxed whitespace-pre-wrap">{f.content}</p>

                  {f.status === "pending" && (
                    <div className="mt-3 pt-3 border-t border-gold/30 flex flex-col gap-2">
                      <p className="text-[12.5px] text-ink-mute italic">
                        {f.note || "This seems to contradict what was already on file."}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void resolve({ fileId: f._id, accept: true })}
                          className="rounded-full px-4 py-1.5 text-[13px] bg-ink text-white hover:bg-[#2a2f3a] transition"
                        >
                          Use this
                        </button>
                        <button
                          onClick={() => void resolve({ fileId: f._id, accept: false })}
                          className="rounded-full px-4 py-1.5 text-[13px] bg-card border border-line text-ink-soft hover:border-gold transition"
                        >
                          Keep what I had
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="pt-2">
          <button
            onClick={onDone}
            className="rounded-full px-8 py-2.5 text-[15px] bg-ink text-white hover:bg-[#2a2f3a] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
