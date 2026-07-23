import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { chatComplete } from "./openai";
import { parseDailyQuote } from "./parse";
import { TASKS } from "./config";

// ============================================================================
// The daily-quote agent (AI hub node `dailyQuote`, cheap Haiku — Ariel 2026-07-15).
// Its one job: surface a real, existing inspirational quote for the person's day,
// chosen from their Core (Mirror + North Star + standing horizons) and varied from
// the recent ones. Scheduled once per person per day by dailyTidbits.ensureForDay;
// writes the result back onto the pending row. Every call is logged to aiLogs by
// chatComplete (ADR 0017), so this agent shows up in the AI usage hub like the rest.
// ============================================================================

function buildInput(cx: {
  northStar: string;
  values: string[];
  themes: string[];
  summary: string;
  standing: string;
  recentQuotes: string[];
}): string {
  const lines: string[] = ["Who this person is:"];
  if (cx.summary) lines.push(`- Summary: ${cx.summary}`);
  if (cx.values.length) lines.push(`- Values: ${cx.values.join(", ")}`);
  if (cx.themes.length) lines.push(`- Themes: ${cx.themes.join(", ")}`);
  if (cx.northStar) lines.push(`- North Star: ${cx.northStar}`);
  if (cx.standing) lines.push(`- Horizons:\n${cx.standing}`);
  if (lines.length === 1) lines.push("- (Little is known yet — choose a broadly resonant quote.)");
  if (cx.recentQuotes.length) {
    lines.push("\nRecently shown (do NOT repeat these):");
    for (const q of cx.recentQuotes) lines.push(`- ${q}`);
  }
  lines.push("\nReturn one fitting quote as JSON {\"quote\",\"author\"}.");
  return lines.join("\n");
}

export const generate = internalAction({
  args: { tidbitId: v.id("dailyTidbits"), userId: v.id("users"), day: v.string() },
  handler: async (ctx, args) => {
    // Everything the generation touches lives inside the try — INCLUDING the
    // context read. If it threw outside (as it once did), the action aborted with
    // the row still `pending`, and since ensureForDay is a no-op when any row
    // exists, the scroll span "Finding today's words…" forever with no retry. Now
    // any failure lands as `status: error`, which the UI surfaces with "Try again".
    try {
      const cx = await ctx.runQuery(internal.dailyTidbits.contextForInternal, {
        userId: args.userId,
        day: args.day,
      });
      const raw = await chatComplete(ctx, {
        taskId: "dailyQuote",
        fn: "ai/dailyQuote.generate",
        userId: args.userId,
        jsonMode: true,
        messages: [{ role: "user", content: buildInput(cx) }],
      });
      // Tolerant on the wrapper (bare JSON, ```json fences, or JSON inside a line
      // of prose), strict on the content: a usable quote needs BOTH a non-empty
      // quote and a non-empty attribution. Anything missing/blank/non-string ->
      // null -> we throw, so the row lands `error` instead of a half-quote. We
      // never stamp "Unknown" for a missing author (ARI-134).
      const parsed = parseDailyQuote(raw ?? "");
      if (!parsed) throw new Error("unusable quote payload");
      await ctx.runMutation(internal.dailyTidbits.writeInternal, {
        tidbitId: args.tidbitId,
        status: "done",
        text: parsed.text,
        attribution: parsed.attribution,
        model: TASKS.dailyQuote.model,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.dailyTidbits.writeInternal, {
        tidbitId: args.tidbitId,
        status: "error",
        error: String(e?.message ?? e).slice(0, 300),
      });
    }
  },
});
