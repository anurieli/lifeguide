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

import { mutation, query, internalQuery, MutationCtx } from "./_generated/server";
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

// Move a ticket to "pending" — being dealt with (you replied, or it's out in
// Linear). Idempotent-ish: a dealt_with ticket stays dealt_with unless reopened.
export const markPending = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const row = await actableRow(ctx, userId, args.id);
    if (row.status === "dealt_with") return; // don't drag a closed ticket back
    await ctx.db.patch(args.id, { status: "pending", pendingAt: row.pendingAt ?? Date.now() });
  },
});

// Mark a ticket dealt with (moves it to the closed pile).
export const resolve = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await actableRow(ctx, userId, args.id);
    await ctx.db.patch(args.id, { status: "dealt_with", resolvedAt: Date.now() });
  },
});

// Reopen a ticket back into the "needs you" pile (clears pending/resolved marks).
export const reopen = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await actableRow(ctx, userId, args.id);
    await ctx.db.patch(args.id, { status: "open", pendingAt: undefined, resolvedAt: undefined });
  },
});

// ── Linear export plumbing ───────────────────────────────────────────────────
// Internal read for the export action (convex/linear.ts): returns the row's
// content + storage ids + a display label for the submitter, owner/self gated so
// the action can't be used to read someone else's ticket. Auth propagates from
// the calling action into this query.
export const getRowForExport = internalQuery({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Not found");
    if (row.userId !== userId && !(await isOwner(ctx))) throw new Error("Not found");
    const u = await ctx.db.get(row.userId);
    const submitterLabel = u?.name
      ? `${u.name}${u.email ? ` (${u.email})` : ""}`
      : u?.email ?? "anonymous";
    return {
      type: row.type,
      text: row.text,
      route: row.route,
      view: row.view,
      title: row.title,
      viewport: row.viewport,
      userAgent: row.userAgent,
      errors: row.errors,
      createdAt: row.createdAt,
      shotId: row.shotId,
      imageIds: row.imageIds,
      linear: row.linear,
      submitterLabel,
    };
  },
});

// Link a ticket to the Linear issue it was exported to and move it to pending.
// Called by the export action (convex/linear.ts) after the card is created.
export const markExported = mutation({
  args: {
    id: v.id("feedback"),
    issueId: v.string(),
    identifier: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const row = await actableRow(ctx, userId, args.id);
    await ctx.db.patch(args.id, {
      linear: { issueId: args.issueId, identifier: args.identifier, url: args.url, at: Date.now() },
      // Exporting means it's now being worked in Linear → pending (unless closed).
      status: row.status === "dealt_with" ? "dealt_with" : "pending",
      pendingAt: row.pendingAt ?? Date.now(),
    });
  },
});
