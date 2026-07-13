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

const DAY = "2026-07-14";

describe("morningNote — the note to tomorrow-morning-you", () => {
  it("set writes the note and forDay reads it back", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.morningNote.set, { day: DAY, text: "Meditation. Even in the room !!" });
    const note = await asUser.query(api.morningNote.forDay, { day: DAY });
    expect(note?.text).toBe("Meditation. Even in the room !!");
  });

  it("set is an upsert: rewriting replaces the one note, no duplicates", async () => {
    const { t, asUser, userId } = await setup();
    await asUser.mutation(api.morningNote.set, { day: DAY, text: "first draft" });
    await asUser.mutation(api.morningNote.set, { day: DAY, text: "  final words  " });
    const note = await asUser.query(api.morningNote.forDay, { day: DAY });
    expect(note?.text).toBe("final words"); // trimmed
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("morningNotes")
        .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", DAY))
        .collect(),
    );
    expect(rows.length).toBe(1);
  });

  it("setting empty text tears the note up", async () => {
    const { asUser } = await setup();
    await asUser.mutation(api.morningNote.set, { day: DAY, text: "scratch that" });
    await asUser.mutation(api.morningNote.set, { day: DAY, text: "   " });
    const note = await asUser.query(api.morningNote.forDay, { day: DAY });
    expect(note).toBeNull();
  });

  it("notes are per-user: another account never sees mine", async () => {
    const { t, asUser } = await setup();
    await asUser.mutation(api.morningNote.set, { day: DAY, text: "mine alone" });
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    expect(await asOther.query(api.morningNote.forDay, { day: DAY })).toBeNull();
  });

  it("rejects malformed day keys", async () => {
    const { asUser } = await setup();
    await expect(
      asUser.mutation(api.morningNote.set, { day: "not-a-day", text: "hi" }),
    ).rejects.toThrow();
    expect(await asUser.query(api.morningNote.forDay, { day: "not-a-day" })).toBeNull();
  });
});
