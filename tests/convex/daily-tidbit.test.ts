import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";

async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

const DAY = "2026-07-15";

describe("dailyTidbits: the lazy daily quote", () => {
  it("ensureForDay creates ONE pending row and is idempotent", async () => {
    const { t, asUser } = await setup();
    const id1 = await asUser.mutation(api.dailyTidbits.ensureForDay, { day: DAY, kind: "quote" });
    const id2 = await asUser.mutation(api.dailyTidbits.ensureForDay, { day: DAY, kind: "quote" });
    expect(id2).toEqual(id1); // second call is a no-op (agent runs at most once/day)
    const rows = await t.run(async (ctx) => ctx.db.query("dailyTidbits").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("pending");
    const row = await asUser.query(api.dailyTidbits.forDay, { day: DAY, kind: "quote" });
    expect(row!.status).toBe("pending");
    expect(row!.text).toBeUndefined();
  });

  it("writeInternal lands the quote and forDay streams it", async () => {
    const { t, asUser } = await setup();
    const id = await asUser.mutation(api.dailyTidbits.ensureForDay, { day: DAY, kind: "quote" });
    await t.mutation(internal.dailyTidbits.writeInternal, {
      tidbitId: id,
      status: "done",
      text: "The obstacle is the way.",
      attribution: "Marcus Aurelius",
      model: "anthropic/claude-haiku-4.5",
    });
    const row = await asUser.query(api.dailyTidbits.forDay, { day: DAY, kind: "quote" });
    expect(row!.status).toBe("done");
    expect(row!.text).toBe("The obstacle is the way.");
    expect(row!.attribution).toBe("Marcus Aurelius");
    expect(row!.generatedAt).toBeTypeOf("number");
  });

  it("refresh resets a done row to pending (find me another)", async () => {
    const { t, asUser } = await setup();
    const id = await asUser.mutation(api.dailyTidbits.ensureForDay, { day: DAY, kind: "quote" });
    await t.mutation(internal.dailyTidbits.writeInternal, {
      tidbitId: id,
      status: "done",
      text: "First quote.",
      attribution: "Someone",
    });
    await asUser.mutation(api.dailyTidbits.refresh, { day: DAY, kind: "quote" });
    const row = await asUser.query(api.dailyTidbits.forDay, { day: DAY, kind: "quote" });
    expect(row!.status).toBe("pending");
    expect(row!.text).toBeUndefined();
    const rows = await t.run(async (ctx) => ctx.db.query("dailyTidbits").collect());
    expect(rows).toHaveLength(1); // still one row for the day
  });

  it("contextForInternal gathers Core signal + avoids repeating recent quotes", async () => {
    const { t, asUser, userId } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        userId,
        morningCheckin: true,
        eveningCheckin: true,
        dailyExercise: "intention",
        coachTone: "balanced",
        reachingOut: "earned",
        northStar: "Build things that matter",
        updatedAt: 1,
      });
      await ctx.db.insert("dailyTidbits", {
        userId,
        day: "2026-07-14",
        kind: "quote",
        status: "done",
        text: "Yesterday's quote.",
        attribution: "X",
        generatedAt: 1,
        createdAt: 1,
      });
    });
    const cx = await t.query(internal.dailyTidbits.contextForInternal, { userId, day: DAY });
    expect(cx.northStar).toBe("Build things that matter");
    expect(cx.recentQuotes.some((q) => q.includes("Yesterday's quote."))).toBe(true);
  });

  it("rejects malformed day keys", async () => {
    const { asUser } = await setup();
    await expect(
      asUser.mutation(api.dailyTidbits.ensureForDay, { day: "someday", kind: "quote" }),
    ).rejects.toThrow();
  });
});
