import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// The Horizons ladder: the person's nested plan, from the far 5-year vision down
// to today (docs/product/features/horizons.md). Standing rungs (five_year /
// one_year / one_month) are one evolving line each; time-boxed rungs (weekly,
// daily) are small ordered lists of up to MAX_PER_PERIOD checkable goals that
// reset with their period. `period` is computed CLIENT-side from the ritual day
// key (lib/horizons.ts periodKeyFor), same convention as the ritual day keys —
// the server just validates and stores. North Star is NOT here (settings.northStar).
// ============================================================================

const SCOPE = v.union(
  v.literal("five_year"),
  v.literal("one_year"),
  v.literal("one_month"),
  v.literal("weekly"),
  v.literal("daily"),
);
const STANDING = new Set(["five_year", "one_year", "one_month"]);
const MAX_PER_PERIOD = 3;
// "std" | a "YYYY-MM-DD" week/day key.
const PERIOD_KEY = /^(std|\d{4}-\d{2}-\d{2})$/;

type Scope = "five_year" | "one_year" | "one_month" | "weekly" | "daily";

async function rowsFor(
  ctx: { db: QueryCtx["db"] },
  userId: Id<"users">,
  scope: Scope,
  period: string,
) {
  return await ctx.db
    .query("horizons")
    .withIndex("by_user_scope_period", (q) =>
      q.eq("userId", userId).eq("scope", scope).eq("period", period),
    )
    .collect();
}

async function getOwned(ctx: MutationCtx, userId: Id<"users">, id: Id<"horizons">) {
  const row = await ctx.db.get(id);
  if (!row || row.userId !== userId) throw new Error("Not found");
  return row;
}

// The whole ladder for a given moment: the caller passes the standing bucket ("std"),
// this week's key, and today's key (all from lib/horizons.ts), and gets every rung's
// rows back in one shot, ordered. Standing rungs return their single row (or none).
export const ladder = query({
  args: { week: v.string(), day: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    if (!PERIOD_KEY.test(args.week) || !PERIOD_KEY.test(args.day)) return null;
    const periodOf = (scope: Scope) =>
      STANDING.has(scope) ? "std" : scope === "weekly" ? args.week : args.day;
    const scopes: Scope[] = ["five_year", "one_year", "one_month", "weekly", "daily"];
    const out: Record<string, { _id: Id<"horizons">; text: string; order: number; doneAt?: number }[]> =
      {};
    for (const scope of scopes) {
      const rows = (await rowsFor(ctx, userId, scope, periodOf(scope))).sort(
        (a, b) => a.order - b.order,
      );
      out[scope] = rows.map((r) => ({ _id: r._id, text: r.text, order: r.order, doneAt: r.doneAt }));
    }
    return out;
  },
});

// Set a STANDING rung (five_year / one_year / one_month): a single evolving line.
// Upserts the one row; empty text clears it (deletes the row).
export const setStanding = mutation({
  args: { scope: SCOPE, text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!STANDING.has(args.scope)) throw new Error("Not a standing rung");
    const existing = (await rowsFor(ctx, userId, args.scope, "std"))[0];
    const text = args.text.trim();
    const now = Date.now();
    if (!text) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }
    if (existing) {
      await ctx.db.patch(existing._id, { text, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("horizons", {
      userId,
      scope: args.scope,
      period: "std",
      text,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Add one goal to a TIME-BOXED rung (weekly / daily) for its period. Enforces the
// MAX_PER_PERIOD cap ("the most important thing, plus two more") server-side.
export const addGoal = mutation({
  args: { scope: SCOPE, period: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (STANDING.has(args.scope)) throw new Error("Standing rungs use setStanding");
    if (!PERIOD_KEY.test(args.period) || args.period === "std") throw new Error("Bad period key");
    const text = args.text.trim();
    if (!text) throw new Error("Empty goal");
    const siblings = await rowsFor(ctx, userId, args.scope, args.period);
    if (siblings.length >= MAX_PER_PERIOD) throw new Error("At most three goals");
    const now = Date.now();
    return await ctx.db.insert("horizons", {
      userId,
      scope: args.scope,
      period: args.period,
      text,
      order: siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Edit a goal's / rung's text in place. Empty text deletes the row (a cleared goal).
export const update = mutation({
  args: { id: v.id("horizons"), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const row = await getOwned(ctx, userId, args.id);
    const text = args.text.trim();
    if (!text) {
      await ctx.db.delete(row._id);
      return null;
    }
    await ctx.db.patch(row._id, { text, updatedAt: Date.now() });
    return row._id;
  },
});

export const remove = mutation({
  args: { id: v.id("horizons") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const row = await getOwned(ctx, userId, args.id);
    await ctx.db.delete(row._id);
  },
});

// Check off (or un-check) a time-boxed goal — the night review marks what got done.
export const setDone = mutation({
  args: { id: v.id("horizons"), done: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const row = await getOwned(ctx, userId, args.id);
    if (STANDING.has(row.scope)) throw new Error("Standing rungs are not checkable");
    await ctx.db.patch(row._id, { doneAt: args.done ? Date.now() : undefined });
  },
});
