import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// The daily tidbit: one AI-surfaced inspirational QUOTE per person per day, shown
// in the morning scroll (docs/product/features/daily-tidbit.md). Generated lazily
// and cached: the scroll calls `ensureForDay` on render, which — if today has no
// row yet — writes a `pending` row and schedules the cheap Haiku `dailyQuote` agent
// (convex/ai/dailyQuote.ts). `forDay` streams the row reactively, so the quote
// appears the moment the agent lands. `kind` is a union for future tidbit kinds.
// ============================================================================

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const KIND = v.union(v.literal("quote"));
type Kind = "quote";

async function rowFor(
  ctx: { db: any },
  userId: Id<"users">,
  day: string,
  kind: Kind,
) {
  return await ctx.db
    .query("dailyTidbits")
    .withIndex("by_user_day_kind", (q: any) =>
      q.eq("userId", userId).eq("day", day).eq("kind", kind),
    )
    .first();
}

// Today's tidbit row (pending / done / error), or null before it exists.
export const forDay = query({
  args: { day: v.string(), kind: KIND },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    if (!DAY_KEY.test(args.day)) return null;
    return await rowFor(ctx, userId, args.day, args.kind);
  },
});

// Called by the scroll on render: make sure today's tidbit exists. If missing, write
// a `pending` row and kick the agent. Idempotent — an existing row (any status) is a
// no-op, so the agent runs at most once per person per day. A stuck `error` row is
// left for the explicit `refresh` (never auto-retried in a render loop).
export const ensureForDay = mutation({
  args: { day: v.string(), kind: KIND },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!DAY_KEY.test(args.day)) throw new Error("Bad day key");
    const existing = await rowFor(ctx, userId, args.day, args.kind);
    if (existing) return existing._id;
    const id = await ctx.db.insert("dailyTidbits", {
      userId,
      day: args.day,
      kind: args.kind,
      status: "pending",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.ai.dailyQuote.generate, {
      tidbitId: id,
      userId,
      day: args.day,
    });
    return id;
  },
});

// Explicit "find me another" — reset today's row to pending and re-run the agent.
export const refresh = mutation({
  args: { day: v.string(), kind: KIND },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!DAY_KEY.test(args.day)) throw new Error("Bad day key");
    const existing = await rowFor(ctx, userId, args.day, args.kind);
    const now = Date.now();
    const id =
      existing?._id ??
      (await ctx.db.insert("dailyTidbits", {
        userId,
        day: args.day,
        kind: args.kind,
        status: "pending",
        createdAt: now,
      }));
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "pending",
        text: undefined,
        attribution: undefined,
        error: undefined,
      });
    }
    await ctx.scheduler.runAfter(0, internal.ai.dailyQuote.generate, {
      tidbitId: id,
      userId,
      day: args.day,
    });
    return id;
  },
});

// The Core context the agent draws on, plus the last few quotes shown (so it varies).
// Internal — assembled server-side, never exposed to the client.
export const contextForInternal = internalQuery({
  args: { userId: v.id("users"), day: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    const mirror = await ctx.db
      .query("mirror")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
    // Standing horizons (5yr / 1yr / 1mo) add direction beyond the Mirror.
    const standing = await ctx.db
      .query("horizons")
      .withIndex("by_user_scope_period", (q) => q.eq("userId", args.userId))
      .collect();
    const recent = await ctx.db
      .query("dailyTidbits")
      .withIndex("by_user_day_kind", (q) => q.eq("userId", args.userId))
      .collect();
    const recentQuotes = recent
      .filter((r) => r.kind === "quote" && r.text && r.day !== args.day)
      .sort((a, b) => (b.generatedAt ?? 0) - (a.generatedAt ?? 0))
      .slice(0, 8)
      .map((r) => `${r.text}${r.attribution ? ` — ${r.attribution}` : ""}`);
    const standingText = standing
      .filter((h) => h.period === "std" && h.text)
      .map((h) => `${h.scope}: ${h.text}`)
      .join("\n");
    return {
      northStar: settings?.northStar ?? "",
      values: mirror?.structured.values ?? [],
      themes: mirror?.structured.themes ?? [],
      summary: mirror?.summary ?? "",
      standing: standingText,
      recentQuotes,
    };
  },
});

// Write the agent's result (or an error) back onto the row.
export const writeInternal = internalMutation({
  args: {
    tidbitId: v.id("dailyTidbits"),
    status: v.union(v.literal("done"), v.literal("error")),
    text: v.optional(v.string()),
    attribution: v.optional(v.string()),
    model: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.tidbitId);
    if (!row) return; // deleted while the agent ran
    await ctx.db.patch(args.tidbitId, {
      status: args.status,
      ...(args.text !== undefined ? { text: args.text } : {}),
      ...(args.attribution !== undefined ? { attribution: args.attribution } : {}),
      ...(args.model !== undefined ? { model: args.model } : {}),
      ...(args.error !== undefined ? { error: args.error } : {}),
      generatedAt: Date.now(),
    });
  },
});
