// ============================================================================
// FEEDBACK — in-app feedback capture + the /admin ticketing queue.
// ============================================================================
// A user drops a quick note (typed or spoken) tagged Bug/Feature/Other. We store
// it with page context: route, metadata, the page's recent JS/console errors, and
// an optional html2canvas snapshot (uploaded via files.generateUploadUrl). The
// /admin dev panel reads `listAll` (reactive) and flips status via resolve/reopen.
//
// Self-scoped, like the rest of /admin: every function only ever touches rows owned
// by the authed identity. This is the single-builder feedback loop, not cross-user
// moderation (that would need a real isAdmin role).
// ============================================================================

import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const TYPE = v.union(v.literal("bug"), v.literal("feature"), v.literal("other"));

// Load a feedback row and assert it belongs to the current user. Throws otherwise.
async function ownRow(ctx: MutationCtx, userId: Id<"users">, id: Id<"feedback">) {
  const row = await ctx.db.get(id);
  if (!row || row.userId !== userId) throw new Error("Not found");
  return row;
}

// Record one feedback submission. Always created `open`.
export const submit = mutation({
  args: {
    type: TYPE,
    text: v.string(),
    route: v.string(),
    view: v.string(),
    title: v.string(),
    viewport: v.object({ w: v.number(), h: v.number() }),
    userAgent: v.string(),
    errors: v.array(
      v.object({ message: v.string(), stack: v.optional(v.string()), at: v.number() }),
    ),
    shotId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("feedback", {
      userId,
      ...args,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

// All of the user's feedback, newest first, each with its snapshot URL resolved.
// Reactive: the /admin queue updates live as new feedback arrives.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return await Promise.all(
      rows.map(async (r) => ({
        ...r,
        shotUrl: r.shotId ? await ctx.storage.getUrl(r.shotId) : null,
      })),
    );
  },
});

// Mark a ticket dealt with (clears its alert in the admin queue).
export const resolve = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownRow(ctx, userId, args.id);
    await ctx.db.patch(args.id, { status: "dealt_with", resolvedAt: Date.now() });
  },
});

// Reopen a previously-resolved ticket.
export const reopen = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownRow(ctx, userId, args.id);
    await ctx.db.patch(args.id, { status: "open", resolvedAt: undefined });
  },
});
