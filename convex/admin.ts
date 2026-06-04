// ============================================================================
// ADMIN / DEV TOOLS — self-scoped maintenance actions for the CURRENT identity.
// ============================================================================
// Because LifeGuide uses anonymous, cookie-bound auth, "admin" here means
// "operate on my own account": reset onboarding so the Door reappears, clear or
// seed the Core, inspect my interview sessions, or wipe my test data. These are
// NOT cross-user operations (that would need a real isAdmin role). The /admin
// page that drives these is dev-gated; the mutations themselves only ever touch
// rows owned by the authed user, so they are safe by construction.
// ============================================================================

import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { blueprintStatus, deriveLevel } from "../lib/levels";
import { ALL_KEYS } from "../lib/levels";

async function requireUser(ctx: MutationCtx | QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

// Get the user's settings row, creating it with defaults if absent
// (mirrors settings.getOrCreate, which isn't exported).
async function settingsRow(ctx: MutationCtx, userId: Id<"users">) {
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

// Recompute blueprint status + level from the user's current coreResponses.
// Mirrors settings.recompute (can't call a sibling mutation from within a mutation).
async function recomputeFor(ctx: MutationCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("coreResponses")
    .withIndex("by_user_question", (q) => q.eq("userId", userId))
    .collect();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.questionKey] = r.content;
  const s = await settingsRow(ctx, userId);
  await ctx.db.patch(s._id, {
    blueprintStatus: blueprintStatus(map),
    level: deriveLevel(map),
    updatedAt: Date.now(),
  });
}

// Put the user back in front of the Door: clear the onboarding stamp + derived
// status/level. Leaves Core answers intact (use clearCore to wipe those too).
export const resetOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const s = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (s) {
      await ctx.db.patch(s._id, {
        onboardedAt: undefined,
        blueprintStatus: undefined,
        level: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});

// Delete every Core answer for the user, then recompute status (-> unstarted/0).
export const clearCore = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const rows = await ctx.db
      .query("coreResponses")
      .withIndex("by_user_question", (q) => q.eq("userId", userId))
      .collect();
    for (const r of rows) await ctx.db.delete(r._id);
    await recomputeFor(ctx, userId);
  },
});

// Fill all 18 blueprint boxes with sample text (to exercise complete / Level 1).
export const seedCore = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    for (const key of ALL_KEYS) {
      const content = `[seed] sample answer for ${key}`;
      const existing = await ctx.db
        .query("coreResponses")
        .withIndex("by_user_question", (q) => q.eq("userId", userId).eq("questionKey", key))
        .first();
      if (existing) await ctx.db.patch(existing._id, { content, updatedAt: Date.now() });
      else await ctx.db.insert("coreResponses", { userId, questionKey: key, content, updatedAt: Date.now() });
    }
    await recomputeFor(ctx, userId);
  },
});

// The user's interview sessions, newest first (for inspection in the panel).
export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("interviewSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Full wipe of the user's onboarding footprint: Core answers, interview
// sessions, telemetry events, and the onboarding stamp. Settings preferences
// (rhythm, tone) are kept. Use to get a clean slate without a new identity.
export const clearTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);

    const core = await ctx.db
      .query("coreResponses")
      .withIndex("by_user_question", (q) => q.eq("userId", userId))
      .collect();
    for (const r of core) await ctx.db.delete(r._id);

    const sessions = await ctx.db
      .query("interviewSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const r of sessions) await ctx.db.delete(r._id);

    const events = await ctx.db
      .query("experienceEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const r of events) await ctx.db.delete(r._id);

    const s = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (s) {
      await ctx.db.patch(s._id, {
        onboardedAt: undefined,
        blueprintStatus: undefined,
        level: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});
