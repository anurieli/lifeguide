import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { fallbackTitle } from "../lib/sessionDigest";

// ============================================================================
// Sessions: the living journal entry. A session is a container over captures
// (optional captures.sessionId); the raw truth stays on the captures rows and
// their stored blobs. This module owns container CRUD + the digest read/write
// used by convex/ai/sessionDigest.ts. See docs/product/features/sessions.md.
// ============================================================================

export const create = mutation({
  args: { device: v.union(v.literal("phone"), v.literal("desktop")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("sessions", {
      userId,
      device: args.device,
      startedAt: now,
      updatedAt: now,
    });
  },
});

// Newest-first list rows with derived display fields. Personal volumes are small;
// reading each session's captures here is fine and keeps storage clean of derived data.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    return await Promise.all(
      rows.map(async (s) => {
        const caps = await ctx.db
          .query("captures")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();
        const counts = { voice: 0, text: 0, photo: 0 };
        for (const c of caps) {
          if (c.rawType === "audio") counts.voice++;
          else if (c.rawType === "image") counts.photo++;
          else counts.text++;
        }
        return {
          _id: s._id,
          title: s.title,
          summary: s.summary,
          doing: s.doing,
          device: s.device,
          digestStatus: s.digest?.status,
          startedAt: s.startedAt,
          updatedAt: s.updatedAt,
          preview: fallbackTitle(caps),
          counts,
        };
      }),
    );
  },
});

// The document view: the session plus its captures in capture order, files resolved.
export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;
    const rows = await ctx.db
      .query("captures")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const captures = await Promise.all(
      rows.map(async (c) => ({
        ...c,
        fileUrl: c.rawFileId ? await ctx.storage.getUrl(c.rawFileId) : null,
      })),
    );
    return { session, captures };
  },
});

export const setDoing = mutation({
  args: { sessionId: v.id("sessions"), doing: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.sessionId, {
      doing: args.doing.trim().slice(0, 200) || undefined,
      updatedAt: Date.now(),
    });
  },
});

// Called when leaving the document view: a session that never got content
// (e.g. "Type instead" then bail) leaves no husk in the list.
export const deleteIfEmpty = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) return;
    const first = await ctx.db
      .query("captures")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!first) await ctx.db.delete(args.sessionId);
  },
});

// ---- digest plumbing (server-only) ------------------------------------------

export const getForDigestInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    const captures = await ctx.db
      .query("captures")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return { session, captures };
  },
});

export const writeDigestInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    const s = await ctx.db.get(args.sessionId);
    if (!s) return; // session deleted while the digest was in flight
    await ctx.db.patch(args.sessionId, {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.summary !== undefined ? { summary: args.summary } : {}),
      digest: { status: args.status, at: Date.now() },
    });
  },
});
