import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { aiForTask } from "./openai";

// Generate an image for an existing node and file it back onto the board.
//
// The client creates the node first (type "generated_image", attribution "generating")
// so the spinner card appears instantly, then calls this. We generate, store the bytes
// in Convex file storage, and patch the node with the fileId — the reactive query swaps
// the spinner for the image. On any failure the node is flagged attribution "error" so
// the card can offer "Try again" (it keeps node.text as the prompt to retry with).
export const generateInto = action({
  args: { nodeId: v.id("nodes"), prompt: v.string() },
  handler: async (ctx, { nodeId, prompt }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Ownership check before we touch the node (internal mutations below don't re-auth).
    const node = await ctx.runQuery(internal.nodes.getInternal, { nodeId });
    if (!node || node.userId !== userId) throw new Error("Node not found");

    try {
      const { client, model } = await aiForTask(ctx, "imageGen", userId);
      const res = await client.images.generate({
        model,
        prompt: prompt.trim().slice(0, 1000),
        size: "1024x1024",
        n: 1,
      });
      const d = res.data?.[0];
      let blob: Blob;
      if (d?.b64_json) {
        blob = b64ToBlob(d.b64_json);
      } else if (d?.url) {
        blob = await (await fetch(d.url)).blob();
      } else {
        throw new Error("The image model returned no image.");
      }
      const fileId = await ctx.storage.store(blob);
      await ctx.runMutation(internal.nodes.finishGeneratedImage, { nodeId, fileId });
    } catch (e) {
      await ctx.runMutation(internal.nodes.failGeneratedImage, {
        nodeId,
        note: e instanceof Error ? e.message : String(e),
      });
    }
  },
});

// Decode a base64 image payload (gpt-image-1 returns b64_json) into a Blob.
function b64ToBlob(b64: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}
