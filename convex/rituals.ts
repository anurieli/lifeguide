import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { getOrCreate as getOrCreateSettings } from "./settings";

// ============================================================================
// The Daily Ritual: two small user-editable checklists (morning and night) that
// turn the bookends of the day into a digital ritual. Items are per-user and
// ordered; check state lives in per-day rows (ritualDays) so it resets each
// ritual day structurally, while completed rows persist as history. Time logic
// (which ritual now, which day this is) lives in lib/ritual.ts; the day key is
// computed client-side (ADR 0009). See docs/product/features/daily-ritual.md.
// ============================================================================

const RITUAL = v.union(v.literal("morning"), v.literal("night"));
const KIND = v.union(v.literal("do"), v.literal("read"));

// A ritual-day key must be the "YYYY-MM-DD" shape lib/ritual.ts produces.
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

// The minimal default set, derived from the Blueprint for Living doctrine
// (docs/research/blueprint-for-living.md). Deliberately small: users delete
// what they do not want. Everything here is editable after seeding.
export const DEFAULT_RITUAL_ITEMS: {
  ritual: "morning" | "night";
  kind: "do" | "read";
  title: string;
  content?: string;
}[] = [
  {
    ritual: "morning",
    kind: "read",
    title: "Read the mantra",
    content:
      "Discipline over motivation. Create more than you consume. One small win today, kept like a promise to myself.",
  },
  { ritual: "morning", kind: "do", title: "Drink a glass of water" },
  { ritual: "morning", kind: "do", title: "Plan the day: one move that points at the goal" },
  { ritual: "night", kind: "do", title: "Check out: wins and lessons from today" },
  { ritual: "night", kind: "do", title: "Plan tomorrow before bed" },
];

async function getOwnedItem(ctx: MutationCtx, userId: Id<"users">, itemId: Id<"ritualItems">) {
  const item = await ctx.db.get(itemId);
  if (!item || item.userId !== userId) throw new Error("Not found");
  return item;
}

async function itemsFor(
  ctx: { db: QueryCtx["db"] },
  userId: Id<"users">,
  ritual: "morning" | "night",
) {
  return await ctx.db
    .query("ritualItems")
    .withIndex("by_user_ritual", (q) => q.eq("userId", userId).eq("ritual", ritual))
    .collect();
}

async function dayRow(
  ctx: { db: QueryCtx["db"] },
  userId: Id<"users">,
  ritual: "morning" | "night",
  day: string,
) {
  return await ctx.db
    .query("ritualDays")
    .withIndex("by_user_ritual_day", (q) =>
      q.eq("userId", userId).eq("ritual", ritual).eq("day", day),
    )
    .first();
}

// Every ritual item for the user, ordered by ritual then order (the index's sort).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("ritualItems")
      .withIndex("by_user_ritual", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Seed the default items for a user who has none. Idempotent, and one-shot per
// user: `settings.ritualsSeededAt` marks it done, so a user who deletes every
// item is honored (the defaults never come back on their own).
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const settings = await getOrCreateSettings(ctx, userId);
    if (settings.ritualsSeededAt) return;
    const now = Date.now();
    const existing = await ctx.db
      .query("ritualItems")
      .withIndex("by_user_ritual", (q) => q.eq("userId", userId))
      .first();
    if (!existing) {
      const orders: Record<string, number> = { morning: 0, night: 0 };
      for (const item of DEFAULT_RITUAL_ITEMS) {
        await ctx.db.insert("ritualItems", {
          userId,
          ritual: item.ritual,
          kind: item.kind,
          title: item.title,
          content: item.content,
          order: orders[item.ritual]++,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    await ctx.db.patch(settings._id, { ritualsSeededAt: now, updatedAt: now });
  },
});

export const addItem = mutation({
  args: {
    ritual: RITUAL,
    kind: KIND,
    title: v.string(),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const siblings = await itemsFor(ctx, userId, args.ritual);
    const now = Date.now();
    return await ctx.db.insert("ritualItems", {
      userId,
      ritual: args.ritual,
      kind: args.kind,
      title: args.title.trim() || (args.kind === "read" ? "Something to read" : "New step"),
      content: args.content,
      order: siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("ritualItems"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const item = await getOwnedItem(ctx, userId, args.itemId);
    await ctx.db.patch(item._id, {
      ...(args.title !== undefined ? { title: args.title.trim() || item.title } : {}),
      ...(args.content !== undefined ? { content: args.content } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("ritualItems") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const item = await getOwnedItem(ctx, userId, args.itemId);
    await ctx.db.delete(item._id);
    // Stale ids left in any ritualDays.checkedIds are ignored by completion logic.
  },
});

// Reorder: swap the item's `order` with its neighbor in the given direction.
export const moveItem = mutation({
  args: { itemId: v.id("ritualItems"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const item = await getOwnedItem(ctx, userId, args.itemId);
    const siblings = (await itemsFor(ctx, userId, item.ritual)).sort((a, b) => a.order - b.order);
    const i = siblings.findIndex((s) => s._id === item._id);
    const j = args.direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return;
    const now = Date.now();
    await ctx.db.patch(siblings[i]._id, { order: siblings[j].order, updatedAt: now });
    await ctx.db.patch(siblings[j]._id, { order: siblings[i].order, updatedAt: now });
  },
});

// The check state + completion record for one ritual on one day (null until touched).
export const day = query({
  args: { ritual: RITUAL, day: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    if (!DAY_KEY.test(args.day)) return null;
    return await dayRow(ctx, userId, args.ritual, args.day);
  },
});

export const setChecked = mutation({
  args: {
    ritual: RITUAL,
    day: v.string(),
    itemId: v.id("ritualItems"),
    checked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!DAY_KEY.test(args.day)) throw new Error("Bad day key");
    const item = await getOwnedItem(ctx, userId, args.itemId);
    if (item.ritual !== args.ritual) throw new Error("Item is not part of this ritual");
    const row = await dayRow(ctx, userId, args.ritual, args.day);
    if (row?.completedAt) return; // sealed for the day; checks are read-only
    if (!row) {
      await ctx.db.insert("ritualDays", {
        userId,
        ritual: args.ritual,
        day: args.day,
        checkedIds: args.checked ? [args.itemId] : [],
      });
      return;
    }
    const checkedIds = args.checked
      ? row.checkedIds.includes(args.itemId)
        ? row.checkedIds
        : [...row.checkedIds, args.itemId]
      : row.checkedIds.filter((id) => id !== args.itemId);
    await ctx.db.patch(row._id, { checkedIds });
  },
});

// The single confirm of the completion moment. Verifies every current item is
// checked, stamps `completedAt`, and publishes the event to the Bus. Idempotent.
export const complete = mutation({
  args: { ritual: RITUAL, day: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!DAY_KEY.test(args.day)) throw new Error("Bad day key");
    const row = await dayRow(ctx, userId, args.ritual, args.day);
    if (!row) throw new Error("Nothing checked yet");
    if (row.completedAt) return row.completedAt;
    const items = await itemsFor(ctx, userId, args.ritual);
    const checked = new Set(row.checkedIds);
    if (items.length === 0 || !items.every((i) => checked.has(i._id)))
      throw new Error("Ritual not finished");
    const now = Date.now();
    await ctx.db.patch(row._id, { completedAt: now });
    await ctx.db.insert("interactions", {
      userId,
      type: "ritual_completed",
      payload: JSON.stringify({ ritual: args.ritual, day: args.day }),
      at: now,
    });
    return now;
  },
});
