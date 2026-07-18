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

describe("sessions.setMode", () => {
  it("round-trips quiet <-> dynamic and bumps updatedAt", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    const before = (await asUser.query(api.sessions.get, { sessionId }))!.session;
    expect(before.mode).toBeUndefined(); // absent = quiet
    await new Promise((r) => setTimeout(r, 5));
    await asUser.mutation(api.sessions.setMode, { sessionId, mode: "dynamic" });
    const dynamic = (await asUser.query(api.sessions.get, { sessionId }))!.session;
    expect(dynamic.mode).toBe("dynamic");
    expect(dynamic.updatedAt).toBeGreaterThan(before.updatedAt);
    await asUser.mutation(api.sessions.setMode, { sessionId, mode: "quiet" });
    const quiet = (await asUser.query(api.sessions.get, { sessionId }))!.session;
    expect(quiet.mode).toBe("quiet");
  });

  it("rejects another user's session", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await expect(
      asOther.mutation(api.sessions.setMode, { sessionId, mode: "dynamic" }),
    ).rejects.toThrow();
  });
});

describe("sessions.replies", () => {
  it("returns inserted rows oldest first, scoped to the owner", async () => {
    const { t, asUser, userId } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    const first = await t.mutation(internal.sessions.insertReplyInternal, {
      sessionId,
      userId,
      persona: "coach",
    });
    await new Promise((r) => setTimeout(r, 5));
    const second = await t.mutation(internal.sessions.insertReplyInternal, {
      sessionId,
      userId,
      persona: "coach",
    });
    const rows = await asUser.query(api.sessions.replies, { sessionId });
    expect(rows.map((r) => r._id)).toEqual([first, second]);

    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    expect(await asOther.query(api.sessions.replies, { sessionId })).toEqual([]);
  });
});

// maybeReply's guards must all resolve BEFORE any model call, so these tests can
// call the action directly (t.action) without hitting the network.
describe("ai/sessionReply.maybeReply guards", () => {
  it("no-ops on a quiet (default) session — no reply row inserted", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "thinking out loud",
      sessionId,
    });
    await t.action(internal.ai.sessionReply.maybeReply, { sessionId, captureId });
    const rows = await t.run(async (ctx) => ctx.db.query("sessionReplies").collect());
    expect(rows).toHaveLength(0);
  });

  it("supersede guard: a newer capture exists -> the older capture's run no-ops", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.sessions.setMode, { sessionId, mode: "dynamic" });
    const olderId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "first thought",
      sessionId,
    });
    await new Promise((r) => setTimeout(r, 5));
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "second, newer thought",
      sessionId,
    });
    await t.action(internal.ai.sessionReply.maybeReply, { sessionId, captureId: olderId });
    const rows = await t.run(async (ctx) => ctx.db.query("sessionReplies").collect());
    expect(rows).toHaveLength(0);
  });

  it("already-answered guard: a reply newer than the latest capture -> no new pending row", async () => {
    const { t, asUser, userId } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.sessions.setMode, { sessionId, mode: "dynamic" });
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "one thought",
      sessionId,
    });
    await new Promise((r) => setTimeout(r, 5));
    // Simulate an already-completed reply for this exact state.
    await t.mutation(internal.sessions.insertReplyInternal, {
      sessionId,
      userId,
      afterCaptureId: captureId,
      persona: "coach",
    });
    await t.action(internal.ai.sessionReply.maybeReply, { sessionId, captureId });
    const rows = await t.run(async (ctx) => ctx.db.query("sessionReplies").collect());
    expect(rows).toHaveLength(1); // only the one we seeded — no second pending row
  });
});
