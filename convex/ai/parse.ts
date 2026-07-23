// Pure, dependency-free parsing of the distillation model's JSON output.
// Tolerant: handles clean JSON, prose-wrapped JSON, and garbage. Kept pure so it is unit-tested
// without a model or the Convex runtime.

export type Distilled = { title: string; essence: string; pillars: string[] };
export type BoardWorthy = { verdict: boolean; reason: string };

// The canonical pillar tag vocabulary the distiller may assign (lowercase).
export const PILLAR_TAGS = [
  "lifestyle",
  "health",
  "relationships",
  "financial",
  "growth",
  "money",
  "spirit",
];

function tolerantJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
  }
  return {};
}

export function parseDistilled(raw: string): Distilled {
  const obj = tolerantJson(raw);

  const title = typeof obj.title === "string" && obj.title.trim() ? obj.title.trim().slice(0, 80) : "Untitled";
  const essence = typeof obj.essence === "string" ? obj.essence.trim().slice(0, 400) : "";
  const pillars = Array.isArray(obj.pillars)
    ? Array.from(
        new Set(
          obj.pillars
            .filter((p): p is string => typeof p === "string")
            .map((p) => p.toLowerCase().trim())
            .filter((p) => PILLAR_TAGS.includes(p)),
        ),
      ).slice(0, 3)
    : [];

  return { title, essence, pillars };
}

// The vision sieve's verdict, read from the same distill response. Defaults to NOT
// board-worthy: on garbage or a missing field, an ambient capture stays out of the
// board Inbox rather than leaking in (explicit target="board" captures never need this).
export function parseBoardWorthy(raw: string): BoardWorthy {
  const obj = tolerantJson(raw);
  const verdict = obj.board_worthy === true;
  const reason =
    typeof obj.board_reason === "string" ? obj.board_reason.trim().slice(0, 200) : "";
  return { verdict, reason };
}

// The daily-quote agent's output (convex/ai/dailyQuote.ts): one real, attributed
// inspirational quote. STRICT by design: both a non-empty quote AND a non-empty
// attribution are required. A missing, non-string, or blank value for either
// returns null, and the caller marks the tidbit row `error` rather than showing a
// half-quote. We never fabricate an attribution: a blank author is a rejection, not
// a cue to stamp "Unknown" (that default let unattributed lines through, ARI-134).
// Tolerance is only about the WRAPPER: tolerantJson already accepts bare JSON,
// Markdown-fenced JSON, and JSON sitting inside a sentence of prose.
export type DailyQuote = { text: string; attribution: string };

const QUOTE_CAP = 400;
const ATTRIBUTION_CAP = 120;

export function parseDailyQuote(raw: string): DailyQuote | null {
  const obj = tolerantJson(raw);
  // Valid JSON that is not an object (the literal `null`, an array, a number)
  // leaves nothing to read; reject rather than crash on null property access.
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const text = typeof obj.quote === "string" ? obj.quote.trim().slice(0, QUOTE_CAP) : "";
  const attribution =
    typeof obj.author === "string" ? obj.author.trim().slice(0, ATTRIBUTION_CAP) : "";
  if (!text || !attribution) return null;
  return { text, attribution };
}

// A goal/aspiration's AI-drafted roadmap: a short "what this takes" summary
// plus 3-7 steps. `blockedByIndexes` are 0-based indexes into this same
// `steps` array (resolved from the model's own local ids, e.g. "s1") — the
// hand-off shape convex/goals.ts's writeGoalEnrichmentInternal inserts in
// order and patches real ids onto afterward.
export type GoalEnrichStep = { title: string; isNextMove: boolean; blockedByIndexes: number[] };
export type GoalEnrichment = { summary: string; steps: GoalEnrichStep[] };

const GOAL_SUMMARY_CAP = 400;
const GOAL_STEP_TITLE_CAP = 100;
const GOAL_MAX_STEPS = 7;

// The Coach's goal-intent classification: does the user's latest message ask
// to create or update a goal/aspiration? Cross-checks any id the model
// returns against ids actually fetched this call (knownGoalIds/knownPillarIds)
// — never trusts the model's string blindly, same discipline as elsewhere.
// Defaults to "none" on any ambiguity or unrecognized id.
export type GoalIntent =
  | { action: "none" }
  | { action: "createGoal"; name: string; why?: string; pillarId?: string; deadline?: string }
  | {
      action: "updateGoal";
      goalId: string;
      name?: string;
      why?: string;
      pillarId?: string;
      deadline?: string;
    };

// The one message the classifier sees: the known ids plus the raw text, as a
// SINGLE user turn. Deliberately never role "system" — chatComplete only
// prepends the task's own configured system prompt (config.ts's
// coachGoalIntent.system, which carries both the classifier's real
// instructions and the word "json" that OpenAI's json_object response mode
// requires somewhere in the prompt) when messages[0] isn't already role
// "system". A second system message here silently dropped those
// instructions and made every call 400 (see the coach.ts landing hotfix).
export function buildGoalIntentMessages(
  goalIds: string[],
  pillarIds: string[],
  message: string,
): { role: "user"; content: string }[] {
  return [
    {
      role: "user",
      content: `Known goal ids:\n${goalIds.join("\n") || "(none)"}\n\nKnown pillar ids:\n${pillarIds.join("\n") || "(none)"}\n\nMessage: ${message}`,
    },
  ];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseGoalIntent(
  raw: string,
  knownGoalIds: Set<string>,
  knownPillarIds: Set<string>,
): GoalIntent {
  const obj = tolerantJson(raw);
  const pillarId =
    typeof obj.pillarId === "string" && knownPillarIds.has(obj.pillarId)
      ? obj.pillarId
      : undefined;
  const deadline =
    typeof obj.deadline === "string" && DATE_RE.test(obj.deadline) ? obj.deadline : undefined;
  const why =
    typeof obj.why === "string" && obj.why.trim() ? obj.why.trim().slice(0, 300) : undefined;

  if (obj.action === "createGoal") {
    const name = typeof obj.name === "string" ? obj.name.trim().slice(0, 100) : "";
    if (!name) return { action: "none" };
    return { action: "createGoal", name, why, pillarId, deadline };
  }
  if (obj.action === "updateGoal") {
    const goalId = typeof obj.goalId === "string" ? obj.goalId : "";
    if (!goalId || !knownGoalIds.has(goalId)) return { action: "none" };
    const name =
      typeof obj.name === "string" && obj.name.trim() ? obj.name.trim().slice(0, 100) : undefined;
    return { action: "updateGoal", goalId, name, why, pillarId, deadline };
  }
  return { action: "none" };
}

export function parseGoalEnrichment(raw: string): GoalEnrichment {
  const obj = tolerantJson(raw);
  const summary =
    typeof obj.summary === "string" ? obj.summary.trim().slice(0, GOAL_SUMMARY_CAP) : "";

  type Draft = { localId: string; title: string; isNextMove: boolean; blockedByLocal: string[] };
  const drafts: Draft[] = [];
  const rawSteps = Array.isArray(obj.steps) ? obj.steps : [];
  for (const s of rawSteps) {
    if (drafts.length >= GOAL_MAX_STEPS) break;
    if (!s || typeof s !== "object") continue;
    const rec = s as Record<string, unknown>;
    const title =
      typeof rec.title === "string" ? rec.title.trim().slice(0, GOAL_STEP_TITLE_CAP) : "";
    if (!title) continue;
    const localId =
      typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : `s${drafts.length + 1}`;
    const blockedByLocal = Array.isArray(rec.blockedBy)
      ? rec.blockedBy.filter((b): b is string => typeof b === "string")
      : [];
    drafts.push({ localId, title, isNextMove: rec.nextMove === true, blockedByLocal });
  }
  // Never pad to fill: fewer than 3 valid steps is kept as-is.
  if (drafts.length === 0) return { summary, steps: [] };

  const indexByLocalId = new Map(drafts.map((d, i) => [d.localId, i]));

  // Resolve local ids to indexes, dropping self-references and unknown ids.
  const candidateBy: number[][] = drafts.map((d, i) =>
    Array.from(
      new Set(
        d.blockedByLocal
          .map((id) => indexByLocalId.get(id))
          .filter((idx): idx is number => idx !== undefined && idx !== i),
      ),
    ),
  );

  // Cycle guard (same technique as lib/thoughtMap.ts's normalizeThoughtMap):
  // accept each edge only if it doesn't already close a cycle back to its own
  // source — first edge in input order wins, the cycle-forming one is dropped.
  const accepted: number[][] = drafts.map(() => []);
  function dependsOn(from: number, target: number): boolean {
    const seen = new Set<number>();
    const stack = [...accepted[from]];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === target) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...accepted[cur]);
    }
    return false;
  }
  for (let i = 0; i < drafts.length; i++) {
    for (const dep of candidateBy[i]) {
      if (dependsOn(dep, i)) continue; // dep already leads back to i — would cycle
      accepted[i].push(dep);
    }
  }

  // Exactly one isNextMove: true — first-wins if several came back marked,
  // flip the first step true if none did.
  let nextMoveIdx = drafts.findIndex((d) => d.isNextMove);
  if (nextMoveIdx === -1) nextMoveIdx = 0;

  return {
    summary,
    steps: drafts.map((d, i) => ({
      title: d.title,
      isNextMove: i === nextMoveIdx,
      blockedByIndexes: accepted[i],
    })),
  };
}
