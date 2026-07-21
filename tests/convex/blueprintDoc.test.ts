import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { SEED_VERSION } from "../../convex/blueprintDoc";

// Auth test-identity pattern: insert a real users row, use its _id as the subject.
async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

// The v1 free-text seed, verbatim — mirrors the private LEGACY_SEED_V1 constant in
// convex/blueprintDoc.ts. Kept here (not imported — it's intentionally private) so
// the "untouched legacy seed" upgrade path can be exercised.
const LEGACY_SEED_V1 = `Discipline over motivation. Environment over willpower. Creation over consumption. Depth over scatter. Presence over performance. Self-trust through kept promises. Small actions compounding. Deliberate inputs.

## 1 · The Body

Train for strength and capacity most days. Walk daily. Whole foods, protein first, stop at 80 percent full. Sleep 7 to 9 hours. Schedule recovery before burnout forces it. Cut alcohol.

*Payoff: energy, stress tolerance, confidence — the engine that funds every other pillar.*

## 2 · The Inner Game

Get clear on the why behind the goals. Work on yourself before chasing a partner. Treat mistakes as golden repair. Start before ready. Break comfort on purpose. Borrow belief from someone who already did it.

*Payoff: discipline stops feeling like force and starts feeling like direction.*

## 3 · Systems and Discipline

One small win a day. Consistency over motivation. Keep promises to yourself. Protect mornings. Automate repeat decisions — meals, workout times, wardrobe. Shape the environment. Split the day into selfless hours and selfish hours. Say no to the unaligned.

*Payoff: willpower spent only where it matters; the day stops being reactive.*

## 4 · Focus and Creation

A pre-work focus ritual. Depth on few things over scatter on many. Create more than you consume. One day a week off social media.

*Payoff: consumption drains hunger; creation feeds it.*

## 5 · Direction

One huge goal that scares you, broken down to today. Plan tomorrow before bed. Weekly audit — what gets reviewed gets improved. Journal wins and lessons. Track progress, not perfection. Never compare timelines. Become the person your younger self would look up to.

*Payoff: drift only survives when nobody is looking at it.*

## 6 · Money and Craft

Invest now — the habit, not the amount. Track every dollar. Invest in yourself before consuming. Learn one skill that makes money. Start the thing, post before ready, build the craft.

*Payoff: freedom, options, time back later in life.*

## 7 · People

You are the average of the five around you — get proximity to people ahead of you. Cut energy drains. Real time with family; calls over texts. Be a good human; feedback over criticism.

*Payoff: ceilings and energy are contagious in both directions.*

## 8 · Presence

Slow, steady movement; open posture. Eye contact, full listening, speak slower. Phone away with people. No oversharing, no gossip, no dominating the room. Respond, don't react. Simple grooming, fewer better clothes. No validation seeking, no performed confidence.

*Payoff: calm reads as confidence without a word said.*`;

describe("blueprintDoc: adopting the structured seed", () => {
  it("adopt() creates a fresh doc with the full 8-pillar structured seed", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const doc = await asUser.query(api.blueprintDoc.get, {});
    expect(doc).not.toBeNull();
    expect(doc!.seedVersion).toBe(SEED_VERSION);
    expect(doc!.header?.title).toBe("The Blueprint for Living");
    expect(doc!.pillars).toHaveLength(8);
    expect(doc!.pillars!.map((p) => p.name)).toEqual([
      "The Body",
      "The Inner Game",
      "Systems & Discipline",
      "Focus & Creation",
      "Direction",
      "Money & Craft",
      "People",
      "Presence",
    ]);
    // Every pillar has at least one item, and every item carries both fields.
    for (const p of doc!.pillars!) {
      expect(p.items.length).toBeGreaterThan(0);
      for (const it of p.items) {
        expect(it.practice.length).toBeGreaterThan(0);
        expect(it.why.length).toBeGreaterThan(0);
      }
    }
    // The derived markdown carries the pillar content — the read path's contract.
    expect(doc!.content).toContain("The Body");
    expect(doc!.content).toContain(doc!.pillars![0].items[0].practice);
  });

  it("is idempotent: repeated adopt never duplicates or resets the doc", async () => {
    const { asUser } = await setup();
    const id1 = await asUser.mutation(api.blueprintDoc.adopt, {});
    const id2 = await asUser.mutation(api.blueprintDoc.adopt, {});
    expect(id1).toBe(id2);
  });

  it("upgrades an untouched legacy free-text doc in place to the structured seed", async () => {
    const { t, asUser, userId } = await setup();
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("blueprint", {
        userId,
        title: "The Blueprint for Life",
        content: LEGACY_SEED_V1,
        seedVersion: 1,
        createdAt: now,
        updatedAt: now,
      });
    });
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const doc = await asUser.query(api.blueprintDoc.get, {});
    expect(doc!.seedVersion).toBe(SEED_VERSION);
    expect(doc!.pillars).toHaveLength(8);
    expect(doc!.header?.title).toBe("The Blueprint for Living");
  });

  it("preserves a genuinely edited legacy free-text doc, wrapping it into one pillar", async () => {
    const { t, asUser, userId } = await setup();
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("blueprint", {
        userId,
        title: "My own doctrine",
        content: "Wake up. Do the work. Tell the truth.",
        seedVersion: 1,
        createdAt: now,
        updatedAt: now,
      });
    });
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const doc = await asUser.query(api.blueprintDoc.get, {});
    // The edited words are never discarded — content is left exactly as written.
    expect(doc!.content).toBe("Wake up. Do the work. Tell the truth.");
    expect(doc!.pillars).toHaveLength(1);
    expect(doc!.pillars![0].items).toHaveLength(1);
    expect(doc!.pillars![0].items[0].practice).toBe("Wake up. Do the work. Tell the truth.");
    expect(doc!.seedVersion).toBe(SEED_VERSION);

    // And the upgrade never re-runs (already structured — pillars is set).
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const again = await asUser.query(api.blueprintDoc.get, {});
    expect(again!.pillars).toHaveLength(1);
  });
});

describe("blueprintDoc: the coach-editable surface", () => {
  it("updateHeader patches the header block and keeps top-level title in sync", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    await asUser.mutation(api.blueprintDoc.updateHeader, {
      title: "My Blueprint",
      intro: "New intro line.",
    });
    const doc = await asUser.query(api.blueprintDoc.get, {});
    expect(doc!.header!.title).toBe("My Blueprint");
    expect(doc!.title).toBe("My Blueprint");
    expect(doc!.header!.intro).toBe("New intro line.");
    expect(doc!.content).toContain("New intro line.");
  });

  it("addPillar appends a new, empty pillar with a stable id", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const pillarId = await asUser.mutation(api.blueprintDoc.addPillar, {
      name: "Craft",
      subtitle: "Make things well.",
    });
    const doc = await asUser.query(api.blueprintDoc.get, {});
    expect(doc!.pillars).toHaveLength(9);
    const added = doc!.pillars!.find((p) => p.id === pillarId)!;
    expect(added.name).toBe("Craft");
    expect(added.subtitle).toBe("Make things well.");
    expect(added.items).toEqual([]);
    expect(doc!.content).toContain("Craft");
  });

  it("removePillar removes exactly that pillar and its items, regenerating content", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const before = (await asUser.query(api.blueprintDoc.get, {}))!;
    const target = before.pillars![0];
    await asUser.mutation(api.blueprintDoc.removePillar, { pillarId: target.id });
    const after = await asUser.query(api.blueprintDoc.get, {});
    expect(after!.pillars).toHaveLength(7);
    expect(after!.pillars!.some((p) => p.id === target.id)).toBe(false);
    expect(after!.content).not.toContain(target.items[0].practice);
  });

  it("updatePillar edits name and subtitle", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const before = (await asUser.query(api.blueprintDoc.get, {}))!;
    const target = before.pillars![1];
    await asUser.mutation(api.blueprintDoc.updatePillar, {
      pillarId: target.id,
      name: "Mind",
      subtitle: "Renamed.",
    });
    const after = await asUser.query(api.blueprintDoc.get, {});
    const updated = after!.pillars!.find((p) => p.id === target.id)!;
    expect(updated.name).toBe("Mind");
    expect(updated.subtitle).toBe("Renamed.");
    expect(after!.content).toContain("Mind");
  });

  it("addItem appends a new item (practice + why) to the named pillar only", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const before = (await asUser.query(api.blueprintDoc.get, {}))!;
    const pillar = before.pillars![0];
    const otherPillar = before.pillars![1];
    const itemId = await asUser.mutation(api.blueprintDoc.addItem, {
      pillarId: pillar.id,
      practice: "Cold showers.",
      why: "Discomfort on demand.",
    });
    const after = await asUser.query(api.blueprintDoc.get, {});
    const updatedPillar = after!.pillars!.find((p) => p.id === pillar.id)!;
    const added = updatedPillar.items.find((it) => it.id === itemId)!;
    expect(added.practice).toBe("Cold showers.");
    expect(added.why).toBe("Discomfort on demand.");
    const untouchedOther = after!.pillars!.find((p) => p.id === otherPillar.id)!;
    expect(untouchedOther.items).toHaveLength(otherPillar.items.length);
    expect(after!.content).toContain("Cold showers.");
  });

  it("addItem rejects an unknown pillar", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    await expect(
      asUser.mutation(api.blueprintDoc.addItem, {
        pillarId: "does-not-exist",
        practice: "x",
        why: "y",
      }),
    ).rejects.toThrow("Pillar not found");
  });

  // Every rule carries the reason it pays off. Enforced server-side, not just in
  // the UI, because this mutation is the contract an agent appends through.
  it("addItem rejects a rule with no why, and one with no practice", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const doc = await asUser.query(api.blueprintDoc.get, {});
    const pillarId = doc!.pillars![0].id;

    await expect(
      asUser.mutation(api.blueprintDoc.addItem, {
        pillarId,
        practice: "Walk daily.",
        why: "   ",
      }),
    ).rejects.toThrow("needs its why");

    await expect(
      asUser.mutation(api.blueprintDoc.addItem, {
        pillarId,
        practice: "  ",
        why: "Because it compounds.",
      }),
    ).rejects.toThrow("needs a practice");
  });

  it("addItem trims the practice and why it stores", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const doc = await asUser.query(api.blueprintDoc.get, {});
    const pillarId = doc!.pillars![0].id;

    await asUser.mutation(api.blueprintDoc.addItem, {
      pillarId,
      practice: "  Cold showers.  ",
      why: "  It builds the habit of choosing discomfort.  ",
    });

    const after = await asUser.query(api.blueprintDoc.get, {});
    const added = after!.pillars!.find((p) => p.id === pillarId)!.items.at(-1)!;
    expect(added.practice).toBe("Cold showers.");
    expect(added.why).toBe("It builds the habit of choosing discomfort.");
  });

  it("removeItem removes exactly that item from its pillar", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const before = (await asUser.query(api.blueprintDoc.get, {}))!;
    const pillar = before.pillars![0];
    const target = pillar.items[0];
    await asUser.mutation(api.blueprintDoc.removeItem, { pillarId: pillar.id, itemId: target.id });
    const after = await asUser.query(api.blueprintDoc.get, {});
    const updatedPillar = after!.pillars!.find((p) => p.id === pillar.id)!;
    expect(updatedPillar.items.some((it) => it.id === target.id)).toBe(false);
    expect(updatedPillar.items).toHaveLength(pillar.items.length - 1);
    expect(after!.content).not.toContain(target.practice);
  });

  it("updateItem edits practice and why independently", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const before = (await asUser.query(api.blueprintDoc.get, {}))!;
    const pillar = before.pillars![0];
    const target = pillar.items[0];
    await asUser.mutation(api.blueprintDoc.updateItem, {
      pillarId: pillar.id,
      itemId: target.id,
      practice: "New practice text.",
    });
    let after = await asUser.query(api.blueprintDoc.get, {});
    let updated = after!.pillars!.find((p) => p.id === pillar.id)!.items.find((it) => it.id === target.id)!;
    expect(updated.practice).toBe("New practice text.");
    expect(updated.why).toBe(target.why); // untouched
    expect(after!.content).toContain("New practice text.");

    await asUser.mutation(api.blueprintDoc.updateItem, {
      pillarId: pillar.id,
      itemId: target.id,
      why: "New why text.",
    });
    after = await asUser.query(api.blueprintDoc.get, {});
    updated = after!.pillars!.find((p) => p.id === pillar.id)!.items.find((it) => it.id === target.id)!;
    expect(updated.practice).toBe("New practice text."); // still the earlier edit
    expect(updated.why).toBe("New why text.");
  });

  it("rejects touching another user's Blueprint", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    await asUser.mutation(api.blueprintDoc.adopt, {});
    // The other user has no doc yet — their own call auto-creates THEIR OWN doc
    // (ensureBlueprint is per-caller), so this is really testing that a
    // structured mutation never reaches across users, not a thrown error.
    await asOther.mutation(api.blueprintDoc.addPillar, { name: "Other's pillar" });
    const mine = await asUser.query(api.blueprintDoc.get, {});
    expect(mine!.pillars!.some((p) => p.name === "Other's pillar")).toBe(false);
  });
});

describe("blueprintDoc: the derived content / morning-read path", () => {
  it("content always mirrors the structured pillars after every mutation", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.blueprintDoc.adopt, {});
    const pillarId = await asUser.mutation(api.blueprintDoc.addPillar, { name: "Rest" });
    await asUser.mutation(api.blueprintDoc.addItem, {
      pillarId,
      practice: "Nap when tired.",
      why: "The body knows.",
    });
    const doc = await asUser.query(api.blueprintDoc.get, {});
    expect(doc!.content).toContain("Rest");
    expect(doc!.content).toContain("Nap when tired.");
    expect(doc!.content).toContain("The body knows.");
  });

  it("a blueprint-sourced ritual read step resolves the live, up-to-date content", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.rituals.adoptBlueprintRead, { ritual: "morning" });
    await asUser.mutation(api.blueprintDoc.updateHeader, { intro: "Read this every morning." });
    const doc = await asUser.query(api.blueprintDoc.get, {});
    const items = await asUser.query(api.rituals.list, {});
    const readStep = items.find((i) => i.kind === "read" && i.source === "blueprint")!;
    expect(readStep).toBeDefined();
    // RitualSequence.readContent() resolves source="blueprint" steps from
    // blueprintDoc.get().content — this is that same contract, tested directly.
    expect(doc!.content).toContain("Read this every morning.");
  });
});
