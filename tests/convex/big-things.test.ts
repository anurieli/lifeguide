import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

const TODAY = "2026-07-23";

async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

describe("bigThings: create", () => {
  it("captures a big thing with title, context, and date", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.bigThings.create, {
      title: "Board meeting",
      context: "Quarterly review with investors",
      date: "2026-08-15",
    });
    const list = await asUser.query(api.bigThings.list, {});
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Board meeting");
    expect(list[0].context).toBe("Quarterly review with investors");
    expect(list[0].date).toBe("2026-08-15");
    expect(list[0].archived).toBeFalsy();
  });

  it("rejects an empty title", async () => {
    const { asUser } = await setup();
    await expect(asUser.mutation(api.bigThings.create, { title: "   " })).rejects.toThrow();
  });

  it("creating a big thing has NO goal/roadmap side effects", async () => {
    const { t, asUser } = await setup();
    await asUser.mutation(api.bigThings.create, { title: "Ship the migration" });
    const goals = await t.run(async (ctx) => ctx.db.query("goals").collect());
    const steps = await t.run(async (ctx) => ctx.db.query("roadmapSteps").collect());
    expect(goals).toHaveLength(0);
    expect(steps).toHaveLength(0);
  });
});

describe("bigThings: update", () => {
  it("edits title/context/date and clears context/date with null", async () => {
    const { asUser } = await setup();
    const id = await asUser.mutation(api.bigThings.create, {
      title: "Big meeting",
      context: "notes",
      date: "2026-09-01",
    });

    await asUser.mutation(api.bigThings.update, {
      id,
      title: "Bigger meeting",
      context: "updated notes",
      date: "2026-09-02",
    });
    let list = await asUser.query(api.bigThings.list, {});
    expect(list[0].title).toBe("Bigger meeting");
    expect(list[0].context).toBe("updated notes");
    expect(list[0].date).toBe("2026-09-02");

    await asUser.mutation(api.bigThings.update, { id, context: null, date: null });
    list = await asUser.query(api.bigThings.list, {});
    expect(list[0].context).toBeUndefined();
    expect(list[0].date).toBeUndefined();
    expect(list[0].title).toBe("Bigger meeting"); // untouched
  });
});

describe("bigThings: archive", () => {
  it("archiving removes it from the live list", async () => {
    const { asUser } = await setup();
    const id = await asUser.mutation(api.bigThings.create, { title: "Old commitment" });
    await asUser.mutation(api.bigThings.archive, { id });
    const list = await asUser.query(api.bigThings.list, {});
    expect(list).toHaveLength(0);
  });
});

describe("bigThings: ownership", () => {
  it("rejects updating, archiving, or promoting another user's big thing", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const foreignId = await t.run(async (ctx) =>
      ctx.db.insert("bigThings", {
        userId: otherId,
        title: "Not yours",
        sortOrder: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await expect(
      asUser.mutation(api.bigThings.update, { id: foreignId, title: "hijack" }),
    ).rejects.toThrow();
    await expect(asUser.mutation(api.bigThings.archive, { id: foreignId })).rejects.toThrow();
    await expect(asUser.mutation(api.bigThings.promote, { id: foreignId })).rejects.toThrow();
  });
});

describe("bigThings: promote", () => {
  it("creates a dated Goal from a dated Big Thing and retires the source", async () => {
    const { t, asUser } = await setup();
    const id = await asUser.mutation(api.bigThings.create, {
      title: "Launch v2",
      context: "The big rewrite",
      date: "2026-12-01",
    });

    const goalId = await asUser.mutation(api.bigThings.promote, { id });

    // The new goal mirrors the Big Thing: title → name, date → deadline,
    // context → why. Assert fields the background enrichment never touches.
    const board = await asUser.query(api.goals.board, { today: TODAY });
    const goal = board!.goals.find((g) => g._id === goalId)!;
    expect(goal.name).toBe("Launch v2");
    expect(goal.deadline).toBe("2026-12-01"); // date → deadline (minimal default)
    expect(goal.why).toBe("The big rewrite"); // context → why
    expect(goal.status).toBe("planning");

    // The source is retired in place: archived + a pointer to the goal it became,
    // so it never appears in both sections.
    const list = await asUser.query(api.bigThings.list, {});
    expect(list).toHaveLength(0);
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row!.archived).toBe(true);
    expect(row!.promotedToGoalId).toBe(goalId);
  });

  it("an undated Big Thing promotes to an aspiration (no deadline)", async () => {
    const { asUser } = await setup();
    const id = await asUser.mutation(api.bigThings.create, { title: "Someday commitment" });
    const goalId = await asUser.mutation(api.bigThings.promote, { id });
    const board = await asUser.query(api.goals.board, { today: TODAY });
    const goal = board!.goals.find((g) => g._id === goalId)!;
    expect(goal.deadline).toBeUndefined();
  });

  it("promoting twice is a no-op: one goal, returned both times", async () => {
    const { t, asUser } = await setup();
    const id = await asUser.mutation(api.bigThings.create, { title: "Once only" });
    const first = await asUser.mutation(api.bigThings.promote, { id });
    const second = await asUser.mutation(api.bigThings.promote, { id });
    expect(second).toBe(first);
    const goals = await t.run(async (ctx) => ctx.db.query("goals").collect());
    expect(goals).toHaveLength(1);
  });
});
