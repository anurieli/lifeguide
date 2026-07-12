import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { getOrCreate as getOrCreateSettings } from "./settings";
import { ensureBlueprint } from "./blueprintDoc";

// ============================================================================
// The Daily Ritual: two ordered sequences of TYPED COMPONENTS (ADR 0011) that
// bookend the day. The morning is a primer sequence walked top to bottom (read,
// roadmap, question); the evening builds tomorrow's roadmap; plain "do" steps
// live on the day's to-do rail beside the sequence. Items are per-user and
// ordered; check state lives in per-day rows (ritualDays) so it resets each
// ritual day structurally, while completed rows persist as history. Time logic
// (which ritual now, which day this is) lives in lib/ritual.ts; the day key is
// computed client-side (ADR 0009). See docs/product/features/daily-ritual.md.
// ============================================================================

const RITUAL = v.union(v.literal("morning"), v.literal("night"));
// Items and daily check state also accept "any": a ritual practice indifferent
// to the time of day (rail-only, checkable daily, part of neither seal).
const RITUAL_ANY = v.union(v.literal("morning"), v.literal("night"), v.literal("any"));
const KIND = v.union(
  v.literal("do"),
  v.literal("read"),
  v.literal("question"),
  v.literal("roadmap"),
);
const SOURCE = v.union(v.literal("inline"), v.literal("blueprint"));

// A ritual-day key must be the "YYYY-MM-DD" shape lib/ritual.ts produces.
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

// The current seed version: bumping it means new default components exist that
// upgradeToSeedVersion can offer to older accounts. Fresh seeds start here.
export const RITUALS_SEED_VERSION = 2;

// The minimal default set, derived from the Blueprint for Living doctrine
// (docs/research/blueprint-for-living.md). Deliberately small: users delete
// what they do not want. Everything here is editable after seeding. The morning
// is the primer sequence (read → roadmap → question) plus one "do"; the evening
// is the close-out (question) and tomorrow's roadmap builder.
export const DEFAULT_RITUAL_ITEMS: {
  ritual: "morning" | "night";
  kind: "do" | "read" | "question" | "roadmap";
  title: string;
  content?: string;
  source?: "inline" | "blueprint";
}[] = [
  { ritual: "morning", kind: "read", title: "Read the Blueprint", source: "blueprint" },
  { ritual: "morning", kind: "do", title: "Drink a glass of water" },
  { ritual: "morning", kind: "roadmap", title: "Walk today's roadmap" },
  {
    ritual: "morning",
    kind: "question",
    title: "Today's one move",
    content: "What's one small thing today that points at it?",
  },
  { ritual: "night", kind: "question", title: "Check out" }, // no content → rotating bank
  { ritual: "night", kind: "roadmap", title: "Set tomorrow's roadmap" },
];

async function getOwnedItem(ctx: MutationCtx, userId: Id<"users">, itemId: Id<"ritualItems">) {
  const item = await ctx.db.get(itemId);
  if (!item || item.userId !== userId) throw new Error("Not found");
  return item;
}

async function itemsFor(
  ctx: { db: QueryCtx["db"] },
  userId: Id<"users">,
  ritual: "morning" | "night" | "any",
) {
  return await ctx.db
    .query("ritualItems")
    .withIndex("by_user_ritual", (q) => q.eq("userId", userId).eq("ritual", ritual))
    .collect();
}

async function dayRow(
  ctx: { db: QueryCtx["db"] },
  userId: Id<"users">,
  ritual: "morning" | "night" | "any",
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
          source: item.source,
          order: orders[item.ritual]++,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    // A fresh seed is already on the current version, so the upgrade never runs.
    await ctx.db.patch(settings._id, {
      ritualsSeededAt: now,
      ritualsSeedVersion: RITUALS_SEED_VERSION,
      updatedAt: now,
    });
  },
});

// One-shot upgrade to the typed-component seed (v2, ADR 0011): offers the new
// question/roadmap components to accounts seeded before they existed. Only
// touches a ritual that still has at least one item (an emptied ritual stays
// empty — delete-all is honored), only appends kinds the ritual does not already
// have, and never edits existing items. Marked done via settings.ritualsSeedVersion,
// so deleting the added components later also sticks.
export const upgradeToSeedVersion = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const settings = await getOrCreateSettings(ctx, userId);
    if ((settings.ritualsSeedVersion ?? 1) >= RITUALS_SEED_VERSION) return;
    const now = Date.now();
    const additions: Record<
      "morning" | "night",
      { kind: "question" | "roadmap"; title: string; content?: string }[]
    > = {
      morning: [
        { kind: "roadmap", title: "Walk today's roadmap" },
        {
          kind: "question",
          title: "Today's one move",
          content: "What's one small thing today that points at it?",
        },
      ],
      night: [
        { kind: "question", title: "Check out" },
        { kind: "roadmap", title: "Set tomorrow's roadmap" },
      ],
    };
    for (const ritual of ["morning", "night"] as const) {
      const items = await itemsFor(ctx, userId, ritual);
      if (items.length === 0) continue; // emptied on purpose; stays empty
      let order = Math.max(...items.map((i) => i.order)) + 1;
      const have = new Set(items.map((i) => i.kind));
      for (const add of additions[ritual]) {
        if (have.has(add.kind)) continue;
        await ctx.db.insert("ritualItems", {
          userId,
          ritual,
          kind: add.kind,
          title: add.title,
          content: add.content,
          order: order++,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    await ctx.db.patch(settings._id, {
      ritualsSeedVersion: RITUALS_SEED_VERSION,
      updatedAt: now,
    });
  },
});

// "Add the Blueprint": ensure the Blueprint document exists (seeding it if this
// account never adopted one) and ensure the morning ritual opens with a read step
// that resolves from it. Idempotent — an existing blueprint-sourced read step (in
// either ritual) makes this a no-op, so repeated taps never duplicate.
export const adoptBlueprintRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ensureBlueprint(ctx, userId);
    const all = await ctx.db
      .query("ritualItems")
      .withIndex("by_user_ritual", (q) => q.eq("userId", userId))
      .collect();
    if (all.some((i) => i.kind === "read" && i.source === "blueprint")) return;
    const morning = all.filter((i) => i.ritual === "morning");
    const now = Date.now();
    await ctx.db.insert("ritualItems", {
      userId,
      ritual: "morning",
      kind: "read",
      title: "Read the Blueprint",
      source: "blueprint",
      // The read opens the morning: slot in ahead of everything.
      order: morning.length === 0 ? 0 : Math.min(...morning.map((i) => i.order)) - 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

const DEFAULT_TITLES: Record<string, string> = {
  do: "New step",
  read: "Something to read",
  question: "A question to sit with",
  roadmap: "The roadmap",
};

export const addItem = mutation({
  args: {
    ritual: RITUAL_ANY,
    kind: KIND,
    title: v.string(),
    content: v.optional(v.string()),
    source: v.optional(SOURCE),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.ritual === "any" && args.kind !== "do")
      throw new Error("Only plain ritual practices can be time-indifferent");
    const siblings = await itemsFor(ctx, userId, args.ritual);
    const now = Date.now();
    return await ctx.db.insert("ritualItems", {
      userId,
      ritual: args.ritual,
      kind: args.kind,
      title: args.title.trim() || DEFAULT_TITLES[args.kind],
      content: args.content,
      source: args.kind === "read" ? args.source : undefined, // source is a read-only concept
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
  args: { ritual: RITUAL_ANY, day: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    if (!DAY_KEY.test(args.day)) return null;
    return await dayRow(ctx, userId, args.ritual, args.day);
  },
});

// Completion history from `sinceDay` (inclusive) onward, both rituals: the quiet
// "am I keeping up with the mornings and nights" strip. Day keys sort
// lexicographically, so a string range over the index does the work.
export const history = query({
  args: { sinceDay: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (!DAY_KEY.test(args.sinceDay)) return [];
    const out: { ritual: "morning" | "night"; day: string; completedAt: number | null }[] = [];
    for (const ritual of ["morning", "night"] as const) {
      const rows = await ctx.db
        .query("ritualDays")
        .withIndex("by_user_ritual_day", (q) =>
          q.eq("userId", userId).eq("ritual", ritual).gte("day", args.sinceDay),
        )
        .collect();
      for (const r of rows) out.push({ ritual, day: r.day, completedAt: r.completedAt ?? null });
    }
    return out;
  },
});

export const setChecked = mutation({
  args: {
    ritual: RITUAL_ANY,
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
