import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { chatComplete } from "./ai/openai";
import { parseGoalIntent } from "./ai/parse";
import { assembleContext } from "./context/assemble";
import { ContextFragment } from "./context/types";

const TONE_GUIDE = {
  gentle: "Warm and encouraging. Patient. Never pushy.",
  balanced: "Warm but honest. Name things directly when it helps.",
  direct: "Direct and challenging, like a coach who believes in them. Still kind.",
} as const;

// Context-aware Coach reply (Mirror + goals + the surface they're on), persisted to the
// user's thread. History is loaded from the DB (not passed by the client) so the
// conversation survives reloads. Goal creation/update is a real write path (a thin
// wrapper over goals.createGoal/updateGoal, docs/decisions/0022); the board is still
// advisory-only — a future pass would add the same tool-call shape there.
export const ask = action({
  args: {
    message: v.string(),
    surfaceId: v.optional(v.id("surfaces")),
  },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Snapshot prior turns BEFORE persisting this one, then echo the user message immediately
    // (the mutation commits and pushes to the reactive `messages.list` subscribers right away).
    const prior = await ctx.runQuery(api.messages.list, {});
    const history = prior.slice(-8);
    await ctx.runMutation(api.messages.add, { role: "user", content: args.message });

    const fragments: ContextFragment[] = [];
    const mirror = await ctx.runQuery(api.mirror.assemble, {});
    if (mirror) fragments.push(mirror);
    const goalsFragment = await ctx.runQuery(api.goals.coachContext, {});
    if (goalsFragment) fragments.push(goalsFragment);
    if (args.surfaceId) {
      const surface = await ctx.runQuery(api.nodes.surfaceContext, { surfaceId: args.surfaceId });
      if (surface) fragments.push(surface);
    }
    const settings = await ctx.runQuery(api.settings.get, {});
    const tone = (settings?.coachTone ?? "balanced") as keyof typeof TONE_GUIDE;

    // Goal-intent classification runs before the reply, so the reply can
    // ground itself in what was actually just done. A thin wrapper over the
    // EXISTING goals.createGoal/updateGoal mutations — never a new write path.
    // Explicit, accepted tradeoff: every Coach turn now costs 2 model calls.
    let goalActionNote: string | null = null;
    const ids = await ctx.runQuery(api.goals.intentIds, {});
    const intentRaw = await chatComplete(ctx, {
      taskId: "coachGoalIntent",
      fn: "coach.ask#goalIntent",
      userId,
      jsonMode: true,
      messages: [
        {
          role: "system",
          content: `Known goal ids:\n${ids.goalIds.join("\n") || "(none)"}\n\nKnown pillar ids:\n${ids.pillarIds.join("\n") || "(none)"}`,
        },
        { role: "user", content: args.message },
      ],
    });
    const intent = parseGoalIntent(intentRaw, new Set(ids.goalIds), new Set(ids.pillarIds));
    if (intent.action === "createGoal") {
      await ctx.runMutation(api.goals.createGoal, {
        name: intent.name,
        why: intent.why,
        pillarId: intent.pillarId ? (intent.pillarId as Id<"pillars">) : undefined,
        deadline: intent.deadline,
      });
      goalActionNote = `You just created the goal/aspiration "${intent.name}" for them.`;
    } else if (intent.action === "updateGoal") {
      await ctx.runMutation(api.goals.updateGoal, {
        id: intent.goalId as Id<"goals">,
        name: intent.name,
        why: intent.why,
        pillarId: intent.pillarId ? (intent.pillarId as Id<"pillars">) : undefined,
        deadline: intent.deadline,
      });
      goalActionNote = "You just updated that goal for them.";
    }

    const context = assembleContext(fragments, 6000);

    const system = `You are the Coach inside LifeGuide, a calm, AI-first space that helps people (often young men) who feel lost reflect, find direction, and stay aligned with who they are becoming. You are not a generic chatbot or a therapist; you are a steady guide who remembers this person and can see what they are working on.

Tone: ${TONE_GUIDE[tone]}

What you can see right now about this person and their space:
${context || "(almost nothing yet, they are just getting started, so be welcoming and curious)"}
${goalActionNote ? `\n${goalActionNote} Mention it plainly in your reply — don't oversell it, don't repeat it if they didn't ask for confirmation.` : ""}

Rules: Be concise, usually 2 to 4 sentences. Talk like a real person, not a self-help book. No streaks, guilt, or hype. Ground what you say in what you can actually see above. If they ask about the board, describe what you would add and where it fits (you still can't place it there yourself). If they ask you to create or update a goal, you can actually do that — say so plainly when you did, never claim to have done something you didn't.`;

    // Model + provider come from convex/ai/config.ts (or the user's Settings override);
    // uses their own provider key if saved, else the env key. chatComplete logs the
    // call — tokens, estimated cost, duration — per ADR 0017.
    const out = await chatComplete(ctx, {
      taskId: "coachReply",
      fn: "coach.ask",
      userId,
      messages: [
        { role: "system", content: system },
        ...history.map((m) => ({
          role: m.role === "coach" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
        { role: "user", content: args.message },
      ],
    });
    const reply = out || "I'm here.";
    await ctx.runMutation(api.messages.add, { role: "coach", content: reply });
    return reply;
  },
});
