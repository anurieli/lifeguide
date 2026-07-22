import { describe, it, expect } from "vitest";
import { buildGoalIntentMessages, parseGoalEnrichment, parseGoalIntent } from "../convex/ai/parse";

describe("parseGoalEnrichment", () => {
  it("parses clean JSON with a summary and steps", () => {
    const r = parseGoalEnrichment(
      '{"summary":"This takes training and logistics.","steps":[{"id":"s1","title":"Book a guide","nextMove":true,"blockedBy":[]},{"id":"s2","title":"Train for altitude","nextMove":false,"blockedBy":["s1"]}]}',
    );
    expect(r.summary).toBe("This takes training and logistics.");
    expect(r.steps).toHaveLength(2);
    expect(r.steps[0]).toEqual({ title: "Book a guide", isNextMove: true, blockedByIndexes: [] });
    expect(r.steps[1]).toEqual({
      title: "Train for altitude",
      isNextMove: false,
      blockedByIndexes: [0],
    });
  });

  it("extracts JSON from prose-wrapped output", () => {
    const r = parseGoalEnrichment(
      'Sure! {"summary":"ok","steps":[{"id":"s1","title":"Step one","nextMove":true}]} Hope that helps.',
    );
    expect(r.summary).toBe("ok");
    expect(r.steps).toHaveLength(1);
  });

  it("falls back to empty on garbage", () => {
    const r = parseGoalEnrichment("not json at all");
    expect(r.summary).toBe("");
    expect(r.steps).toEqual([]);
  });

  it("clamps to at most 7 steps", () => {
    const steps = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i + 1}`,
      title: `Step ${i + 1}`,
      nextMove: i === 0,
    }));
    const r = parseGoalEnrichment(JSON.stringify({ summary: "s", steps }));
    expect(r.steps).toHaveLength(7);
  });

  it("never pads to fill — fewer than 3 valid steps is kept as-is", () => {
    const r = parseGoalEnrichment(
      '{"summary":"s","steps":[{"id":"s1","title":"Only step","nextMove":true}]}',
    );
    expect(r.steps).toHaveLength(1);
  });

  it("normalizes zero nextMove flags to the first step", () => {
    const r = parseGoalEnrichment(
      '{"summary":"s","steps":[{"id":"s1","title":"A","nextMove":false},{"id":"s2","title":"B","nextMove":false}]}',
    );
    expect(r.steps.map((s) => s.isNextMove)).toEqual([true, false]);
  });

  it("normalizes multiple nextMove flags to only the first", () => {
    const r = parseGoalEnrichment(
      '{"summary":"s","steps":[{"id":"s1","title":"A","nextMove":true},{"id":"s2","title":"B","nextMove":true}]}',
    );
    expect(r.steps.map((s) => s.isNextMove)).toEqual([true, false]);
  });

  it("drops a self-referencing blockedBy", () => {
    const r = parseGoalEnrichment(
      '{"summary":"s","steps":[{"id":"s1","title":"A","nextMove":true,"blockedBy":["s1"]}]}',
    );
    expect(r.steps[0].blockedByIndexes).toEqual([]);
  });

  it("drops a blockedBy referencing an unknown id", () => {
    const r = parseGoalEnrichment(
      '{"summary":"s","steps":[{"id":"s1","title":"A","nextMove":true,"blockedBy":["ghost"]}]}',
    );
    expect(r.steps[0].blockedByIndexes).toEqual([]);
  });

  it("breaks a cycle across three steps, dropping only the closing edge", () => {
    // s1 <- s3, s2 <- s1, s3 <- s2: a 3-cycle. Processed in input order, the
    // edge that would close the loop back to its own source is dropped.
    const r = parseGoalEnrichment(
      JSON.stringify({
        summary: "s",
        steps: [
          { id: "s1", title: "One", nextMove: true, blockedBy: ["s3"] },
          { id: "s2", title: "Two", nextMove: false, blockedBy: ["s1"] },
          { id: "s3", title: "Three", nextMove: false, blockedBy: ["s2"] },
        ],
      }),
    );
    expect(r.steps[0].blockedByIndexes).toEqual([2]); // s1 <- s3 kept
    expect(r.steps[1].blockedByIndexes).toEqual([0]); // s2 <- s1 kept
    expect(r.steps[2].blockedByIndexes).toEqual([]); // s3 <- s2 dropped (would cycle)
  });
});

describe("parseGoalIntent", () => {
  const goalIds = new Set(["g1", "g2"]);
  const pillarIds = new Set(["p1"]);

  it("defaults to none on garbage", () => {
    expect(parseGoalIntent("not json", goalIds, pillarIds)).toEqual({ action: "none" });
  });

  it("parses a createGoal intent", () => {
    const intent = parseGoalIntent(
      '{"action":"createGoal","name":"Learn Spanish","why":"for travel","pillarId":"p1","deadline":"2026-12-01"}',
      goalIds,
      pillarIds,
    );
    expect(intent).toEqual({
      action: "createGoal",
      name: "Learn Spanish",
      why: "for travel",
      pillarId: "p1",
      deadline: "2026-12-01",
    });
  });

  it("drops an unrecognized pillarId and an unparsable deadline rather than guessing", () => {
    const intent = parseGoalIntent(
      '{"action":"createGoal","name":"Run a marathon","pillarId":"ghost","deadline":"soon"}',
      goalIds,
      pillarIds,
    );
    expect(intent).toEqual({ action: "createGoal", name: "Run a marathon" });
  });

  it("rejects createGoal with an empty name", () => {
    expect(parseGoalIntent('{"action":"createGoal","name":"  "}', goalIds, pillarIds)).toEqual({
      action: "none",
    });
  });

  it("parses an updateGoal intent for a known goal id", () => {
    const intent = parseGoalIntent(
      '{"action":"updateGoal","goalId":"g1","deadline":"2026-08-01"}',
      goalIds,
      pillarIds,
    );
    expect(intent).toEqual({ action: "updateGoal", goalId: "g1", deadline: "2026-08-01" });
  });

  it("defaults to none when updateGoal references an unknown goal id — never invents one", () => {
    const intent = parseGoalIntent('{"action":"updateGoal","goalId":"ghost"}', goalIds, pillarIds);
    expect(intent).toEqual({ action: "none" });
  });

  it("defaults to none when updateGoal has no goalId at all", () => {
    expect(parseGoalIntent('{"action":"updateGoal","name":"x"}', goalIds, pillarIds)).toEqual({
      action: "none",
    });
  });
});

// Regression: the ADR 0029 landing sent the ids context as a second `role:
// "system"` message. chatComplete only prepends the coachGoalIntent task's
// configured system prompt (which carries the classifier's real instructions
// AND the word "json" that OpenAI's json_object response mode requires
// somewhere in the prompt) when messages[0] isn't already role "system" — so
// that variant silently dropped the real instructions and made every single
// Coach turn 400 in production, since this call has no try/catch of its own
// and its exception took the whole coach.ask reply down with it.
describe("buildGoalIntentMessages", () => {
  it("returns a single user-role message, never a system message", () => {
    const messages = buildGoalIntentMessages(["g1"], ["p1"], "make a goal");
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
  });

  it("includes the known ids and the raw message text in the one turn", () => {
    const messages = buildGoalIntentMessages(["g1", "g2"], ["p1"], "climb Everest by 2027");
    expect(messages[0].content).toContain("g1");
    expect(messages[0].content).toContain("g2");
    expect(messages[0].content).toContain("p1");
    expect(messages[0].content).toContain("climb Everest by 2027");
  });

  it("reads as (none) when there are no known ids yet", () => {
    const messages = buildGoalIntentMessages([], [], "anything");
    expect(messages[0].content).toContain("Known goal ids:\n(none)");
    expect(messages[0].content).toContain("Known pillar ids:\n(none)");
  });
});
