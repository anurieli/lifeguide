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

// Demo thoughts: two fully packed entries (voice takes, photos, typed passages)
// so the surface can be seen lived-in before it is. Everything is real data —
// ordinary sessions and captures the person can open, append to, or swipe away.
// Members land with extraction already done and the digest stamped, so no ingest
// runs and no model is called over demo text. The voice/photo files are painted
// client-side (components/sessions/demoMedia.ts) and uploaded before this call.
const DEMO_ENTRIES = [
  {
    title: "Walk in — saying yes to less",
    summary:
      "A walk-and-talk about overcommitting, narrowed down to the three things this week that are actually his.",
    ageMs: 2 * 24 * 3_600_000,
    members: [
      {
        kind: "voice" as const,
        voiceIndex: 0,
        durationMs: 24_000,
        transcript:
          "Okay — thinking out loud on the walk in. The thing that's been eating at me isn't the workload, it's that I keep saying yes to things that aren't mine to carry. Every yes is a small no to the stuff I said matters.",
      },
      {
        kind: "text" as const,
        text: "Three things that are actually mine this week:\n1. Finish the portfolio page\n2. Call grandpa\n3. Gym Tuesday and Thursday",
      },
      {
        kind: "photo" as const,
        photoIndex: 0,
        description:
          "A sunrise over a dark horizon, the sky going from deep blue to warm gold.",
      },
      {
        kind: "text" as const,
        text: "Noticing: the anxious hum shows up on days I skip the morning walk. Two for two now. Keep the walk.",
      },
    ],
  },
  {
    title: "Late night — putting the loop down",
    summary:
      "A pre-sleep dump that turns a looping idea into a weekend-sized plan with a concrete first step for the morning.",
    ageMs: 5 * 3_600_000,
    members: [
      {
        kind: "text" as const,
        text: "Can't sleep. Brain's loud. Putting it here so it stops looping.",
      },
      {
        kind: "voice" as const,
        voiceIndex: 1,
        durationMs: 31_000,
        transcript:
          "The site for dad's woodworking again. I keep treating it like some huge project — it's a landing page, six photos and a contact form. That's a weekend, not a mountain. If I sketch it tomorrow morning it stops being a thing I carry around.",
      },
      {
        kind: "photo" as const,
        photoIndex: 1,
        description: "A notebook page with pen scribbles and a gold underline.",
      },
      {
        kind: "text" as const,
        text: "Tomorrow starts with: water, walk, then the site sketch. Nothing else until that's done.",
      },
    ],
  },
];

export const seedDemo = mutation({
  args: {
    voiceFileIds: v.array(v.id("_storage")),
    photoFileIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.voiceFileIds.length < 2 || args.photoFileIds.length < 2)
      throw new Error("Expected two voice files and two photos");
    const now = Date.now();
    const ids = [];
    for (const entry of DEMO_ENTRIES) {
      const startedAt = now - entry.ageMs;
      const sessionId = await ctx.db.insert("sessions", {
        userId,
        device: "desktop" as const,
        startedAt,
        updatedAt: startedAt,
      });
      let createdAt = startedAt;
      for (const m of entry.members) {
        createdAt += 90_000; // members ~90s apart, like a real sitting
        const sourceMeta = JSON.stringify({
          device: "desktop",
          demo: true,
          ...(m.kind === "voice"
            ? { durationMs: m.durationMs, recordingStartedAt: createdAt - m.durationMs }
            : {}),
        });
        await ctx.db.insert("captures", {
          userId,
          sessionId,
          source: m.kind === "voice" ? ("audio" as const) : m.kind === "photo" ? ("upload" as const) : ("paste" as const),
          rawType: m.kind === "voice" ? ("audio" as const) : m.kind === "photo" ? ("image" as const) : ("text" as const),
          ...(m.kind === "text" ? { rawText: m.text } : {}),
          ...(m.kind === "voice" ? { rawFileId: args.voiceFileIds[m.voiceIndex] } : {}),
          ...(m.kind === "photo" ? { rawFileId: args.photoFileIds[m.photoIndex] } : {}),
          ...(m.kind === "voice" ? { extractedText: m.transcript } : {}),
          ...(m.kind === "photo" ? { extractedText: m.description } : {}),
          extraction: { status: "done" as const, at: createdAt },
          sourceMeta,
          isActive: true,
          createdAt,
        });
      }
      // Digest stamped done at `now` (>= updatedAt), so opening a demo entry
      // never schedules a real digest run over the demo text.
      await ctx.db.patch(sessionId, {
        title: entry.title,
        summary: entry.summary,
        digest: { status: "done" as const, at: now },
        updatedAt: createdAt,
      });
      ids.push(sessionId);
    }
    return ids;
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
          mode: s.mode,
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

// The person switches this entry between quiet (just held) and dynamic (an AI
// interviewer replies after each capture, convex/ai/sessionReply.ts). Absent
// counts as "quiet" everywhere that reads it.
export const setMode = mutation({
  args: { sessionId: v.id("sessions"), mode: v.union(v.literal("quiet"), v.literal("dynamic")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.sessionId, { mode: args.mode, updatedAt: Date.now() });
  },
});

// The dynamic-mode conversation thread: this session's interviewer replies, oldest first.
export const replies = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) return [];
    return await ctx.db
      .query("sessionReplies")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

// The session's live thought map (or null if none has been requested yet).
export const thoughtMap = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) return null;
    return await ctx.db
      .query("thoughtMaps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
  },
});

// Ask for a (re)generation of this session's thought map: upserts the row to
// pending (one live map per session — patched in place, never duplicated) and
// schedules the generation pass.
export const requestThoughtMap = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) throw new Error("Not found");
    const existing = await ctx.db
      .query("thoughtMaps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "pending" as const,
        error: undefined,
        generatedAt: now,
      });
    } else {
      await ctx.db.insert("thoughtMaps", {
        userId,
        sessionId: args.sessionId,
        status: "pending" as const,
        nodes: [],
        edges: [],
        generatedAt: now,
        createdAt: now,
      });
    }
    await ctx.scheduler.runAfter(0, internal.ai.thoughtMap.generate, { sessionId: args.sessionId });
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

// ---- interviewer reply plumbing (server-only, convex/ai/sessionReply.ts) ---

export const getForReplyInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    const captures = await ctx.db
      .query("captures")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const replies = await ctx.db
      .query("sessionReplies")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return { session, captures, replies };
  },
});

export const insertReplyInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    afterCaptureId: v.optional(v.id("captures")),
    persona: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessionReplies", {
      userId: args.userId,
      sessionId: args.sessionId,
      afterCaptureId: args.afterCaptureId,
      persona: args.persona,
      status: "pending" as const,
      createdAt: Date.now(),
    });
  },
});

export const finishReplyInternal = internalMutation({
  args: {
    replyId: v.id("sessionReplies"),
    status: v.union(v.literal("done"), v.literal("error")),
    text: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.replyId, {
      status: args.status,
      ...(args.text !== undefined ? { text: args.text } : {}),
      ...(args.error !== undefined ? { error: args.error } : {}),
    });
  },
});

// ---- thought map plumbing (server-only, convex/ai/thoughtMap.ts) -----------

export const getForThoughtMapInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    // USER CONTENT ONLY: the map reads what the person actually thought, never
    // the interviewer's replies.
    const captures = await ctx.db
      .query("captures")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return { session, captures };
  },
});

const thoughtMapNodeValidator = v.object({
  id: v.string(),
  label: v.string(),
  detail: v.optional(v.string()),
  level: v.number(),
  status: v.union(v.literal("active"), v.literal("superseded")),
  parentId: v.optional(v.string()),
});

const thoughtMapEdgeValidator = v.object({
  from: v.string(),
  to: v.string(),
  kind: v.union(v.literal("leads_to"), v.literal("part_of"), v.literal("relates")),
  label: v.optional(v.string()),
});

export const writeThoughtMapInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
    error: v.optional(v.string()),
    nodes: v.optional(v.array(thoughtMapNodeValidator)),
    edges: v.optional(v.array(thoughtMapEdgeValidator)),
    rootId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("thoughtMaps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
    if (!existing) return; // deleted (or never requested) while generation was in flight
    await ctx.db.patch(existing._id, {
      status: args.status,
      error: args.error,
      ...(args.nodes !== undefined ? { nodes: args.nodes } : {}),
      ...(args.edges !== undefined ? { edges: args.edges } : {}),
      ...(args.rootId !== undefined ? { rootId: args.rootId } : {}),
      generatedAt: Date.now(),
    });
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
