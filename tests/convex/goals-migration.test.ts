import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";

// ADR 0029 landing migration: production carried Todoist-synced goals in the
// old Orbit shape (`area`/`kind`), which the v2 schema rejected on push. The
// fields are temporarily back as validate-only optionals; this migration
// strips them so those optionals can later be deleted for good.

describe("goals.migrateDropAreaKind (ADR 0029 landing)", () => {
  it("strips area/kind from old-shape rows and leaves clean rows untouched", async () => {
    const t = convexTest(schema);
    const { userId, oldId, newId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const now = Date.now();
      const oldId = await ctx.db.insert("goals", {
        userId,
        name: "Pre-0029 Orbit goal",
        status: "active",
        area: "personal",
        kind: "big",
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      });
      const newId = await ctx.db.insert("goals", {
        userId,
        name: "Clean v2 aspiration",
        status: "active",
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      });
      return { userId, oldId, newId };
    });

    const res = await t.mutation(internal.goals.migrateDropAreaKind, {});
    expect(res.scanned).toBe(2);
    expect(res.cleaned).toBe(1);

    await t.run(async (ctx) => {
      const migrated = (await ctx.db.get(oldId)) as Record<string, unknown>;
      expect(migrated.area).toBeUndefined();
      expect(migrated.kind).toBeUndefined();
      expect(migrated.name).toBe("Pre-0029 Orbit goal");
      expect(migrated.todoistProjectId).toBeUndefined();
      const untouched = (await ctx.db.get(newId)) as Record<string, unknown>;
      expect(untouched.name).toBe("Clean v2 aspiration");
      expect(untouched.userId).toBe(userId);
    });

    // Idempotent: a second run finds nothing left to clean.
    const again = await t.mutation(internal.goals.migrateDropAreaKind, {});
    expect(again.cleaned).toBe(0);
  });
});
