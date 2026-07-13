import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Auth test-identity pattern: insert a real users row, use its _id as the subject.
async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

const DAY = "2026-07-12";
const NEXT_DAY = "2026-07-13";

async function checkAll(
  asUser: Awaited<ReturnType<typeof setup>>["asUser"],
  ritual: "morning" | "night",
  day = DAY,
) {
  const items = await asUser.query(api.rituals.list, {});
  for (const item of items.filter((i) => i.ritual === ritual)) {
    await asUser.mutation(api.rituals.setChecked, { ritual, day, itemId: item._id, checked: true });
  }
}

describe("rituals: items", () => {
  it("seedDefaults seeds both rituals once, ordered and typed, and is idempotent", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    await asUser.mutation(api.rituals.seedDefaults, {});
    const items = await asUser.query(api.rituals.list, {});
    const morning = items.filter((i) => i.ritual === "morning");
    const night = items.filter((i) => i.ritual === "night");
    expect(morning).toHaveLength(4);
    expect(night).toHaveLength(2);
    expect(morning.map((i) => i.order)).toEqual([0, 1, 2, 3]);
    // The morning opens with the Blueprint read; the sequence carries roadmap + question.
    expect(morning[0].kind).toBe("read");
    expect(morning[0].source).toBe("blueprint");
    expect(morning.map((i) => i.kind)).toEqual(["read", "do", "roadmap", "question"]);
    // The evening question carries no fixed prompt: it draws from the rotating bank.
    expect(night.map((i) => i.kind)).toEqual(["question", "roadmap"]);
    expect(night[0].content).toBeUndefined();
  });

  it("never re-seeds after the user deletes everything", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    const items = await asUser.query(api.rituals.list, {});
    for (const item of items) await asUser.mutation(api.rituals.removeItem, { itemId: item._id });
    await asUser.mutation(api.rituals.seedDefaults, {});
    expect(await asUser.query(api.rituals.list, {})).toHaveLength(0);
  });

  it("addItem appends to the end of its own ritual", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    await asUser.mutation(api.rituals.addItem, {
      ritual: "night",
      kind: "do",
      title: "Phone out of the bedroom",
    });
    const night = (await asUser.query(api.rituals.list, {})).filter((i) => i.ritual === "night");
    expect(night.map((i) => i.title)).toContain("Phone out of the bedroom");
    expect(Math.max(...night.map((i) => i.order))).toBe(2);
  });

  it("updateItem edits title and mantra content", async () => {
    const { asUser } = await setup();
    const itemId = await asUser.mutation(api.rituals.addItem, {
      ritual: "morning",
      kind: "read",
      title: "Read the mantra",
      content: "old words",
    });
    await asUser.mutation(api.rituals.updateItem, {
      itemId,
      title: "My creed",
      content: "new words",
    });
    const item = (await asUser.query(api.rituals.list, {})).find((i) => i._id === itemId)!;
    expect(item.title).toBe("My creed");
    expect(item.content).toBe("new words");
  });

  it("moveItem swaps an item with its neighbor and clamps at the edges", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    const before = (await asUser.query(api.rituals.list, {}))
      .filter((i) => i.ritual === "morning")
      .sort((a, b) => a.order - b.order);
    await asUser.mutation(api.rituals.moveItem, { itemId: before[2]._id, direction: "up" });
    await asUser.mutation(api.rituals.moveItem, { itemId: before[0]._id, direction: "up" }); // no-op at top
    const after = (await asUser.query(api.rituals.list, {}))
      .filter((i) => i.ritual === "morning")
      .sort((a, b) => a.order - b.order);
    expect(after.map((i) => i._id)).toEqual([
      before[0]._id,
      before[2]._id,
      before[1]._id,
      before[3]._id,
    ]);
  });

  it("rejects touching another user's items", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    const itemId = await asUser.mutation(api.rituals.addItem, {
      ritual: "morning",
      kind: "do",
      title: "mine",
    });
    await expect(
      asOther.mutation(api.rituals.updateItem, { itemId, title: "stolen" }),
    ).rejects.toThrow();
    await expect(asOther.mutation(api.rituals.removeItem, { itemId })).rejects.toThrow();
    await expect(
      asOther.mutation(api.rituals.setChecked, {
        ritual: "morning",
        day: DAY,
        itemId,
        checked: true,
      }),
    ).rejects.toThrow();
  });
});

describe("rituals: check state and completion", () => {
  it("setChecked creates the day row, and unchecking removes the id", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    const item = (await asUser.query(api.rituals.list, {})).find((i) => i.ritual === "morning")!;
    await asUser.mutation(api.rituals.setChecked, {
      ritual: "morning",
      day: DAY,
      itemId: item._id,
      checked: true,
    });
    let row = await asUser.query(api.rituals.day, { ritual: "morning", day: DAY });
    expect(row!.checkedIds).toEqual([item._id]);
    await asUser.mutation(api.rituals.setChecked, {
      ritual: "morning",
      day: DAY,
      itemId: item._id,
      checked: false,
    });
    row = await asUser.query(api.rituals.day, { ritual: "morning", day: DAY });
    expect(row!.checkedIds).toEqual([]);
  });

  it("complete refuses an unfinished ritual", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    const item = (await asUser.query(api.rituals.list, {})).find((i) => i.ritual === "morning")!;
    await asUser.mutation(api.rituals.setChecked, {
      ritual: "morning",
      day: DAY,
      itemId: item._id,
      checked: true,
    });
    await expect(
      asUser.mutation(api.rituals.complete, { ritual: "morning", day: DAY }),
    ).rejects.toThrow("Ritual not finished");
  });

  it("complete stamps completedAt once all items are checked, publishes to the Bus, and is idempotent", async () => {
    const { t, asUser, userId } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    await checkAll(asUser, "morning");
    const first = await asUser.mutation(api.rituals.complete, { ritual: "morning", day: DAY });
    const again = await asUser.mutation(api.rituals.complete, { ritual: "morning", day: DAY });
    expect(first).toBeTypeOf("number");
    expect(again).toBe(first);
    const row = await asUser.query(api.rituals.day, { ritual: "morning", day: DAY });
    expect(row!.completedAt).toBe(first);
    const events = await t.run(async (ctx) =>
      ctx.db
        .query("interactions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    );
    const published = events.filter((e) => e.type === "ritual_completed");
    expect(published).toHaveLength(1);
    expect(JSON.parse(published[0].payload)).toEqual({ ritual: "morning", day: DAY });
  });

  it("checks are read-only once the day is sealed", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    await checkAll(asUser, "morning");
    await asUser.mutation(api.rituals.complete, { ritual: "morning", day: DAY });
    const item = (await asUser.query(api.rituals.list, {})).find((i) => i.ritual === "morning")!;
    await asUser.mutation(api.rituals.setChecked, {
      ritual: "morning",
      day: DAY,
      itemId: item._id,
      checked: false,
    });
    const row = await asUser.query(api.rituals.day, { ritual: "morning", day: DAY });
    expect(row!.checkedIds).toContain(item._id);
  });

  it("each day starts fresh while completed days persist as history (daily reset)", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    await checkAll(asUser, "night");
    await asUser.mutation(api.rituals.complete, { ritual: "night", day: DAY });
    const next = await asUser.query(api.rituals.day, { ritual: "night", day: NEXT_DAY });
    expect(next).toBeNull(); // nothing checked yet on the new day
    const history = await asUser.query(api.rituals.day, { ritual: "night", day: DAY });
    expect(history!.completedAt).toBeTypeOf("number");
  });

  it("morning and night are independent per day", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    await checkAll(asUser, "morning");
    await asUser.mutation(api.rituals.complete, { ritual: "morning", day: DAY });
    const night = await asUser.query(api.rituals.day, { ritual: "night", day: DAY });
    expect(night).toBeNull();
  });

  it("an item added after some checks keeps the ritual incomplete until it too is checked", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    await checkAll(asUser, "night");
    const lateId = await asUser.mutation(api.rituals.addItem, {
      ritual: "night",
      kind: "do",
      title: "Stretch",
    });
    await expect(
      asUser.mutation(api.rituals.complete, { ritual: "night", day: DAY }),
    ).rejects.toThrow("Ritual not finished");
    await asUser.mutation(api.rituals.setChecked, {
      ritual: "night",
      day: DAY,
      itemId: lateId,
      checked: true,
    });
    await asUser.mutation(api.rituals.complete, { ritual: "night", day: DAY });
  });

  it("completion counts every typed component — question and roadmap included", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    // Check everything in the morning EXCEPT the roadmap component.
    const morning = (await asUser.query(api.rituals.list, {})).filter(
      (i) => i.ritual === "morning",
    );
    for (const item of morning.filter((i) => i.kind !== "roadmap")) {
      await asUser.mutation(api.rituals.setChecked, {
        ritual: "morning",
        day: DAY,
        itemId: item._id,
        checked: true,
      });
    }
    await expect(
      asUser.mutation(api.rituals.complete, { ritual: "morning", day: DAY }),
    ).rejects.toThrow("Ritual not finished");
    const roadmap = morning.find((i) => i.kind === "roadmap")!;
    await asUser.mutation(api.rituals.setChecked, {
      ritual: "morning",
      day: DAY,
      itemId: roadmap._id,
      checked: true,
    });
    await asUser.mutation(api.rituals.complete, { ritual: "morning", day: DAY });
  });

  it("rejects malformed day keys", async () => {
    const { asUser } = await setup();
    const itemId = await asUser.mutation(api.rituals.addItem, {
      ritual: "morning",
      kind: "do",
      title: "x",
    });
    await expect(
      asUser.mutation(api.rituals.setChecked, {
        ritual: "morning",
        day: "yesterday-ish",
        itemId,
        checked: true,
      }),
    ).rejects.toThrow("Bad day key");
  });
});

// A legacy v1 account: seeded before typed components existed (do/read only,
// ritualsSeededAt set, no ritualsSeedVersion).
async function legacyV1Account() {
  const { t, asUser, userId } = await setup();
  await t.run(async (ctx) => {
    const now = 1;
    const rows = [
      { ritual: "morning", kind: "read", title: "Read the mantra", content: "old words", order: 0 },
      { ritual: "morning", kind: "do", title: "Drink a glass of water", order: 1 },
      { ritual: "night", kind: "do", title: "Check out: wins and lessons", order: 0 },
    ] as const;
    for (const r of rows) {
      await ctx.db.insert("ritualItems", { userId, ...r, createdAt: now, updatedAt: now });
    }
    await ctx.db.insert("settings", {
      userId,
      morningCheckin: true,
      eveningCheckin: true,
      dailyExercise: "intention",
      coachTone: "balanced",
      reachingOut: "earned",
      ritualsSeededAt: now,
      updatedAt: now,
    });
  });
  return { t, asUser, userId };
}

describe("rituals: the v2 typed-component upgrade", () => {
  it("appends the missing question/roadmap components without touching existing items", async () => {
    const { asUser } = await legacyV1Account();
    await asUser.mutation(api.rituals.upgradeToSeedVersion, {});
    const items = await asUser.query(api.rituals.list, {});
    const morning = items.filter((i) => i.ritual === "morning").sort((a, b) => a.order - b.order);
    const night = items.filter((i) => i.ritual === "night").sort((a, b) => a.order - b.order);
    // Existing items untouched, new kinds appended after them.
    expect(morning.map((i) => i.kind)).toEqual(["read", "do", "roadmap", "question"]);
    expect(morning[0].content).toBe("old words");
    expect(night.map((i) => i.kind)).toEqual(["do", "question", "roadmap"]);
  });

  it("is one-shot: deleting the added components sticks across re-runs", async () => {
    const { asUser } = await legacyV1Account();
    await asUser.mutation(api.rituals.upgradeToSeedVersion, {});
    const added = (await asUser.query(api.rituals.list, {})).filter(
      (i) => i.kind === "question" || i.kind === "roadmap",
    );
    for (const item of added) await asUser.mutation(api.rituals.removeItem, { itemId: item._id });
    await asUser.mutation(api.rituals.upgradeToSeedVersion, {});
    const after = await asUser.query(api.rituals.list, {});
    expect(after.filter((i) => i.kind === "question" || i.kind === "roadmap")).toHaveLength(0);
  });

  it("leaves an emptied ritual empty (delete-all is honored)", async () => {
    const { asUser } = await legacyV1Account();
    const night = (await asUser.query(api.rituals.list, {})).filter((i) => i.ritual === "night");
    for (const item of night) await asUser.mutation(api.rituals.removeItem, { itemId: item._id });
    await asUser.mutation(api.rituals.upgradeToSeedVersion, {});
    const after = await asUser.query(api.rituals.list, {});
    expect(after.filter((i) => i.ritual === "night")).toHaveLength(0);
    // ...while the still-populated morning got its components.
    expect(after.filter((i) => i.ritual === "morning").map((i) => i.kind).sort()).toEqual(
      ["do", "question", "read", "roadmap"],
    );
  });

  it("no-ops on a fresh v2 seed (no duplicate components)", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    await asUser.mutation(api.rituals.upgradeToSeedVersion, {});
    const items = await asUser.query(api.rituals.list, {});
    expect(items.filter((i) => i.kind === "roadmap")).toHaveLength(2); // one per ritual
    expect(items.filter((i) => i.kind === "question")).toHaveLength(2);
  });
});

describe("rituals: adopting the Blueprint read", () => {
  it("creates the Blueprint document and prepends a blueprint-sourced read to the morning", async () => {
    const { asUser } = await legacyV1Account();
    await asUser.mutation(api.rituals.adoptBlueprintRead, {});
    const doc = await asUser.query(api.blueprintDoc.get, {});
    expect(doc).not.toBeNull();
    expect(doc!.content).toContain("The Body");
    const morning = (await asUser.query(api.rituals.list, {}))
      .filter((i) => i.ritual === "morning")
      .sort((a, b) => a.order - b.order);
    expect(morning[0].kind).toBe("read");
    expect(morning[0].source).toBe("blueprint");
  });

  it("is idempotent, and re-adoption never clobbers an edited document", async () => {
    const { asUser } = await legacyV1Account();
    await asUser.mutation(api.rituals.adoptBlueprintRead, {});
    await asUser.mutation(api.blueprintDoc.update, { content: "my own doctrine" });
    await asUser.mutation(api.rituals.adoptBlueprintRead, {});
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const doc = await asUser.query(api.blueprintDoc.get, {});
    expect(doc!.content).toBe("my own doctrine");
    const reads = (await asUser.query(api.rituals.list, {})).filter(
      (i) => i.kind === "read" && i.source === "blueprint",
    );
    expect(reads).toHaveLength(1);
  });
});

describe("rituals: time-indifferent practices (the rituals rail)", () => {
  it("an 'any' practice checks against its own day row and blocks no seal", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.seedDefaults, {});
    const anyId = await asUser.mutation(api.rituals.addItem, {
      ritual: "any",
      kind: "do",
      title: "10 minute walk",
    });
    await asUser.mutation(api.rituals.setChecked, {
      ritual: "any",
      day: DAY,
      itemId: anyId,
      checked: true,
    });
    const row = await asUser.query(api.rituals.day, { ritual: "any", day: DAY });
    expect(row!.checkedIds).toEqual([anyId]);
    // Sealing the morning ignores the unchecked-tomorrow / any-practice entirely.
    await checkAll(asUser, "morning");
    await asUser.mutation(api.rituals.setChecked, {
      ritual: "any",
      day: DAY,
      itemId: anyId,
      checked: false,
    });
    await asUser.mutation(api.rituals.complete, { ritual: "morning", day: DAY });
  });

  it("only plain 'do' practices can be time-indifferent", async () => {
    const { asUser } = await setup();
    await expect(
      asUser.mutation(api.rituals.addItem, { ritual: "any", kind: "question", title: "nope" }),
    ).rejects.toThrow("time-indifferent");
  });

  it("deleting a practice removes it from the profile (every day), not just today", async () => {
    const { asUser } = await setup();
    const anyId = await asUser.mutation(api.rituals.addItem, {
      ritual: "any",
      kind: "do",
      title: "gone",
    });
    await asUser.mutation(api.rituals.setChecked, {
      ritual: "any",
      day: DAY,
      itemId: anyId,
      checked: true,
    });
    await asUser.mutation(api.rituals.removeItem, { itemId: anyId });
    const items = await asUser.query(api.rituals.list, {});
    expect(items.find((i) => i._id === anyId)).toBeUndefined();
    // Stale id in the day row is ignored by completion logic (long-standing rule).
  });
});
