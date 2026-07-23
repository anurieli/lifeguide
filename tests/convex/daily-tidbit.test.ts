import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { parseDailyQuote } from "../../convex/ai/parse";

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

// ─── The generate action's parse-and-write path (ARI-134) ──────────────────────
//
// The one thing the daily-quote agent OWNS beyond the model call is: parse the reply
// with parseDailyQuote, then write the result back onto the row. We do NOT execute
// chatComplete under convex-test: the model call genuinely needs a live key (the repo
// documents this, and the OpenAI SDK bypasses a swapped global.fetch and hits the
// provider for real), so a "mocked" action run is neither deterministic nor offline.
// Instead we cover the two pieces the action actually owns, deterministically:
//   1. the exact parse the action performs (convex/ai/dailyQuote.generate calls
//      parseDailyQuote) — tolerant of fenced / prose JSON, strict on the fields; and
//   2. the write-back through the REAL dailyTidbits.writeInternal mutation, including
//      the Try-again recovery: a refreshed (previously errored) row lands `done` with
//      text + attribution and the stale error cleared.
// The wider wrapper/rejection matrix lives in tests/daily-quote-parse.test.ts.
describe("ai/dailyQuote.generate -- parse-and-write path (ARI-134)", () => {
  it("parses the fenced JSON a model returns, and rejects a missing-author reply", () => {
    // The exact wrapper the failing model produced (fenced ```json): the action's
    // parseDailyQuote call accepts it and yields a clean text + attribution.
    const good = parseDailyQuote(
      '```json\n{"quote":"The impediment to action advances action.","author":"Marcus Aurelius"}\n```',
    );
    expect(good).toEqual({
      text: "The impediment to action advances action.",
      attribution: "Marcus Aurelius",
    });
    // A missing author is a rejection (-> the action throws -> the row lands `error`),
    // never a fabricated "Unknown": the ARI-134 bug.
    expect(parseDailyQuote('Sorry, here you go: {"quote":"A line with no author"}')).toBeNull();
  });

  it("a Try-again re-run recovers a prior error row: refresh -> pending -> writeInternal done", async () => {
    const { t, asUser } = await setup();
    const id = await asUser.mutation(api.dailyTidbits.ensureForDay, { day: DAY, kind: "quote" });

    // First run: unusable output -> the action lands the row `error`, nothing persisted.
    await t.mutation(internal.dailyTidbits.writeInternal, {
      tidbitId: id,
      status: "error",
      error: "unusable quote payload",
    });
    let row = await asUser.query(api.dailyTidbits.forDay, { day: DAY, kind: "quote" });
    expect(row!.status).toBe("error");
    expect(row!.error).toBe("unusable quote payload");
    expect(row!.text).toBeUndefined();
    expect(row!.attribution).toBeUndefined();

    // Try again: refresh resets the SAME row to pending and clears the stale error.
    const reId = await asUser.mutation(api.dailyTidbits.refresh, { day: DAY, kind: "quote" });
    expect(reId).toEqual(id);
    row = await asUser.query(api.dailyTidbits.forDay, { day: DAY, kind: "quote" });
    expect(row!.status).toBe("pending");

    // A good reply, parsed the way the action parses it, is written back through the
    // real mutation: the row lands `done` with text + attribution, error gone.
    const parsed = parseDailyQuote(
      '{"quote":"Well done is better than well said.","author":"Benjamin Franklin"}',
    );
    expect(parsed).not.toBeNull();
    await t.mutation(internal.dailyTidbits.writeInternal, {
      tidbitId: reId,
      status: "done",
      text: parsed!.text,
      attribution: parsed!.attribution,
      model: "anthropic/claude-haiku-4.5",
    });

    row = await asUser.query(api.dailyTidbits.forDay, { day: DAY, kind: "quote" });
    expect(row!.status).toBe("done");
    expect(row!.text).toBe("Well done is better than well said.");
    expect(row!.attribution).toBe("Benjamin Franklin");
    expect(row!.error).toBeUndefined();
    expect(row!.generatedAt).toBeTypeOf("number");
  });
});
