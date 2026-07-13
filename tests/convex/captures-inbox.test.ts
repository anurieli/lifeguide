import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";

// Auth test-identity pattern: insert a real users row, use its _id as the subject.
async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

// The board Inbox gate (ADR 0014): unplaced + active is necessary but not
// sufficient — a capture must be board-bound, either by explicit intent
// (target="board") or by the vision sieve's verdict (boardWorthy.verdict).
describe("captures.inbox — the board gate", () => {
  it("shows an explicit board capture immediately, before any distillation", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "a cabin in the mountains with a workshop",
      target: "board",
    });
    const inbox = await asUser.query(api.captures.inbox, {});
    expect(inbox).toHaveLength(1);
    expect(inbox[0].target).toBe("board");
  });

  it("hides an ambient capture with no sieve verdict yet", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "remember to email the accountant about Q3",
    });
    expect(await asUser.query(api.captures.inbox, {})).toHaveLength(0);
  });

  it("shows an ambient capture once the sieve says it is board-worthy", async () => {
    const { t, asUser } = await setup();
    const captureId = await asUser.mutation(api.captures.create, {
      source: "audio",
      rawType: "text",
      rawText: "I want to be the kind of man my son copies",
    });
    await t.mutation(internal.captures.updateDistilled, {
      captureId,
      distilled: { title: "Father worth copying", essence: "e", pillars: ["relationships"] },
      boardWorthy: { verdict: true, reason: "an identity aspiration", at: Date.now() },
    });
    const inbox = await asUser.query(api.captures.inbox, {});
    expect(inbox).toHaveLength(1);
    expect(inbox[0].boardWorthy?.verdict).toBe(true);
  });

  it("keeps hiding an ambient capture the sieve rejected", async () => {
    const { t, asUser } = await setup();
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "put that as a card in Settings where we handle canvas movement",
    });
    await t.mutation(internal.captures.updateDistilled, {
      captureId,
      distilled: { title: "Canvas movement notes", essence: "e", pillars: [] },
      boardWorthy: { verdict: false, reason: "an instruction to a computer", at: Date.now() },
    });
    expect(await asUser.query(api.captures.inbox, {})).toHaveLength(0);
  });

  it("a session capture never reaches the board inbox without a verdict", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "today was long, the gym was closed",
      sessionId,
    });
    expect(await asUser.query(api.captures.inbox, {})).toHaveLength(0);
  });

  it("placing removes a board capture from the inbox", async () => {
    const { t, asUser } = await setup();
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "a house with a garage gym",
      target: "board",
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(captureId, { placedAt: Date.now() });
    });
    expect(await asUser.query(api.captures.inbox, {})).toHaveLength(0);
  });

  it("dismissing (softDelete) removes a board capture from the inbox", async () => {
    const { asUser } = await setup();
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "an idea I changed my mind about",
      target: "board",
    });
    await asUser.mutation(api.captures.softDelete, { captureId });
    expect(await asUser.query(api.captures.inbox, {})).toHaveLength(0);
  });
});
