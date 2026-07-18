import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { chatComplete } from "./openai";
import { assembleSummaryInput, parseSessionSummary } from "../../lib/listenerMemory";

// ============================================================================
// The Listener's memory backbone (ARI-23) — the post-call summary pass.
// ============================================================================
// Distinct from the Center (convex/center.ts), which files what was heard into
// WHO the person is (coreFiles). This pass answers a different question: what
// have this person and the Listener been talking about lately — conversation
// memory that grounds the NEXT call's opening (agents/listener/persona.ts,
// convex/ai/voice/index.ts). Scheduled from convex/interview.ts's `end` mutation
// on EVERY call end, whatever the final status (completed, abandoned, or tossed
// alike, ADR 0022) — a toss only withholds the Center's identity filing, never
// this conversational memory. See docs/decisions/0023-listener-memory-backbone.md
// and docs/product/features/listener.md.
// ============================================================================

export const summarizeSession = internalAction({
  args: { sessionId: v.id("interviewSessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.runQuery(internal.interview.getForSummaryInternal, { sessionId });
    if (!session) return; // deleted before this ran
    if (session.experienceId !== "listen") return; // onboarding sessions don't need this

    const input = assembleSummaryInput(session.transcript);
    if (!input) {
      // A real, common outcome: opened and closed with nothing said. No AI call
      // needed — "done" with no text, so the next call's handoff finds nothing to
      // hand off (lib/listenerMemory.ts's buildListenerOpeningAddendum no-ops).
      await ctx.runMutation(internal.interview.writeSummaryInternal, {
        sessionId,
        status: "done",
      });
      return;
    }

    try {
      const raw = await chatComplete(ctx, {
        taskId: "listenerSummary",
        fn: "ai/listenerMemory.summarizeSession",
        userId: session.userId,
        jsonMode: true,
        messages: [{ role: "user", content: input }],
      });
      const parsed = parseSessionSummary(raw || "");
      if (!parsed) {
        await ctx.runMutation(internal.interview.writeSummaryInternal, {
          sessionId,
          status: "error",
          error: "empty or unparsable summary",
        });
        return;
      }
      await ctx.runMutation(internal.interview.writeSummaryInternal, {
        sessionId,
        status: "done",
        text: parsed.text,
        topics: parsed.topics,
        openThreads: parsed.openThreads,
      });
    } catch (e) {
      await ctx.runMutation(internal.interview.writeSummaryInternal, {
        sessionId,
        status: "error",
        error: e instanceof Error ? e.message.slice(0, 300) : "summarize failed",
      });
    }
  },
});
