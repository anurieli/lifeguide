import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Preset library offered after the default "Lifestyle" pillar. Users can add any of these
// or define custom pillars. Pillars are cross-cutting tags, never containers.
export const PRESETS = [
  "Health & Fitness",
  "Family & Relationships",
  "Financial & Professional",
  "Growth & Mind",
  "Money & Freedom",
  "Spirit & Meaning",
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("pillars")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const presets = query({
  args: {},
  handler: async () => PRESETS,
});

export const add = mutation({
  args: {
    name: v.string(),
    source: v.union(v.literal("preset"), v.literal("custom")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("pillars", {
      userId,
      name: args.name,
      description: args.description,
      weight: 0,
      source: args.source,
      createdAt: Date.now(),
    });
  },
});
