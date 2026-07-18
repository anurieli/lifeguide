import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Auth test-identity pattern: insert a real users row, use its _id as the subject
// (getAuthUserId returns the subject and the schema validates it as v.id("users")).

describe("tour (ARI-19 guided product tour)", () => {
  it("get() reads as never-started before any settings row exists", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const tour = await asUser.query(api.tour.get, {});
    expect(tour).toEqual({ step: 0, completedAt: null, skippedAt: null });
  });

  it("advance() persists the current step so a reload resumes at the same stop", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.tour.advance, { step: 2 });
    const tour = await asUser.query(api.tour.get, {});
    expect(tour?.step).toBe(2);
    expect(tour?.completedAt).toBeNull();
    expect(tour?.skippedAt).toBeNull();
  });

  it("complete() stamps completedAt; a completed tour does not resume as active", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.tour.advance, { step: 4 });
    await asUser.mutation(api.tour.complete, {});
    const tour = await asUser.query(api.tour.get, {});
    expect(tour?.completedAt).toBeTruthy();
    expect(tour?.skippedAt).toBeNull();
  });

  it("skip() stamps skippedAt independently of completedAt", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.tour.skip, {});
    const tour = await asUser.query(api.tour.get, {});
    expect(tour?.skippedAt).toBeTruthy();
    expect(tour?.completedAt).toBeNull();
  });

  it("restart() clears both terminal stamps and resets the step to 0", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.tour.advance, { step: 3 });
    await asUser.mutation(api.tour.complete, {});
    let tour = await asUser.query(api.tour.get, {});
    expect(tour?.completedAt).toBeTruthy();

    await asUser.mutation(api.tour.restart, {});
    tour = await asUser.query(api.tour.get, {});
    expect(tour).toEqual({ step: 0, completedAt: null, skippedAt: null });
  });

  it("restart() also clears a skip, not just a completion", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.tour.skip, {});
    await asUser.mutation(api.tour.restart, {});
    const tour = await asUser.query(api.tour.get, {});
    expect(tour?.skippedAt).toBeNull();
  });

  it("tour progress is per-user and does not leak across identities", async () => {
    const t = convexTest(schema);
    const userA = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const userB = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asA = t.withIdentity({ subject: userA });
    const asB = t.withIdentity({ subject: userB });

    await asA.mutation(api.tour.complete, {});
    const tourA = await asA.query(api.tour.get, {});
    const tourB = await asB.query(api.tour.get, {});
    expect(tourA?.completedAt).toBeTruthy();
    expect(tourB?.completedAt).toBeNull();
  });

  it("every mutation requires an authenticated identity", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.tour.advance, { step: 1 })).rejects.toThrow();
    await expect(t.mutation(api.tour.complete, {})).rejects.toThrow();
    await expect(t.mutation(api.tour.skip, {})).rejects.toThrow();
    await expect(t.mutation(api.tour.restart, {})).rejects.toThrow();
  });

  it("get() returns null when signed out", async () => {
    const t = convexTest(schema);
    const tour = await t.query(api.tour.get, {});
    expect(tour).toBeNull();
  });
});
