import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { blueprintStatus, deriveLevel } from "../lib/levels";

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

export const recompute = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rows = await ctx.db
      .query("coreResponses")
      .withIndex("by_user_question", (q) => q.eq("userId", userId))
      .collect();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.questionKey] = r.content;
    const s = await getOrCreate(ctx, userId);
    await ctx.db.patch(s._id, {
      blueprintStatus: blueprintStatus(map),
      level: deriveLevel(map),
      updatedAt: Date.now(),
    });
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
