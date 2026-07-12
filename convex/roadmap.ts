import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// The roadmap loop (ADR 0012): before bed the person quickly sets down exactly
// what tomorrow starts with — what to do, plus any where/info needed to just
// execute. Entries target the NEXT ritual day, so the next morning opens with
// them as its ordered spine and the person wakes up executing, not deciding.
// The 4am boundary (ADR 0009) means an entry at 23:00 and one at 1:30am both
// land on the same upcoming morning; the target day key is computed client-side
// (lib/ritual.ts nextRitualDayKey), same as ritual day keys.
// ============================================================================

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

async function entriesFor(ctx: { db: QueryCtx["db"] }, userId: Id<"users">, day: string) {
  return await ctx.db
    .query("roadmapEntries")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", day))
    .collect();
}

async function getOwned(ctx: MutationCtx, userId: Id<"users">, entryId: Id<"roadmapEntries">) {
  const entry = await ctx.db.get(entryId);
  if (!entry || entry.userId !== userId) throw new Error("Not found");
  return entry;
}

// The roadmap for one ritual day, in order. The morning display passes today's
// key; the evening builder passes tomorrow's.
export const forDay = query({
  args: { day: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (!DAY_KEY.test(args.day)) return [];
    return (await entriesFor(ctx, userId, args.day)).sort((a, b) => a.order - b.order);
  },
});

// Fast entry: text, enter, next. Appends to the end of the target day's list.
export const add = mutation({
  args: { day: v.string(), text: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!DAY_KEY.test(args.day)) throw new Error("Bad day key");
    const text = args.text.trim();
    if (!text) throw new Error("Empty entry");
    const siblings = await entriesFor(ctx, userId, args.day);
    return await ctx.db.insert("roadmapEntries", {
      userId,
      day: args.day,
      text,
      note: args.note?.trim() || undefined,
      order: siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    entryId: v.id("roadmapEntries"),
    text: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await getOwned(ctx, userId, args.entryId);
    await ctx.db.patch(entry._id, {
      ...(args.text !== undefined ? { text: args.text.trim() || entry.text } : {}),
      ...(args.note !== undefined ? { note: args.note.trim() || undefined } : {}),
    });
  },
});

export const remove = mutation({
  args: { entryId: v.id("roadmapEntries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await getOwned(ctx, userId, args.entryId);
    await ctx.db.delete(entry._id);
  },
});

// Reorder within the day: swap `order` with the neighbor in the given direction.
export const move = mutation({
  args: {
    entryId: v.id("roadmapEntries"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await getOwned(ctx, userId, args.entryId);
    const siblings = (await entriesFor(ctx, userId, entry.day)).sort((a, b) => a.order - b.order);
    const i = siblings.findIndex((s) => s._id === entry._id);
    const j = args.direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return;
    await ctx.db.patch(siblings[i]._id, { order: siblings[j].order });
    await ctx.db.patch(siblings[j]._id, { order: siblings[i].order });
  },
});

// The morning tap: mark an entry done (or undo it).
export const setDone = mutation({
  args: { entryId: v.id("roadmapEntries"), done: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await getOwned(ctx, userId, args.entryId);
    await ctx.db.patch(entry._id, { doneAt: args.done ? Date.now() : undefined });
  },
});
