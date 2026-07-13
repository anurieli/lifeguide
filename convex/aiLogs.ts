import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// The universal AI call log (ADR 0017). Every model call in the app — chat,
// transcription, image — lands here as one row, success or failure, written
// best-effort by the helpers in convex/ai/openai.ts (logAi / chatComplete /
// transcribeLogged). This is the observability spine the Settings AI hub reads.
// ============================================================================

/** Server-only writer. Called via logAi(); never callable from the client. */
export const record = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    taskId: v.string(),
    fn: v.string(),
    provider: v.string(),
    model: v.string(),
    kind: v.union(
      v.literal("chat"),
      v.literal("transcription"),
      v.literal("image"),
      v.literal("realtime"),
    ),
    ok: v.boolean(),
    error: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    durationMs: v.number(),
    at: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiLogs", args);
  },
});

/** The caller's most recent AI calls, newest first, for the Settings activity list. */
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const rows = await ctx.db
      .query("aiLogs")
      .withIndex("by_user_at", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
    return rows.map((r) => ({
      id: r._id,
      taskId: r.taskId,
      fn: r.fn,
      provider: r.provider,
      model: r.model,
      kind: r.kind,
      ok: r.ok,
      error: r.error,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      costUsd: r.costUsd,
      durationMs: r.durationMs,
      at: r.at,
    }));
  },
});

/** This calendar month's totals for the caller: calls, tokens, estimated spend. */
export const monthSpend = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const rows = await ctx.db
      .query("aiLogs")
      .withIndex("by_user_at", (q) => q.eq("userId", userId).gte("at", monthStart))
      .collect();
    let calls = 0,
      errors = 0,
      inputTokens = 0,
      outputTokens = 0,
      costUsd = 0,
      costKnown = 0;
    for (const r of rows) {
      calls++;
      if (!r.ok) errors++;
      inputTokens += r.inputTokens ?? 0;
      outputTokens += r.outputTokens ?? 0;
      if (r.costUsd !== undefined) {
        costUsd += r.costUsd;
        costKnown++;
      }
    }
    return { calls, errors, inputTokens, outputTokens, costUsd, costKnown, since: monthStart };
  },
});
