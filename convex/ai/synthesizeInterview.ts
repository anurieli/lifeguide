import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { aiForTask } from "./openai";
import { ALL_KEYS } from "../../lib/levels";
import { BLUEPRINT } from "../../lib/blueprint";

// ─── Pure helper (unit-tested without network) ───────────────────────────────

/**
 * Given the user's current core answers and a map of AI-drafted answers,
 * determine what is safe to write (only empty slots), what conflicts with
 * authored text, and which keys remain empty even after the draft.
 */
export function applySynthesis(
  existing: Record<string, string>,
  drafted: Record<string, string | null>,
): { toWrite: Record<string, string>; conflicts: string[]; emptyKeys: string[] } {
  const toWrite: Record<string, string> = {};
  const conflicts: string[] = [];
  const emptyKeys: string[] = [];
  const isFilled = (v?: string | null) => !!v && v.trim().length > 0;
  for (const [key, draft] of Object.entries(drafted)) {
    const cur = existing[key];
    if (isFilled(draft)) {
      if (!isFilled(cur)) toWrite[key] = (draft as string);
      else if (cur.trim() !== (draft as string).trim()) conflicts.push(key);
      // if equal, no-op
    } else {
      if (!isFilled(cur)) emptyKeys.push(key);
    }
  }
  return { toWrite, conflicts, emptyKeys };
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function parseSynthesisJson(raw: string): Record<string, string | null> {
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        obj = JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        obj = {};
      }
    }
  }
  const result: Record<string, string | null> = {};
  for (const key of ALL_KEYS) {
    const val = obj[key];
    result[key] = typeof val === "string" && val.trim().length > 0 ? val.trim() : null;
  }
  return result;
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const keys = BLUEPRINT.flatMap((s) =>
    s.questions.map((q) => `${q.key}: ${q.title} — ${q.description.slice(0, 120)}`),
  ).join("\n");
  return `You are a synthesis assistant for a personal life-mapping app. You have just read a completed voice interview transcript in which a coach asked the user reflective questions about who they are and where they are going.

Your job: extract draft answers for the following blueprint questions, grounded ONLY in what the user actually said. If the transcript does not contain enough signal for a question, return null for that key.

Blueprint questions:
${keys}

Return ONLY a JSON object with exactly these keys. Values must be either a thoughtful drafted string (what the user said, in first person, condensed) or null. No extra keys, no prose outside the JSON.`;
}

function buildTranscript(
  transcript: Array<{ role: string; text: string; at?: number }>,
): string {
  return transcript
    .map((t) => `${t.role === "user" ? "User" : "Coach"}: ${t.text}`)
    .join("\n");
}

// ─── Convex action ────────────────────────────────────────────────────────────

export const synthesizeInterview = action({
  args: { sessionId: v.id("interviewSessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Load session
    const session = await ctx.runQuery(api.interview.get, { sessionId });
    if (!session) throw new Error("Session not found");

    // Load existing core answers
    const existingCore: Record<string, string> = await ctx.runQuery(api.core.get, {});

    // Build transcript text
    const transcriptText = buildTranscript(session.transcript);

    let drafted: Record<string, string | null> | null = null;
    try {
      // Call synthesis model
      const { client, model, temperature } = await aiForTask(ctx, "synthesis", userId);
      const res = await client.chat.completions.create({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: transcriptText || "(no transcript)" },
        ],
      });
      drafted = parseSynthesisJson(res.choices[0]?.message?.content ?? "{}");
    } catch {
      // No API key or model unavailable — synthesis skipped, but levels still recomputed below.
    }

    // Recompute levels regardless of whether synthesis succeeded — directly-written answers
    // (from appendTurn) are already in coreResponses and must be reflected in blueprint status.
    await ctx.runMutation(api.settings.recompute, {});

    if (drafted === null) {
      // Synthesis failed — return early with info about unfilled keys.
      return {
        filled: 0,
        conflicts: [],
        emptyKeys: ALL_KEYS.filter((k) => !existingCore[k]),
      };
    }

    const { toWrite, conflicts, emptyKeys } = applySynthesis(existingCore, drafted);

    // Write each safe answer
    for (const [questionKey, content] of Object.entries(toWrite)) {
      await ctx.runMutation(api.core.save, { questionKey, content });
    }

    // Log synthesized event
    await ctx.runMutation(internal.interview.logEvent, {
      userId,
      sessionId,
      experienceId: session.experienceId,
      event: "synthesized",
      meta: JSON.stringify({ conflicts, filled: Object.keys(toWrite) }),
    });

    // Log completed event
    await ctx.runMutation(internal.interview.logEvent, {
      userId,
      sessionId,
      experienceId: session.experienceId,
      event: "completed",
    });

    return { filled: Object.keys(toWrite).length, conflicts, emptyKeys };
  },
});
