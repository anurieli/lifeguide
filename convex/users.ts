import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { DEFAULT_PILLARS } from "./pillars";

// Insert any canonical pillars the user is missing (by name). Idempotent — safe to call
// on every bootstrap, so older accounts get topped up to the full skeleton.
async function seedDefaultPillars(ctx: MutationCtx, userId: Id<"users">) {
  const have = await ctx.db
    .query("pillars")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const haveNames = new Set(have.map((p) => p.name.trim().toLowerCase()));
  const now = Date.now();
  for (const p of DEFAULT_PILLARS) {
    if (haveNames.has(p.name.trim().toLowerCase())) continue;
    await ctx.db.insert("pillars", {
      userId,
      name: p.name,
      about: p.about,
      composition: p.composition,
      weight: 1,
      source: "default",
      role: p.role,
      createdAt: now,
    });
  }
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    // Include the default surface id so the client resolves the board in one roundtrip
    // (no "Preparing…" flash on reload for an already-bootstrapped user).
    const surface = profile
      ? await ctx.db
          .query("surfaces")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first()
      : null;
    const settings = profile
      ? await ctx.db
          .query("settings")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first()
      : null;
    return {
      user,
      bootstrapped: !!profile,
      surfaceId: surface?._id ?? null,
      onboarded: !!settings?.onboardedAt,
    };
  },
});

// Idempotent: seeds the user's default surface + Lifestyle pillar + empty Mirror on first call.
// Returns the default surface id either way.
export const bootstrap = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      // Heal accounts seeded before the skeleton existed (only the lone "Lifestyle" pillar):
      // top them up to the full canonical set of pillars-with-metadata, idempotently.
      await seedDefaultPillars(ctx, userId);

      const s = await ctx.db
        .query("surfaces")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (s) return s._id;
      // Profile exists but no surface (shouldn't happen) — heal it.
      return await ctx.db.insert("surfaces", {
        userId,
        type: "whiteboard",
        title: "My Board",
        createdAt: Date.now(),
      });
    }

    const now = Date.now();
    await ctx.db.insert("profiles", { userId, bootstrappedAt: now });
    await seedDefaultPillars(ctx, userId);
    await ctx.db.insert("mirror", {
      userId,
      summary: "",
      structured: { values: [], themes: [] },
      version: 1,
      takenAt: now,
    });
    await ctx.db.insert("settings", {
      userId,
      morningCheckin: true,
      eveningCheckin: true,
      dailyExercise: "intention",
      coachTone: "balanced",
      reachingOut: "earned",
      updatedAt: now,
    });
    return await ctx.db.insert("surfaces", {
      userId,
      type: "whiteboard",
      title: "My Board",
      createdAt: now,
    });
  },
});
