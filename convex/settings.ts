import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const EXERCISE = v.union(v.literal("intention"), v.literal("gratitude"), v.literal("free"));
const TONE = v.union(v.literal("gentle"), v.literal("balanced"), v.literal("direct"));
const REACH = v.union(v.literal("leave"), v.literal("earned"), v.literal("often"));

async function getOrCreate(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("settings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (existing) return existing;
  const id = await ctx.db.insert("settings", {
    userId,
    morningCheckin: true,
    eveningCheckin: true,
    dailyExercise: "intention",
    coachTone: "balanced",
    reachingOut: "earned",
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const update = mutation({
  args: {
    morningCheckin: v.optional(v.boolean()),
    eveningCheckin: v.optional(v.boolean()),
    dailyExercise: v.optional(EXERCISE),
    coachTone: v.optional(TONE),
    reachingOut: v.optional(REACH),
    northStar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const s = await getOrCreate(ctx, userId);
    await ctx.db.patch(s._id, { ...args, updatedAt: Date.now() });
  },
});

export const completeOnboarding = mutation({
  args: {
    dailyExercise: v.optional(EXERCISE),
    coachTone: v.optional(TONE),
    morningCheckin: v.optional(v.boolean()),
    eveningCheckin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const s = await getOrCreate(ctx, userId);
    await ctx.db.patch(s._id, { ...args, onboardedAt: Date.now(), updatedAt: Date.now() });
  },
});
