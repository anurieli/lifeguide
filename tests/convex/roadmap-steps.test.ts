import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

async function setup() {
  const t = convexTest(schema);
  const userId = await t.run((ctx) => ctx.db.insert("users", {}));
  const asUser = t.withIdentity({ subject: userId });
  const goalId = await t.run((ctx) =>
    ctx.db.insert("goals", {
      userId,
      name: "Climb Everest",
      status: "planning",
      sortOrder: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  return { t, asUser, userId, goalId };
}

describe("roadmapSteps: computed `blocked`", () => {
  it("a step is blocked only while its blockedBy step isn't done", async () => {
    const { asUser, goalId } = await setup();
    const s1 = await asUser.mutation(api.roadmapSteps.add, { goalId, title: "Book a guide" });
    const s2 = await asUser.mutation(api.roadmapSteps.add, {
      goalId,
      title: "Train for altitude",
      blockedBy: [s1],
    });

    let steps = await asUser.query(api.roadmapSteps.list, { goalId });
    expect(steps.find((s) => s._id === s2)!.blocked).toBe(true);

    await asUser.mutation(api.roadmapSteps.updateStatus, { id: s1, status: "done" });
    steps = await asUser.query(api.roadmapSteps.list, { goalId });
    expect(steps.find((s) => s._id === s2)!.blocked).toBe(false);
  });

  it("a dangling blockedBy id (its step deleted) resolves as non-blocking", async () => {
    const { asUser, goalId } = await setup();
    const s1 = await asUser.mutation(api.roadmapSteps.add, { goalId, title: "A" });
    const s2 = await asUser.mutation(api.roadmapSteps.add, {
      goalId,
      title: "B",
      blockedBy: [s1],
    });

    await asUser.mutation(api.roadmapSteps.remove, { id: s1 });
    const steps = await asUser.query(api.roadmapSteps.list, { goalId });
    expect(steps.find((s) => s._id === s2)!.blocked).toBe(false);
  });
});

describe("roadmapSteps.add", () => {
  it("rejects blockedBy referencing a step from a different goal", async () => {
    const { t, asUser, userId, goalId } = await setup();
    const otherGoalId = await t.run((ctx) =>
      ctx.db.insert("goals", {
        userId,
        name: "Other goal",
        status: "planning",
        sortOrder: 2,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const foreignStep = await asUser.mutation(api.roadmapSteps.add, {
      goalId: otherGoalId,
      title: "Foreign",
    });
    await expect(
      asUser.mutation(api.roadmapSteps.add, { goalId, title: "X", blockedBy: [foreignStep] }),
    ).rejects.toThrow();
  });
});

describe("roadmapSteps.setBlockedBy", () => {
  it("rejects a step blocking itself", async () => {
    const { asUser, goalId } = await setup();
    const s1 = await asUser.mutation(api.roadmapSteps.add, { goalId, title: "A" });
    await expect(
      asUser.mutation(api.roadmapSteps.setBlockedBy, { id: s1, blockedBy: [s1] }),
    ).rejects.toThrow();
  });

  it("rejects a cycle outright — a user's edit is never silently dropped, unlike the AI-batch path", async () => {
    const { asUser, goalId } = await setup();
    const s1 = await asUser.mutation(api.roadmapSteps.add, { goalId, title: "A" });
    const s2 = await asUser.mutation(api.roadmapSteps.add, {
      goalId,
      title: "B",
      blockedBy: [s1],
    });
    // s1 <- s2 would close the loop (s1 blocks s2, s2 would now block s1).
    await expect(
      asUser.mutation(api.roadmapSteps.setBlockedBy, { id: s1, blockedBy: [s2] }),
    ).rejects.toThrow();
  });

  it("rejects blockedBy referencing a different goal's step", async () => {
    const { t, asUser, userId, goalId } = await setup();
    const otherGoalId = await t.run((ctx) =>
      ctx.db.insert("goals", {
        userId,
        name: "Other goal",
        status: "planning",
        sortOrder: 2,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const s1 = await asUser.mutation(api.roadmapSteps.add, { goalId, title: "A" });
    const foreignStep = await asUser.mutation(api.roadmapSteps.add, {
      goalId: otherGoalId,
      title: "Foreign",
    });
    await expect(
      asUser.mutation(api.roadmapSteps.setBlockedBy, { id: s1, blockedBy: [foreignStep] }),
    ).rejects.toThrow();
  });

  it("accepts a valid same-goal dependency", async () => {
    const { asUser, goalId } = await setup();
    const s1 = await asUser.mutation(api.roadmapSteps.add, { goalId, title: "A" });
    const s2 = await asUser.mutation(api.roadmapSteps.add, { goalId, title: "B" });
    await asUser.mutation(api.roadmapSteps.setBlockedBy, { id: s2, blockedBy: [s1] });
    const steps = await asUser.query(api.roadmapSteps.list, { goalId });
    expect(steps.find((s) => s._id === s2)!.blocked).toBe(true);
  });
});

describe("roadmapSteps: ownership", () => {
  it("rejects touching another user's step, and listing another user's goal", async () => {
    const { t, asUser, goalId } = await setup();
    const otherUserId = await t.run((ctx) => ctx.db.insert("users", {}));
    const otherGoalId = await t.run((ctx) =>
      ctx.db.insert("goals", {
        userId: otherUserId,
        name: "Not yours",
        status: "planning",
        sortOrder: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const asOther = t.withIdentity({ subject: otherUserId });
    const foreignStep = await asOther.mutation(api.roadmapSteps.add, {
      goalId: otherGoalId,
      title: "Theirs",
    });

    await expect(
      asUser.mutation(api.roadmapSteps.updateStatus, { id: foreignStep, status: "done" }),
    ).rejects.toThrow();
    await expect(asUser.query(api.roadmapSteps.list, { goalId: otherGoalId })).rejects.toThrow();
    // Sanity: the caller's own goal is unaffected by the rejected cross-user calls.
    expect(await asUser.query(api.roadmapSteps.list, { goalId })).toEqual([]);
  });
});
