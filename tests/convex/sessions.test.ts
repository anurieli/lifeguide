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

describe("sessions", () => {
  it("create + append captures -> get returns them in order", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "audio",
      rawType: "audio",
      sessionId,
    });
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "and then I typed this",
      sessionId,
    });
    const doc = await asUser.query(api.sessions.get, { sessionId });
    expect(doc).not.toBeNull();
    expect(doc!.captures.map((c) => c.rawType)).toEqual(["audio", "text"]);
  });

  it("appending bumps session.updatedAt", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "desktop" });
    const before = (await asUser.query(api.sessions.get, { sessionId }))!.session.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "more",
      sessionId,
    });
    const after = (await asUser.query(api.sessions.get, { sessionId }))!.session.updatedAt;
    expect(after).toBeGreaterThan(before);
  });

  it("list derives a preview fallback and kind counts", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "walking and thinking about work",
      sessionId,
    });
    const rows = await asUser.query(api.sessions.list, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].preview).toBe("walking and thinking about work");
    expect(rows[0].counts).toEqual({ voice: 0, text: 1, photo: 0 });
  });

  it("cannot append to another user's session", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await expect(
      asOther.mutation(api.captures.create, {
        source: "paste",
        rawType: "text",
        rawText: "intruder",
        sessionId,
      }),
    ).rejects.toThrow();
  });

  it("deleteIfEmpty deletes a session with no active captures, keeps one with content", async () => {
    const { asUser } = await setup();
    const empty = await asUser.mutation(api.sessions.create, { device: "phone" });
    const full = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "keep me",
      sessionId: full,
    });
    await asUser.mutation(api.sessions.deleteIfEmpty, { sessionId: empty });
    await asUser.mutation(api.sessions.deleteIfEmpty, { sessionId: full });
    expect(await asUser.query(api.sessions.get, { sessionId: empty })).toBeNull();
    expect(await asUser.query(api.sessions.get, { sessionId: full })).not.toBeNull();
  });
});
