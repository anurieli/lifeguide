import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { buildCoreInstructions } from "../../convex/ai/voice/index";
import { applySynthesis } from "../../convex/ai/synthesizeInterview";

// Exercises the persistence path behind ARI-2's Conversational Core mode without a
// live Convex deployment or network calls (convex-test runs the real backend
// functions against an in-memory DB — see tests/convex/interview.test.ts for the
// established pattern this follows). The realtime call and the LLM mapping step
// (mintRealtimeSession / synthesizeInterview) both need the network, so those stay
// covered by pure-function tests (buildCoreInstructions, applySynthesis) plus this
// mutation-level test of everything around them: starting a "core" session, the
// free-flowing transcript NOT auto-writing to coreResponses (unlike the typed
// interview, which tags every turn with a questionKey), and the shared
// coreResponses store that all three Core modes (grid/zen/conversational) read
// through `core.get`.

describe("Core Conversational mode — session + shared-data persistence", () => {
  it("starts a 'core' experienceId session distinct from onboarding's 'text-interview'/'voice-interview'", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { name: "Test User" }));
    const asUser = t.withIdentity({ subject: userId });

    const id = await asUser.mutation(api.interview.start, {
      experienceId: "core",
      device: "desktop",
    });
    const session = await asUser.query(api.interview.get, { sessionId: id });
    expect(session?.experienceId).toBe("core");
    expect(session?.status).toBe("active");
    expect(session?.transcript).toEqual([]);
  });

  it("free-flowing turns (no questionKey) accumulate in the transcript but do NOT write coreResponses directly", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { name: "Test User" }));
    const asUser = t.withIdentity({ subject: userId });

    const id = await asUser.mutation(api.interview.start, { experienceId: "core", device: "desktop" });
    await asUser.mutation(api.interview.appendTurn, {
      sessionId: id,
      role: "coach",
      text: "What does the person you want to become look like?",
    });
    await asUser.mutation(api.interview.appendTurn, {
      sessionId: id,
      role: "user",
      text: "Honestly I just want to be someone people can rely on.",
    });

    const session = await asUser.query(api.interview.get, { sessionId: id });
    expect(session?.transcript.length).toBe(2);

    // No questionKey was tagged (the call is free-flowing), so nothing should have
    // been written to coreResponses yet — mapping is deferred to synthesis.
    const core = await asUser.query(api.core.get, {});
    expect(core).toEqual({});
  });

  it("ending the session and applying a synthesis draft never overwrites an answer already on file, and both are visible via the same core.get every mode reads", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { name: "Test User" }));
    const asUser = t.withIdentity({ subject: userId });

    // Grid/Zen already hold an authored answer for s1q0.
    await asUser.mutation(api.core.save, { questionKey: "s1q0", content: "my own words" });

    const id = await asUser.mutation(api.interview.start, { experienceId: "core", device: "desktop" });
    await asUser.mutation(api.interview.appendTurn, {
      sessionId: id,
      role: "user",
      text: "I want to be dependable, and I want to finally get in shape.",
    });
    await asUser.mutation(api.interview.end, { sessionId: id, status: "completed" });

    const session = await asUser.query(api.interview.get, { sessionId: id });
    expect(session?.status).toBe("completed");

    // Simulate what synthesizeInterview would draft from that transcript (the LLM
    // call itself needs the network — covered separately by applySynthesis's own
    // unit test — this proves the write-back respects the same never-overwrite rule
    // when driven from a Conversational-mode session).
    const existingCore = await asUser.query(api.core.get, {});
    const drafted = { s1q0: "an ai paraphrase", s1q4: "I want to finally get in shape" };
    const { toWrite, conflicts } = applySynthesis(existingCore, drafted);
    expect(conflicts).toEqual(["s1q0"]); // authored answer stands; conflict surfaced, not applied
    for (const [questionKey, content] of Object.entries(toWrite)) {
      await asUser.mutation(api.core.save, { questionKey, content });
    }

    const core = await asUser.query(api.core.get, {});
    expect(core.s1q0).toBe("my own words"); // untouched
    expect(core.s1q4).toBe("I want to finally get in shape"); // filled from the conversation
  });
});

describe("buildCoreInstructions wiring (used by mintRealtimeSession for 'core' sessions)", () => {
  it("is a pure function callable with whatever core.get would return", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { name: "Test User" }));
    const asUser = t.withIdentity({ subject: userId });
    await asUser.mutation(api.core.save, { questionKey: "s1q0", content: "note to self" });

    const existingCore = await asUser.query(api.core.get, {});
    const instructions = buildCoreInstructions(existingCore);
    expect(instructions).toContain("already answered 1 of");
    expect(instructions).not.toMatch(/Still open:[^.]*\bs1q0\b/);
  });
});

// ─── The Convex action itself, end-to-end ──────────────────────────────────────
//
// mintRealtimeSession is a real Convex `action` (not a mutation), so it's the one
// piece of ARI-2 that genuinely needs an action-level test rather than a mutation
// test. It only touches the network for the OpenAI Realtime mint itself (see
// tests/voice-mint.test.ts, which pins that adapter's request/response contract);
// everything else it does — auth, loading the session, building the "core"
// instructions, logging — runs against the in-memory DB. Mocking `global.fetch`
// (the same technique tests/voice-mint.test.ts already uses) lets this run the
// real action handler, for real, with no live deployment and no network.
describe("mintRealtimeSession — 'core' experienceId (action-level)", () => {
  const realFetch = global.fetch;
  const realKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test";
  });
  afterEach(() => {
    global.fetch = realFetch;
    process.env.OPENAI_API_KEY = realKey;
    vi.restoreAllMocks();
  });

  it("mints a session and sends a persona built from the person's current Core answers", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { name: "Test User" }));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.core.save, { questionKey: "s1q0", content: "note to self" });
    const sessionId = await asUser.mutation(api.interview.start, {
      experienceId: "core",
      device: "desktop",
    });

    let sentInstructions = "";
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      sentInstructions = JSON.parse(init.body as string).session.instructions as string;
      return new Response(
        JSON.stringify({ value: "ek_test", expires_at: 1000, session: { model: "gpt-4o-mini-realtime-preview" } }),
        { status: 200 },
      );
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await asUser.action(api.ai.voice.index.mintRealtimeSession, { sessionId });

    expect(result.clientSecret).toBe("ek_test");
    // The instructions sent to OpenAI are the "core" persona, not the fixed onboarding one.
    expect(sentInstructions).toContain("talking through the person's Life Blueprint out loud");
    expect(sentInstructions).toContain("already answered 1 of");
    expect(sentInstructions).not.toMatch(/Still open:[^.]*\bs1q0\b/);

    // Telemetry: the mint logs a "voice_connected" experienceEvent for this session.
    const events = await t.run(async (ctx) =>
      ctx.db
        .query("experienceEvents")
        .filter((q) => q.eq(q.field("sessionId"), sessionId))
        .collect(),
    );
    expect(events.some((e) => e.event === "voice_connected")).toBe(true);
  });

  it("still mints the fixed onboarding persona for a non-'core' experienceId (no regression)", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { name: "Test User" }));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.interview.start, {
      experienceId: "voice-interview",
      device: "desktop",
    });

    let sentInstructions = "";
    global.fetch = vi.fn(async (_url: string, init: RequestInit) => {
      sentInstructions = JSON.parse(init.body as string).session.instructions as string;
      return new Response(
        JSON.stringify({ value: "ek_test", expires_at: 1000, session: { model: "gpt-4o-mini-realtime-preview" } }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    await asUser.action(api.ai.voice.index.mintRealtimeSession, { sessionId });
    expect(sentInstructions).toContain("conducting a calm onboarding interview");
  });
});
