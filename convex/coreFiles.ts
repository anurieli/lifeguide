// ============================================================================
// coreFiles — the files on the human.
// ============================================================================
// CRUD + queries for the file system on the human. The Center (convex/center.ts)
// writes here through the internal mutations during its post-call fan-out; the
// filing report and the pending-contradiction resolution are the public surface.
// See agents/center/README.md and docs/product/features/file-system-on-the-human.md.
// ============================================================================

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Read for synthesis ───────────────────────────────────────────────────────

/** Every pillar (folder) with its current ACTIVE files. Drives the Center's fan-out. */
export const pillarsWithFiles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const pillars = await ctx.db
      .query("pillars")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const out = [];
    for (const p of pillars) {
      const files = await ctx.db
        .query("coreFiles")
        .withIndex("by_user_pillar", (q) =>
          q.eq("userId", userId).eq("pillarId", p._id).eq("status", "active"),
        )
        .collect();
      out.push({
        pillar: { _id: p._id, name: p.name, about: p.about, composition: p.composition },
        files: files.map((f) => ({ id: f._id, name: f.name, kind: f.kind, content: f.content })),
      });
    }
    return out;
  },
});

// ─── Internal writes (called by the Center action) ────────────────────────────

export const createFile = internalMutation({
  args: {
    userId: v.id("users"),
    pillarId: v.id("pillars"),
    name: v.string(),
    content: v.string(),
    kind: v.string(),
    sourceSessionId: v.optional(v.id("interviewSessions")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("coreFiles", {
      userId: args.userId,
      pillarId: args.pillarId,
      name: args.name,
      content: args.content,
      kind: args.kind,
      status: "active",
      sourceSessionId: args.sourceSessionId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFile = internalMutation({
  args: {
    userId: v.id("users"),
    fileId: v.id("coreFiles"),
    name: v.string(),
    content: v.string(),
    kind: v.string(),
    sourceSessionId: v.optional(v.id("interviewSessions")),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== args.userId) return; // ownership guard
    await ctx.db.patch(args.fileId, {
      name: args.name,
      content: args.content,
      kind: args.kind,
      sourceSessionId: args.sourceSessionId,
      updatedAt: Date.now(),
    });
  },
});

/** Hold a contradicting change as a pending file for the person to decide. Never overwrites. */
export const holdPending = internalMutation({
  args: {
    userId: v.id("users"),
    pillarId: v.id("pillars"),
    supersedes: v.id("coreFiles"),
    name: v.string(),
    content: v.string(),
    kind: v.string(),
    note: v.string(),
    sourceSessionId: v.optional(v.id("interviewSessions")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("coreFiles", {
      userId: args.userId,
      pillarId: args.pillarId,
      name: args.name,
      content: args.content,
      kind: args.kind,
      status: "pending",
      note: args.note,
      supersedes: args.supersedes,
      sourceSessionId: args.sourceSessionId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── Filing report + pending resolution (public) ──────────────────────────────

/** The filing report for a session: what got filed where (with pillar names). */
export const bySession = query({
  args: { sessionId: v.id("interviewSessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("coreFiles")
      .withIndex("by_session", (q) => q.eq("sourceSessionId", sessionId))
      .collect();

    const pillarNames = new Map<string, string>();
    const out = [];
    for (const f of rows) {
      if (f.userId !== userId) continue;
      let pillarName = pillarNames.get(f.pillarId);
      if (pillarName === undefined) {
        const p = await ctx.db.get(f.pillarId);
        pillarName = p?.name ?? "Unknown";
        pillarNames.set(f.pillarId, pillarName);
      }
      out.push({
        _id: f._id,
        pillarId: f.pillarId,
        pillarName,
        name: f.name,
        kind: f.kind,
        content: f.content,
        status: f.status,
        note: f.note,
      });
    }
    return out;
  },
});

/** Accept or dismiss a pending (contradicting) change. Accept applies it to the held file. */
export const resolvePending = mutation({
  args: { fileId: v.id("coreFiles"), accept: v.boolean() },
  handler: async (ctx, { fileId, accept }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const pending = await ctx.db.get(fileId);
    if (!pending || pending.userId !== userId || pending.status !== "pending") return;

    if (accept) {
      if (pending.supersedes) {
        const target = await ctx.db.get(pending.supersedes);
        if (target && target.userId === userId) {
          await ctx.db.patch(target._id, {
            content: pending.content,
            kind: pending.kind,
            updatedAt: Date.now(),
          });
        }
      }
    }
    // Whether accepted (applied to the held file) or dismissed, the pending row is consumed.
    await ctx.db.delete(fileId);
  },
});
