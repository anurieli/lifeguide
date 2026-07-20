import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { LAUNCH_ENTRIES } from "../../convex/whatsNew";

// ARI-107: the What's New feed was invisible in production because no entries were
// ever published. `seedLaunchEntries` publishes the hand-written launch entries so
// the pill appears. These lock its two guarantees: it actually publishes (and the
// feed then shows them), and it is idempotent (safe to re-run).

const OWNER_EMAIL = "anurieli365@gmail.com";

describe("whatsNew.seedLaunchEntries (ARI-107)", () => {
  it("publishes the launch entries; the feed then shows them to a fresh user", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));

    const res = await t.mutation(internal.whatsNew.seedLaunchEntries, {});
    expect(res.inserted).toBe(LAUNCH_ENTRIES.length);
    expect(res.skipped).toBe(0);

    // A different (non-owner) user sees every published entry, none seen yet.
    const readerId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const feed = await t.withIdentity({ subject: readerId }).query(api.whatsNew.feed, {});
    expect(feed).toHaveLength(LAUNCH_ENTRIES.length);
    // Newest-first ordering: the last-seeded entry leads.
    expect(feed[0].title).toBe(LAUNCH_ENTRIES[LAUNCH_ENTRIES.length - 1].title);
  });

  it("is idempotent — re-running inserts nothing and never duplicates", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));

    await t.mutation(internal.whatsNew.seedLaunchEntries, {});
    const again = await t.mutation(internal.whatsNew.seedLaunchEntries, {});
    expect(again.inserted).toBe(0);
    expect(again.skipped).toBe(LAUNCH_ENTRIES.length);

    const all = await t.run(async (ctx) => ctx.db.query("whatsNew").collect());
    expect(all).toHaveLength(LAUNCH_ENTRIES.length);
  });

  it("refuses to seed when the owner account does not exist yet", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(internal.whatsNew.seedLaunchEntries, {})).rejects.toThrow(/owner/i);
  });
});
