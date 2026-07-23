import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// The roadmap loop (ADR 0012): before bed the person quickly sets down exactly
// what tomorrow starts with — what to do, plus any where/info needed to just
// execute. Entries target the NEXT ritual day, so the next morning opens with
// them as its ordered spine and the person wakes up executing, not deciding.
// The 4am boundary (ADR 0009) means an entry at 23:00 and one at 1:30am both
// land on the same upcoming morning; the target day key is computed client-side
// (lib/ritual.ts nextRitualDayKey), same as ritual day keys.
//
// A roadmap entry is a POINTER at a canonical Goals task, not a fresh to-do
// (ARI-144). New additions PICK an open `goalTasks` row; `goalTaskId` links to
// it and `text` is only a fallback snapshot for when that task is later deleted.
// While the link is live, `forDay` resolves the task's CURRENT content (a rename
// shows through) and its checked state, and `setDone` mirrors a morning check
// back to the canonical task (and its Todoist push). Legacy free-form entries
// (no `goalTaskId`) keep rendering and behaving exactly as they did.
// ============================================================================

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

async function entriesFor(ctx: { db: QueryCtx["db"] }, userId: Id<"users">, day: string) {
  return await ctx.db
    .query("roadmapEntries")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", day))
    .collect();
}

async function getOwned(ctx: MutationCtx, userId: Id<"users">, entryId: Id<"roadmapEntries">) {
  const entry = await ctx.db.get(entryId);
  if (!entry || entry.userId !== userId) throw new Error("Not found");
  return entry;
}

// The roadmap for one ritual day, in order. The morning display passes today's
// key; the evening builder passes tomorrow's. Each entry is resolved: a live
// linked entry shows the canonical task's CURRENT content and checked state (so a
// rename on the Goals board shows through, and a completion or reopen there is
// reflected). A legacy or orphaned entry (no link, or the link's task is gone)
// falls back to its own stored `text` and `doneAt`.
export const forDay = query({
  args: { day: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (!DAY_KEY.test(args.day)) return [];
    const entries = (await entriesFor(ctx, userId, args.day)).sort((a, b) => a.order - b.order);
    const resolved = [];
    for (const e of entries) {
      let text = e.text;
      let linked: Id<"goalTasks"> | undefined = undefined;
      // A LIVE linked entry's done state follows the canonical task alone, so a
      // reopen on the Goals board un-does it here too (a stale local doneAt must
      // never win). Only legacy / orphaned entries fall back to their own doneAt.
      let done = e.doneAt != null;
      if (e.goalTaskId) {
        const task = await ctx.db.get(e.goalTaskId);
        if (task && task.userId === userId) {
          text = task.content; // canonical current content: a rename shows through
          linked = e.goalTaskId;
          done = task.checked;
        }
        // Deleted (or not owned): fall through to the stored snapshot + local doneAt.
      }
      resolved.push({
        _id: e._id,
        userId: e.userId,
        day: e.day,
        text,
        note: e.note,
        order: e.order,
        doneAt: e.doneAt,
        done,
        goalTaskId: linked,
      });
    }
    return resolved;
  },
});

// Legacy free-form entry: text, enter, next. Retained for back-compat and any
// existing caller; the scroll no longer creates entries this way (new additions
// go through `addFromTask`, ARI-144). Appends to the end of the target day.
export const add = mutation({
  args: { day: v.string(), text: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!DAY_KEY.test(args.day)) throw new Error("Bad day key");
    const text = args.text.trim();
    if (!text) throw new Error("Empty entry");
    const siblings = await entriesFor(ctx, userId, args.day);
    return await ctx.db.insert("roadmapEntries", {
      userId,
      day: args.day,
      text,
      note: args.note?.trim() || undefined,
      order: siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1,
      createdAt: Date.now(),
    });
  },
});

// The open Goals tasks the person can PICK into a day's roadmap: their own open
// (unchecked, not "waiting") `goalTasks`, minus any already on that day's roadmap
// so the same task can't be picked twice. Carries the goal name for grouping.
export const availableTasks = query({
  args: { day: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (!DAY_KEY.test(args.day)) return [];
    const entries = await entriesFor(ctx, userId, args.day);
    const taken = new Set(
      entries.map((e) => e.goalTaskId).filter((id): id is Id<"goalTasks"> => !!id),
    );
    const [tasks, goals] = await Promise.all([
      ctx.db
        .query("goalTasks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);
    const goalName = new Map(goals.map((g) => [g._id as string, g.name]));
    return tasks
      .filter((t) => !t.checked && !t.waiting && !taken.has(t._id))
      .sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1) || a.sortOrder - b.sortOrder)
      .map((t) => ({
        _id: t._id,
        content: t.content,
        goalName: t.goalId ? (goalName.get(t.goalId) ?? null) : null,
        dueDate: t.dueDate ?? null,
        priority: t.priority ?? 1,
      }));
  },
});

// Pick an existing open Goals task into a day's roadmap (ARI-144). Links the new
// entry to the canonical task and snapshots its content as a delete-time fallback.
// Eligibility is enforced HERE, not just in the availableTasks query the UI reads:
// a checked or "waiting" task is rejected, since only an open, actionable task can
// be tomorrow's first move. Picking a task already on that day is a no-op (returns
// null), so a double-tap or a stale list never creates a duplicate.
export const addFromTask = mutation({
  args: { day: v.string(), goalTaskId: v.id("goalTasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!DAY_KEY.test(args.day)) throw new Error("Bad day key");
    const task = await ctx.db.get(args.goalTaskId);
    if (!task || task.userId !== userId) throw new Error("Task not found");
    if (task.checked) throw new Error("That task is already done");
    if (task.waiting) throw new Error("That task is waiting, not actionable yet");
    const siblings = await entriesFor(ctx, userId, args.day);
    if (siblings.some((e) => e.goalTaskId === args.goalTaskId)) return null; // already picked
    return await ctx.db.insert("roadmapEntries", {
      userId,
      day: args.day,
      text: task.content, // snapshot, only used if the task is later deleted
      note: task.description?.trim() || undefined,
      goalTaskId: args.goalTaskId,
      order: siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    entryId: v.id("roadmapEntries"),
    text: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await getOwned(ctx, userId, args.entryId);
    await ctx.db.patch(entry._id, {
      ...(args.text !== undefined ? { text: args.text.trim() || entry.text } : {}),
      ...(args.note !== undefined ? { note: args.note.trim() || undefined } : {}),
    });
  },
});

export const remove = mutation({
  args: { entryId: v.id("roadmapEntries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await getOwned(ctx, userId, args.entryId);
    await ctx.db.delete(entry._id);
  },
});

// Reorder within the day: swap `order` with the neighbor in the given direction.
export const move = mutation({
  args: {
    entryId: v.id("roadmapEntries"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await getOwned(ctx, userId, args.entryId);
    const siblings = (await entriesFor(ctx, userId, entry.day)).sort((a, b) => a.order - b.order);
    const i = siblings.findIndex((s) => s._id === entry._id);
    const j = args.direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return;
    await ctx.db.patch(siblings[i]._id, { order: siblings[j].order });
    await ctx.db.patch(siblings[j]._id, { order: siblings[i].order });
  },
});

// The morning tap: mark an entry done (or undo it). A linked entry mirrors its
// state to the canonical `goalTasks` row (checking it off in the morning also
// checks it on the Goals board) and pushes that through to Todoist exactly as a
// board check would (ARI-144). A legacy/orphaned entry just stamps its own doneAt.
export const setDone = mutation({
  args: { entryId: v.id("roadmapEntries"), done: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await getOwned(ctx, userId, args.entryId);
    await ctx.db.patch(entry._id, { doneAt: args.done ? Date.now() : undefined });
    if (entry.goalTaskId) {
      const task = await ctx.db.get(entry.goalTaskId);
      if (task && task.userId === userId && task.checked !== args.done) {
        await ctx.db.patch(task._id, {
          checked: args.done,
          completedAt: args.done ? Date.now() : undefined,
          updatedAt: Date.now(),
        });
        if (task.todoistTaskId) {
          await ctx.scheduler.runAfter(0, internal.todoist.pushChecked, {
            userId,
            todoistTaskId: task.todoistTaskId,
            checked: args.done,
          });
        }
      }
    }
  },
});
