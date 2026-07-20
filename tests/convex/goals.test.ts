import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

const TODAY = "2026-07-18";

async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

// Inserts a goal row directly (bypassing createGoal) so these tests don't
// trigger the real AI-enrichment scheduler side effect — convex-test's
// runAfter(0, ...) fires for real via a live setTimeout, which would race
// an actual (key-less, failing) model call against these assertions. Only
// the dedicated createGoal test below exercises that path, and only checks
// fields the background action never touches.
async function insertGoal(t: any, userId: any, overrides: Record<string, unknown> = {}) {
  return await t.run((ctx: any) =>
    ctx.db.insert("goals", {
      userId,
      name: "Untitled",
      status: "planning",
      sortOrder: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    }),
  );
}

describe("goals: createGoal", () => {
  it("lands as an aspiration — no deadline, no pillar, planning status", async () => {
    const { asUser } = await setup();
    const id = await asUser.mutation(api.goals.createGoal, { name: "Climb Everest" });
    const board = await asUser.query(api.goals.board, { today: TODAY });
    const goal = board!.goals.find((g) => g._id === id)!;
    expect(goal.name).toBe("Climb Everest");
    expect(goal.deadline).toBeUndefined();
    expect(goal.pillarId).toBeUndefined();
    expect(goal.status).toBe("planning");
  });
});

describe("goals: aspiration/Goal tiering is purely deadline presence", () => {
  it("setting a deadline graduates an aspiration; clearing it ungraduates back", async () => {
    const { t, asUser, userId } = await setup();
    const id = await insertGoal(t, userId, { name: "Write a book" });

    await asUser.mutation(api.goals.updateGoal, { id, deadline: "2026-12-31" });
    let board = await asUser.query(api.goals.board, { today: TODAY });
    expect(board!.goals.find((g) => g._id === id)!.deadline).toBe("2026-12-31");

    await asUser.mutation(api.goals.updateGoal, { id, deadline: null });
    board = await asUser.query(api.goals.board, { today: TODAY });
    expect(board!.goals.find((g) => g._id === id)!.deadline).toBeUndefined();
  });

  it("sets and clears pillarId and laddersTo", async () => {
    const { t, asUser, userId } = await setup();
    const pillarId = await t.run((ctx) =>
      ctx.db.insert("pillars", {
        userId,
        name: "Body & Health",
        weight: 0,
        source: "default",
        createdAt: Date.now(),
      }),
    );
    const id = await insertGoal(t, userId);

    await asUser.mutation(api.goals.updateGoal, { id, pillarId, laddersTo: "one_year" });
    let board = await asUser.query(api.goals.board, { today: TODAY });
    let goal = board!.goals.find((g) => g._id === id)!;
    expect(goal.pillarId).toBe(pillarId);
    expect(goal.laddersTo).toBe("one_year");

    await asUser.mutation(api.goals.updateGoal, { id, pillarId: null, laddersTo: null });
    board = await asUser.query(api.goals.board, { today: TODAY });
    goal = board!.goals.find((g) => g._id === id)!;
    expect(goal.pillarId).toBeUndefined();
    expect(goal.laddersTo).toBeUndefined();
  });
});

describe("goals: ownership", () => {
  it("rejects updating another user's goal", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run((ctx) => ctx.db.insert("users", {}));
    const goalId = await insertGoal(t, otherId);
    await expect(
      asUser.mutation(api.goals.updateGoal, { id: goalId, name: "hijack" }),
    ).rejects.toThrow();
  });
});

describe("goals: Coach context + intent ids", () => {
  it("coachContext renders goals and pillars with real ids inline", async () => {
    const { t, asUser, userId } = await setup();
    const pillarId = await t.run((ctx) =>
      ctx.db.insert("pillars", {
        userId,
        name: "Work & Money",
        weight: 0,
        source: "default",
        createdAt: Date.now(),
      }),
    );
    await insertGoal(t, userId, { name: "Ship the app", pillarId, deadline: "2026-09-01" });

    const fragment = await asUser.query(api.goals.coachContext, {});
    expect(fragment).not.toBeNull();
    expect(fragment!.text).toContain("Ship the app");
    expect(fragment!.text).toContain(pillarId);
    expect(fragment!.text).toContain("Work & Money");
  });

  it("intentIds excludes archived goals — the Coach can't reference them", async () => {
    const { t, asUser, userId } = await setup();
    const liveId = await insertGoal(t, userId, { name: "Live" });
    await insertGoal(t, userId, { name: "Archived", archived: true });

    const ids = await asUser.query(api.goals.intentIds, {});
    expect(ids.goalIds).toEqual([liveId]);
  });
});
