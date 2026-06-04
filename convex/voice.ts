import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { aiForTask } from "./ai/openai";
import { assembleContext } from "./context/assemble";
import { ContextFragment } from "./context/types";

// ============================================================================
// VoiceField server passes. Transcription is CLIENT-side (Web Speech API); these
// two actions are the AI layer that turns raw speech into something useful:
//   shape()   — clean a raw transcript into what the field is asking for.
//   prompts() — generate contextual "say this next" nudges for Prompt Mode.
// Both are field-aware (they receive the field's question/descriptor/intent) and
// person-aware (they read the Mirror via the Context Bus). See
// docs/product/features/voice-field.md.
// ============================================================================

const fieldArgs = {
  // The modular field bundle (mirrors lib/voiceField.ts FieldMeta). Passed from the client
  // so the same component works on any field with no server-side field registry.
  question: v.string(),
  intent: v.string(),
  descriptor: v.optional(v.string()),
} as const;

/**
 * Shape a raw spoken transcript into clean text fitted to the field.
 * Returns the cleaned string. The client keeps the raw transcript and offers a
 * "show raw" toggle — we never silently discard what the person actually said.
 */
export const shape = action({
  args: { raw: v.string(), ...fieldArgs },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const raw = args.raw.trim().slice(0, 4000);
    if (!raw) return "";

    const { client, model, temperature } = await aiForTask(ctx, "voiceShape", userId);
    const system = `You clean up spoken answers inside LifeGuide, a calm space that helps people get honest about who they are and where they're going.

The person is speaking an answer to ONE field. Your job: turn their raw, spoken words into clean written text that fits what the field is asking — nothing more.

The field:
- Question: ${args.question}
${args.descriptor ? `- Note to them: ${args.descriptor}\n` : ""}- What a good answer is: ${args.intent}

Rules:
- Keep THEIR meaning, voice, and specifics. Do not add ideas they didn't say. Do not invent facts.
- Remove filler ("um", "like", "you know"), false starts, and repetition. Fix obvious speech-to-text errors.
- Shape it toward the field's intent (e.g. if the field wants one concrete action, return one concrete action).
- Match the length the answer deserves — a sentence stays a sentence; don't pad.
- First person, plain and human. No preamble, no quotes, no labels. Return ONLY the cleaned answer text.`;

    const res = await client.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: raw },
      ],
    });
    return (res.choices[0]?.message?.content ?? raw).trim();
  },
});

/**
 * Prompt Mode: generate a few short, contextual suggestions of what the person
 * could say next on THIS field, grounded in what we know about them (the Mirror).
 * `partial` is whatever they've said so far (may be empty at the start).
 * Returns up to 3 short strings; returns [] on any trouble (Prompt Mode is ambient, never blocking).
 */
export const prompts = action({
  args: { partial: v.optional(v.string()), ...fieldArgs },
  handler: async (ctx, args): Promise<string[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Person context (best-effort): the Mirror, assembled under a small budget.
    const fragments: ContextFragment[] = [];
    const mirror = await ctx.runQuery(api.mirror.assemble, {});
    if (mirror) fragments.push(mirror);
    const context = assembleContext(fragments, 1200);

    const said = (args.partial ?? "").trim().slice(0, 1500);
    const system = `You run "Prompt Mode" inside LifeGuide: as someone speaks an answer aloud, you surface a FEW gentle nudges for what they could say next — like a thoughtful interviewer who helps them go deeper.

The field they're answering:
- Question: ${args.question}
${args.descriptor ? `- Note: ${args.descriptor}\n` : ""}- What a good answer is: ${args.intent}

${context ? `What you know about this person:\n${context}\n` : ""}
Return ONLY a JSON object: {"prompts": ["...", "...", "..."]}.
- 2 to 3 items. Each is SHORT (max ~8 words), a question or a direction, not an answer.
- Make them specific to this field and, where possible, to this person. Never generic ("tell me more").
- If they've started talking, build on what they said; if not, help them begin.
- Calm and curious. No pressure, no hype.`;

    try {
      const { client, model, temperature } = await aiForTask(ctx, "voicePrompts", userId);
      const res = await client.chat.completions.create({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: said ? `So far they said: "${said}"` : "(they haven't started yet)" },
        ],
      });
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
      const list = Array.isArray(parsed?.prompts) ? parsed.prompts : [];
      return list
        .filter((p: unknown): p is string => typeof p === "string" && p.trim().length > 0)
        .slice(0, 3)
        .map((p: string) => p.trim());
    } catch {
      return []; // ambient feature — never surface an error into the UI
    }
  },
});
