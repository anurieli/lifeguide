"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Composer } from "./Composer";
import { ThoughtCard } from "./ThoughtCard";

/**
 * The Thought Stream: one spot to record every thought. Speak, type, paste a
 * link, or drop a photo — each lands as a capture, gets processed in the
 * background, and the card grows to show what the system heard and took from it.
 * See docs/product/features/thought-stream.md.
 */
export function ThoughtStream() {
  const captures = useQuery(api.captures.stream, { limit: 100 });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[680px] mx-auto">
        <Composer />
        <div className="px-5 py-4 md:px-8 md:py-6 flex flex-col gap-3">
          {captures === undefined ? (
            <p className="text-center text-[13px] text-ink-mute py-10">Loading…</p>
          ) : captures.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[15px] text-ink-soft mb-1">Nothing here yet.</p>
              <p className="text-[13px] text-ink-mute">
                Speak, type, or drop something — it all lands here first.
              </p>
            </div>
          ) : (
            captures.map((capture) => <ThoughtCard key={capture._id} capture={capture} />)
          )}
        </div>
      </div>
    </div>
  );
}

export default ThoughtStream;
