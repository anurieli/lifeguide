import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// The Goals board (Orbit): Big Things with a "why", plus the Today / Inbox /
// Waiting triage queue. Spec: _source-apps/goal-manager/Orbit-PRD.md and
// docs/product/features/goals.md. Every write that touches a Todoist-linked
// task schedules a push action (convex/todoist.ts); pushes no-op without a token.

const STATUS = v.union(v.literal("active"), v.literal("planning"), v.literal("ongoing"));
const AREA = v.union(v.literal("business"), v.literal("personal"), v.literal("people"));

async function ownedGoal(ctx: any, userId: string, id: any) {
  const goal = await ctx.db.get(id);
  if (!goal || goal.userId !== userId) throw new Error("Not found");
  return goal;
}

async function ownedTask(ctx: any, userId: string, id: any) {
  const task = await ctx.db.get(id);
  if (!task || task.userId !== userId) throw new Error("Not found");
  return task;
}

// ── Reads ────────────────────────────────────────────────────────────────────

// The whole board in one subscription: goals with open/done counts, plus the
// queue counts. One query so the board renders atomically.
export const board = query({
  args: { today: v.string() }, // client's local YYYY-MM-DD
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const tasks = await ctx.db
      .query("goalTasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const open = new Map<string, number>();
    const done = new Map<string, number>();
    let inboxCount = 0;
    let todayCount = 0;
    let waitingCount = 0;
    for (const t of tasks) {
      if (t.checked) {
        if (t.goalId) done.set(t.goalId, (done.get(t.goalId) ?? 0) + 1);
        continue;
      }
      if (t.goalId) open.set(t.goalId, (open.get(t.goalId) ?? 0) + 1);
      else inboxCount++;
      if (t.dueDate && t.dueDate <= args.today) todayCount++;
      if (t.waiting) waitingCount++;
    }

    return {
      goals: goals
        .filter((g) => !g.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((g) => ({
          ...g,
          openCount: open.get(g._id) ?? 0,
          doneCount: done.get(g._id) ?? 0,
        })),
      inboxCount,
      todayCount,
      waitingCount,
    };
  },
});

// One list for the queue panel or a goal drill-in. Open tasks only.
export const tasks = query({
  args: {
    view: v.union(v.literal("today"), v.literal("inbox"), v.literal("waiting"), v.literal("goal")),
    today: v.string(),
    goalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (args.view === "goal") {
      if (!args.goalId) return [];
      const rows = await ctx.db
        .query("goalTasks")
        .withIndex("by_user_goal", (q) => q.eq("userId", userId).eq("goalId", args.goalId))
        .collect();
      return rows
        .filter((t) => !t.checked)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const rows = await ctx.db
      .query("goalTasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const openRows = rows.filter((t) => !t.checked);
    if (args.view === "inbox") {
      return openRows.filter((t) => !t.goalId).sort((a, b) => b.createdAt - a.createdAt);
    }
    if (args.view === "waiting") {
      return openRows
        .filter((t) => t.waiting)
        .sort((a, b) => (a.waitingSince ?? a.createdAt) - (b.waitingSince ?? b.createdAt));
    }
    // today: due today or overdue, highest priority first, most overdue first.
    return openRows
      .filter((t) => t.dueDate && t.dueDate <= args.today)
      .sort(
        (a, b) =>
          (b.priority ?? 1) - (a.priority ?? 1) || a.dueDate!.localeCompare(b.dueDate!),
      );
  },
});

// ── Goal writes ──────────────────────────────────────────────────────────────

export const createGoal = mutation({
  args: {
    name: v.string(),
    area: v.optional(AREA),
    kind: v.optional(v.union(v.literal("big"), v.literal("shelf"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const name = args.name.trim();
    if (!name) throw new Error("Empty name");
    const existing = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const maxOrder = existing.reduce((m, g) => Math.max(m, g.sortOrder), 0);
    return await ctx.db.insert("goals", {
      userId,
      name,
      kind: args.kind ?? "big",
      status: "planning",
      area: args.area ?? "personal",
      sortOrder: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateGoal = mutation({
  args: {
    id: v.id("goals"),
    name: v.optional(v.string()),
    why: v.optional(v.string()),
    status: v.optional(STATUS),
    area: v.optional(AREA),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedGoal(ctx, userId, args.id);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined && args.name.trim()) patch.name = args.name.trim();
    if (args.why !== undefined) patch.why = args.why;
    if (args.status !== undefined) patch.status = args.status;
    if (args.area !== undefined) patch.area = args.area;
    await ctx.db.patch(args.id, patch);
  },
});

export const archiveGoal = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedGoal(ctx, userId, args.id);
    await ctx.db.patch(args.id, { archived: true, updatedAt: Date.now() });
  },
});

// Persist a new left-to-right, top-to-bottom card order after a manual reorder.
export const reorderGoals = mutation({
  args: { ids: v.array(v.id("goals")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    for (let i = 0; i < args.ids.length; i++) {
      await ownedGoal(ctx, userId, args.ids[i]);
      await ctx.db.patch(args.ids[i], { sortOrder: i + 1 });
    }
  },
});

// ── Task writes ──────────────────────────────────────────────────────────────

export const addTask = mutation({
  args: {
    content: v.string(),
    goalId: v.optional(v.id("goals")),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const content = args.content.trim();
    if (!content) throw new Error("Empty task");
    if (args.goalId) await ownedGoal(ctx, userId, args.goalId);
    const id = await ctx.db.insert("goalTasks", {
      userId,
      goalId: args.goalId,
      content,
      dueDate: args.dueDate,
      checked: false,
      sortOrder: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    // Mirror the new task into Todoist (no-ops without a saved token).
    await ctx.scheduler.runAfter(0, internal.todoist.pushCreate, { taskId: id });
    return id;
  },
});

export const setChecked = mutation({
  args: { id: v.id("goalTasks"), checked: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const task = await ownedTask(ctx, userId, args.id);
    await ctx.db.patch(args.id, {
      checked: args.checked,
      completedAt: args.checked ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
    if (task.todoistTaskId) {
      await ctx.scheduler.runAfter(0, internal.todoist.pushChecked, {
        userId,
        todoistTaskId: task.todoistTaskId,
        checked: args.checked,
      });
    }
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("goalTasks"),
    content: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedTask(ctx, userId, args.id);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.content !== undefined && args.content.trim()) patch.content = args.content.trim();
    if (args.description !== undefined) patch.description = args.description;
    if (args.dueDate !== undefined) patch.dueDate = args.dueDate ?? undefined;
    await ctx.db.patch(args.id, patch);
  },
});

// File a task into a goal, or back to the Inbox (goalId omitted).
export const moveTask = mutation({
  args: { id: v.id("goalTasks"), goalId: v.optional(v.id("goals")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedTask(ctx, userId, args.id);
    if (args.goalId) await ownedGoal(ctx, userId, args.goalId);
    await ctx.db.patch(args.id, { goalId: args.goalId, updatedAt: Date.now() });
  },
});

export const setWaiting = mutation({
  args: {
    id: v.id("goalTasks"),
    waiting: v.boolean(),
    waitingOn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedTask(ctx, userId, args.id);
    await ctx.db.patch(args.id, {
      waiting: args.waiting,
      waitingOn: args.waiting ? args.waitingOn : undefined,
      waitingSince: args.waiting ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

export const deleteTask = mutation({
  args: { id: v.id("goalTasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedTask(ctx, userId, args.id);
    await ctx.db.delete(args.id);
  },
});
