import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

describe("qr join token", () => {
  it("issues a token the phone can redeem for the session", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });
    const id = await asUser.mutation(api.interview.start, { experienceId: "voice-interview", device: "desktop" });
    const { token } = await asUser.mutation(api.interview.issueJoinToken, { sessionId: id });
    // Unauthenticated phone redeems by token:
    const joined = await t.query(api.interview.joinWithToken, { sessionId: id, token });
    expect(joined?.experienceId).toBe("voice-interview");
  });
  it("returns null for a bad token", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });
    const id = await asUser.mutation(api.interview.start, { experienceId: "voice-interview", device: "desktop" });
    await asUser.mutation(api.interview.issueJoinToken, { sessionId: id });
    expect(await t.query(api.interview.joinWithToken, { sessionId: id, token: "wrong" })).toBeNull();
  });
});
