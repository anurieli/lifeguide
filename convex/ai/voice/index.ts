import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getVoiceProvider } from "./provider";
import { logAi } from "../openai";
import { BLUEPRINT } from "../../../lib/blueprint";
import { LISTENER_INSTRUCTIONS } from "../../../agents/listener/persona";

const SECTION_TITLES = BLUEPRINT.map((s) => s.title).join(", ");
const ALL_BLUEPRINT_QUESTIONS = BLUEPRINT.flatMap((s) => s.questions);

const INTERVIEW_INSTRUCTIONS = `You are LifeGuide's Coach conducting a calm onboarding interview to fill the user's Life Blueprint. The blueprint covers these sections: ${SECTION_TITLES}. Ask one question at a time, allow the user to skip, circle back to skipped topics once, never be pushy, keep a warm even tone.`;

/**
 * Instructions for the Core's Conversational mode (ADR 0022). Unlike onboarding, this
 * session can start at any point — the person may already have 0, some, or all 18
 * Blueprint answers. The persona is told what's already filled so it never re-asks a
 * settled question, and what's still open so it favors that ground. It does NOT tag
 * turns to a specific key in real time (the conversation is meant to flow freely);
 * mapping happens after the call via `ai/synthesizeInterview.ts`, the same pass
 * onboarding's voice interview already uses. Exported for unit testing — pure
 * function, no ctx, no network.
 */
export function buildCoreInstructions(existingCore: Record<string, string>): string {
  const isFilled = (v?: string) => !!v && v.trim().length > 0;
  const remaining = ALL_BLUEPRINT_QUESTIONS.filter((q) => !isFilled(existingCore[q.key]));
  const filledCount = ALL_BLUEPRINT_QUESTIONS.length - remaining.length;

  const status =
    filledCount === 0
      ? "They haven't answered any Blueprint questions yet — this is a first pass."
      : remaining.length === 0
        ? "Every Blueprint question already has an answer. Don't interrogate a checklist — invite them to reflect on or revise whatever they bring up."
        : `They've already answered ${filledCount} of ${ALL_BLUEPRINT_QUESTIONS.length} Blueprint questions. Don't re-ask those — pick up wherever they want to go, favoring what's still open.`;

  const remainingList =
    remaining.length > 0
      ? `Still open: ${remaining.map((q) => `${q.key}: ${q.title}`).join("; ")}.`
      : "";

  return `You are LifeGuide's Coach, talking through the person's Life Blueprint out loud instead of having them type it. The blueprint covers these sections: ${SECTION_TITLES}.
${status}
${remainingList}
Ask one thing at a time, warm and unhurried, like a real conversation, not a form read aloud. Follow their thread over your own order; let them skip or wander. Never be pushy.`.trim();
}

/** Pick the realtime persona for a session. "listen" sessions get the Listener (free-form,
 *  reflective); "core" sessions get `buildCoreInstructions` (built by the caller below, since
 *  it needs the person's current core answers); everything else (onboarding) gets the fixed
 *  blueprint interviewer. */
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

    // Mint the realtime session token with the persona that fits this session. "core"
    // sessions (Core's Conversational mode) get a personalized prompt built from the
    // person's current Core answers; everything else uses the fixed persona.
    const started = Date.now();
    const instructions =
      session.experienceId === "core"
        ? buildCoreInstructions(await ctx.runQuery(api.core.get, {}))
        : instructionsFor(session.experienceId);
    const { clientSecret, model, expiresAt } = await getVoiceProvider().mint(instructions);
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
