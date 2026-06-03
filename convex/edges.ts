import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

type EdgeLike = { fromNode: string; toNode: string };

/**
 * Pure cycle check: would adding from→to create a cycle given existing edges?
 * True if a path already exists from `to` back to `from` (or it's a self-edge).
 */
export function wouldCreateCycle(edges: EdgeLike[], from: string, to: string): boolean {
  if (from === to) return true;
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.fromNode)) adj.set(e.fromNode, []);
    adj.get(e.fromNode)!.push(e.toNode);
  }
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === from) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const nxt of adj.get(cur) ?? []) stack.push(nxt);
  }
  return false;
}

export const list = query({
  args: { surfaceId: v.id("surfaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const surface = await ctx.db.get(args.surfaceId);
    if (!surface || surface.userId !== userId) return [];
    return await ctx.db
      .query("edges")
      .withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId))
      .collect();
  },
});

export const connect = mutation({
  args: {
    surfaceId: v.id("surfaces"),
    fromNode: v.id("nodes"),
    toNode: v.id("nodes"),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const [from, to] = await Promise.all([ctx.db.get(args.fromNode), ctx.db.get(args.toNode)]);
    if (!from || from.userId !== userId || !to || to.userId !== userId) {
      throw new Error("Node not found");
    }
    if (from.surfaceId !== args.surfaceId || to.surfaceId !== args.surfaceId) {
      throw new Error("Nodes belong to a different surface");
    }

    const existing = await ctx.db
      .query("edges")
      .withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId))
      .collect();

    if (
      wouldCreateCycle(
        existing.map((e) => ({ fromNode: e.fromNode, toNode: e.toNode })),
        args.fromNode,
        args.toNode,
      )
    ) {
      throw new Error("That connection would create a cycle.");
    }

    const dup = existing.find((e) => e.fromNode === args.fromNode && e.toNode === args.toNode);
    if (dup) return dup._id;

    return await ctx.db.insert("edges", {
      userId,
      surfaceId: args.surfaceId,
      fromNode: args.fromNode,
      toNode: args.toNode,
      label: args.label,
      createdAt: Date.now(),
    });
  },
});

export const setLabel = mutation({
  args: { edgeId: v.id("edges"), label: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const e = await ctx.db.get(args.edgeId);
    if (!e || e.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.edgeId, { label: args.label });
  },
});

export const remove = mutation({
  args: { edgeId: v.id("edges") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const e = await ctx.db.get(args.edgeId);
    if (!e || e.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.edgeId);
  },
});
