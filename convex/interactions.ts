import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Append-only event log. Feeds Mirror deltas (Plan 2) and audit/history.
export const log = mutation({
  args: { type: v.string(), payload: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.insert("interactions", {
      userId,
      type: args.type,
      payload: args.payload,
      at: Date.now(),
    });
  },
});
