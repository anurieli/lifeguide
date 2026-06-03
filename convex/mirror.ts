import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// The Mirror as a context fragment — the global "about this person" layer the Coach always reads.
export const assemble = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const m = await ctx.db
      .query("mirror")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    const themeText = m?.structured.themes.join(", ") || "(none yet)";
    const valueText = m?.structured.values.join(", ") || "(none yet)";
    return {
      surfaceId: "mirror",
      scope: "mirror" as const,
      label: "About this person (Mirror)",
      text: `Summary: ${m?.summary || "(still learning)"}\nValues: ${valueText}\nThemes: ${themeText}`,
      priority: 6,
    };
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("mirror")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

// Append a theme to the latest Mirror snapshot (idempotent on theme text). Plan 2 expands this
// into proper compaction; this is the minimal delta path.
export const recordDelta = mutation({
  args: { theme: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const m = await ctx.db
      .query("mirror")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    if (!m) return;
    if (!m.structured.themes.includes(args.theme)) {
      await ctx.db.patch(m._id, {
        structured: { ...m.structured, themes: [...m.structured.themes, args.theme] },
        takenAt: Date.now(),
      });
    }
  },
});
