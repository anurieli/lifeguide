// ============================================================================
// THE CENTER — post-call orchestrator.
// ============================================================================
// When a Listener (/speak) call ends, synthesizeSession reads every pillar with its
// current files, then fans out ONE isolated synthesis per pillar. Each pass decides
// what from the transcript belongs in that pillar's folder; the results are applied to
// the file system on the human (coreFiles), holding any contradiction for the person.
//
// The per-pillar contract (prompt + parsing) lives in agents/center/synthesis.ts; the
// pure op-planning lives in lib/center.ts. See agents/center/README.md.
// ============================================================================

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { aiForTask } from "./ai/openai";
import { buildPillarSynthesisPrompt, parsePillarSynthesis } from "../agents/center/synthesis";
import { planFileOps, type ExistingFile } from "../lib/center";

function buildTranscript(transcript: Array<{ role: string; text: string }>): string {
  return transcript.map((t) => `${t.role === "user" ? "Person" : "Listener"}: ${t.text}`).join("\n");
}

export const synthesizeSession = action({
  args: { sessionId: v.id("interviewSessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.runQuery(api.interview.get, { sessionId });
    if (!session) throw new Error("Session not found");

    const transcript = buildTranscript(session.transcript);
    const pillars = await ctx.runQuery(api.coreFiles.pillarsWithFiles, {});
    if (pillars.length === 0) {
      return { created: 0, updated: 0, pending: 0, pillarsTouched: 0 };
    }

    const ai = await aiForTask(ctx, "center", userId).catch(() => null);
    if (!ai) {
      // No key / model unavailable — nothing to file, but don't crash the call's end.
      return { created: 0, updated: 0, pending: 0, pillarsTouched: 0, error: "ai_unavailable" as const };
    }
    const { client, model, temperature } = ai;

    let created = 0;
    let updated = 0;
    let pending = 0;
    const touched = new Set<string>();

    // Fan out: one isolated synthesis per pillar. A failure in one pillar must not
    // sink the others, so each pass is independently guarded.
    await Promise.all(
      pillars.map(async ({ pillar, files }) => {
        let ops;
        try {
          const { system, user } = buildPillarSynthesisPrompt(
            { name: pillar.name, about: pillar.about, composition: pillar.composition },
            files.map((f) => ({ name: f.name, kind: f.kind, content: f.content })),
            transcript,
          );
          const res = await client.chat.completions.create({
            model,
            temperature,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          });
          ops = parsePillarSynthesis(res.choices[0]?.message?.content ?? "{}");
        } catch {
          return; // this pillar contributed nothing this session
        }

        const existing: ExistingFile[] = files.map((f) => ({ id: f.id, name: f.name }));
        const plan = planFileOps(existing, ops);
        if (plan.length > 0) touched.add(pillar._id);

        for (const op of plan) {
          if (op.type === "create") {
            await ctx.runMutation(internal.coreFiles.createFile, {
              userId,
              pillarId: pillar._id,
              name: op.name,
              content: op.content,
              kind: op.kind,
              sourceSessionId: sessionId,
            });
            created++;
          } else if (op.type === "update") {
            await ctx.runMutation(internal.coreFiles.updateFile, {
              userId,
              fileId: op.targetId as Id<"coreFiles">,
              name: op.name,
              content: op.content,
              kind: op.kind,
              sourceSessionId: sessionId,
            });
            updated++;
          } else {
            await ctx.runMutation(internal.coreFiles.holdPending, {
              userId,
              pillarId: pillar._id,
              supersedes: op.targetId as Id<"coreFiles">,
              name: op.name,
              content: op.content,
              kind: op.kind,
              note: op.note,
              sourceSessionId: sessionId,
            });
            pending++;
          }
        }
      }),
    );

    await ctx.runMutation(internal.interview.logEvent, {
      userId,
      sessionId,
      experienceId: session.experienceId,
      event: "synthesized",
      meta: JSON.stringify({ created, updated, pending, pillarsTouched: touched.size }),
    });

    return { created, updated, pending, pillarsTouched: touched.size };
  },
});
