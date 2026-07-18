/// <reference types="vite/client" />
import { describe, it, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// ARI-23: the Listener's memory backbone. Guard/wiring tests only — the model call
// itself (`chatComplete`) needs a live AI key and is exercised by the pure
// assembly/parsing tests in tests/listener-memory.test.ts instead. See
// docs/decisions/0022-listener-memory-backbone.md.

// convex-test's default module discovery (`convexTest(schema)` with no second arg)
// resolves its `import.meta.glob` relative to convex-test's OWN location inside
// node_modules — which, in a git-worktree checkout with a symlinked node_modules
// (see CLAUDE.md's environment notes), realpaths outside this worktree entirely.
// This new module (`convex/ai/listenerMemory.ts`) only exists here, so it must be
// passed explicitly, resolved relative to THIS test file's own real path.
const modules = import.meta.glob("../../convex/**/*.*s");

async function setup() {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

describe("ai/listenerMemory.summarizeSession guards", () => {
  it("an empty-transcript listen call gets a 'done' summary with no text — no model call needed", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.interview.start, {
      experienceId: "listen",
      device: "desktop",
    });
    await t.action(internal.ai.listenerMemory.summarizeSession, { sessionId });
    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session?.summary?.status).toBe("done");
    expect(session?.summary?.text).toBeUndefined();
  });

  it("no-ops entirely for a non-listen (onboarding) session — summary stays unset", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.interview.start, {
      experienceId: "text-interview",
      device: "desktop",
    });
    await asUser.mutation(api.interview.appendTurn, {
      sessionId,
      role: "user",
      questionKey: "s1q0",
      text: "I want peace.",
    });
    await t.action(internal.ai.listenerMemory.summarizeSession, { sessionId });
    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session?.summary).toBeUndefined();
  });

  it("no-ops when the session no longer exists", async () => {
    const { t, asUser } = await setup();
    const sessionId = await asUser.mutation(api.interview.start, {
      experienceId: "listen",
      device: "desktop",
    });
    await t.run(async (ctx) => ctx.db.delete(sessionId));
    // Must not throw (Convex serializes an action's implicit `undefined` return as `null`).
    await expect(
      t.action(internal.ai.listenerMemory.summarizeSession, { sessionId }),
    ).resolves.toBeNull();
  });
});

describe("interview.end schedules the memory-backbone summary", () => {
  // ai/listenerMemory.summarizeSession is scheduled via ctx.scheduler.runAfter(0, ...),
  // which convex-test fires through a real setTimeout — fake timers + the documented
  // finishAllScheduledFunctions(advanceTimers) loop make waiting for it deterministic.
  it("a 'listen' call ending as completed gets a summary once the scheduled pass runs", async () => {
    vi.useFakeTimers();
    try {
      const { t, asUser } = await setup();
      const sessionId = await asUser.mutation(api.interview.start, {
        experienceId: "listen",
        device: "desktop",
      });
      // Empty transcript keeps this deterministic (no live AI key in test env) while
      // still proving the end -> scheduler -> summarizeSession -> writeSummaryInternal
      // wiring actually fires.
      await asUser.mutation(api.interview.end, { sessionId, status: "completed" });
      await t.finishAllScheduledFunctions(vi.runAllTimers);
      const session = await t.run(async (ctx) => ctx.db.get(sessionId));
      expect(session?.status).toBe("completed");
      expect(session?.summary?.status).toBe("done");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a 'listen' call ending as tossed STILL gets a summary — filed and tossed alike", async () => {
    vi.useFakeTimers();
    try {
      const { t, asUser } = await setup();
      const sessionId = await asUser.mutation(api.interview.start, {
        experienceId: "listen",
        device: "desktop",
      });
      await asUser.mutation(api.interview.end, { sessionId, status: "tossed" });
      await t.finishAllScheduledFunctions(vi.runAllTimers);
      const session = await t.run(async (ctx) => ctx.db.get(sessionId));
      expect(session?.status).toBe("tossed");
      expect(session?.summary?.status).toBe("done");
    } finally {
      vi.useRealTimers();
    }
  });

  it("an onboarding call ending never gets a summary field", async () => {
    vi.useFakeTimers();
    try {
      const { t, asUser } = await setup();
      const sessionId = await asUser.mutation(api.interview.start, {
        experienceId: "text-interview",
        device: "desktop",
      });
      await asUser.mutation(api.interview.end, { sessionId, status: "completed" });
      await t.finishAllScheduledFunctions(vi.runAllTimers);
      const session = await t.run(async (ctx) => ctx.db.get(sessionId));
      expect(session?.summary).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("interview.latestListenSummaryInternal", () => {
  it("returns the most recent done summary for the user, excluding the given session", async () => {
    const { t, userId } = await setup();

    const older = await t.run(async (ctx) =>
      ctx.db.insert("interviewSessions", {
        userId,
        experienceId: "listen",
        status: "completed",
        device: "desktop",
        transcript: [],
        skipped: [],
        startedAt: 1,
        summary: { status: "done", text: "Older call about sleep.", at: 1 },
      }),
    );
    await new Promise((r) => setTimeout(r, 5));
    const newer = await t.run(async (ctx) =>
      ctx.db.insert("interviewSessions", {
        userId,
        experienceId: "listen",
        status: "completed",
        device: "desktop",
        transcript: [],
        skipped: [],
        startedAt: 2,
        summary: {
          status: "done",
          text: "Newer call about a career change.",
          topics: ["career"],
          openThreads: ["whether to tell their manager"],
          at: 2,
        },
      }),
    );
    void older;

    const current = await t.run(async (ctx) =>
      ctx.db.insert("interviewSessions", {
        userId,
        experienceId: "listen",
        status: "active",
        device: "desktop",
        transcript: [],
        skipped: [],
        startedAt: 3,
      }),
    );

    const result = await t.query(internal.interview.latestListenSummaryInternal, {
      userId,
      excludeSessionId: current as Id<"interviewSessions">,
    });
    expect(result).toEqual({
      text: "Newer call about a career change.",
      topics: ["career"],
      openThreads: ["whether to tell their manager"],
    });
  });

  it("skips sessions with no done summary and non-listen experiences", async () => {
    const { t, userId } = await setup();
    await t.run(async (ctx) =>
      ctx.db.insert("interviewSessions", {
        userId,
        experienceId: "listen",
        status: "abandoned",
        device: "desktop",
        transcript: [],
        skipped: [],
        startedAt: 1,
        summary: { status: "error", error: "boom", at: 1 },
      }),
    );
    await t.run(async (ctx) =>
      ctx.db.insert("interviewSessions", {
        userId,
        experienceId: "text-interview",
        status: "completed",
        device: "desktop",
        transcript: [],
        skipped: [],
        startedAt: 2,
        summary: { status: "done", text: "should never be read (not a listen session)", at: 2 },
      }),
    );
    const result = await t.query(internal.interview.latestListenSummaryInternal, { userId });
    expect(result).toBeNull();
  });

  it("returns null for a user with no prior listen sessions at all", async () => {
    const { t, userId } = await setup();
    const result = await t.query(internal.interview.latestListenSummaryInternal, { userId });
    expect(result).toBeNull();
  });
});
