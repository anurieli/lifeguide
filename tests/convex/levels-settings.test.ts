import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { ALL_KEYS } from "../../lib/levels";

describe("recompute level", () => {
  it("flips to level 1 when all 18 core answers are filled", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.settings.completeOnboarding, {}); // ensures a settings row + onboardedAt
    for (const k of ALL_KEYS) await asUser.mutation(api.core.save, { questionKey: k, content: "x" });
    await asUser.mutation(api.settings.recompute, {});

    const s = await asUser.query(api.settings.get, {});
    expect(s?.blueprintStatus).toBe("complete");
    expect(s?.level).toBe(1);
  });
});
