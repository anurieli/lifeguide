import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

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
