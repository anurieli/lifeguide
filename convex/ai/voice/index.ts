import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getVoiceProvider } from "./provider";
import { BLUEPRINT } from "../../../lib/blueprint";
import { LISTENER_INSTRUCTIONS } from "../../../agents/listener/persona";

const SECTION_TITLES = BLUEPRINT.map((s) => s.title).join(", ");

const INTERVIEW_INSTRUCTIONS = `You are LifeGuide's Coach conducting a calm onboarding interview to fill the user's Life Blueprint. The blueprint covers these sections: ${SECTION_TITLES}. Ask one question at a time, allow the user to skip, circle back to skipped topics once, never be pushy, keep a warm even tone.`;

/** Pick the realtime persona for a session. "listen" sessions get the Listener (free-form,
 *  reflective); everything else (onboarding) gets the blueprint interviewer. */
function instructionsFor(experienceId: string): string {
  return experienceId === "listen" ? LISTENER_INSTRUCTIONS : INTERVIEW_INSTRUCTIONS;
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
    const { clientSecret, model, expiresAt } = await getVoiceProvider().mint(
      instructionsFor(session.experienceId),
    );

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
