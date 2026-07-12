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

  it("pinned sessions lead the list regardless of recency", async () => {
    const { asUser } = await setup();
    const older = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "older but pinned",
      sessionId: older,
    });
    await new Promise((r) => setTimeout(r, 5));
    const newer = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "newer",
      sessionId: newer,
    });
    await asUser.mutation(api.sessions.setPinned, { sessionId: older, pinned: true });
    let rows = await asUser.query(api.sessions.list, {});
    expect(rows.map((r) => r._id)).toEqual([older, newer]);
    await asUser.mutation(api.sessions.setPinned, { sessionId: older, pinned: false });
    rows = await asUser.query(api.sessions.list, {});
    expect(rows.map((r) => r._id)).toEqual([newer, older]);
  });

  it("remove deletes the session but keeps its captures in the archive, inactive", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "spoken into the void",
      sessionId,
    });
    await asUser.mutation(api.sessions.remove, { sessionId });
    expect(await asUser.query(api.sessions.get, { sessionId })).toBeNull();
    const raw = await t.run(async (ctx) => ctx.db.get(captureId));
    expect(raw).not.toBeNull();
    expect(raw!.isActive).toBe(false);
    expect(raw!.sessionId).toBe(sessionId); // association kept for future mining
  });

  it("merge folds sessions into the earliest one, elements chronological", async () => {
    const { asUser } = await setup();
    const first = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "one",
      sessionId: first,
    });
    await new Promise((r) => setTimeout(r, 5));
    const second = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "two",
      sessionId: second,
    });
    await new Promise((r) => setTimeout(r, 5));
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "three",
      sessionId: first,
    });
    const mergedId = await asUser.mutation(api.sessions.merge, {
      sessionIds: [second, first],
    });
    expect(mergedId).toBe(first); // earliest started survives
    expect(await asUser.query(api.sessions.get, { sessionId: second })).toBeNull();
    const doc = await asUser.query(api.sessions.get, { sessionId: first });
    expect(doc!.captures.map((c) => c.rawText)).toEqual(["one", "two", "three"]);
    expect(doc!.session.digest?.status).toBe("pending"); // digest re-synthesizes
  });

  it("merge rejects sessions owned by someone else", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    const mine = await asUser.mutation(api.sessions.create, { device: "phone" });
    const theirs = await asOther.mutation(api.sessions.create, { device: "phone" });
    await expect(
      asUser.mutation(api.sessions.merge, { sessionIds: [mine, theirs] }),
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
