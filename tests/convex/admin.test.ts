import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { ALL_KEYS } from "../../lib/levels";

// Auth test-identity pattern: insert a real users row, use its _id as the subject
// (getAuthUserId returns the subject and the schema validates it as v.id("users")).

describe("admin dev tools", () => {
  it("resetOnboarding clears onboardedAt + status + level", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.settings.completeOnboarding, {});
    let s = await asUser.query(api.settings.get, {});
    expect(s?.onboardedAt).toBeTruthy();

    await asUser.mutation(api.admin.resetOnboarding, {});
    s = await asUser.query(api.settings.get, {});
    expect(s?.onboardedAt ?? null).toBeNull();
    expect(s?.level ?? 0).toBe(0);
  });

  it("clearCore deletes all core answers and resets status to unstarted", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.core.save, { questionKey: "s1q0", content: "hi" });
    await asUser.mutation(api.admin.clearCore, {});

    const core = await asUser.query(api.core.get, {});
    expect(Object.keys(core).length).toBe(0);
    const s = await asUser.query(api.settings.get, {});
    expect(s?.blueprintStatus ?? "unstarted").toBe("unstarted");
  });

  it("seedCore fills all 18 boxes and flips to complete / level 1", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.admin.seedCore, {});
    const core = await asUser.query(api.core.get, {});
    expect(Object.keys(core).length).toBe(ALL_KEYS.length);
    const s = await asUser.query(api.settings.get, {});
    expect(s?.blueprintStatus).toBe("complete");
    expect(s?.level).toBe(1);
  });

  it("listSessions returns the user's interview sessions", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.interview.start, { experienceId: "text-interview", device: "desktop" });
    const sessions = await asUser.query(api.admin.listSessions, {});
    expect(sessions.length).toBe(1);
    expect(sessions[0].experienceId).toBe("text-interview");
  });

  it("clearTestData wipes core, sessions, events and resets onboarding", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.settings.completeOnboarding, {});
    await asUser.mutation(api.core.save, { questionKey: "s1q0", content: "hi" });
    await asUser.mutation(api.interview.start, { experienceId: "text-interview", device: "desktop" });

    await asUser.mutation(api.admin.clearTestData, {});

    const core = await asUser.query(api.core.get, {});
    expect(Object.keys(core).length).toBe(0);
    const sessions = await asUser.query(api.admin.listSessions, {});
    expect(sessions.length).toBe(0);
    const s = await asUser.query(api.settings.get, {});
    expect(s?.onboardedAt ?? null).toBeNull();
  });
});
