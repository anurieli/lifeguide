import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// The Today log's read side: interactions.forRange (the day's journal entries)
// and rituals.history (the keeping-up strip).

async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

describe("interactions.forRange (the day's log)", () => {
  it("returns only entries inside [since, until)", async () => {
    const { t, asUser, userId } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.insert("interactions", { userId, type: "checkin_morning", payload: "early", at: 999 });
      await ctx.db.insert("interactions", { userId, type: "checkin_morning", payload: "in", at: 1000 });
      await ctx.db.insert("interactions", { userId, type: "checkin_evening", payload: "edge", at: 1999 });
      await ctx.db.insert("interactions", { userId, type: "checkin_evening", payload: "late", at: 2000 });
    });
    const rows = await asUser.query(api.interactions.forRange, { sinceMs: 1000, untilMs: 2000 });
    expect(rows.map((r) => r.payload).sort()).toEqual(["edge", "in"]);
  });

  it("never returns another user's entries", async () => {
    const { t, asUser } = await setup();
    await t.run(async (ctx) => {
      const otherId = await ctx.db.insert("users", {});
      await ctx.db.insert("interactions", { userId: otherId, type: "checkin_morning", payload: "not mine", at: 1500 });
    });
    expect(await asUser.query(api.interactions.forRange, { sinceMs: 0, untilMs: 10_000 })).toEqual([]);
  });

  it("returns empty when signed out", async () => {
    const { t } = await setup();
    expect(await t.query(api.interactions.forRange, { sinceMs: 0, untilMs: 10_000 })).toEqual([]);
  });
});

describe("rituals.history (keeping up)", () => {
  it("returns both rituals' rows from sinceDay onward, with completion state", async () => {
    const { t, asUser, userId } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.insert("ritualDays", { userId, ritual: "morning", day: "2026-07-05", checkedIds: [], completedAt: 5 }); // before the window
      await ctx.db.insert("ritualDays", { userId, ritual: "morning", day: "2026-07-10", checkedIds: [], completedAt: 10 });
      await ctx.db.insert("ritualDays", { userId, ritual: "night", day: "2026-07-11", checkedIds: [] }); // touched, never sealed
      await ctx.db.insert("ritualDays", { userId, ritual: "night", day: "2026-07-12", checkedIds: [], completedAt: 12 });
    });
    const rows = await asUser.query(api.rituals.history, { sinceDay: "2026-07-06" });
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.day === "2026-07-10")).toMatchObject({ ritual: "morning", completedAt: 10 });
    expect(rows.find((r) => r.day === "2026-07-11")).toMatchObject({ ritual: "night", completedAt: null });
    expect(rows.find((r) => r.day === "2026-07-12")).toMatchObject({ ritual: "night", completedAt: 12 });
  });

  it("rejects a malformed day key and never returns another user's days", async () => {
    const { t, asUser } = await setup();
    await t.run(async (ctx) => {
      const otherId = await ctx.db.insert("users", {});
      await ctx.db.insert("ritualDays", { userId: otherId, ritual: "morning", day: "2026-07-12", checkedIds: [], completedAt: 1 });
    });
    expect(await asUser.query(api.rituals.history, { sinceDay: "not-a-day" })).toEqual([]);
    expect(await asUser.query(api.rituals.history, { sinceDay: "2026-07-01" })).toEqual([]);
  });
});
