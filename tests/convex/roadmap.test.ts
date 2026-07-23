import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// The roadmap loop's storage side (ADR 0012): entries keyed to their TARGET
// ritual day. Day-key computation is client-side (lib/ritual.ts, tested in
// tests/ritual.test.ts); here we verify the store honors the keys.

// Explicit `modules` glob (rather than convex-test's default) because this worktree's
// node_modules is a symlink to a sibling checkout: Vite resolves the default glob relative
// to node_modules' real path, which would silently bundle that OTHER checkout's convex/
// instead of this one's (hiding new `addFromTask` / `availableTasks` exports). Scoped to
// this file; matches tests/convex/pillars.test.ts and tests/convex/whats-new.test.ts.
const modules = (
  import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }
).glob("../../convex/**/*.*s");

async function setup() {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

// Insert a Goals task directly (bypassing the Todoist push scheduler), returning
// its id. `goalId`/`goalName` optionally home it in a goal so availableTasks can
// carry the goal's name.
async function makeTask(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  content: string,
  opts: {
    goalName?: string;
    checked?: boolean;
    waiting?: boolean;
    todoistTaskId?: string;
  } = {},
): Promise<Id<"goalTasks">> {
  return await t.run(async (ctx) => {
    let goalId: Id<"goals"> | undefined = undefined;
    if (opts.goalName) {
      goalId = await ctx.db.insert("goals", {
        userId,
        name: opts.goalName,
        status: "active",
        sortOrder: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return await ctx.db.insert("goalTasks", {
      userId,
      goalId,
      content,
      checked: opts.checked ?? false,
      completedAt: opts.checked ? Date.now() : undefined,
      waiting: opts.waiting,
      todoistTaskId: opts.todoistTaskId,
      sortOrder: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

// The Todoist push actions scheduled so far, newest last. A linked morning check
// mirrors through to Todoist exactly as a board check would (ARI-144); these tests
// assert the push is queued without running the (key-less) action for real.
async function scheduledPushes(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const all = await ctx.db.system.query("_scheduled_functions").collect();
    return all
      .filter((f) => f.name.includes("pushChecked"))
      .map((f) => f.args[0] as { todoistTaskId: string; checked: boolean });
  });
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

// Linked roadmap entries (ARI-144): the night roadmap PICKS canonical Goals
// tasks instead of typing a fresh to-do list. An entry points at a goalTask;
// the morning display resolves the task's current content and mirrors a check
// back to it.
describe("roadmap linked to goal tasks (ARI-144)", () => {
  it("addFromTask links the entry and snapshots the task content", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Call the plumber", { goalName: "Fix the house" });
    const entryId = await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    });
    expect(entryId).not.toBeNull();
    const rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("Call the plumber");
    expect(rows[0].goalTaskId).toBe(taskId);
    expect(rows[0].done).toBe(false);
    // The snapshot is stored on the row for delete-time fallback.
    const stored = await t.run(async (ctx) => ctx.db.get(entryId as Id<"roadmapEntries">));
    expect(stored?.text).toBe("Call the plumber");
  });

  it("forDay shows the task's CURRENT content when it is renamed", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Old name");
    await asUser.mutation(api.roadmap.addFromTask, { day: TOMORROW, goalTaskId: taskId });
    await t.run(async (ctx) => ctx.db.patch(taskId, { content: "New name" }));
    const rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows[0].text).toBe("New name"); // canonical wins over the stored snapshot
  });

  it("availableTasks lists open tasks, with goal name, minus already-picked / checked / waiting", async () => {
    const { t, asUser, userId } = await setup();
    const open = await makeTask(t, userId, "Open one", { goalName: "Big Thing" });
    const picked = await makeTask(t, userId, "Already picked");
    await makeTask(t, userId, "Done one", { checked: true });
    await makeTask(t, userId, "Blocked one", { waiting: true });
    await asUser.mutation(api.roadmap.addFromTask, { day: TOMORROW, goalTaskId: picked });

    const avail = await asUser.query(api.roadmap.availableTasks, { day: TOMORROW });
    expect(avail.map((a) => a.content)).toEqual(["Open one"]);
    expect(avail[0]._id).toBe(open);
    expect(avail[0].goalName).toBe("Big Thing");
  });

  it("rejects picking the same task twice for a day (no duplicate)", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Only once");
    const first = await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    });
    expect(first).not.toBeNull();
    const second = await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    });
    expect(second).toBeNull();
    expect(await asUser.query(api.roadmap.forDay, { day: TOMORROW })).toHaveLength(1);
  });

  it("checking a linked entry in the morning completes the canonical task, and reopening reopens it", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Ship it");
    const entryId = (await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    })) as Id<"roadmapEntries">;

    await asUser.mutation(api.roadmap.setDone, { entryId, done: true });
    let task = await t.run(async (ctx) => ctx.db.get(taskId));
    expect(task?.checked).toBe(true);
    expect(task?.completedAt).toBeTypeOf("number");
    // forDay reflects the completion.
    let rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows[0].done).toBe(true);

    await asUser.mutation(api.roadmap.setDone, { entryId, done: false });
    task = await t.run(async (ctx) => ctx.db.get(taskId));
    expect(task?.checked).toBe(false);
    expect(task?.completedAt).toBeUndefined();
    rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows[0].done).toBe(false);
  });

  it("a task completed on the Goals board reads as done on the morning roadmap", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Done elsewhere");
    await asUser.mutation(api.roadmap.addFromTask, { day: TOMORROW, goalTaskId: taskId });
    await t.run(async (ctx) => ctx.db.patch(taskId, { checked: true, completedAt: Date.now() }));
    const rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows[0].done).toBe(true);
  });

  it("falls back to the stored snapshot when the linked task is deleted", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Was linked");
    const entryId = (await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    })) as Id<"roadmapEntries">;
    await t.run(async (ctx) => ctx.db.delete(taskId));
    const rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows[0].text).toBe("Was linked"); // snapshot fallback
    expect(rows[0].goalTaskId).toBeUndefined(); // link is dead → renders as a plain entry
    // A dead link falls through to its own doneAt only (no canonical to mirror).
    await asUser.mutation(api.roadmap.setDone, { entryId, done: true });
    const after = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(after[0].done).toBe(true);
  });

  it("rejects picking another user's task", async () => {
    const { t, asUser, userId } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const theirTask = await makeTask(t, otherId as Id<"users">, "not yours");
    await expect(
      asUser.mutation(api.roadmap.addFromTask, { day: TOMORROW, goalTaskId: theirTask }),
    ).rejects.toThrow();
    void userId;
  });

  it("rejects picking a checked or waiting task at the mutation, not just the query", async () => {
    const { t, asUser, userId } = await setup();
    const doneTask = await makeTask(t, userId, "already done", { checked: true });
    const waitingTask = await makeTask(t, userId, "blocked", { waiting: true });
    await expect(
      asUser.mutation(api.roadmap.addFromTask, { day: TOMORROW, goalTaskId: doneTask }),
    ).rejects.toThrow("already done");
    await expect(
      asUser.mutation(api.roadmap.addFromTask, { day: TOMORROW, goalTaskId: waitingTask }),
    ).rejects.toThrow("waiting");
    expect(await asUser.query(api.roadmap.forDay, { day: TOMORROW })).toEqual([]);
  });

  it("reopening the linked task on the Goals board un-does the morning entry (canonical wins)", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "round trip");
    const entryId = (await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    })) as Id<"roadmapEntries">;
    // Check it off in the morning (this also stamps the entry's own doneAt).
    await asUser.mutation(api.roadmap.setDone, { entryId, done: true });
    expect((await asUser.query(api.roadmap.forDay, { day: TOMORROW }))[0].done).toBe(true);
    // Reopen the canonical task elsewhere (e.g. the Goals board): the roadmap must
    // follow it back to not-done even though the stale local doneAt is still set.
    await t.run(async (ctx) => ctx.db.patch(taskId, { checked: false, completedAt: undefined }));
    expect((await asUser.query(api.roadmap.forDay, { day: TOMORROW }))[0].done).toBe(false);
  });

  it("setDone on a linked task with a Todoist id queues the push (without running it)", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Synced task", { todoistTaskId: "td-1" });
    const entryId = (await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    })) as Id<"roadmapEntries">;

    expect(await scheduledPushes(t)).toHaveLength(0);
    await asUser.mutation(api.roadmap.setDone, { entryId, done: true });
    // The morning check mirrors to the canonical task and schedules exactly one push
    // carrying that task's Todoist id + the new checked state. The action itself never
    // runs here (no key), so this asserts the queue, not a live Todoist call.
    const pushes = await scheduledPushes(t);
    expect(pushes).toHaveLength(1);
    expect(pushes[0].todoistTaskId).toBe("td-1");
    expect(pushes[0].checked).toBe(true);

    // Reopening in the morning queues the mirror-back push too.
    await asUser.mutation(api.roadmap.setDone, { entryId, done: false });
    const after = await scheduledPushes(t);
    expect(after).toHaveLength(2);
    expect(after[1].checked).toBe(false);
  });

  it("does NOT queue a Todoist push when the linked task carries no Todoist id", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Unsynced task");
    const entryId = (await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    })) as Id<"roadmapEntries">;
    await asUser.mutation(api.roadmap.setDone, { entryId, done: true });
    expect(await scheduledPushes(t)).toHaveLength(0);
  });
});

// Delete-time freezing (ARI-144): deleting the canonical task through the REAL
// `goals.deleteTask` mutation must freeze each linked entry's LATEST resolved
// snapshot (current content + current canonical checked state), not the pick-time
// copy, then sever the link so the row lives on as a plain frozen line.
describe("goals.deleteTask freezes linked roadmap entries (ARI-144)", () => {
  it("freezes the task's LATEST renamed content, not the pick-time snapshot", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Old name");
    const entryId = (await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    })) as Id<"roadmapEntries">;
    // Rename on the Goals board AFTER picking, then delete via the real mutation.
    await asUser.mutation(api.goals.updateTask, { id: taskId, content: "New name" });
    await asUser.mutation(api.goals.deleteTask, { id: taskId });

    const rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows[0].text).toBe("New name"); // the LATEST content is frozen, not "Old name"
    expect(rows[0].goalTaskId).toBeUndefined(); // link severed → plain frozen line
    // The stored row itself carries the frozen text (no live task left to resolve).
    const stored = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(stored?.text).toBe("New name");
    expect(stored?.goalTaskId).toBeUndefined();
  });

  it("freezes the LATEST canonical checked state (done on the board → frozen done)", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Finish it");
    const entryId = (await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    })) as Id<"roadmapEntries">;
    // Complete the task on the Goals board via the real mutation, then delete it.
    await asUser.mutation(api.goals.setChecked, { id: taskId, checked: true });
    await asUser.mutation(api.goals.deleteTask, { id: taskId });

    const rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows[0].done).toBe(true); // canonical done is frozen into the row's doneAt
    const stored = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(stored?.doneAt).toBeTypeOf("number");
    expect(stored?.goalTaskId).toBeUndefined();
  });

  it("roadmap-check then canonical reopen then delete freezes as NOT done (canonical wins over stale local doneAt)", async () => {
    const { t, asUser, userId } = await setup();
    const taskId = await makeTask(t, userId, "Round trip");
    const entryId = (await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    })) as Id<"roadmapEntries">;
    // Check it off in the morning: this stamps the entry's OWN doneAt and completes
    // the canonical task.
    await asUser.mutation(api.roadmap.setDone, { entryId, done: true });
    expect(await t.run(async (ctx) => (await ctx.db.get(entryId))?.doneAt)).toBeTypeOf("number");
    // Reopen the canonical task on the Goals board (leaving the stale local doneAt set).
    await asUser.mutation(api.goals.setChecked, { id: taskId, checked: false });
    // Delete the task: freezing must trust the canonical NOT-checked state and clear the
    // stale local doneAt, or the row would wrongly read as done forever.
    await asUser.mutation(api.goals.deleteTask, { id: taskId });

    const rows = await asUser.query(api.roadmap.forDay, { day: TOMORROW });
    expect(rows[0].done).toBe(false);
    const stored = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(stored?.doneAt).toBeUndefined(); // stale local doneAt cleared at freeze time
    expect(stored?.goalTaskId).toBeUndefined();
  });

  it("deleting one user's task never patches another user's roadmap entry, even with corrupt cross-user data", async () => {
    const { t, asUser, userId } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    // My task, legitimately linked from my own roadmap.
    const taskId = await makeTask(t, userId, "Mine");
    const mineEntry = (await asUser.mutation(api.roadmap.addFromTask, {
      day: TOMORROW,
      goalTaskId: taskId,
    })) as Id<"roadmapEntries">;
    // Corrupt data: the OTHER user has a roadmap entry pointing at MY task id (something
    // `addFromTask` would never allow, forced directly here).
    const foreignEntry = await t.run(async (ctx) =>
      ctx.db.insert("roadmapEntries", {
        userId: otherId,
        day: TOMORROW,
        text: "theirs, untouched",
        goalTaskId: taskId,
        order: 0,
        createdAt: Date.now(),
      }),
    );
    await asUser.mutation(api.goals.deleteTask, { id: taskId });

    // My own entry was frozen; the other user's entry was left exactly as it was.
    const foreign = await t.run(async (ctx) => ctx.db.get(foreignEntry));
    expect(foreign?.text).toBe("theirs, untouched");
    expect(foreign?.goalTaskId).toBe(taskId); // NOT severed by my delete
    const theirs = await asOther.query(api.roadmap.forDay, { day: TOMORROW });
    expect(theirs[0].text).toBe("theirs, untouched");
    void mineEntry;
  });
});
