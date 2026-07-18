import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { THOUGHT_MAP_MEMO_CAP } from "../../lib/thoughtMap";

// Settings round-trip for the thought map's steering memo (ARI-18 teachable
// map), same convex-test identity pattern as tests/convex/levels-settings.test.ts.
describe("settings.thoughtMapMemo", () => {
  it("is unset by default", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });
    await asUser.mutation(api.settings.completeOnboarding, {});
    const s = await asUser.query(api.settings.get, {});
    expect(s?.thoughtMapMemo).toBeUndefined();
  });

  it("saves and reads back a memo", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });
    await asUser.mutation(api.settings.update, {
      thoughtMapMemo: "Keep it to 5 nodes or fewer.",
    });
    const s = await asUser.query(api.settings.get, {});
    expect(s?.thoughtMapMemo).toBe("Keep it to 5 nodes or fewer.");
  });

  it("trims whitespace and caps length server-side", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });
    const oversized = "  " + "z".repeat(THOUGHT_MAP_MEMO_CAP + 500) + "  ";
    await asUser.mutation(api.settings.update, { thoughtMapMemo: oversized });
    const s = await asUser.query(api.settings.get, {});
    expect(s?.thoughtMapMemo?.length).toBe(THOUGHT_MAP_MEMO_CAP);
  });

  it("saving an empty/whitespace memo clears it (unset, not an empty string)", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });
    await asUser.mutation(api.settings.update, { thoughtMapMemo: "something" });
    await asUser.mutation(api.settings.update, { thoughtMapMemo: "   " });
    const s = await asUser.query(api.settings.get, {});
    expect(s?.thoughtMapMemo).toBeUndefined();
  });

  it("other settings fields are untouched by a memo-only update", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });
    await asUser.mutation(api.settings.update, { coachTone: "direct" });
    await asUser.mutation(api.settings.update, { thoughtMapMemo: "guidance" });
    const s = await asUser.query(api.settings.get, {});
    expect(s?.coachTone).toBe("direct");
    expect(s?.thoughtMapMemo).toBe("guidance");
  });

  it("getMemoInternal reads the saved memo server-side (ai/thoughtMap.ts's read path)", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });
    await asUser.mutation(api.settings.update, { thoughtMapMemo: "the underlying want is the root" });
    const memo = await t.query(internal.settings.getMemoInternal, { userId });
    expect(memo).toBe("the underlying want is the root");
  });

  it("getMemoInternal is null for a user with no settings row yet (undefined return -> null over the query boundary)", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const memo = await t.query(internal.settings.getMemoInternal, { userId });
    expect(memo).toBeNull();
  });
});
