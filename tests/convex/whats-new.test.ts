import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Auth test-identity pattern: insert a real users row, use its _id as the subject.

// convex-test resolves its own internal `import.meta.glob` relative to its OWN
// installed location, which — in this sandbox's symlinked node_modules — points at
// a different checkout of this repo than the one this test file lives in. Passing
// `modules` explicitly (computed relative to THIS file) makes brand-new convex/*.ts
// modules (like whatsNew.ts) resolvable without waiting on that checkout to catch up.
// (tsconfig has no vite/client types — this repo isn't Vite-built — hence the cast)
const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob(
  "../../convex/**/*.*s",
);

const OWNER_EMAIL = "anurieli365@gmail.com"; // keep in sync with convex/owner.ts

const ENTRY = { title: "Thought Maps", body: "Sessions now sketch a map after you talk.", view: "sessions" as const };

describe("whatsNew — authoring (owner-gated)", () => {
  it("owner can create, listAll returns it newest-first", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const asOwner = t.withIdentity({ subject: owner });

    const id = await asOwner.mutation(api.whatsNew.create, ENTRY);
    const all = await asOwner.query(api.whatsNew.listAll, {});
    expect(all.length).toBe(1);
    expect(all[0]._id).toBe(id);
    expect(all[0].title).toBe(ENTRY.title);
    expect(all[0].createdBy).toBe(owner);

    await asOwner.mutation(api.whatsNew.create, { ...ENTRY, title: "Second" });
    const two = await asOwner.query(api.whatsNew.listAll, {});
    expect(two.map((e) => e.title)).toEqual(["Second", "Thought Maps"]);
  });

  it("non-owner cannot create, update, or delete; listAll is empty for them", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", { email: "alice@example.com" }));
    const asOwner = t.withIdentity({ subject: owner });
    const asAlice = t.withIdentity({ subject: alice });

    const id = await asOwner.mutation(api.whatsNew.create, ENTRY);

    await expect(asAlice.mutation(api.whatsNew.create, ENTRY)).rejects.toThrow();
    await expect(asAlice.mutation(api.whatsNew.update, { id, title: "Hijacked" })).rejects.toThrow();
    await expect(asAlice.mutation(api.whatsNew.remove, { id })).rejects.toThrow();

    expect(await asAlice.query(api.whatsNew.listAll, {})).toEqual([]);
  });

  it("owner can update and delete an entry", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const asOwner = t.withIdentity({ subject: owner });

    const id = await asOwner.mutation(api.whatsNew.create, ENTRY);
    await asOwner.mutation(api.whatsNew.update, { id, title: "Renamed", view: "goals" });
    let all = await asOwner.query(api.whatsNew.listAll, {});
    expect(all[0].title).toBe("Renamed");
    expect(all[0].view).toBe("goals");

    await asOwner.mutation(api.whatsNew.remove, { id });
    all = await asOwner.query(api.whatsNew.listAll, {});
    expect(all.length).toBe(0);
  });
});

describe("whatsNew — feed + click-through (markSeen)", () => {
  it("feed returns published entries a user hasn't clicked through yet", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOwner = t.withIdentity({ subject: owner });
    const asAlice = t.withIdentity({ subject: alice });

    await asOwner.mutation(api.whatsNew.create, ENTRY);
    await asOwner.mutation(api.whatsNew.create, { ...ENTRY, title: "Goals sync" });

    const feed = await asAlice.query(api.whatsNew.feed, {});
    expect(feed.length).toBe(2);
    expect(feed.map((e) => e.title)).toEqual(["Goals sync", "Thought Maps"]);
  });

  it("markSeen removes that specific entry from the caller's feed only", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const bob = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOwner = t.withIdentity({ subject: owner });
    const asAlice = t.withIdentity({ subject: alice });
    const asBob = t.withIdentity({ subject: bob });

    const id1 = await asOwner.mutation(api.whatsNew.create, ENTRY);
    await asOwner.mutation(api.whatsNew.create, { ...ENTRY, title: "Goals sync" });

    await asAlice.mutation(api.whatsNew.markSeen, { id: id1 });

    const aliceFeed = await asAlice.query(api.whatsNew.feed, {});
    expect(aliceFeed.map((e) => e.title)).toEqual(["Goals sync"]);

    // Bob never clicked anything — still sees both. Per-user, not global.
    const bobFeed = await asBob.query(api.whatsNew.feed, {});
    expect(bobFeed.length).toBe(2);
  });

  it("markSeen is idempotent — clicking the same entry twice doesn't error or duplicate", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOwner = t.withIdentity({ subject: owner });
    const asAlice = t.withIdentity({ subject: alice });

    const id = await asOwner.mutation(api.whatsNew.create, ENTRY);
    await asAlice.mutation(api.whatsNew.markSeen, { id });
    await asAlice.mutation(api.whatsNew.markSeen, { id });

    const rows = await t.run(async (ctx) => ctx.db.query("whatsNewSeen").collect());
    expect(rows.length).toBe(1);
  });

  it("unauthenticated feed is empty; markSeen throws", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const id = await t.withIdentity({ subject: owner }).mutation(api.whatsNew.create, ENTRY);

    expect(await t.query(api.whatsNew.feed, {})).toEqual([]);
    await expect(t.mutation(api.whatsNew.markSeen, { id })).rejects.toThrow();
  });
});

describe("whatsNew: history (See All)", () => {
  it("returns every published entry newest-first, each tagged with the caller's seen flag", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOwner = t.withIdentity({ subject: owner });
    const asAlice = t.withIdentity({ subject: alice });

    const id1 = await asOwner.mutation(api.whatsNew.create, ENTRY);
    await asOwner.mutation(api.whatsNew.create, { ...ENTRY, title: "Goals sync" });

    // Nothing seen yet: full history, newest first, all unseen.
    let hist = await asAlice.query(api.whatsNew.history, {});
    expect(hist.map((e) => e.title)).toEqual(["Goals sync", "Thought Maps"]);
    expect(hist.every((e) => e.seen === false)).toBe(true);

    // Clicking one flips only that entry's flag; it STAYS in history (unlike feed).
    await asAlice.mutation(api.whatsNew.markSeen, { id: id1 });
    hist = await asAlice.query(api.whatsNew.history, {});
    expect(hist.map((e) => e.title)).toEqual(["Goals sync", "Thought Maps"]);
    expect(hist.find((e) => e._id === id1)!.seen).toBe(true);
    expect(hist.find((e) => e.title === "Goals sync")!.seen).toBe(false);
  });

  it("seen flags are per-user: one person's click-through never marks another's history", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const bob = await t.run(async (ctx) => ctx.db.insert("users", {}));

    const id = await t.withIdentity({ subject: owner }).mutation(api.whatsNew.create, ENTRY);
    await t.withIdentity({ subject: alice }).mutation(api.whatsNew.markSeen, { id });

    const bobHist = await t.withIdentity({ subject: bob }).query(api.whatsNew.history, {});
    expect(bobHist).toHaveLength(1);
    expect(bobHist[0].seen).toBe(false);
  });

  it("unauthenticated history is empty", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    await t.withIdentity({ subject: owner }).mutation(api.whatsNew.create, ENTRY);
    expect(await t.query(api.whatsNew.history, {})).toEqual([]);
  });
});

describe("whatsNew: clearAll", () => {
  it("marks every currently published entry seen for the caller; the feed then empties", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOwner = t.withIdentity({ subject: owner });
    const asAlice = t.withIdentity({ subject: alice });

    await asOwner.mutation(api.whatsNew.create, ENTRY);
    await asOwner.mutation(api.whatsNew.create, { ...ENTRY, title: "Goals sync" });

    const res = await asAlice.mutation(api.whatsNew.clearAll, {});
    expect(res.marked).toBe(2);
    expect(await asAlice.query(api.whatsNew.feed, {})).toEqual([]);
    const hist = await asAlice.query(api.whatsNew.history, {});
    expect(hist.every((e) => e.seen === true)).toBe(true);
  });

  it("is per-user: clearing one person's feed leaves everyone else's untouched", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const bob = await t.run(async (ctx) => ctx.db.insert("users", {}));

    await t.withIdentity({ subject: owner }).mutation(api.whatsNew.create, ENTRY);
    await t.withIdentity({ subject: alice }).mutation(api.whatsNew.clearAll, {});

    expect(await t.withIdentity({ subject: bob }).query(api.whatsNew.feed, {})).toHaveLength(1);
  });

  it("is idempotent and never duplicates rows, even mixed with markSeen", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOwner = t.withIdentity({ subject: owner });
    const asAlice = t.withIdentity({ subject: alice });

    const id1 = await asOwner.mutation(api.whatsNew.create, ENTRY);
    await asOwner.mutation(api.whatsNew.create, { ...ENTRY, title: "Goals sync" });

    // One already clicked through: clearAll must only fill the gap, not re-insert it.
    await asAlice.mutation(api.whatsNew.markSeen, { id: id1 });
    const first = await asAlice.mutation(api.whatsNew.clearAll, {});
    expect(first.marked).toBe(1);

    // Re-running writes nothing more.
    const second = await asAlice.mutation(api.whatsNew.clearAll, {});
    expect(second.marked).toBe(0);

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("whatsNewSeen")
        .withIndex("by_user", (q) => q.eq("userId", alice))
        .collect(),
    );
    expect(rows.length).toBe(2); // exactly one per entry, no duplicates
  });

  it("unauthenticated clearAll throws", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    await t.withIdentity({ subject: owner }).mutation(api.whatsNew.create, ENTRY);
    await expect(t.mutation(api.whatsNew.clearAll, {})).rejects.toThrow();
  });
});

describe("whatsNew: optional componentTarget", () => {
  const TARGETED = { ...ENTRY, title: "Talk to Coach", componentTarget: "coach" as const };

  it("create stores a componentTarget; feed and history carry it", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOwner = t.withIdentity({ subject: owner });
    const asAlice = t.withIdentity({ subject: alice });

    await asOwner.mutation(api.whatsNew.create, TARGETED);
    const feed = await asAlice.query(api.whatsNew.feed, {});
    expect(feed[0].componentTarget).toBe("coach");
    const hist = await asAlice.query(api.whatsNew.history, {});
    expect(hist[0].componentTarget).toBe("coach");
  });

  it("create without a target leaves it undefined (page-level entry)", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const asOwner = t.withIdentity({ subject: owner });

    await asOwner.mutation(api.whatsNew.create, ENTRY);
    const all = await asOwner.query(api.whatsNew.listAll, {});
    expect(all[0].componentTarget).toBeUndefined();
  });

  it("update sets, then null clears, the componentTarget; omitting it leaves it unchanged", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const asOwner = t.withIdentity({ subject: owner });

    const id = await asOwner.mutation(api.whatsNew.create, ENTRY);

    // Set it.
    await asOwner.mutation(api.whatsNew.update, { id, componentTarget: "settings-restart" });
    let all = await asOwner.query(api.whatsNew.listAll, {});
    expect(all[0].componentTarget).toBe("settings-restart");

    // Editing only the title must not disturb the target.
    await asOwner.mutation(api.whatsNew.update, { id, title: "Renamed" });
    all = await asOwner.query(api.whatsNew.listAll, {});
    expect(all[0].title).toBe("Renamed");
    expect(all[0].componentTarget).toBe("settings-restart");

    // null clears it back to page-level.
    await asOwner.mutation(api.whatsNew.update, { id, componentTarget: null });
    all = await asOwner.query(api.whatsNew.listAll, {});
    expect(all[0].componentTarget).toBeUndefined();
  });

  it("owner gating still holds for targeted entries", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const alice = await t.run(async (ctx) => ctx.db.insert("users", { email: "alice@example.com" }));

    await expect(
      t.withIdentity({ subject: alice }).mutation(api.whatsNew.create, TARGETED),
    ).rejects.toThrow();
  });

  it("rejects a componentTarget outside the closed registry set", async () => {
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => ctx.db.insert("users", { email: OWNER_EMAIL }));
    const asOwner = t.withIdentity({ subject: owner });

    await expect(
      // "core" was removed from the registry (a full-page anchor); the validator rejects it.
      asOwner.mutation(api.whatsNew.create, {
        ...ENTRY,
        componentTarget: "core" as unknown as "coach",
      }),
    ).rejects.toThrow();
  });
});
