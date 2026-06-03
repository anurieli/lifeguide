import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { aiForTask } from "./openai";
import { parseDistilled } from "./parse";

// Distill a capture into {title, essence, pillars}. Scheduled by captures.create.
// Internal: only the server schedules it; the key never reaches the client.
export const distillCapture = internalAction({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args) => {
    const capture = await ctx.runQuery(internal.captures.getByIdInternal, {
      captureId: args.captureId,
    });
    if (!capture || !capture.isActive) return;

    const input = buildInput(capture);
    if (!input) return; // nothing textual to distill yet (e.g. a bare image) — placed as-is

    // Uses the user's own provider key if they saved one, else the deployment env key.
    const { client, model, temperature, system } = await aiForTask(ctx, "distill", capture.userId);
    const res = await client.chat.completions.create({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system! },
        { role: "user", content: input },
      ],
    });

    const distilled = parseDistilled(res.choices[0]?.message?.content ?? "{}");
    await ctx.runMutation(internal.captures.updateDistilled, {
      captureId: args.captureId,
      distilled,
    });
  },
});

function buildInput(capture: Doc<"captures">): string | null {
  if (capture.rawText && capture.rawText.trim()) return capture.rawText.trim().slice(0, 4000);
  if (capture.rawUrl) return `A link the person saved and found worth keeping: ${capture.rawUrl}`;
  return null;
}
