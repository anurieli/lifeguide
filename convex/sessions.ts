import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
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

// List rows with derived display fields: pinned entries first (most recently pinned
// on top), then the rest newest-first. Personal volumes are small; reading each
// session's captures here is fine and keeps storage clean of derived data.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
    const mapped = await Promise.all(
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
          pinnedAt: s.pinnedAt,
          preview: fallbackTitle(caps),
          counts,
        };
      }),
    );
    return mapped.sort(
      (a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0) || b.updatedAt - a.updatedAt,
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

// The person names the entry. A person-entered name is authoritative: titleEditedAt
// marks it and the digest stops writing title (the summary keeps refreshing).
// Clearing the field hands naming back to the AI.
export const setTitle = mutation({
  args: { sessionId: v.id("sessions"), title: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) throw new Error("Not found");
    const title = args.title.trim().slice(0, 80);
    await ctx.db.patch(args.sessionId, {
      title: title || undefined,
      titleEditedAt: title ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

// Called by the document view on open and on leave: the digest (name + the living
// description an agent pulls) must never sit stale behind the content. Skips when
// the digest already covers the latest content, so repeated visits cost nothing.
export const refreshDigest = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) return;
    if (s.digest?.status === "done" && (s.digest.at ?? 0) >= s.updatedAt) return;
    const first = await ctx.db
      .query("captures")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!first) return;
    await ctx.scheduler.runAfter(0, internal.ai.sessionDigest.digestSession, {
      sessionId: args.sessionId,
    });
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

// Visit metadata: stamp when the document view was opened. Deliberately does NOT
// bump updatedAt; reading an entry is not a content change and must not resort the list.
export const touchOpened = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) return;
    await ctx.db.patch(args.sessionId, { lastOpenedAt: Date.now() });
  },
});

// Swipe-left pin/unpin. pinnedAt doubles as the pin ordering key in list().
export const setPinned = mutation({
  args: { sessionId: v.id("sessions"), pinned: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.sessionId, { pinnedAt: args.pinned ? Date.now() : undefined });
  },
});

// Swipe-right delete. The container row goes away; member captures are soft-deleted
// (isActive=false, sessionId kept) so the raw archive never loses an artifact and
// future retroactive mining still sees what belonged together.
export const remove = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) throw new Error("Not found");
    const caps = await ctx.db
      .query("captures")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const c of caps) await ctx.db.patch(c._id, { isActive: false });
    await ctx.db.delete(args.sessionId);
  },
});

// Merge selected sessions into one living entry. The earliest-started session is the
// survivor; every member capture (active or not) is re-parented onto it, so the merged
// document reads chronologically by each element's own createdAt. The stale digest is
// cleared and re-synthesized over the combined content.
export const merge = mutation({
  args: { sessionIds: v.array(v.id("sessions")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const ids = [...new Set(args.sessionIds)];
    if (ids.length < 2) throw new Error("Pick at least two sessions to merge");
    const sessions = [];
    for (const id of ids) {
      const s = await ctx.db.get(id);
      if (!s || s.userId !== userId) throw new Error("Session not found");
      sessions.push(s);
    }
    const target = sessions.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
    const rest = sessions.filter((s) => s._id !== target._id);
    for (const s of rest) {
      const caps = await ctx.db
        .query("captures")
        .withIndex("by_session", (q) => q.eq("sessionId", s._id))
        .collect();
      for (const c of caps) await ctx.db.patch(c._id, { sessionId: target._id });
      await ctx.db.delete(s._id);
    }
    // A person-entered name survives the merge (earliest such session wins);
    // AI titles are stale over the combined content and re-synthesize.
    const named = [target, ...rest].find((s) => s.titleEditedAt !== undefined);
    await ctx.db.patch(target._id, {
      doing: [target, ...rest].map((s) => s.doing).find((d) => d) ?? undefined,
      pinnedAt: sessions.map((s) => s.pinnedAt).find((p) => p !== undefined),
      title: named?.title,
      titleEditedAt: named?.titleEditedAt,
      summary: undefined,
      digest: { status: "pending" as const, at: Date.now() },
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.ai.sessionDigest.digestSession, {
      sessionId: target._id,
    });
    return target._id;
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
    // A person-entered name is never overwritten; the digest still owns the summary.
    await ctx.db.patch(args.sessionId, {
      ...(args.title !== undefined && s.titleEditedAt === undefined
        ? { title: args.title }
        : {}),
      ...(args.summary !== undefined ? { summary: args.summary } : {}),
      digest: { status: args.status, at: Date.now() },
    });
  },
});
