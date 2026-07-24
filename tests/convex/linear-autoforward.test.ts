import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";

// Auto-forward: every feedback submission → a Linear `agent:cody` task (ADR
// 0031). autoForwardFeedback is an internal action, scheduled (not awaited)
// from feedback.submit, so it's exercised directly via t.action — same
// technique as tests/convex/core-conversational.test.ts's mintRealtimeSession
// coverage: mock global.fetch, run the real action handler, no live deployment,
// no network. See convex/linear.ts for the implementation this pins.

// convex-test resolves its default function-module glob relative to its OWN
// installed location, which (through this worktree's symlinked node_modules)
// points at the primary checkout, where convex/linear.ts lacks autoForwardFeedback.
// Passing `modules` computed relative to THIS file makes it load this worktree's
// convex/linear.ts (same convention as tests/convex/whats-new-seed.test.ts).
// (tsconfig has no vite/client types, this repo isn't Vite-built, hence the cast)
const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob(
  "../../convex/**/*.*s",
);

const BASE = {
  type: "bug" as const,
  text: "the button does nothing\nsecond line the title should not include",
  route: "/",
  view: "today",
  title: "LifeGuide",
  viewport: { w: 1280, h: 800 },
  userAgent: "test",
  errors: [],
};

async function setup() {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", { name: "Alice" }));
  return { t, asUser: t.withIdentity({ subject: userId }) };
}

// submit() itself schedules autoForwardFeedback via ctx.scheduler.runAfter(0,
// …). convex-test actually fires that (a real setTimeout), which would race
// this file's direct t.action() calls and its own fetch mocking. Insert the
// row directly instead of going through the mutation so only the explicit
// t.action() call below runs the action under test.
async function insertRow(t: ReturnType<typeof convexTest>, userId: any, overrides: any = {}) {
  return await t.run(async (ctx) =>
    ctx.db.insert("feedback", {
      userId,
      ...BASE,
      ...overrides,
      status: "open",
      createdAt: Date.now(),
    }),
  );
}

describe("linear.autoForwardFeedback", () => {
  const realFetch = global.fetch;
  const realFlag = process.env.FEEDBACK_AUTOFORWARD;
  const realKey = process.env.LINEAR_API_KEY;

  afterEach(() => {
    global.fetch = realFetch;
    process.env.FEEDBACK_AUTOFORWARD = realFlag;
    process.env.LINEAR_API_KEY = realKey;
    vi.restoreAllMocks();
  });

  it("no-ops when FEEDBACK_AUTOFORWARD is unset (default off) — no Linear call, no link set", async () => {
    delete process.env.FEEDBACK_AUTOFORWARD;
    process.env.LINEAR_API_KEY = "lin_test";
    const { t } = await setup();
    const userId = await t.run(async (ctx) => (await ctx.db.query("users").first())!._id);
    const feedbackId = await insertRow(t, userId);

    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await t.action(internal.linear.autoForwardFeedback, { feedbackId });

    expect(fetchMock).not.toHaveBeenCalled();
    const row = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(row!.linear).toBeUndefined();
  });

  it("no-ops when LINEAR_API_KEY is unset even with the flag on", async () => {
    process.env.FEEDBACK_AUTOFORWARD = "1";
    delete process.env.LINEAR_API_KEY;
    const { t, asUser } = await setup();
    const userId = await t.run(async (ctx) => (await ctx.db.query("users").first())!._id);
    const feedbackId = await insertRow(t, userId);

    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await t.action(internal.linear.autoForwardFeedback, { feedbackId });

    expect(fetchMock).not.toHaveBeenCalled();
    const row = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(row!.linear).toBeUndefined();
  });

  // Reusable issueCreate mock: captures the input, returns a fixed created issue.
  function mockIssueCreate(capture: (input: any) => void) {
    return vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      if (body.query.includes("issueCreate")) {
        capture(body.variables.input);
        return new Response(
          JSON.stringify({
            data: {
              issueCreate: {
                success: true,
                issue: { id: "issue_1", identifier: "ARI-500", url: "https://linear.app/x/issue/ARI-500" },
              },
            },
          }),
          { status: 200 },
        );
      }
      throw new Error(`unexpected fetch: ${body.query}`);
    });
  }

  it("type bug → agent:cody + Bug labels in Todo, and links the row", async () => {
    process.env.FEEDBACK_AUTOFORWARD = "1";
    process.env.LINEAR_API_KEY = "lin_test";
    const { t } = await setup();
    const userId = await t.run(async (ctx) => (await ctx.db.query("users").first())!._id);
    const feedbackId = await insertRow(t, userId); // BASE.type === "bug"

    let issueCreateInput: any = null;
    const fetchMock = mockIssueCreate((input) => (issueCreateInput = input));
    global.fetch = fetchMock as unknown as typeof fetch;

    await t.action(internal.linear.autoForwardFeedback, { feedbackId });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // agent:cody + Bug, in Todo — Cody picks it up.
    expect(issueCreateInput.labelIds).toEqual([
      "1e31d2da-32df-444d-9ee8-b18f5e86cb41",
      "38fe1250-6761-48ae-9369-01543777ad48",
    ]);
    expect(issueCreateInput.stateId).toBe("566dc2e2-f62e-4583-b5c4-a58d4cc1e249");
    expect(issueCreateInput.teamId).toBe("4b7ed3d5-b167-44cd-825c-becca23ac5c4");
    expect(issueCreateInput.projectId).toBe("e0af6c94-da8e-4ac3-8fd7-415f9c9cd2f8");
    expect(issueCreateInput.title).toBe("the button does nothing");
    expect(issueCreateInput.description).toContain("Repo: lifeguide");
    expect(issueCreateInput.description).toContain("What they said");
    expect(issueCreateInput.description).toContain(BASE.text);
    expect(issueCreateInput.description).toContain("Cody: read this");

    const row = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(row!.linear?.identifier).toBe("ARI-500");
    expect(row!.linear?.url).toBe("https://linear.app/x/issue/ARI-500");
    expect(row!.status).toBe("pending");
  });

  it("type tweak → agent:cody + Improvement labels in Todo", async () => {
    process.env.FEEDBACK_AUTOFORWARD = "1";
    process.env.LINEAR_API_KEY = "lin_test";
    const { t } = await setup();
    const userId = await t.run(async (ctx) => (await ctx.db.query("users").first())!._id);
    const feedbackId = await insertRow(t, userId, { type: "tweak" });

    let issueCreateInput: any = null;
    const fetchMock = mockIssueCreate((input) => (issueCreateInput = input));
    global.fetch = fetchMock as unknown as typeof fetch;

    await t.action(internal.linear.autoForwardFeedback, { feedbackId });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // agent:cody + Improvement (the "Tweak" equivalent), in Todo.
    expect(issueCreateInput.labelIds).toEqual([
      "1e31d2da-32df-444d-9ee8-b18f5e86cb41",
      "02037d25-de1f-47e9-89ec-705ac3500447",
    ]);
    expect(issueCreateInput.stateId).toBe("566dc2e2-f62e-4583-b5c4-a58d4cc1e249");

    const row = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(row!.linear?.identifier).toBe("ARI-500");
    expect(row!.status).toBe("pending");
  });

  it("type feature → Feature label only (no agent:cody), parked in Backlog", async () => {
    process.env.FEEDBACK_AUTOFORWARD = "1";
    process.env.LINEAR_API_KEY = "lin_test";
    const { t } = await setup();
    const userId = await t.run(async (ctx) => (await ctx.db.query("users").first())!._id);
    const feedbackId = await insertRow(t, userId, { type: "feature" });

    let issueCreateInput: any = null;
    const fetchMock = mockIssueCreate((input) => (issueCreateInput = input));
    global.fetch = fetchMock as unknown as typeof fetch;

    await t.action(internal.linear.autoForwardFeedback, { feedbackId });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Feature only — Cody must NOT pick it up — and parked in Backlog, not Todo.
    expect(issueCreateInput.labelIds).toEqual(["1d27c3d3-fc4e-4cc5-b789-45cd0e9f63ad"]);
    expect(issueCreateInput.labelIds).not.toContain("1e31d2da-32df-444d-9ee8-b18f5e86cb41");
    expect(issueCreateInput.stateId).toBe("04852289-beb0-4708-bdc5-a36d6c3fe7d4");

    const row = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(row!.linear?.identifier).toBe("ARI-500");
    expect(row!.status).toBe("pending");
  });

  it("type feedback → not filed at all: no Linear call, row left unlinked", async () => {
    process.env.FEEDBACK_AUTOFORWARD = "1";
    process.env.LINEAR_API_KEY = "lin_test";
    const { t } = await setup();
    const userId = await t.run(async (ctx) => (await ctx.db.query("users").first())!._id);
    const feedbackId = await insertRow(t, userId, { type: "feedback" });

    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await t.action(internal.linear.autoForwardFeedback, { feedbackId });

    // Stays in the app only — no issue created, no status change, no link.
    expect(fetchMock).not.toHaveBeenCalled();
    const row = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(row!.linear).toBeUndefined();
    expect(row!.status).toBe("open");
  });

  it("already-linked row is skipped — idempotent, no duplicate Linear call", async () => {
    process.env.FEEDBACK_AUTOFORWARD = "1";
    process.env.LINEAR_API_KEY = "lin_test";
    const { t } = await setup();
    const userId = await t.run(async (ctx) => (await ctx.db.query("users").first())!._id);
    const feedbackId = await insertRow(t, userId, {
      linear: { issueId: "issue_x", identifier: "ARI-1", url: "https://linear.app/x/issue/ARI-1", at: Date.now() },
    });

    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await t.action(internal.linear.autoForwardFeedback, { feedbackId });

    expect(fetchMock).not.toHaveBeenCalled();
    const row = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(row!.linear?.identifier).toBe("ARI-1"); // unchanged
  });

  it("embeds an attached image as markdown when the row has one", async () => {
    process.env.FEEDBACK_AUTOFORWARD = "1";
    process.env.LINEAR_API_KEY = "lin_test";
    const { t } = await setup();
    const userId = await t.run(async (ctx) => (await ctx.db.query("users").first())!._id);
    const imageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["fake-png"], { type: "image/png" })),
    );
    const feedbackId = await insertRow(t, userId, { imageIds: [imageId] });

    let issueCreateInput: any = null;
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (typeof url === "string" && url.includes("upload.example")) {
        return new Response(null, { status: 200 }); // the PUT of the blob bytes
      }
      const body = JSON.parse(init.body as string);
      if (body.query.includes("fileUpload")) {
        return new Response(
          JSON.stringify({
            data: {
              fileUpload: {
                success: true,
                uploadFile: {
                  uploadUrl: "https://upload.example/put",
                  assetUrl: "https://linear.app/assets/feedback-image.png",
                  headers: [],
                },
              },
            },
          }),
          { status: 200 },
        );
      }
      if (body.query.includes("issueCreate")) {
        issueCreateInput = body.variables.input;
        return new Response(
          JSON.stringify({
            data: {
              issueCreate: {
                success: true,
                issue: { id: "issue_2", identifier: "ARI-501", url: "https://linear.app/x/issue/ARI-501" },
              },
            },
          }),
          { status: 200 },
        );
      }
      throw new Error(`unexpected fetch: ${body.query}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await t.action(internal.linear.autoForwardFeedback, { feedbackId });

    expect(issueCreateInput.description).toContain(
      "![feedback image](https://linear.app/assets/feedback-image.png)",
    );
  });
});
