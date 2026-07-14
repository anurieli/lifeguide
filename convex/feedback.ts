// ============================================================================
// FEEDBACK — in-app feedback capture + the /admin ticketing queue.
// ============================================================================
// A user drops a quick note (typed or spoken) tagged Bug/Feature/Other, with any
// photos they pasted/attached. We store it with page context: route, metadata, the
// page's recent JS/console errors, and an optional html2canvas snapshot (photos and
// snapshot both uploaded via files.generateUploadUrl). The
// /admin dev panel reads `listAll` (reactive) and flips status via resolve/reopen.
//
// Access model: the OWNER (see convex/owner.ts) sees and triages EVERY user's
// feedback — this is the support inbox. Everyone else is self-scoped: they only
// ever see/act on their own rows. The split is enforced server-side here, so it
// holds regardless of which surface (dev or prod) is calling.
// ============================================================================

import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { isOwner } from "./owner";

const TYPE = v.union(v.literal("bug"), v.literal("feature"), v.literal("other"));

// Load a feedback row the caller may act on: their own, or — for the owner — any
// row (triage). Throws otherwise.
async function actableRow(ctx: MutationCtx, userId: Id<"users">, id: Id<"feedback">) {
  const row = await ctx.db.get(id);
  if (!row) throw new Error("Not found");
  if (row.userId !== userId && !(await isOwner(ctx))) throw new Error("Not found");
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
    imageIds: v.optional(v.array(v.id("_storage"))),
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

// Feedback for the /admin queue, newest first, each with its snapshot URL and the
// submitter's identity resolved. The OWNER gets EVERY user's feedback (support
// inbox); everyone else gets only their own. Reactive: the queue updates live.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const owner = await isOwner(ctx);
    const rows = owner
      ? // Owner: all feedback across users, newest first (full scan, low volume).
        await ctx.db.query("feedback").order("desc").collect()
      : // Everyone else: only their own.
        await ctx.db
          .query("feedback")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .order("desc")
          .collect();
    return await Promise.all(
      rows.map(async (r) => {
        const u = await ctx.db.get(r.userId);
        return {
          ...r,
          shotUrl: r.shotId ? await ctx.storage.getUrl(r.shotId) : null,
          // User-attached photos (pasted or picked in the composer), resolved to URLs.
          imageUrls: r.imageIds
            ? (await Promise.all(r.imageIds.map((id) => ctx.storage.getUrl(id)))).filter(
                (u): u is string => u !== null,
              )
            : [],
          // Identity to show + reply to in the queue. Anonymous users have no email.
          submitter: {
            name: u?.name ?? null,
            email: u?.email ?? null,
            isAnonymous: !u?.email,
          },
        };
      }),
    );
  },
});

// Mark a ticket dealt with (clears its alert in the admin queue).
export const resolve = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await actableRow(ctx, userId, args.id);
    await ctx.db.patch(args.id, { status: "dealt_with", resolvedAt: Date.now() });
  },
});

// Reopen a previously-resolved ticket.
export const reopen = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await actableRow(ctx, userId, args.id);
    await ctx.db.patch(args.id, { status: "open", resolvedAt: undefined });
  },
});
