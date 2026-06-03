import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { aiClient, resolveModel } from "./ai/openai";
import { assembleContext } from "./context/assemble";
import { ContextFragment } from "./context/types";

const TONE_GUIDE = {
  gentle: "Warm and encouraging. Patient. Never pushy.",
  balanced: "Warm but honest. Name things directly when it helps.",
  direct: "Direct and challenging, like a coach who believes in them. Still kind.",
} as const;

// Single-turn Coach reply, context-aware (Mirror + the surface they're on). Plan 2 adds tools
// (so it can act on the board) and thread persistence; this is the live, grounded conversation.
export const ask = action({
  args: {
    message: v.string(),
    history: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("coach")),
        content: v.string(),
      }),
    ),
    surfaceId: v.optional(v.id("surfaces")),
  },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const fragments: ContextFragment[] = [];
    const mirror = await ctx.runQuery(api.mirror.assemble, {});
    if (mirror) fragments.push(mirror);
    if (args.surfaceId) {
      const surface = await ctx.runQuery(api.nodes.surfaceContext, { surfaceId: args.surfaceId });
      if (surface) fragments.push(surface);
    }
    const settings = await ctx.runQuery(api.settings.get, {});
    const tone = (settings?.coachTone ?? "balanced") as keyof typeof TONE_GUIDE;
    const context = assembleContext(fragments, 6000);

    const system = `You are the Coach inside LifeGuide, a calm, AI-first space that helps people (often young men) who feel lost reflect, find direction, and stay aligned with who they are becoming. You are not a generic chatbot or a therapist; you are a steady guide who remembers this person and can see what they are working on.

Tone: ${TONE_GUIDE[tone]}

What you can see right now about this person and their space:
${context || "(almost nothing yet, they are just getting started, so be welcoming and curious)"}

Rules: Be concise, usually 2 to 4 sentences. Talk like a real person, not a self-help book. No streaks, guilt, or hype. Ground what you say in what you can actually see above. If they ask you to put something on their board, describe what you would add and where it fits (in this version you cannot place it yourself yet).`;

    const { client, provider } = aiClient();
    const res = await client.chat.completions.create({
      model: resolveModel("openai/gpt-4o-mini", provider),
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        ...args.history.map((m) => ({
          role: m.role === "coach" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
        { role: "user", content: args.message },
      ],
    });
    return res.choices[0]?.message?.content ?? "I'm here.";
  },
});
