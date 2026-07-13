import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Todoist connection for the Goals board. The user's Todoist API token lives in
// the apiKeys table (provider "todoist", saved from Settings; never returned to
// the client). Sync model, per the Orbit PRD's "thin sync" recommendation:
//   Pull: "Sync now" fetches all projects + active tasks over the Todoist REST
//         API and reconciles them into goals/goalTasks (upsert by todoist id;
//         linked tasks that disappeared from Todoist are marked done here).
//   Push: completing/reopening a linked task and adding a task write through
//         immediately (scheduled from convex/goals.ts; no-op without a token).
// Orbit-only metadata (why, status, area) never leaves LifeGuide.

const API = "https://api.todoist.com/rest/v2";

async function todoistFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Todoist ${path} failed: ${res.status}`);
  return res;
}

async function tokenFor(ctx: any, userId: Id<"users">): Promise<string | null> {
  return await ctx.runQuery(internal.aiKeys.getKeyInternal, {
    userId,
    provider: "todoist",
  });
}

// ── Connect ──────────────────────────────────────────────────────────────────

// Called from Settings when the user hits "Save" on their Todoist token. Tests
// the token against the real Todoist API right away (a lightweight /projects
// fetch) before persisting it, so a bad token is caught immediately instead of
// silently sitting unused. Never logs the token itself — only HTTP status is
// surfaced, and only a human-readable message reaches the client.
export const saveToken = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const token = args.token.trim();
    if (!token) throw new Error("Empty token");

    let res: Response;
    try {
      res = await fetch(`${API}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Network/fetch failure — don't leak internals, don't include the token.
      throw new Error("Couldn't reach Todoist. Check your connection and try again.");
    }
    if (!res.ok) {
      const message =
        res.status === 401 || res.status === 403
          ? "Todoist rejected that token — double-check it's correct and has API access."
          : `Todoist connection test failed (HTTP ${res.status}). Try again in a moment.`;
      throw new Error(message);
    }

    await ctx.runMutation(api.aiKeys.setKey, { provider: "todoist", key: token });
    return { ok: true };
  },
});

// ── Pull ─────────────────────────────────────────────────────────────────────

// User-triggered "Sync now": pull projects and active tasks into the board.
export const sync = action({
  args: {},
  handler: async (ctx): Promise<{ projects: number; tasks: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const token = await tokenFor(ctx, userId);
    if (!token) throw new Error("No Todoist token saved. Add one in Settings.");

    const projects: any[] = await (await todoistFetch(token, "/projects")).json();
    const tasks: any[] = await (await todoistFetch(token, "/tasks")).json();

    await ctx.runMutation(internal.todoist.applySync, {
      userId,
      projects: projects.map((p) => ({
        id: String(p.id),
        name: String(p.name),
        parentId: p.parent_id ? String(p.parent_id) : undefined,
        isInbox: Boolean(p.is_inbox_project),
        order: Number(p.order ?? 0),
      })),
      tasks: tasks.map((t) => ({
        id: String(t.id),
        projectId: t.project_id ? String(t.project_id) : undefined,
        content: String(t.content),
        description: t.description ? String(t.description) : undefined,
        dueDate: t.due?.date ? String(t.due.date).slice(0, 10) : undefined,
        priority: Number(t.priority ?? 1),
        order: Number(t.order ?? 0),
      })),
    });
    return { projects: projects.length, tasks: tasks.length };
  },
});

// Reconcile a pulled snapshot into goals/goalTasks. Todoist is authoritative for
// task content/state; LifeGuide is authoritative for Orbit-only metadata.
export const applySync = internalMutation({
  args: {
    userId: v.id("users"),
    projects: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        parentId: v.optional(v.string()),
        isInbox: v.boolean(),
        order: v.number(),
      }),
    ),
    tasks: v.array(
      v.object({
        id: v.string(),
        projectId: v.optional(v.string()),
        content: v.string(),
        description: v.optional(v.string()),
        dueDate: v.optional(v.string()),
        priority: v.number(),
        order: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const existingGoals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const goalByTodoist = new Map(
      existingGoals.filter((g) => g.todoistProjectId).map((g) => [g.todoistProjectId!, g]),
    );
    const maxOrder = existingGoals.reduce((m, g) => Math.max(m, g.sortOrder), 0);

    // Upsert projects → goals. The Todoist Inbox project maps to our Inbox
    // (goalId unset), so it gets no goal card.
    const inboxProjectIds = new Set(args.projects.filter((p) => p.isInbox).map((p) => p.id));
    const goalIdByProject = new Map<string, Id<"goals">>();
    for (const p of args.projects) {
      if (p.isInbox) continue;
      const existing = goalByTodoist.get(p.id);
      if (existing) {
        if (existing.name !== p.name) {
          await ctx.db.patch(existing._id, { name: p.name, updatedAt: Date.now() });
        }
        goalIdByProject.set(p.id, existing._id);
      } else {
        const id = await ctx.db.insert("goals", {
          userId,
          name: p.name,
          kind: "big",
          status: "active",
          area: "personal",
          sortOrder: maxOrder + 1 + p.order,
          todoistProjectId: p.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        goalIdByProject.set(p.id, id);
      }
    }
    // Second pass: parent links (a Todoist sub-project becomes a part).
    for (const p of args.projects) {
      if (p.isInbox || !p.parentId) continue;
      const childId = goalIdByProject.get(p.id);
      const parentId = goalIdByProject.get(p.parentId);
      if (childId && parentId) await ctx.db.patch(childId, { parentId });
    }

    // Upsert tasks. Anything of ours linked to Todoist but missing from the
    // active snapshot was completed (or deleted) over there → mark done here.
    const existingTasks = await ctx.db
      .query("goalTasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const taskByTodoist = new Map(
      existingTasks.filter((t) => t.todoistTaskId).map((t) => [t.todoistTaskId!, t]),
    );
    const seen = new Set<string>();
    for (const t of args.tasks) {
      seen.add(t.id);
      const goalId =
        t.projectId && !inboxProjectIds.has(t.projectId)
          ? goalIdByProject.get(t.projectId)
          : undefined;
      const existing = taskByTodoist.get(t.id);
      if (existing) {
        await ctx.db.patch(existing._id, {
          content: t.content,
          description: t.description,
          dueDate: t.dueDate,
          priority: t.priority,
          goalId,
          checked: false,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("goalTasks", {
          userId,
          goalId,
          content: t.content,
          description: t.description,
          dueDate: t.dueDate,
          priority: t.priority,
          checked: false,
          sortOrder: t.order,
          todoistTaskId: t.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    for (const t of existingTasks) {
      if (t.todoistTaskId && !t.checked && !seen.has(t.todoistTaskId)) {
        await ctx.db.patch(t._id, {
          checked: true,
          completedAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  },
});

// ── Push ─────────────────────────────────────────────────────────────────────

// Write a complete/reopen through to a linked Todoist task.
export const pushChecked = internalAction({
  args: { userId: v.id("users"), todoistTaskId: v.string(), checked: v.boolean() },
  handler: async (ctx, args) => {
    const token = await tokenFor(ctx, args.userId);
    if (!token) return;
    try {
      await todoistFetch(
        token,
        `/tasks/${args.todoistTaskId}/${args.checked ? "close" : "reopen"}`,
        { method: "POST" },
      );
    } catch (e) {
      console.error("todoist pushChecked failed", e);
    }
  },
});

// Mirror a task created in LifeGuide into Todoist and link it back.
export const pushCreate = internalAction({
  args: { taskId: v.id("goalTasks") },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.todoist.getTaskInternal, { id: args.taskId });
    if (!task || task.todoistTaskId) return;
    const token = await tokenFor(ctx, task.userId);
    if (!token) return;
    const goal = task.goalId
      ? await ctx.runQuery(internal.todoist.getGoalInternal, { id: task.goalId })
      : null;
    try {
      const body: Record<string, unknown> = { content: task.content };
      if (goal?.todoistProjectId) body.project_id = goal.todoistProjectId;
      if (task.dueDate) body.due_date = task.dueDate;
      const created = await (
        await todoistFetch(token, "/tasks", { method: "POST", body: JSON.stringify(body) })
      ).json();
      await ctx.runMutation(internal.todoist.linkTask, {
        id: args.taskId,
        todoistTaskId: String(created.id),
      });
    } catch (e) {
      console.error("todoist pushCreate failed", e);
    }
  },
});

// ── Server-only plumbing for the push actions ────────────────────────────────

export const getTaskInternal = internalQuery({
  args: { id: v.id("goalTasks") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const getGoalInternal = internalQuery({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const linkTask = internalMutation({
  args: { id: v.id("goalTasks"), todoistTaskId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { todoistTaskId: args.todoistTaskId });
  },
});
