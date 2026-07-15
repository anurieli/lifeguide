import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";

// Auth test-identity pattern: insert a real users row, use its _id as the subject.

const BASE = {
  type: "bug" as const,
  text: "the button does nothing",
  route: "/",
  view: "today",
  title: "LifeGuide",
  viewport: { w: 1280, h: 800 },
  userAgent: "test",
  errors: [{ message: "TypeError: x is undefined", at: 1 }],
};

describe("feedback", () => {
  it("submit inserts an open ticket and listAll returns it", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.feedback.submit, BASE);

    const all = await asUser.query(api.feedback.listAll, {});
    expect(all.length).toBe(1);
    expect(all[0].status).toBe("open");
    expect(all[0].text).toBe(BASE.text);
    expect(all[0].errors.length).toBe(1);
    expect(all[0].shotUrl).toBeNull();
    expect(all[0].imageUrls).toEqual([]);
  });

  it("submit with attached photos resolves imageUrls in listAll", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const imageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["fake-png"], { type: "image/png" })),
    );
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.feedback.submit, { ...BASE, imageIds: [imageId] });

    const row = (await asUser.query(api.feedback.listAll, {}))[0];
    expect(row.imageIds).toEqual([imageId]);
    expect(row.imageUrls.length).toBe(1);
    expect(typeof row.imageUrls[0]).toBe("string");
  });

  it("listAll returns rows newest-first", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.feedback.submit, { ...BASE, text: "first" });
    await asUser.mutation(api.feedback.submit, { ...BASE, text: "second" });

    const all = await asUser.query(api.feedback.listAll, {});
    expect(all.map((r) => r.text)).toEqual(["second", "first"]);
  });

  it("resolve flips to dealt_with + sets resolvedAt; reopen flips back", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const id = await asUser.mutation(api.feedback.submit, BASE);

    await asUser.mutation(api.feedback.resolve, { id });
    let row = (await asUser.query(api.feedback.listAll, {}))[0];
    expect(row.status).toBe("dealt_with");
    expect(row.resolvedAt).toBeTruthy();

    await asUser.mutation(api.feedback.reopen, { id });
    row = (await asUser.query(api.feedback.listAll, {}))[0];
    expect(row.status).toBe("open");
    expect(row.resolvedAt ?? null).toBeNull();
  });

  it("unauthenticated submit throws", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.feedback.submit, BASE)).rejects.toThrow();
  });

  it("cannot resolve another user's ticket", async () => {
    const t = convexTest(schema);
    const a = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const b = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const id = await t.withIdentity({ subject: a }).mutation(api.feedback.submit, BASE);

    await expect(
      t.withIdentity({ subject: b }).mutation(api.feedback.resolve, { id }),
    ).rejects.toThrow();
  });
});

// The owner (identified by email) is the cross-user support inbox; everyone else
// is self-scoped. Keep OWNER_EMAIL in sync with convex/owner.ts.
const OWNER_EMAIL = "anurieli365@gmail.com";

describe("feedback — owner access", () => {
  it("owner sees ALL users' feedback with submitter identity; non-owner sees only their own", async () => {
    const t = convexTest(schema);
    const owner = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: OWNER_EMAIL, name: "Ariel" }),
    );
    const alice = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", name: "Alice" }),
    );
    const anon = await t.run(async (ctx) => ctx.db.insert("users", {}));

    await t.withIdentity({ subject: alice }).mutation(api.feedback.submit, { ...BASE, text: "alice note" });
    await t.withIdentity({ subject: anon }).mutation(api.feedback.submit, { ...BASE, text: "anon note" });

    // Owner sees both, newest first, with submitter resolved.
    const all = await t.withIdentity({ subject: owner }).query(api.feedback.listAll, {});
    expect(all.length).toBe(2);
    expect(all.map((r) => r.text).sort()).toEqual(["alice note", "anon note"]);
    const aliceRow = all.find((r) => r.text === "alice note")!;
    expect(aliceRow.submitter).toEqual({ name: "Alice", email: "alice@example.com", isAnonymous: false });
    const anonRow = all.find((r) => r.text === "anon note")!;
    expect(anonRow.submitter.isAnonymous).toBe(true);
    expect(anonRow.submitter.email).toBeNull();

    // Alice sees only her own.
    const aliceView = await t.withIdentity({ subject: alice }).query(api.feedback.listAll, {});
    expect(aliceView.map((r) => r.text)).toEqual(["alice note"]);
  });

  it("owner can resolve any ticket; amOwner reflects the email", async () => {
    const t = convexTest(schema);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", { email: "alice@example.com" }));

    const id = await t.withIdentity({ subject: alice }).mutation(api.feedback.submit, BASE);
    await t.withIdentity({ subject: owner }).mutation(api.feedback.resolve, { id });

    const row = (await t.withIdentity({ subject: owner }).query(api.feedback.listAll, {})).find((r) => r._id === id)!;
    expect(row.status).toBe("dealt_with");

    expect((await t.withIdentity({ subject: owner }).query(api.owner.amOwner, {})).isOwner).toBe(true);
    expect((await t.withIdentity({ subject: alice }).query(api.owner.amOwner, {})).isOwner).toBe(false);
    expect((await t.query(api.owner.amOwner, {})).isOwner).toBe(false); // anonymous/unauthenticated
  });
});

// The triage lifecycle (open → pending → dealt_with) and the Linear link (ADR 0018).
describe("feedback — lifecycle + Linear link", () => {
  it("markPending moves open → pending; won't drag a dealt_with ticket back", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const id = await asUser.mutation(api.feedback.submit, BASE);
    await asUser.mutation(api.feedback.markPending, { id });
    let row = (await asUser.query(api.feedback.listAll, {}))[0];
    expect(row.status).toBe("pending");
    expect(row.pendingAt).toBeTruthy();

    // Close it, then a stray markPending must not reopen it as pending.
    await asUser.mutation(api.feedback.resolve, { id });
    await asUser.mutation(api.feedback.markPending, { id });
    row = (await asUser.query(api.feedback.listAll, {}))[0];
    expect(row.status).toBe("dealt_with");
  });

  it("reopen clears both pendingAt and resolvedAt", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const id = await asUser.mutation(api.feedback.submit, BASE);
    await asUser.mutation(api.feedback.markPending, { id });
    await asUser.mutation(api.feedback.resolve, { id });
    await asUser.mutation(api.feedback.reopen, { id });

    const row = (await asUser.query(api.feedback.listAll, {}))[0];
    expect(row.status).toBe("open");
    expect(row.pendingAt ?? null).toBeNull();
    expect(row.resolvedAt ?? null).toBeNull();
  });

  it("markExported links the Linear issue and moves the ticket to pending", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const id = await asUser.mutation(api.feedback.submit, BASE);
    await asUser.mutation(api.feedback.markExported, {
      id,
      issueId: "issue_123",
      identifier: "ARI-99",
      url: "https://linear.app/cuttheedge/issue/ARI-99",
    });

    const row = (await asUser.query(api.feedback.listAll, {}))[0];
    expect(row.status).toBe("pending");
    expect(row.linear?.identifier).toBe("ARI-99");
    expect(row.linear?.url).toContain("ARI-99");
    expect(row.linear?.at).toBeTruthy();
  });

  it("getRowForExport returns the note + submitter label; blocks other users", async () => {
    const t = convexTest(schema);
    const alice = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", name: "Alice" }),
    );
    const bob = await t.run(async (ctx) => ctx.db.insert("users", { email: "bob@example.com" }));

    const id = await t
      .withIdentity({ subject: alice })
      .mutation(api.feedback.submit, { ...BASE, text: "export me" });

    const row = await t
      .withIdentity({ subject: alice })
      .query(internal.feedback.getRowForExport, { id });
    expect(row.text).toBe("export me");
    expect(row.submitterLabel).toBe("Alice (alice@example.com)");

    // A different (non-owner) user cannot read the row for export.
    await expect(
      t.withIdentity({ subject: bob }).query(internal.feedback.getRowForExport, { id }),
    ).rejects.toThrow();
  });
});
