import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Big Things: the active commitments that occupy real time and mental space
// (a pending big meeting, an ongoing big project, an obligation in flight),
// captured lightly and held, with NO AI roadmap and NO goal semantics until
// the person explicitly promotes one into a Goal. Deliberately a separate table
// and module from `goals` precisely because a goal/aspiration ALWAYS schedules
// the roadmap-drafting pass (convex/ai/goalEnrich.ts) on create; a Big Thing
// must have no such side effect. Spec: docs/product/features/goals.md.

async function ownedBigThing(ctx: any, userId: string, id: Id<"bigThings">) {
  const row = await ctx.db.get(id);
  if (!row || row.userId !== userId) throw new Error("Not found");
  return row;
}

// ── Reads ────────────────────────────────────────────────────────────────────

// The live (non-archived) Big Things, soonest-dated first, then undated by most
// recently captured. Promoted rows are archived, so they never appear here.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("bigThings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((r) => !r.archived)
      .sort((a, b) => {
        // Dated items lead, earliest first; undated trail, newest capture first.
        if (a.date && b.date) return a.date.localeCompare(b.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return b.createdAt - a.createdAt;
      });
  },
});

// ── Writes ───────────────────────────────────────────────────────────────────

// Quick capture. No AI, no scheduler, no goal; this is the whole point of the
// layer: hold the commitment without drafting a roadmap for it.
export const create = mutation({
  args: {
    title: v.string(),
    context: v.optional(v.string()),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const title = args.title.trim();
    if (!title) throw new Error("Empty title");
    const existing = await ctx.db
      .query("bigThings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const maxOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder), 0);
    return await ctx.db.insert("bigThings", {
      userId,
      title,
      context: args.context?.trim() || undefined,
      date: args.date || undefined,
      sortOrder: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("bigThings"),
    title: v.optional(v.string()),
    // null clears context/date; undefined leaves the field untouched.
    context: v.optional(v.union(v.string(), v.null())),
    date: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedBigThing(ctx, userId, args.id);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined && args.title.trim()) patch.title = args.title.trim();
    if (args.context !== undefined) patch.context = args.context?.trim() || undefined;
    if (args.date !== undefined) patch.date = args.date ?? undefined;
    await ctx.db.patch(args.id, patch);
  },
});

export const archive = mutation({
  args: { id: v.id("bigThings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedBigThing(ctx, userId, args.id);
    await ctx.db.patch(args.id, { archived: true, updatedAt: Date.now() });
  },
});

// Promote a Big Thing into a real Goal, atomically in one mutation:
//   1. create the normal goal (same shape as goals.createGoal: status
//      "planning", roadmapDraft pending) so it behaves identically to a
//      hand-created goal, mapping the Big Thing's title to name, its optional
//      `date` to the goal's `deadline` (the minimal default: a dated Big Thing
//      becomes a dated Goal; an undated one stays an aspiration), and carrying
//      its `context` to the goal's `why` so nothing the person wrote is lost;
//   2. schedule the STANDARD roadmap draft (convex/ai/goalEnrich.ts), exactly
//      as goals.createGoal does; this is the first moment any AI runs for it;
//   3. retire the source Big Thing in place (archived + promotedToGoalId), so
//      it leaves the section and can never duplicate the goal it became.
// Ownership-safe (rejects another user's row) and idempotent-guarded (a row
// already promoted cannot be promoted twice).
export const promote = mutation({
  args: { id: v.id("bigThings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const bigThing = await ownedBigThing(ctx, userId, args.id);
    if (bigThing.promotedToGoalId) return bigThing.promotedToGoalId; // already promoted

    const existing = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const maxOrder = existing.reduce((m, g) => Math.max(m, g.sortOrder), 0);
    const goalId = await ctx.db.insert("goals", {
      userId,
      name: bigThing.title,
      status: "planning",
      why: bigThing.context || undefined,
      deadline: bigThing.date || undefined, // date → deadline (minimal default)
      roadmapDraft: { status: "pending" },
      sortOrder: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    // The standard roadmap-drafting pass, same as a hand-created goal.
    await ctx.scheduler.runAfter(0, internal.ai.goalEnrich.draftRoadmap, { goalId });
    // Retire the source so it never lives in both sections.
    await ctx.db.patch(args.id, {
      archived: true,
      promotedToGoalId: goalId,
      updatedAt: Date.now(),
    });
    return goalId;
  },
});
