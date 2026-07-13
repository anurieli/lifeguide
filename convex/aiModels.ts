import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { aiNodeSummary, PROVIDERS, TASKS, type ProviderId } from "./ai/config";

// ============================================================================
// Per-user AI model overrides (ADR 0017). The Settings AI hub lets a person
// re-point any AI node at a different provider/model for their own account.
// aiForTask (convex/ai/openai.ts) reads the override first; clearing it falls
// back to the config default in convex/ai/config.ts. Deployment defaults still
// change in config.ts — this is the personal dial on top.
// ============================================================================

const PROVIDER = v.union(v.literal("openrouter"), v.literal("openai"), v.literal("local"));

/** Set (or replace) the caller's model override for one AI node. */
export const setModel = mutation({
  args: { taskId: v.string(), provider: PROVIDER, model: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!TASKS[args.taskId]) throw new Error(`Unknown AI task: ${args.taskId}`);
    const model = args.model.trim();
    if (!model) throw new Error("Empty model id");
    const existing = await ctx.db
      .query("aiOverrides")
      .withIndex("by_user_task", (q) => q.eq("userId", userId).eq("taskId", args.taskId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { provider: args.provider, model, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("aiOverrides", {
        userId,
        taskId: args.taskId,
        provider: args.provider,
        model,
        updatedAt: Date.now(),
      });
    }
  },
});

/** Remove the caller's override for one node (falls back to the config default). */
export const clearModel = mutation({
  args: { taskId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("aiOverrides")
      .withIndex("by_user_task", (q) => q.eq("userId", userId).eq("taskId", args.taskId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/**
 * Every AI node with the model it will ACTUALLY run for the caller: the config
 * default, overlaid with their override where one exists. Secret-free; feeds the
 * Settings AI hub.
 */
export const nodes = query({
  args: {},
  handler: async (ctx) => {
    const base = aiNodeSummary();
    const userId = await getAuthUserId(ctx);
    if (!userId) return base.map((n) => ({ ...n, overridden: false }));
    const overrides = await ctx.db
      .query("aiOverrides")
      .withIndex("by_user_task", (q) => q.eq("userId", userId))
      .collect();
    const byTask = new Map(overrides.map((o) => [o.taskId, o]));
    return base.map((n) => {
      const ov = byTask.get(n.id);
      if (!ov) return { ...n, overridden: false };
      return {
        ...n,
        provider: ov.provider,
        providerLabel: PROVIDERS[ov.provider as ProviderId].label,
        model: ov.model,
        overridden: true,
        defaultModel: n.model,
      };
    });
  },
});

/** Server-only: the override aiForTask consults. Never callable from the client. */
export const getOverrideInternal = internalQuery({
  args: { userId: v.id("users"), taskId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("aiOverrides")
      .withIndex("by_user_task", (q) => q.eq("userId", args.userId).eq("taskId", args.taskId))
      .first();
    return row ? { provider: row.provider, model: row.model } : null;
  },
});
