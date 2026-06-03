import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { spiralOffsets, rectsOverlap } from "../lib/geometry";

const W = 240;
const H = 150;

// Promote a capture to a node on the surface, choosing the first non-overlapping spiral slot.
export const placeCapture = mutation({
  args: { captureId: v.id("captures"), surfaceId: v.id("surfaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const capture = await ctx.db.get(args.captureId);
    if (!capture || capture.userId !== userId) throw new Error("Capture not found");
    if (capture.placedAt) return capture.nodeId; // already placed
    const surface = await ctx.db.get(args.surfaceId);
    if (!surface || surface.userId !== userId) throw new Error("Surface not found");

    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId).eq("isActive", true))
      .collect();

    // First spiral slot that doesn't overlap an existing node.
    let pos = { x: 0, y: 0 };
    for (const off of spiralOffsets()) {
      const cand = { x: off.x, y: off.y, w: W, h: H };
      const clash = nodes.some((n) =>
        rectsOverlap(cand, {
          x: n.position.x,
          y: n.position.y,
          w: n.dimensions.width,
          h: n.dimensions.height,
        }),
      );
      if (!clash) {
        pos = { x: off.x, y: off.y };
        break;
      }
    }

    const d = capture.distilled;
    const { type, title, text, attribution } = mapCaptureToNode(capture, d);

    const now = Date.now();
    const nodeId = await ctx.db.insert("nodes", {
      userId,
      surfaceId: args.surfaceId,
      captureId: args.captureId,
      type,
      title,
      text,
      fileId: capture.rawFileId,
      attribution,
      position: { x: pos.x, y: pos.y, z: 0 },
      dimensions: { width: W, height: H },
      pillars: d?.pillars ?? [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(args.captureId, { placedAt: now, nodeId });
    return nodeId;
  },
});

type NodeShape = {
  type: "text" | "quote" | "image" | "link";
  title?: string;
  text?: string;
  attribution?: string;
};

function mapCaptureToNode(
  capture: { rawType: string; rawText?: string; rawUrl?: string },
  d?: { title: string; essence: string; pillars: string[] },
): NodeShape {
  switch (capture.rawType) {
    case "image":
      return { type: "image", title: d?.title, text: d?.essence };
    case "link":
    case "video_link":
      return {
        type: "link",
        title: d?.title ?? "Saved link",
        text: d?.essence,
        attribution: capture.rawUrl,
      };
    case "quote":
      return { type: "quote", title: d?.title, text: capture.rawText ?? d?.essence };
    default:
      return { type: "text", title: d?.title, text: capture.rawText ?? d?.essence };
  }
}
