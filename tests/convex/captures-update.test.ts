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

// ARI-123: a committed text/quote capture must be re-openable for editing —
// captures.update is the mutation SessionDoc's click-to-edit field calls.
describe("captures.update — reopening a committed note", () => {
  it("saves new text over the old, and mirrors it onto extractedText", async () => {
    const { t, asUser } = await setup();
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "first draft of the thought",
    });
    await asUser.mutation(api.captures.update, {
      captureId,
      rawText: "first draft of the thought, plus the bit I forgot",
    });
    const saved = await t.run(async (ctx) => ctx.db.get(captureId));
    expect(saved?.rawText).toBe("first draft of the thought, plus the bit I forgot");
    expect(saved?.extractedText).toBe("first draft of the thought, plus the bit I forgot");
  });

  it("works on a quote capture the same as a text capture", async () => {
    const { t, asUser } = await setup();
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "quote",
      rawText: "the original quote",
    });
    await asUser.mutation(api.captures.update, { captureId, rawText: "the corrected quote" });
    const saved = await t.run(async (ctx) => ctx.db.get(captureId));
    expect(saved?.rawText).toBe("the corrected quote");
  });

  it("trims whitespace and no-ops on an unchanged or empty edit", async () => {
    const { t, asUser } = await setup();
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "keep this exactly",
    });
    await asUser.mutation(api.captures.update, { captureId, rawText: "  keep this exactly  " });
    await asUser.mutation(api.captures.update, { captureId, rawText: "   " });
    const saved = await t.run(async (ctx) => ctx.db.get(captureId));
    expect(saved?.rawText).toBe("keep this exactly");
  });

  it("rejects editing a non-text raw type (the rendered text there is derived, not typed)", async () => {
    const { asUser } = await setup();
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "link",
      rawUrl: "https://example.com",
    });
    await expect(
      asUser.mutation(api.captures.update, { captureId, rawText: "a new url text" }),
    ).rejects.toThrow();
  });

  it("refuses to edit a capture owned by someone else", async () => {
    const { t, asUser } = await setup();
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "mine",
    });
    const otherUserId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherUserId });
    await expect(
      asOther.mutation(api.captures.update, { captureId, rawText: "not yours" }),
    ).rejects.toThrow();
  });

  it("bumps the owning session's updatedAt so the entry resurfaces as freshly touched", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "desktop" });
    const before = await t.run(async (ctx) => ctx.db.get(sessionId));
    const captureId = await asUser.mutation(api.captures.create, {
      source: "paste",
      rawType: "text",
      rawText: "a note inside a session",
      sessionId,
    });
    await new Promise((r) => setTimeout(r, 5));
    await asUser.mutation(api.captures.update, {
      captureId,
      rawText: "a note inside a session, edited",
    });
    const after = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(after!.updatedAt).toBeGreaterThan(before!.updatedAt);
  });
});
