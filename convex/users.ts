import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    return { user, bootstrapped: !!profile };
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
    await ctx.db.insert("pillars", {
      userId,
      name: "Lifestyle",
      weight: 1,
      source: "default",
      createdAt: now,
    });
    await ctx.db.insert("mirror", {
      userId,
      summary: "",
      structured: { values: [], themes: [] },
      version: 1,
      takenAt: now,
    });
    return await ctx.db.insert("surfaces", {
      userId,
      type: "whiteboard",
      title: "My Board",
      createdAt: now,
    });
  },
});
