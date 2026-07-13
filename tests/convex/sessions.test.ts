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

  it("setTitle marks the name person-entered; the digest never overwrites it", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "desktop" });
    await asUser.mutation(api.sessions.setTitle, { sessionId, title: "  My walk  " });
    let doc = await asUser.query(api.sessions.get, { sessionId });
    expect(doc!.session.title).toBe("My walk");
    expect(doc!.session.titleEditedAt).toBeDefined();
    // The digest write keeps the person's name and still lands the summary.
    await asUser.mutation(internal.sessions.writeDigestInternal, {
      sessionId,
      title: "AI title",
      summary: "an AI description",
      status: "done",
    });
    doc = await asUser.query(api.sessions.get, { sessionId });
    expect(doc!.session.title).toBe("My walk");
    expect(doc!.session.summary).toBe("an AI description");
    // Clearing the field hands naming back to the AI.
    await asUser.mutation(api.sessions.setTitle, { sessionId, title: "" });
    await asUser.mutation(internal.sessions.writeDigestInternal, {
      sessionId,
      title: "AI title",
      status: "done",
    });
    doc = await asUser.query(api.sessions.get, { sessionId });
    expect(doc!.session.title).toBe("AI title");
  });

  it("setTitle rejects another user's session", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await expect(
      asOther.mutation(api.sessions.setTitle, { sessionId, title: "mine now" }),
    ).rejects.toThrow();
  });

  it("merge keeps a person-entered name over AI re-titling", async () => {
    const { asUser } = await setup();
    const first = await asUser.mutation(api.sessions.create, { device: "phone" });
    await new Promise((r) => setTimeout(r, 5));
    const second = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "content",
      sessionId: second,
    });
    await asUser.mutation(api.sessions.setTitle, { sessionId: second, title: "Named by me" });
    const mergedId = await asUser.mutation(api.sessions.merge, {
      sessionIds: [first, second],
    });
    const doc = await asUser.query(api.sessions.get, { sessionId: mergedId });
    expect(doc!.session.title).toBe("Named by me");
    expect(doc!.session.titleEditedAt).toBeDefined();
  });

  it("refreshDigest schedules only when the digest is behind the content", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "desktop" });
    // Empty entry: nothing to digest, nothing scheduled.
    await asUser.mutation(api.sessions.refreshDigest, { sessionId });
    await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "something to describe",
      sessionId,
    });
    // Content newer than the digest: a refresh marks work (digest run scheduled).
    await asUser.mutation(api.sessions.refreshDigest, { sessionId });
    // A digest that already covers the latest content is left alone.
    await asUser.mutation(internal.sessions.writeDigestInternal, {
      sessionId,
      title: "Covered",
      summary: "up to date",
      status: "done",
    });
    const before = (await asUser.query(api.sessions.get, { sessionId }))!.session.digest;
    await asUser.mutation(api.sessions.refreshDigest, { sessionId });
    const after = (await asUser.query(api.sessions.get, { sessionId }))!.session.digest;
    expect(after).toEqual(before);
    await t.finishInProgressScheduledFunctions();
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

  it("seedDemo builds two packed entries with digest done and no pending ingest", async () => {
    const { t, asUser } = await setup();
    const fileIds = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 4; i++) ids.push(await ctx.storage.store(new Blob([`demo-${i}`])));
      return ids;
    });
    const ids = await asUser.mutation(api.sessions.seedDemo, {
      voiceFileIds: [fileIds[0], fileIds[1]],
      photoFileIds: [fileIds[2], fileIds[3]],
    });
    expect(ids).toHaveLength(2);
    const rows = await asUser.query(api.sessions.list, {});
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.title).toBeTruthy();
      expect(row.summary).toBeTruthy();
      expect(row.digestStatus).toBe("done");
      expect(row.counts).toEqual({ voice: 1, text: 2, photo: 1 });
    }
    const doc = await asUser.query(api.sessions.get, { sessionId: ids[0] });
    // Members read chronologically; every one is fully extracted (nothing pending,
    // so opening a demo entry never schedules a digest re-run over demo text).
    const times = doc!.captures.map((c) => c.createdAt);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    for (const c of doc!.captures) expect(c.extraction?.status).toBe("done");
    const voice = doc!.captures.find((c) => c.rawType === "audio");
    expect(voice!.extractedText).toBeTruthy();
    expect(voice!.fileUrl).toBeTruthy();
    // The refresh path treats the stamped digest as covering the content.
    const before = doc!.session.digest;
    await asUser.mutation(api.sessions.refreshDigest, { sessionId: ids[0] });
    const after = (await asUser.query(api.sessions.get, { sessionId: ids[0] }))!.session.digest;
    expect(after).toEqual(before);
  });

  it("seedDemo requires auth and both media pairs", async () => {
    const { t, asUser } = await setup();
    const fileIds = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 2; i++) ids.push(await ctx.storage.store(new Blob([`x${i}`])));
      return ids;
    });
    await expect(
      asUser.mutation(api.sessions.seedDemo, {
        voiceFileIds: [fileIds[0]],
        photoFileIds: [fileIds[1]],
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.sessions.seedDemo, {
        voiceFileIds: [fileIds[0], fileIds[0]],
        photoFileIds: [fileIds[1], fileIds[1]],
      }),
    ).rejects.toThrow();
  });
});
