import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Auth test-identity pattern: insert a real users row, use its _id as the subject.
async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

// Guard tests below need a session already in dynamic mode as setup, but must
// NOT go through the real sessions.setMode mutation for that — it now
// schedules ai/sessionReply.opener for real (convex-test's scheduler actually
// fires runAfter(0) via a real setTimeout), which would insert its own reply
// row and confound the exact-row-count assertions these tests make about a
// *different* guard. Patching mode directly keeps them isolated.
async function setDynamic(t: ReturnType<typeof convexTest>, sessionId: Id<"sessions">) {
  await t.run(async (ctx) => {
    await ctx.db.patch(sessionId, { mode: "dynamic" });
  });
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
    await setDynamic(t, sessionId);
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
    await setDynamic(t, sessionId);
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

// opener's guards must all resolve BEFORE any model call, so these tests can
// call the action directly (t.action) without hitting the network — same
// shape as maybeReply's guard tests above.
describe("ai/sessionReply.opener guards", () => {
  it("no-ops on a quiet session — no reply row inserted", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await t.action(internal.ai.sessionReply.opener, { sessionId });
    const rows = await t.run(async (ctx) => ctx.db.query("sessionReplies").collect());
    expect(rows).toHaveLength(0);
  });

  it("no double-greeting: a done reply already covers the newest capture -> no-op", async () => {
    const { t, asUser, userId } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await setDynamic(t, sessionId);
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "one thought",
      sessionId,
    });
    await new Promise((r) => setTimeout(r, 5));
    const replyId = await t.mutation(internal.sessions.insertReplyInternal, {
      sessionId,
      userId,
      afterCaptureId: captureId,
      persona: "coach",
    });
    await t.mutation(internal.sessions.finishReplyInternal, {
      replyId,
      status: "done",
      text: "an existing opener",
    });
    await t.action(internal.ai.sessionReply.opener, { sessionId });
    const rows = await t.run(async (ctx) => ctx.db.query("sessionReplies").collect());
    expect(rows).toHaveLength(1); // only the one we seeded — no double greeting
  });

  it("a pending reply already covers the newest capture -> no-op", async () => {
    const { t, asUser, userId } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await setDynamic(t, sessionId);
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "one thought",
      sessionId,
    });
    await new Promise((r) => setTimeout(r, 5));
    await t.mutation(internal.sessions.insertReplyInternal, {
      sessionId,
      userId,
      afterCaptureId: captureId,
      persona: "coach",
    });
    await t.action(internal.ai.sessionReply.opener, { sessionId });
    const rows = await t.run(async (ctx) => ctx.db.query("sessionReplies").collect());
    expect(rows).toHaveLength(1); // the seeded pending row is still the only one
  });
});
