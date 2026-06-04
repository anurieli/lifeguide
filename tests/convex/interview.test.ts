import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

describe("interview sessions", () => {
  it("creates a session and logs a started event", async () => {
    const t = convexTest(schema);
    // Create a real user and use their _id as the auth subject.
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { name: "Test User" }));
    const asUser = t.withIdentity({ subject: userId });
    const id = await asUser.mutation(api.interview.start, {
      experienceId: "text-interview",
      device: "desktop",
    });
    const session = await asUser.query(api.interview.get, { sessionId: id });
    expect(session?.status).toBe("active");
    expect(session?.transcript).toEqual([]);
  });

  it("appends turns and skips", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { name: "Test User" }));
    const asUser = t.withIdentity({ subject: userId });
    const id = await asUser.mutation(api.interview.start, {
      experienceId: "text-interview", device: "desktop",
    });
    await asUser.mutation(api.interview.appendTurn, {
      sessionId: id, role: "user", questionKey: "s1q0", text: "I want peace.",
    });
    await asUser.mutation(api.interview.skip, { sessionId: id, questionKey: "s1q1" });
    const s = await asUser.query(api.interview.get, { sessionId: id });
    expect(s?.transcript.length).toBe(1);
    expect(s?.skipped).toContain("s1q1");
  });
});
