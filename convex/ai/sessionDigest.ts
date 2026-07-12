import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { aiForTask } from "./openai";
import { assembleDigestInput } from "../../lib/sessionDigest";

// The session digest: an AI title + one-line summary for the sessions list.
// Scheduled (debounced) by ingest whenever a session-member capture finishes.
// The run reads current state, so the last append always wins; overlapping runs
// are harmless idempotent overwrites. Failure marks digest.status = "error" and
// the list falls back to first words; the next append retries naturally.
export const digestSession = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.sessions.getForDigestInternal, {
      sessionId: args.sessionId,
    });
    if (!data) return; // deleted (e.g. empty-session cleanup) while scheduled

    // If any member capture is still ingesting, skip: its completion reschedules us,
    // so the digest that finally runs sees the full entry.
    if (data.captures.some((c) => c.extraction?.status === "pending")) return;

    const input = assembleDigestInput(data.captures);
    if (!input) return; // nothing textual yet (e.g. failed transcription, no note)

    try {
      const { client, model, temperature, system } = await aiForTask(
        ctx,
        "sessionDigest",
        data.session.userId,
      );
      const res = await client.chat.completions.create({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system! },
          { role: "user", content: input },
        ],
      });
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
      const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, 80) : "";
      const summary =
        typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 200) : "";
      if (!title && !summary) throw new Error("empty digest");
      await ctx.runMutation(internal.sessions.writeDigestInternal, {
        sessionId: args.sessionId,
        ...(title ? { title } : {}),
        ...(summary ? { summary } : {}),
        status: "done",
      });
    } catch {
      await ctx.runMutation(internal.sessions.writeDigestInternal, {
        sessionId: args.sessionId,
        status: "error",
      });
    }
  },
});
