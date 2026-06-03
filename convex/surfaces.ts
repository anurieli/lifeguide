import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: { surfaceId: v.id("surfaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const s = await ctx.db.get(args.surfaceId);
    return s && s.userId === userId ? s : null;
  },
});

export const firstForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const s = await ctx.db
      .query("surfaces")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return s?._id ?? null;
  },
});
