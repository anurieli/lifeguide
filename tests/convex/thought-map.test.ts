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

describe("sessions.thoughtMap / requestThoughtMap", () => {
  it("query returns null before any map has been requested", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    expect(await asUser.query(api.sessions.thoughtMap, { sessionId })).toBeNull();
  });

  it("requestThoughtMap creates a pending row", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.sessions.requestThoughtMap, { sessionId });
    const map = await asUser.query(api.sessions.thoughtMap, { sessionId });
    expect(map).not.toBeNull();
    expect(map!.status).toBe("pending");
    expect(map!.nodes).toEqual([]);
    expect(map!.edges).toEqual([]);
  });

  it("re-requesting patches the existing row instead of inserting a duplicate", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.sessions.requestThoughtMap, { sessionId });
    const first = (await asUser.query(api.sessions.thoughtMap, { sessionId }))!;
    await new Promise((r) => setTimeout(r, 5));
    await asUser.mutation(api.sessions.requestThoughtMap, { sessionId });
    const second = (await asUser.query(api.sessions.thoughtMap, { sessionId }))!;
    expect(second._id).toBe(first._id);
    expect(second.generatedAt).toBeGreaterThan(first.generatedAt);
    const all = await t.run(async (ctx) => ctx.db.query("thoughtMaps").collect());
    expect(all).toHaveLength(1);
  });

  it("requestThoughtMap rejects another user's session", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await expect(
      asOther.mutation(api.sessions.requestThoughtMap, { sessionId }),
    ).rejects.toThrow();
  });

  it("thoughtMap query is owner-checked", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.sessions.requestThoughtMap, { sessionId });
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    expect(await asOther.query(api.sessions.thoughtMap, { sessionId })).toBeNull();
  });
});

// generate's supersede guard must resolve BEFORE any model call, so these tests
// can call the action directly (t.action) without hitting the network — same
// shape as ai/sessionReply.maybeReply's guard tests.
describe("ai/thoughtMap.generate auto-map supersede guard", () => {
  it("a newer capture exists -> the older capture's run no-ops (no row written)", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
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
    await t.action(internal.ai.thoughtMap.generate, { sessionId, captureId: olderId });
    const rows = await t.run(async (ctx) => ctx.db.query("thoughtMaps").collect());
    expect(rows).toHaveLength(0);
  });

  it("the triggering capture was removed before the run -> no-ops", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "a thought",
      sessionId,
    });
    await t.run(async (ctx) => ctx.db.delete(captureId));
    await t.action(internal.ai.thoughtMap.generate, { sessionId, captureId });
    const rows = await t.run(async (ctx) => ctx.db.query("thoughtMaps").collect());
    expect(rows).toHaveLength(0);
  });
});

describe("writeThoughtMapInternal upsert (auto-map's first write)", () => {
  it("inserts a fresh row when the auto path writes before any manual request", async () => {
    const { t, asUser, userId } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    expect(await asUser.query(api.sessions.thoughtMap, { sessionId })).toBeNull();
    await t.mutation(internal.sessions.writeThoughtMapInternal, {
      sessionId,
      status: "done",
      nodes: [{ id: "n1", label: "A thought", level: 0, status: "active" }],
      edges: [],
      rootId: "n1",
    });
    const map = await asUser.query(api.sessions.thoughtMap, { sessionId });
    expect(map).not.toBeNull();
    expect(map!.status).toBe("done");
    expect(map!.userId).toBe(userId);
    expect(map!.nodes).toHaveLength(1);
    const all = await t.run(async (ctx) => ctx.db.query("thoughtMaps").collect());
    expect(all).toHaveLength(1);
  });

  it("still patches in place once a row exists, never duplicating", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await t.mutation(internal.sessions.writeThoughtMapInternal, {
      sessionId,
      status: "pending",
    });
    await t.mutation(internal.sessions.writeThoughtMapInternal, {
      sessionId,
      status: "done",
      nodes: [{ id: "n1", label: "A thought", level: 0, status: "active" }],
      edges: [],
    });
    const all = await t.run(async (ctx) => ctx.db.query("thoughtMaps").collect());
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("done");
  });
});
