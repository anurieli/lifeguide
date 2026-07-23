import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const NODE_TYPE = v.union(
  v.literal("text"),
  v.literal("quote"),
  v.literal("image"),
  v.literal("link"),
  v.literal("file"),
  v.literal("generated_image"),
);

const POSITION = v.object({ x: v.number(), y: v.number(), z: v.number() });
const DIMENSIONS = v.object({ width: v.number(), height: v.number() });

export const list = query({
  args: { surfaceId: v.id("surfaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const surface = await ctx.db.get(args.surfaceId);
    if (!surface || surface.userId !== userId) return [];
    return await ctx.db
      .query("nodes")
      .withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId).eq("isActive", true))
      .collect();
  },
});

export const create = mutation({
  args: {
    surfaceId: v.id("surfaces"),
    type: NODE_TYPE,
    text: v.optional(v.string()),
    title: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    attribution: v.optional(v.string()),
    position: POSITION,
    dimensions: DIMENSIONS,
    pillars: v.optional(v.array(v.string())),
    captureId: v.optional(v.id("captures")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const surface = await ctx.db.get(args.surfaceId);
    if (!surface || surface.userId !== userId) throw new Error("Surface not found");
    const now = Date.now();
    return await ctx.db.insert("nodes", {
      userId,
      surfaceId: args.surfaceId,
      captureId: args.captureId,
      type: args.type,
      title: args.title,
      text: args.text,
      imageUrl: args.imageUrl,
      fileId: args.fileId,
      fileName: args.fileName,
      mimeType: args.mimeType,
      attribution: args.attribution,
      position: args.position,
      dimensions: args.dimensions,
      pillars: args.pillars ?? [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const move = mutation({
  args: { nodeId: v.id("nodes"), position: POSITION },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const n = await ctx.db.get(args.nodeId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.nodeId, { position: args.position, updatedAt: Date.now() });
  },
});

export const resize = mutation({
  args: { nodeId: v.id("nodes"), dimensions: DIMENSIONS },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const n = await ctx.db.get(args.nodeId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.nodeId, { dimensions: args.dimensions, updatedAt: Date.now() });
  },
});

export const setText = mutation({
  args: { nodeId: v.id("nodes"), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const n = await ctx.db.get(args.nodeId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.nodeId, { text: args.text, updatedAt: Date.now() });
  },
});

export const setPillars = mutation({
  args: { nodeId: v.id("nodes"), pillars: v.array(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const n = await ctx.db.get(args.nodeId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.nodeId, { pillars: args.pillars, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const n = await ctx.db.get(args.nodeId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    // Soft delete; dismissed nodes still feed the Mirror.
    await ctx.db.patch(args.nodeId, { isActive: false, updatedAt: Date.now() });
  },
});

// Undo a delete: flip a soft-deleted node back to active. Same ownership gate as
// remove, and it reuses the existing isActive soft-delete model (no schema change).
// Restoring an already-active node is a harmless no-op. Powers ⌘/Ctrl+Z on
// the board (ARI-139).
export const restore = mutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const n = await ctx.db.get(args.nodeId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    if (n.isActive) return;
    await ctx.db.patch(args.nodeId, { isActive: true, updatedAt: Date.now() });
  },
});

// Change a card's type and content in place. Powers the unified "add anything" card:
// a blank card starts as text and morphs to image/link when you paste into it.
export const morph = mutation({
  args: {
    nodeId: v.id("nodes"),
    type: NODE_TYPE,
    text: v.optional(v.string()),
    title: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    attribution: v.optional(v.string()),
    dimensions: v.optional(DIMENSIONS),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const n = await ctx.db.get(args.nodeId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    const { nodeId, ...rest } = args;
    await ctx.db.patch(nodeId, { ...rest, updatedAt: Date.now() });
  },
});

// ---------------------------------------------------------------------------
// AI image generation (vision board). The client creates a "generating" node and
// calls convex/ai/imageGen.generateInto; these server-only helpers let that action
// read the node (ownership) and file the result back. See that action for the flow.
// ---------------------------------------------------------------------------

export const getInternal = internalQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => await ctx.db.get(args.nodeId),
});

// Generation succeeded: attach the stored image and clear the "generating" flag.
// Clearing attribution (to undefined) deletes the field, so the card — which keys
// off fileId-present + attribution — flips from spinner to the rendered image.
// `title` is also cleared: on a redo of a previously-failed node it still holds the
// old error note, and the mobile row renders `title` as the caption, so a stale
// failure message would otherwise linger over the now-successful image.
export const finishGeneratedImage = internalMutation({
  args: { nodeId: v.id("nodes"), fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.nodeId, {
      fileId: args.fileId,
      attribution: undefined,
      title: undefined,
      updatedAt: Date.now(),
    });
  },
});

// Generation failed: flag the node so the card shows an error + "Try again" (the
// prompt is preserved in node.text). `note` carries the model/transport error.
export const failGeneratedImage = internalMutation({
  args: { nodeId: v.id("nodes"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.nodeId, {
      attribution: "error",
      title: args.note?.slice(0, 200),
      updatedAt: Date.now(),
    });
  },
});

// Surface context fragment for the assembler (consumed by the Coach in Plan 2).
export const surfaceContext = query({
  args: { surfaceId: v.id("surfaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const surface = await ctx.db.get(args.surfaceId);
    if (!surface || surface.userId !== userId) return null;

    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId).eq("isActive", true))
      .collect();
    const edges = await ctx.db
      .query("edges")
      .withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId))
      .collect();

    const nodeLines = nodes
      .map((n) => `- (${n._id}) [${n.type}] ${n.title ?? ""} ${n.text ?? ""}`.trim())
      .join("\n");
    const edgeLines = edges
      .map((e) => `- ${e.fromNode} -> ${e.toNode}${e.label ? ` (${e.label})` : ""}`)
      .join("\n");

    return {
      surfaceId: args.surfaceId as string,
      scope: "surface" as const,
      label: "Whiteboard",
      text: `Nodes:\n${nodeLines || "(empty)"}\n\nConnections:\n${edgeLines || "(none)"}`,
      priority: 8,
    };
  },
});
