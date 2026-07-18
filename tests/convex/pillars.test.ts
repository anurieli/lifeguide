import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { DEFAULT_PILLARS, NEUTRAL_STRENGTH } from "../../convex/pillars";

// Explicit `modules` glob (rather than convex-test's default) because this worktree's
// node_modules is a symlink to a sibling checkout: Vite resolves the default glob relative
// to node_modules' real path, which would silently bundle that OTHER checkout's convex/
// instead of this one's. Scoped to this file; see the PR notes for the wider gotcha.
const modules = (
  import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }
).glob("../../convex/**/*.*s");

async function setup() {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

async function seedSkeleton(t: Awaited<ReturnType<typeof convexTest>>, userId: string) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const ids: Record<string, string> = {};
    for (const p of DEFAULT_PILLARS) {
      const id = await ctx.db.insert("pillars", {
        userId: userId as any,
        name: p.name,
        about: p.about,
        composition: p.composition,
        weight: 1,
        source: "default",
        role: p.role,
        createdAt: now,
      });
      ids[p.name] = id as unknown as string;
    }
    return ids;
  });
}

describe("pillars: the Life Wheel data (ARI-11)", () => {
  it("wheel excludes the identity pillar and defaults unrated pillars to neutral", async () => {
    const { t, asUser, userId } = await setup();
    await seedSkeleton(t, userId as unknown as string);

    const wheel = await asUser.query(api.pillars.wheel, {});
    // 8 canonical pillars minus the one "identity" role = 7 domains on the wheel.
    expect(wheel).toHaveLength(DEFAULT_PILLARS.length - 1);
    expect(wheel.every((p) => p.name !== "Identity & Values")).toBe(true);
    expect(wheel.every((p) => p.strength === NEUTRAL_STRENGTH && p.rated === false)).toBe(true);
  });

  it("setStrength rates a pillar and clamps out-of-range input", async () => {
    const { t, asUser, userId } = await setup();
    const ids = await seedSkeleton(t, userId as unknown as string);
    const bodyId = ids["Body & Health"] as any;

    await asUser.mutation(api.pillars.setStrength, { pillarId: bodyId, strength: 72 });
    let wheel = await asUser.query(api.pillars.wheel, {});
    let body = wheel.find((p) => p.name === "Body & Health")!;
    expect(body.strength).toBe(72);
    expect(body.rated).toBe(true);

    // Out-of-range values clamp rather than throw.
    await asUser.mutation(api.pillars.setStrength, { pillarId: bodyId, strength: 500 });
    wheel = await asUser.query(api.pillars.wheel, {});
    body = wheel.find((p) => p.name === "Body & Health")!;
    expect(body.strength).toBe(100);

    await asUser.mutation(api.pillars.setStrength, { pillarId: bodyId, strength: -30 });
    wheel = await asUser.query(api.pillars.wheel, {});
    body = wheel.find((p) => p.name === "Body & Health")!;
    expect(body.strength).toBe(0);

    // Clearing the rating puts it back to neutral/unrated.
    await asUser.mutation(api.pillars.setStrength, { pillarId: bodyId, strength: undefined });
    wheel = await asUser.query(api.pillars.wheel, {});
    body = wheel.find((p) => p.name === "Body & Health")!;
    expect(body.strength).toBe(NEUTRAL_STRENGTH);
    expect(body.rated).toBe(false);
  });

  it("setStrength rejects touching another user's pillar", async () => {
    const { t, asUser, userId } = await setup();
    const ids = await seedSkeleton(t, userId as unknown as string);
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });

    await expect(
      asOther.mutation(api.pillars.setStrength, {
        pillarId: ids["Body & Health"] as any,
        strength: 10,
      }),
    ).rejects.toThrow();
  });

  it("assembleContext returns a Coach-ready fragment naming each domain's strength, excluding identity", async () => {
    const { t, asUser, userId } = await setup();
    const ids = await seedSkeleton(t, userId as unknown as string);
    await asUser.mutation(api.pillars.setStrength, {
      pillarId: ids["Body & Health"] as any,
      strength: 80,
    });

    const fragment = await asUser.query(api.pillars.assembleContext, {});
    expect(fragment).not.toBeNull();
    expect(fragment!.text).toContain("Body & Health: 80/100");
    expect(fragment!.text).not.toContain("Identity & Values");
    // Every other seeded domain shows up unrated.
    expect(fragment!.text).toContain(`Work & Money: ${NEUTRAL_STRENGTH}/100 (unrated)`);
  });

  it("assembleContext is null with no pillars and for a signed-out caller", async () => {
    const { t, asUser } = await setup();
    expect(await asUser.query(api.pillars.assembleContext, {})).toBeNull();
    expect(await t.query(api.pillars.assembleContext, {})).toBeNull();
  });
});
