import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

// The AI-drafted (and user-editable) roadmap for a goal/aspiration: a small
// dependency graph, not a flat checklist. Distinct from `goalTasks` (the
// day-to-day, Todoist-synced Today/Inbox/Waiting items) — see
// docs/product/features/goals.md and docs/decisions/0029.

async function ownedGoal(ctx: any, userId: string, goalId: Id<"goals">) {
  const goal = await ctx.db.get(goalId);
  if (!goal || goal.userId !== userId) throw new Error("Not found");
  return goal;
}

async function ownedStep(ctx: any, userId: string, id: Id<"roadmapSteps">) {
  const step = await ctx.db.get(id);
  if (!step || step.userId !== userId) throw new Error("Not found");
  return step;
}

// Whether a step is blocked is computed here, never stored: any blockedBy id
// whose step isn't done blocks it. A dangling id (its step was deleted since)
// resolves as non-blocking — no fan-out cleanup needed on delete.
function isBlocked(step: Doc<"roadmapSteps">, byId: Map<string, Doc<"roadmapSteps">>) {
  return step.blockedBy.some((id) => {
    const blocker = byId.get(id);
    return blocker && blocker.status !== "done";
  });
}

// Would linking `from`'s blockedBy to `blockedBy` create a cycle? Walks each
// candidate blocker's own blockedBy chain looking for `from`.
function wouldCycle(
  from: Id<"roadmapSteps">,
  blockedBy: Id<"roadmapSteps">[],
  siblings: Doc<"roadmapSteps">[],
): boolean {
  const byId = new Map(siblings.map((s) => [s._id as string, s]));
  const seen = new Set<string>();
  const stack: string[] = [...blockedBy];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === from) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const step = byId.get(id);
    if (step) stack.push(...step.blockedBy);
  }
  return false;
}

export const list = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    await ownedGoal(ctx, userId, args.goalId);
    const steps = await ctx.db
      .query("roadmapSteps")
      .withIndex("by_user_goal", (q) => q.eq("userId", userId).eq("goalId", args.goalId))
      .collect();
    const byId = new Map(steps.map((s) => [s._id as string, s]));
    return steps
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ ...s, blocked: isBlocked(s, byId) }));
  },
});

// A brand-new step can't create a cycle (nothing can already depend on a step
// that doesn't exist yet) — only same-goal membership needs checking here.
export const add = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.string(),
    blockedBy: v.optional(v.array(v.id("roadmapSteps"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedGoal(ctx, userId, args.goalId);
    const title = args.title.trim();
    if (!title) throw new Error("Empty step");

    const siblings = await ctx.db
      .query("roadmapSteps")
      .withIndex("by_user_goal", (q) => q.eq("userId", userId).eq("goalId", args.goalId))
      .collect();
    const blockedBy = args.blockedBy ?? [];
    const siblingIds = new Set(siblings.map((s) => s._id as string));
    for (const id of blockedBy) {
      if (!siblingIds.has(id)) throw new Error("That step belongs to a different goal");
    }
    const maxOrder = siblings.reduce((m, s) => Math.max(m, s.sortOrder), 0);

    return await ctx.db.insert("roadmapSteps", {
      userId,
      goalId: args.goalId,
      title,
      status: "todo",
      blockedBy,
      source: "manual",
      sortOrder: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("roadmapSteps"),
    status: v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedStep(ctx, userId, args.id);
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
  },
});

export const updateTitle = mutation({
  args: { id: v.id("roadmapSteps"), title: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedStep(ctx, userId, args.id);
    const title = args.title.trim();
    if (!title) throw new Error("Empty step");
    await ctx.db.patch(args.id, { title, updatedAt: Date.now() });
  },
});

// A user's live edit is rejected outright on a cycle (never silently dropped,
// unlike the AI-batch write path) — silently ignoring a deliberate edit to
// real task data is a worse failure than a thrown error.
export const setBlockedBy = mutation({
  args: { id: v.id("roadmapSteps"), blockedBy: v.array(v.id("roadmapSteps")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const step = await ownedStep(ctx, userId, args.id);
    if (args.blockedBy.includes(args.id)) throw new Error("A step can't block itself.");

    const siblings = await ctx.db
      .query("roadmapSteps")
      .withIndex("by_user_goal", (q) => q.eq("userId", userId).eq("goalId", step.goalId))
      .collect();
    const siblingIds = new Set(siblings.map((s) => s._id as string));
    for (const id of args.blockedBy) {
      if (!siblingIds.has(id)) throw new Error("That step belongs to a different goal");
    }
    if (wouldCycle(args.id, args.blockedBy, siblings)) {
      throw new Error(
        "That step is already required by one of the steps you're pointing it at — that would leave things unfinishable.",
      );
    }
    await ctx.db.patch(args.id, { blockedBy: args.blockedBy, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("roadmapSteps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedStep(ctx, userId, args.id);
    // Sibling steps that listed this one in blockedBy simply resolve as
    // non-blocking now (dangling ids are treated as already-resolved) — no
    // fan-out cleanup needed.
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: { goalId: v.id("goals"), ids: v.array(v.id("roadmapSteps")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedGoal(ctx, userId, args.goalId);
    for (let i = 0; i < args.ids.length; i++) {
      await ownedStep(ctx, userId, args.ids[i]);
      await ctx.db.patch(args.ids[i], { sortOrder: i + 1 });
    }
  },
});
