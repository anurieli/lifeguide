// ============================================================================
// WHAT'S NEW — owner-authored feed of shipped features, dismissed by click-through.
// ============================================================================
// Every entry is `{ title, body, view, publishedAt }`, authored by the owner through
// the /admin surface (owner-gated per convex/owner.ts, ADR 0006). `feed` is what the
// bottom-of-shell component reads: every published entry the CALLING user hasn't
// clicked yet. Clicking an entry navigates to its `view` and calls `markSeen`, which
// writes a `whatsNewSeen` row for that (user, entry) pair — the click-through itself
// is the acknowledgment. There is no generic dismiss: an entry stays in the feed
// until its own row is opened. See docs/product/features/whats-new.md, ADR 0022.
// ============================================================================

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isOwner } from "./owner";

const VIEW = v.union(
  v.literal("today"),
  v.literal("core"),
  v.literal("board"),
  v.literal("goals"),
  v.literal("sessions"),
  v.literal("settings"),
);

// Every published entry the caller has not yet clicked through, oldest-unseen last
// (newest first) so the freshest ships lead the feed. Unauthenticated → empty.
export const feed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const entries = await ctx.db
      .query("whatsNew")
      .withIndex("by_publishedAt")
      .order("desc")
      .collect();
    if (entries.length === 0) return [];
    const seenRows = await ctx.db
      .query("whatsNewSeen")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const seenIds = new Set(seenRows.map((r) => r.whatsNewId));
    return entries.filter((e) => !seenIds.has(e._id));
  },
});

// Record the click-through: the person clicked this specific entry and was
// navigated to its linked surface. Idempotent — clicking twice is a no-op.
export const markSeen = mutation({
  args: { id: v.id("whatsNew") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("whatsNewSeen")
      .withIndex("by_user_entry", (q) => q.eq("userId", userId).eq("whatsNewId", args.id))
      .first();
    if (existing) return;
    await ctx.db.insert("whatsNewSeen", { userId, whatsNewId: args.id, seenAt: Date.now() });
  },
});

// ── Owner-gated authoring (the /admin surface) ──────────────────────────────
// Cross-user write access to content every user will see, so — like feedback's
// cross-user reads (convex/feedback.ts) — these gate purely on `isOwner`, with no
// isDev bypass: the /admin PAGE is dev-open per ADR 0006, but the page is UX, not
// the security boundary, and this is not self-scoped data the way the dev tools are.

// Every entry (published or not — there is no draft state today, but this is the
// admin list, not the user feed), newest first. Non-owners get an empty list.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx))) return [];
    return await ctx.db.query("whatsNew").withIndex("by_publishedAt").order("desc").collect();
  },
});

export const create = mutation({
  args: { title: v.string(), body: v.string(), view: VIEW },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!(await isOwner(ctx))) throw new Error("Not authorized");
    return await ctx.db.insert("whatsNew", { ...args, publishedAt: Date.now(), createdBy: userId });
  },
});

export const update = mutation({
  args: {
    id: v.id("whatsNew"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    view: v.optional(VIEW),
  },
  handler: async (ctx, args) => {
    if (!(await isOwner(ctx))) throw new Error("Not authorized");
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("whatsNew") },
  handler: async (ctx, args) => {
    if (!(await isOwner(ctx))) throw new Error("Not authorized");
    await ctx.db.delete(args.id);
  },
});
