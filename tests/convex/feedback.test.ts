import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

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
