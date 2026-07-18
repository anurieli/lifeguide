import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getVoiceProvider } from "./provider";
import { logAi } from "../openai";
import { BLUEPRINT } from "../../../lib/blueprint";
import { buildListenerInstructions } from "../../../agents/listener/persona";
import { buildListenerOpeningAddendum } from "../../../lib/listenerMemory";
import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

const SECTION_TITLES = BLUEPRINT.map((s) => s.title).join(", ");

const INTERVIEW_INSTRUCTIONS = `You are LifeGuide's Coach conducting a calm onboarding interview to fill the user's Life Blueprint. The blueprint covers these sections: ${SECTION_TITLES}. Ask one question at a time, allow the user to skip, circle back to skipped topics once, never be pushy, keep a warm even tone.`;

/** Pick the realtime persona for a session. "listen" sessions get the Listener (free-form,
 *  reflective), grounded in a summary of the person's last call when one exists (ARI-23,
 *  the memory backbone — see docs/decisions/0023-listener-memory-backbone.md); everything
 *  else (onboarding) gets the blueprint interviewer, unchanged. */
async function instructionsFor(
  ctx: ActionCtx,
  experienceId: string,
  userId: Id<"users">,
  sessionId: Id<"interviewSessions">,
): Promise<string> {
  if (experienceId !== "listen") return INTERVIEW_INSTRUCTIONS;
  const prev = await ctx.runQuery(internal.interview.latestListenSummaryInternal, {
    userId,
    excludeSessionId: sessionId,
  });
  return buildListenerInstructions(buildListenerOpeningAddendum(prev));
}

export const mintRealtimeSession = action({
  args: {
    sessionId: v.id("interviewSessions"),
  },
  handler: async (ctx, { sessionId }) => {
    // Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify session belongs to this user
    const session = await ctx.runQuery(api.interview.get, { sessionId });
    if (!session) throw new Error("Interview session not found or not accessible");

    // Mint the realtime session token with the persona that fits this session.
    const started = Date.now();
    const { clientSecret, model, expiresAt } = await getVoiceProvider().mint(
      await instructionsFor(ctx, session.experienceId, userId, sessionId),
    );
    // Log the mint (ADR 0017). The conversation itself runs client-side over WebRTC,
    // so per-token usage never reaches the server; this row marks that a realtime
    // session started, on which model, for whom.
    await logAi(ctx, {
      userId,
      taskId: "voice",
      fn: "ai/voice.mintRealtimeSession",
      provider: "openai",
      model,
      kind: "realtime",
      ok: true,
      durationMs: Date.now() - started,
    });

    // Log telemetry
    await ctx.runMutation(internal.interview.logEvent, {
      userId,
      sessionId,
      experienceId: session.experienceId,
      event: "voice_connected",
    });

    return { clientSecret, model, expiresAt };
  },
});
