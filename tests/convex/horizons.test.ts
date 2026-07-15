import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

const WEEK = "2026-07-13";
const DAY = "2026-07-15";

describe("horizons: the standing rungs (5yr / 1yr / 1mo)", () => {
  it("setStanding upserts a single evolving line, and empty clears it", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.horizons.setStanding, { scope: "five_year", text: "Run my own studio" });
    let ladder = await asUser.query(api.horizons.ladder, { week: WEEK, day: DAY });
    expect(ladder!.five_year).toHaveLength(1);
    expect(ladder!.five_year[0].text).toBe("Run my own studio");

    // A second set edits the same row (no duplicate).
    await asUser.mutation(api.horizons.setStanding, { scope: "five_year", text: "Run a great studio" });
    ladder = await asUser.query(api.horizons.ladder, { week: WEEK, day: DAY });
    expect(ladder!.five_year).toHaveLength(1);
    expect(ladder!.five_year[0].text).toBe("Run a great studio");

    // Empty clears it.
    await asUser.mutation(api.horizons.setStanding, { scope: "five_year", text: "  " });
    ladder = await asUser.query(api.horizons.ladder, { week: WEEK, day: DAY });
    expect(ladder!.five_year).toHaveLength(0);
  });

  it("rejects setStanding on a time-boxed rung", async () => {
    const { asUser } = await setup();
    await expect(
      asUser.mutation(api.horizons.setStanding, { scope: "daily", text: "nope" }),
    ).rejects.toThrow();
  });
});

describe("horizons: the time-boxed rungs (weekly / daily)", () => {
  it("adds up to three goals per period, then refuses a fourth", async () => {
    const { asUser } = await setup();
    for (const text of ["Ship the PR", "Call the bank", "Gym"]) {
      await asUser.mutation(api.horizons.addGoal, { scope: "daily", period: DAY, text });
    }
    await expect(
      asUser.mutation(api.horizons.addGoal, { scope: "daily", period: DAY, text: "one too many" }),
    ).rejects.toThrow("three");
    const ladder = await asUser.query(api.horizons.ladder, { week: WEEK, day: DAY });
    expect(ladder!.daily.map((g) => g.text)).toEqual(["Ship the PR", "Call the bank", "Gym"]);
  });

  it("checks a goal done and back, and only time-boxed goals are checkable", async () => {
    const { asUser } = await setup();
    const id = await asUser.mutation(api.horizons.addGoal, {
      scope: "daily",
      period: DAY,
      text: "Ship it",
    });
    await asUser.mutation(api.horizons.setDone, { id, done: true });
    let ladder = await asUser.query(api.horizons.ladder, { week: WEEK, day: DAY });
    expect(ladder!.daily[0].doneAt).toBeTypeOf("number");
    await asUser.mutation(api.horizons.setDone, { id, done: false });
    ladder = await asUser.query(api.horizons.ladder, { week: WEEK, day: DAY });
    expect(ladder!.daily[0].doneAt).toBeUndefined();

    const std = await asUser.mutation(api.horizons.setStanding, {
      scope: "one_year",
      text: "A standing line",
    });
    await expect(asUser.mutation(api.horizons.setDone, { id: std!, done: true })).rejects.toThrow();
  });

  it("weekly and daily goals live in separate period buckets", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.horizons.addGoal, { scope: "weekly", period: WEEK, text: "Week goal" });
    await asUser.mutation(api.horizons.addGoal, { scope: "daily", period: DAY, text: "Day goal" });
    const ladder = await asUser.query(api.horizons.ladder, { week: WEEK, day: DAY });
    expect(ladder!.weekly.map((g) => g.text)).toEqual(["Week goal"]);
    expect(ladder!.daily.map((g) => g.text)).toEqual(["Day goal"]);
    // A different day sees no daily goals but the same week's goal.
    const other = await asUser.query(api.horizons.ladder, { week: WEEK, day: "2026-07-16" });
    expect(other!.daily).toHaveLength(0);
    expect(other!.weekly).toHaveLength(1);
  });

  it("update edits text and empty deletes; remove drops a goal", async () => {
    const { asUser } = await setup();
    const id = await asUser.mutation(api.horizons.addGoal, {
      scope: "daily",
      period: DAY,
      text: "Draft",
    });
    await asUser.mutation(api.horizons.update, { id, text: "Final" });
    let ladder = await asUser.query(api.horizons.ladder, { week: WEEK, day: DAY });
    expect(ladder!.daily[0].text).toBe("Final");
    await asUser.mutation(api.horizons.update, { id, text: "" }); // empty deletes
    ladder = await asUser.query(api.horizons.ladder, { week: WEEK, day: DAY });
    expect(ladder!.daily).toHaveLength(0);
  });

  it("rejects addGoal on a standing rung and bad period keys", async () => {
    const { asUser } = await setup();
    await expect(
      asUser.mutation(api.horizons.addGoal, { scope: "one_month", period: DAY, text: "x" }),
    ).rejects.toThrow();
    await expect(
      asUser.mutation(api.horizons.addGoal, { scope: "daily", period: "std", text: "x" }),
    ).rejects.toThrow();
  });
});

describe("horizons: ownership", () => {
  it("rejects touching another user's rung", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    const id = await asUser.mutation(api.horizons.addGoal, {
      scope: "daily",
      period: DAY,
      text: "mine",
    });
    await expect(asOther.mutation(api.horizons.update, { id, text: "stolen" })).rejects.toThrow();
    await expect(asOther.mutation(api.horizons.remove, { id })).rejects.toThrow();
  });
});
