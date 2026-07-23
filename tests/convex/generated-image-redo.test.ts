import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";

// Auth test-identity pattern: insert a real users row, use its _id as the subject.
// A board node needs a surface, so seed one owned by the same user.
async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const surfaceId = await t.run(async (ctx) =>
    ctx.db.insert("surfaces", {
      userId,
      type: "whiteboard",
      title: "Vision",
      createdAt: Date.now(),
    }),
  );
  return { t, asUser: t.withIdentity({ subject: userId }), userId, surfaceId };
}

// ARI-146: Redo an AI image in place. The board-side render precedence is unit-tested
// in tests/generated-image.test.ts (lib/generatedImage); these cover the server flow the
// redo reuses: a successful (re)generation must not leave a stale failure note behind.
describe("generated_image redo: server flow", () => {
  it("finishGeneratedImage clears a stale error title left by a prior failure", async () => {
    const { t, asUser, surfaceId } = await setup();
    // A node that already failed once: it carries the error flag and the failure
    // note in `title`, with the prompt kept in `text` (what a redo edits).
    const nodeId = await asUser.mutation(api.nodes.create, {
      surfaceId,
      type: "generated_image",
      text: "a lighthouse at dawn",
      title: "The image model returned no image.",
      attribution: "error",
      position: { x: 0, y: 0, z: 0 },
      dimensions: { width: 280, height: 280 },
    });

    // A redo succeeds: file a fresh image back onto the same node.
    const fileId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["fake-png"], { type: "image/png" })),
    );
    await t.mutation(internal.nodes.finishGeneratedImage, { nodeId, fileId });

    const saved = await t.run(async (ctx) => ctx.db.get(nodeId));
    expect(saved?.fileId).toBe(fileId);
    expect(saved?.attribution).toBeUndefined(); // "generating"/"error" flag cleared
    expect(saved?.title).toBeUndefined(); // stale failure note gone, not shown over the new image
    expect(saved?.text).toBe("a lighthouse at dawn"); // prompt preserved
  });

  it("morph re-runs the same node in place, keeping its id and (until refiled) its image", async () => {
    const { t, asUser, surfaceId } = await setup();
    const fileId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["first"], { type: "image/png" })),
    );
    const nodeId = await asUser.mutation(api.nodes.create, {
      surfaceId,
      type: "generated_image",
      text: "a calm harbor",
      fileId,
      position: { x: 10, y: 10, z: 0 },
      dimensions: { width: 400, height: 400 },
    });

    // Redo with an edited prompt: flag generating, keep the id. The old fileId lingers
    // until the new image is filed, which is exactly why the client keys off the flag.
    await asUser.mutation(api.nodes.morph, {
      nodeId,
      type: "generated_image",
      text: "a calm harbor at golden hour",
      attribution: "generating",
    });
    const mid = await t.run(async (ctx) => ctx.db.get(nodeId));
    expect(mid?.attribution).toBe("generating");
    expect(mid?.text).toBe("a calm harbor at golden hour");
    expect(mid?.fileId).toBe(fileId); // previous image still present during the redo
    expect(mid?.dimensions).toEqual({ width: 400, height: 400 }); // size preserved

    // New image lands: fileId swaps, flag clears.
    const fileId2 = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["second"], { type: "image/png" })),
    );
    await t.mutation(internal.nodes.finishGeneratedImage, { nodeId, fileId: fileId2 });
    const done = await t.run(async (ctx) => ctx.db.get(nodeId));
    expect(done?.fileId).toBe(fileId2);
    expect(done?.attribution).toBeUndefined();
  });
});
