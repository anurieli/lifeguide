import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// The note to tomorrow-morning-you: the hinge between the two scrolls. Written
// (and freely rewritten) during the night scroll targeting the NEXT ritual day,
// then read at the top of that morning's scroll. One note per morning; setting
// an empty text removes it. Day keys follow lib/ritual.ts (4am rollover) — the
// night composer passes nextRitualDayKey, the morning reader passes ritualDayKey.
// ============================================================================

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

// The note addressed to one morning, or null if none was left.
export const forDay = query({
  args: { day: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    if (!DAY_KEY.test(args.day)) return null;
    return await ctx.db
      .query("morningNotes")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", args.day))
      .unique();
  },
});

// Upsert the note for a morning. Empty text tears the note up (deletes the row),
// so the morning scroll never opens on a blank note.
export const set = mutation({
  args: { day: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!DAY_KEY.test(args.day)) throw new Error("Bad day key");
    const existing = await ctx.db
      .query("morningNotes")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", args.day))
      .unique();
    const text = args.text.trim();
    if (!text) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }
    if (existing) {
      await ctx.db.patch(existing._id, { text, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("morningNotes", {
      userId,
      day: args.day,
      text,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
