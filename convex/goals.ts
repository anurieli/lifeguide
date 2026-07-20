import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { ContextFragment } from "./context/types";

// Goals: the things a person is chasing in life, plus the Today / Inbox /
// Waiting triage queue (goalTasks). Spec: docs/product/features/goals.md,
// docs/decisions/0029-aspirations-goals-and-roadmap-steps.md. Every write that
// touches a Todoist-linked task schedules a push action (convex/todoist.ts);
// pushes no-op without a token.

const STATUS = v.union(v.literal("active"), v.literal("planning"), v.literal("ongoing"));
const LADDERS_TO = v.union(
  v.literal("five_year"),
  v.literal("one_year"),
  v.literal("one_month"),
);

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

// No `deadline` = an aspiration; setting one graduates it into a Goal — see
// the schema comment in convex/schema.ts. Every new goal/aspiration gets an
// async AI-drafted roadmap (convex/ai/goalEnrich.ts), scheduled here and never
// blocking the create.
export const createGoal = mutation({
  args: {
    name: v.string(),
    why: v.optional(v.string()),
    pillarId: v.optional(v.id("pillars")),
    deadline: v.optional(v.string()),
    laddersTo: v.optional(LADDERS_TO),
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
    const id = await ctx.db.insert("goals", {
      userId,
      name,
      status: "planning",
      pillarId: args.pillarId,
      why: args.why,
      deadline: args.deadline,
      laddersTo: args.laddersTo,
      roadmapDraft: { status: "pending" },
      sortOrder: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.ai.goalEnrich.draftRoadmap, { goalId: id });
    return id;
  },
});

export const updateGoal = mutation({
  args: {
    id: v.id("goals"),
    name: v.optional(v.string()),
    why: v.optional(v.string()),
    status: v.optional(STATUS),
    // null clears the field (e.g. ungraduating a Goal back to an aspiration).
    pillarId: v.optional(v.union(v.id("pillars"), v.null())),
    deadline: v.optional(v.union(v.string(), v.null())),
    laddersTo: v.optional(v.union(LADDERS_TO, v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedGoal(ctx, userId, args.id);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined && args.name.trim()) patch.name = args.name.trim();
    if (args.why !== undefined) patch.why = args.why;
    if (args.status !== undefined) patch.status = args.status;
    if (args.pillarId !== undefined) patch.pillarId = args.pillarId ?? undefined;
    if (args.deadline !== undefined) patch.deadline = args.deadline ?? undefined;
    if (args.laddersTo !== undefined) patch.laddersTo = args.laddersTo ?? undefined;
    await ctx.db.patch(args.id, patch);
  },
});

// Re-run the AI roadmap draft (manual "Regenerate", or after an error). Only
// ever replaces `source: "ai"` steps (see writeGoalEnrichmentInternal) — a
// user's own manually-added steps are never touched by a regenerate.
export const regenerateRoadmap = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ownedGoal(ctx, userId, args.id);
    await ctx.db.patch(args.id, { roadmapDraft: { status: "pending" } });
    await ctx.scheduler.runAfter(0, internal.ai.goalEnrich.draftRoadmap, { goalId: args.id });
  },
});

// ── AI roadmap-drafting plumbing (convex/ai/goalEnrich.ts) ──────────────────

export const getForEnrichInternal = internalQuery({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal) return null; // deleted while scheduled
    const pillar = goal.pillarId ? await ctx.db.get(goal.pillarId) : null;
    return { ...goal, pillarName: pillar?.name };
  },
});

// One transaction: patch the goal's roadmapDraft AND replace its AI-drafted
// steps, resolving each step's local blockedByIndexes to real ids now that
// every step has one (can't reference a sibling before it's inserted).
export const writeGoalEnrichmentInternal = internalMutation({
  args: {
    goalId: v.id("goals"),
    status: v.union(v.literal("done"), v.literal("error")),
    summary: v.optional(v.string()),
    model: v.optional(v.string()),
    steps: v.optional(
      v.array(
        v.object({
          title: v.string(),
          isNextMove: v.boolean(),
          blockedByIndexes: v.array(v.number()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal) return; // deleted while the action was running

    if (args.status === "error") {
      await ctx.db.patch(args.goalId, {
        roadmapDraft: { status: "error", error: "Couldn't draft a roadmap — try again." },
      });
      return;
    }

    const existing = await ctx.db
      .query("roadmapSteps")
      .withIndex("by_user_goal", (q) => q.eq("userId", goal.userId).eq("goalId", args.goalId))
      .collect();
    for (const step of existing) {
      if (step.source === "ai") await ctx.db.delete(step._id);
    }

    const steps = args.steps ?? [];
    const ids: Id<"roadmapSteps">[] = [];
    for (let i = 0; i < steps.length; i++) {
      const id = await ctx.db.insert("roadmapSteps", {
        userId: goal.userId,
        goalId: args.goalId,
        title: steps[i].title,
        status: "todo",
        isNextMove: steps[i].isNextMove,
        blockedBy: [],
        source: "ai",
        sortOrder: i,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      ids.push(id);
    }
    for (let i = 0; i < steps.length; i++) {
      const blockedBy = steps[i].blockedByIndexes
        .filter((idx) => idx >= 0 && idx < ids.length && idx !== i)
        .map((idx) => ids[idx]);
      if (blockedBy.length) await ctx.db.patch(ids[i], { blockedBy });
    }

    await ctx.db.patch(args.goalId, {
      roadmapDraft: {
        status: "done",
        summary: args.summary,
        model: args.model,
        generatedAt: Date.now(),
      },
    });
  },
});

// The set of ids the Coach's intent classifier is allowed to reference — it
// must cross-check the model's output against this, never trust a returned
// id blindly (convex/ai/parse.ts's parseGoalIntent).
export const intentIds = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { goalIds: [], pillarIds: [] };
    const [goals, pillars] = await Promise.all([
      ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("pillars")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);
    return {
      goalIds: goals.filter((g) => !g.archived).map((g) => g._id as string),
      pillarIds: pillars.map((p) => p._id as string),
    };
  },
});

// ── Coach context (convex/coach.ts) ──────────────────────────────────────────

// Goals/aspirations + pillars, rendered with real ids inline so the Coach's
// intent-classification pass can reference one verbatim rather than fuzzy-
// matching a name (mirrors convex/nodes.ts's surfaceContext).
export const coachContext = query({
  args: {},
  handler: async (ctx): Promise<ContextFragment | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const [goals, pillars] = await Promise.all([
      ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("pillars")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);
    const pillarName = new Map(pillars.map((p) => [p._id as string, p.name]));
    const pillarLines = pillars.map((p) => `- (${p._id}) ${p.name}`).join("\n");
    const goalLines = goals
      .filter((g) => !g.archived)
      .map((g) => {
        const tier = g.deadline ? `due ${g.deadline}` : "aspiration (no deadline)";
        const pillar = g.pillarId ? (pillarName.get(g.pillarId) ?? "unknown pillar") : "none";
        return `- (${g._id}) ${g.name} — ${tier}, pillar: ${pillar}, why: ${g.why || "(none yet)"}`;
      })
      .join("\n");
    return {
      surfaceId: "goals",
      scope: "summary",
      label: "Goals & Aspirations",
      text: `Pillars:\n${pillarLines || "(none)"}\n\nGoals & Aspirations:\n${goalLines || "(none yet)"}`,
      priority: 7,
    };
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

// One-shot migration for ADR 0029's landing: strip the dead pre-0029 Orbit
// fields (`area`, `kind`) from existing rows so the deprecated optionals in
// the schema can eventually be deleted. Idempotent; safe to re-run.
// Run: npx convex run goals:migrateDropAreaKind --prod
export const migrateDropAreaKind = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("goals").collect();
    let cleaned = 0;
    for (const goal of all) {
      const doc = goal as { area?: unknown; kind?: unknown };
      if (doc.area === undefined && doc.kind === undefined) continue;
      await ctx.db.patch(goal._id, { area: undefined, kind: undefined });
      cleaned++;
    }
    return { scanned: all.length, cleaned };
  },
});
