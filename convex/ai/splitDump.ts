import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { aiForTask } from "./openai";

/**
 * Split a free-form brain-dump transcript into distinct, atomic thoughts.
 * Each returned string will become one capture (then distilled + placed).
 *
 * The model is configured in config.ts under "brainDumpSplit". A single-thought
 * dump returns a one-element array; the caller treats every element the same way.
 *
 * This is an internalAction so the user's key is available server-side and the
 * raw transcript never travels back to the client for the split step.
 */
export const splitDump = internalAction({
  args: {
    transcript: v.string(),
    // userId is the resolved Convex user ID string, used to resolve the user's
    // API key preference. Passed as v.string() since Id<"users"> serialises to string.
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const text = args.transcript.trim().slice(0, 6000);
    if (!text) return [];

    // Single-word / very short input: skip the AI split, return as-is.
    if (text.split(/\s+/).length < 5) return [text];

    try {
      const { client, model, temperature, system } = await aiForTask(
        ctx,
        "brainDumpSplit",
        args.userId,
      );
      const res = await client.chat.completions.create({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system! },
          { role: "user", content: text },
        ],
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        // If the model wrapped JSON in prose, pull out the first {...}.
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            parsed = JSON.parse(m[0]) as Record<string, unknown>;
          } catch {
            parsed = {};
          }
        }
      }

      const segs = Array.isArray(parsed.segments) ? parsed.segments : [];
      const valid = segs
        .filter((s): s is string => typeof s === "string" && s.trim().split(/\s+/).length >= 4)
        .map((s: string) => s.trim());

      // If the model produced nothing usable, fall back to the whole dump as one thought.
      return valid.length > 0 ? valid : [text];
    } catch {
      // Any AI failure: treat the whole transcript as a single capture.
      return [text];
    }
  },
});
