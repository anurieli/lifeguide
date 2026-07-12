import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// The roadmap loop's storage side (ADR 0012): entries keyed to their TARGET
// ritual day. Day-key computation is client-side (lib/ritual.ts, tested in
// tests/ritual.test.ts); here we verify the store honors the keys.

async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

const TOMORROW = "2026-07-13";

describe("roadmap entries", () => {
  it("adds in order and reads back only the target day", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.roadmap.add, { day: TOMORROW, text: "Gym at 7", note: "Push day" });
    await asUser.mutation(api.roadmap.add, { day: TOMORROW, text: "Ship the deck" });
    await asUser.mutation(api.roadmap.add, { day: "2026-07-14", text: "Different day" });
    const rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows.map((r) => r.text)).toEqual(["Gym at 7", "Ship the deck"]);
    expect(rows[0].note).toBe("Push day");
  });

  it("entries set at 23:00 and 1:30am land on the same upcoming morning (4am boundary)", async () => {
    // The client computes the target with nextRitualDayKey; both evening moments
    // resolve to the same key, so the store sees one day. This mirrors that flow.
    const { asUser } = await setup();
    await asUser.mutation(api.roadmap.add, { day: TOMORROW, text: "set at 23:00" });
    await asUser.mutation(api.roadmap.add, { day: TOMORROW, text: "set at 1:30am" });
    const rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows).toHaveLength(2);
  });

  it("setDone stamps and clears; move reorders; remove deletes", async () => {
    const { asUser } = await setup();
    const a = await asUser.mutation(api.roadmap.add, { day: TOMORROW, text: "a" });
    const b = await asUser.mutation(api.roadmap.add, { day: TOMORROW, text: "b" });
    await asUser.mutation(api.roadmap.setDone, { entryId: a, done: true });
    let rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows.find((r) => r._id === a)!.doneAt).toBeTypeOf("number");
    await asUser.mutation(api.roadmap.setDone, { entryId: a, done: false });
    await asUser.mutation(api.roadmap.move, { entryId: b, direction: "up" });
    rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows.map((r) => r._id)).toEqual([b, a]);
    expect(rows.find((r) => r._id === a)!.doneAt).toBeUndefined();
    await asUser.mutation(api.roadmap.remove, { entryId: a });
    expect(await asUser.query(api.roadmap.forDay, { day: TOMORROW })).toHaveLength(1);
  });

  it("rejects malformed day keys and empty text", async () => {
    const { asUser } = await setup();
    await expect(
      asUser.mutation(api.roadmap.add, { day: "tomorrow", text: "x" }),
    ).rejects.toThrow("Bad day key");
    await expect(asUser.mutation(api.roadmap.add, { day: TOMORROW, text: "   " })).rejects.toThrow(
      "Empty entry",
    );
    expect(await asUser.query(api.roadmap.forDay, { day: "nope" })).toEqual([]);
  });

  it("rejects touching another user's entries", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    const mine = await asUser.mutation(api.roadmap.add, { day: TOMORROW, text: "mine" });
    await expect(asOther.mutation(api.roadmap.setDone, { entryId: mine, done: true })).rejects.toThrow();
    await expect(asOther.mutation(api.roadmap.remove, { entryId: mine })).rejects.toThrow();
    expect(await asOther.query(api.roadmap.forDay, { day: TOMORROW })).toEqual([]);
  });
});
