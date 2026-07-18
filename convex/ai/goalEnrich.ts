import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { chatComplete } from "./openai";
import { parseGoalEnrichment } from "./parse";
import { assembleGoalEnrichInput } from "../../lib/goalEnrich";
import { TASKS } from "./config";

// Drafts an async "what this actually takes" summary + a 3-7 step starter
// roadmap the moment a goal/aspiration is created (or regenerated). Scheduled
// from convex/goals.ts, never blocking the create. Copies
// convex/ai/sessionDigest.ts's shape exactly: re-read fresh, try/catch, an
// explicit done/error status written back so the UI never hangs.
export const draftRoadmap = internalAction({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const goal = await ctx.runQuery(internal.goals.getForEnrichInternal, {
      goalId: args.goalId,
    });
    if (!goal) return; // deleted while scheduled

    try {
      const raw = await chatComplete(ctx, {
        taskId: "goalEnrich",
        fn: "ai/goalEnrich.draftRoadmap",
        userId: goal.userId,
        jsonMode: true,
        messages: [
          {
            role: "user",
            content: assembleGoalEnrichInput({
              name: goal.name,
              why: goal.why,
              deadline: goal.deadline,
              pillarName: goal.pillarName,
              laddersTo: goal.laddersTo,
            }),
          },
        ],
      });
      const parsed = parseGoalEnrichment(raw);
      if (!parsed.summary && parsed.steps.length === 0) throw new Error("empty enrichment");
      await ctx.runMutation(internal.goals.writeGoalEnrichmentInternal, {
        goalId: args.goalId,
        status: "done",
        summary: parsed.summary,
        model: TASKS.goalEnrich.model,
        steps: parsed.steps,
      });
    } catch {
      await ctx.runMutation(internal.goals.writeGoalEnrichmentInternal, {
        goalId: args.goalId,
        status: "error",
      });
    }
  },
});
