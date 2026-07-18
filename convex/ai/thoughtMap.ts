import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { chatComplete } from "./openai";
import { Doc } from "../_generated/dataModel";
import { normalizeThoughtMap, buildMapSystemPrompt } from "../../lib/thoughtMap";
import { TASKS } from "./config";

const INPUT_CAP = 8_000;

type MapCapture = Pick<Doc<"captures">, "createdAt" | "rawText" | "extractedText" | "extraction">;

// USER CONTENT ONLY, chronological — the map is what the person actually thought,
// never the interviewer's side of a dynamic-mode conversation.
function assembleThoughtMapInput(captures: MapCapture[]): string {
  const parts: string[] = [];
  for (const c of [...captures].sort((a, b) => a.createdAt - b.createdAt)) {
    if (c.extraction?.status === "pending") continue;
    const text = (c.extractedText ?? c.rawText ?? "").trim();
    if (text) parts.push(text);
  }
  return parts.join("\n\n").slice(0, INPUT_CAP);
}

// The post-hoc thought map (ARI-18, UX rework): builds itself in the background
// as a session fills up (convex/ai/ingest.ts schedules this 30s after each
// capture's ingest, same debounce pattern as the digest) — no tap required.
// `sessions.requestThoughtMap` (the "Map now"/"Remap" affordance) also schedules
// this directly, with no captureId, for an explicit run that always executes.
// One model call extracts the person's distinct thoughts as a hierarchy;
// lib/thoughtMap.ts's normalizeThoughtMap turns the untrusted JSON into the
// exact shape the thoughtMaps table expects. The person's own steering memo
// (settings.thoughtMapMemo, taught from the "Teach it" panel or Settings) is
// folded into the base system prompt via lib/thoughtMap.ts's
// buildMapSystemPrompt before every call — teachable per-user, not global.
export const generate = internalAction({
  args: { sessionId: v.id("sessions"), captureId: v.optional(v.id("captures")) },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.sessions.getForThoughtMapInternal, {
      sessionId: args.sessionId,
    });
    if (!data) return; // session deleted while this was scheduled
    const { session, captures } = data;

    // Auto-map supersede guard: when triggered by a specific capture (the
    // scheduled/auto path), skip if a newer capture has landed in the session
    // since — that capture's own scheduled run supersedes this one, last
    // capture wins (same pattern as convex/ai/sessionReply.ts maybeReply). The
    // manual requestThoughtMap path omits captureId, bypassing this guard, so
    // an explicit "Map now"/"Remap" always runs.
    if (args.captureId) {
      const trigger = captures.find((c) => c._id === args.captureId);
      if (!trigger) return; // the triggering capture was removed before this ran
      const newerCaptureExists = captures.some(
        (c) => c._id !== trigger._id && c.createdAt > trigger.createdAt,
      );
      if (newerCaptureExists) return;
    }

    const input = assembleThoughtMapInput(captures);
    if (!input) {
      await ctx.runMutation(internal.sessions.writeThoughtMapInternal, {
        sessionId: args.sessionId,
        status: "error",
        error: "nothing to map",
      });
      return;
    }

    try {
      // The steering memo (ARI-18 teachable map): standing, plain-language guidance
      // the person wrote for how THEY want their thinking mapped, folded into the
      // base system prompt as a clearly-fenced section. Built explicitly here (not
      // left to chatComplete's own system-prepend) because the memo must be woven in
      // per-user, per-call — passing an explicit system message is what chatComplete
      // expects when a call needs anything beyond the task's static config prompt.
      const memo = await ctx.runQuery(internal.settings.getMemoInternal, {
        userId: session.userId,
      });
      const system = buildMapSystemPrompt(TASKS.thoughtMap.system ?? "", memo);
      const raw = await chatComplete(ctx, {
        taskId: "thoughtMap",
        fn: "ai/thoughtMap.generate",
        userId: session.userId,
        jsonMode: true,
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
      });
      const result = normalizeThoughtMap(JSON.parse(raw || "{}"));
      if ("error" in result) {
        await ctx.runMutation(internal.sessions.writeThoughtMapInternal, {
          sessionId: args.sessionId,
          status: "error",
          error: result.error,
        });
        return;
      }
      await ctx.runMutation(internal.sessions.writeThoughtMapInternal, {
        sessionId: args.sessionId,
        status: "done",
        nodes: result.nodes,
        edges: result.edges,
        rootId: result.rootId,
      });
    } catch (e) {
      await ctx.runMutation(internal.sessions.writeThoughtMapInternal, {
        sessionId: args.sessionId,
        status: "error",
        error: e instanceof Error ? e.message.slice(0, 300) : "thought map generation failed",
      });
    }
  },
});
