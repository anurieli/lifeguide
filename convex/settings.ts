import { mutation, query, internalQuery, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { blueprintStatus, deriveLevel } from "../lib/levels";
import { THOUGHT_MAP_MEMO_CAP } from "../lib/thoughtMap";

const EXERCISE = v.union(v.literal("intention"), v.literal("gratitude"), v.literal("free"));
const TONE = v.union(v.literal("gentle"), v.literal("balanced"), v.literal("direct"));
const REACH = v.union(v.literal("leave"), v.literal("earned"), v.literal("often"));
const MOOD = v.union(
  v.literal("inspiration"),
  v.literal("deep-thinking"),
  v.literal("focus"),
  v.literal("calm-reset"),
);

export async function getOrCreate(ctx: MutationCtx, userId: Id<"users">) {
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
    musicEnabled: v.optional(v.boolean()),
    musicAutoplay: v.optional(v.boolean()),
    musicDefaultMood: v.optional(MOOD),
    // The thought map's steering memo (ARI-18 teachable map), per-user. Trimmed
    // and capped server-side; an empty/whitespace memo saves as unset, which
    // buildMapSystemPrompt (lib/thoughtMap.ts) reads as "no memo, default behavior".
    thoughtMapMemo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const s = await getOrCreate(ctx, userId);
    const patch = { ...args } as typeof args;
    if (args.thoughtMapMemo !== undefined) {
      patch.thoughtMapMemo = args.thoughtMapMemo.trim().slice(0, THOUGHT_MAP_MEMO_CAP) || undefined;
    }
    await ctx.db.patch(s._id, { ...patch, updatedAt: Date.now() });
  },
});

// Server-only: the person's thought-map steering memo, read by
// ai/thoughtMap.ts's generate action when it builds the system prompt.
export const getMemoInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const s = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return s?.thoughtMapMemo;
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
