import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// ARI-139: ⌘⌫ soft-deletes a board selection and ⌘Z restores it. Restore reuses
// the existing isActive soft-delete model (no schema change) and is ownership-gated
// exactly like remove. These lock the remove → restore round-trip and its auth.

// Explicit `modules` glob (not convex-test's default): this worktree's node_modules
// is a symlink to a sibling checkout, so the default glob would bundle that OTHER
// checkout's convex/ instead of this one's (missing the new `restore`). Same gotcha
// as tests/convex/pillars.test.ts.
const modules = (
  import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }
).glob("../../convex/**/*.*s");

// Insert a user, a surface they own, and one active node on it. Direct db inserts
// (there's no surfaces.create / nodes.create-free path in tests) keep the setup
// small; the mutations under test then run through the real auth gate.
async function setup() {
  const t = convexTest(schema, modules);
  const { userId, surfaceId, nodeId } = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {});
    const surfaceId = await ctx.db.insert("surfaces", {
      userId,
      type: "whiteboard",
      title: "Board",
      createdAt: now,
    });
    const nodeId = await ctx.db.insert("nodes", {
      userId,
      surfaceId,
      type: "text",
      text: "a thing on the board",
      position: { x: 0, y: 0, z: 0 },
      dimensions: { width: 220, height: 130 },
      pillars: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { userId, surfaceId, nodeId };
  });
  return { t, asUser: t.withIdentity({ subject: userId }), userId, surfaceId, nodeId };
}

const activeOf = (t: Awaited<ReturnType<typeof setup>>["t"], nodeId: Id<"nodes">) =>
  t.run(async (ctx) => (await ctx.db.get(nodeId))?.isActive);

describe("nodes.remove / nodes.restore (ARI-139)", () => {
  it("remove soft-deletes (isActive false), and the surface list drops it", async () => {
    const { t, asUser, surfaceId, nodeId } = await setup();
    await asUser.mutation(api.nodes.remove, { nodeId });
    expect(await activeOf(t, nodeId)).toBe(false);
    const list = await asUser.query(api.nodes.list, { surfaceId });
    expect(list.find((n) => n._id === nodeId)).toBeUndefined();
  });

  it("restore flips it back to active, and the surface list shows it again", async () => {
    const { t, asUser, surfaceId, nodeId } = await setup();
    await asUser.mutation(api.nodes.remove, { nodeId });
    await asUser.mutation(api.nodes.restore, { nodeId });
    expect(await activeOf(t, nodeId)).toBe(true);
    const list = await asUser.query(api.nodes.list, { surfaceId });
    expect(list.find((n) => n._id === nodeId)).toBeDefined();
  });

  it("restoring an already-active node is a harmless no-op", async () => {
    const { t, asUser, nodeId } = await setup();
    await asUser.mutation(api.nodes.restore, { nodeId });
    expect(await activeOf(t, nodeId)).toBe(true);
  });

  it("refuses to remove a node owned by someone else", async () => {
    const { t, nodeId } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    await expect(asOther.mutation(api.nodes.remove, { nodeId })).rejects.toThrow();
    expect(await activeOf(t, nodeId)).toBe(true);
  });

  it("refuses to restore a node owned by someone else", async () => {
    const { t, asUser, nodeId } = await setup();
    await asUser.mutation(api.nodes.remove, { nodeId });
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    await expect(asOther.mutation(api.nodes.restore, { nodeId })).rejects.toThrow();
    // still soft-deleted; another user's undo cannot resurrect it
    expect(await activeOf(t, nodeId)).toBe(false);
  });
});
