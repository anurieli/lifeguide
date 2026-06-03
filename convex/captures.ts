import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const SOURCE = v.union(
  v.literal("paste"),
  v.literal("upload"),
  v.literal("url"),
  v.literal("audio"),
  v.literal("agent"),
);
const RAWTYPE = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("link"),
  v.literal("video_link"),
  v.literal("quote"),
);

// Unplaced, active captures for the current user — the "to place" inbox tray.
export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("captures")
      .withIndex("by_user_unplaced", (q) => q.eq("userId", userId).eq("placedAt", undefined))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
  },
});

// Server-only read for the distill action (runs without an authenticated user).
export const getByIdInternal = internalQuery({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args) => await ctx.db.get(args.captureId),
});

export const create = mutation({
  args: {
    source: SOURCE,
    rawType: RAWTYPE,
    rawText: v.optional(v.string()),
    rawUrl: v.optional(v.string()),
    rawFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const id = await ctx.db.insert("captures", {
      userId,
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
    // Distill in the background (no-op until OPENROUTER_API_KEY is set; the capture still lands).
    await ctx.scheduler.runAfter(0, internal.ai.distill.distillCapture, { captureId: id });
    return id;
  },
});

// Server-only write from the distill action.
export const updateDistilled = internalMutation({
  args: {
    captureId: v.id("captures"),
    distilled: v.object({
      title: v.string(),
      essence: v.string(),
      pillars: v.array(v.string()),
    }),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.captureId, { distilled: args.distilled, embedding: args.embedding });
  },
});

export const softDelete = mutation({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const c = await ctx.db.get(args.captureId);
    if (!c || c.userId !== userId) throw new Error("Not found");
    // Dismissed captures still feed the Mirror later; keep the row, flag inactive.
    await ctx.db.patch(args.captureId, { isActive: false });
  },
});
