import { mutation, query } from "./_generated/server";
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

// The read side of the log: everything the person put in during [sinceMs, untilMs),
// oldest first. The Today surface passes the current ritual day's span
// (lib/ritual.ts ritualDayRange) to render the day's log.
export const forRange = query({
  args: { sinceMs: v.number(), untilMs: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("interactions")
      .withIndex("by_user", (q) =>
        q.eq("userId", userId).gte("at", args.sinceMs).lt("at", args.untilMs),
      )
      .collect();
  },
});
