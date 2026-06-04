"use node"; // Whisper transcription uses Buffer + the OpenAI SDK's toFile (node-only).

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { toFile } from "openai";
import { api, internal } from "./_generated/api";
import { aiForTask } from "./ai/openai";
import { assembleContext } from "./context/assemble";
import { ContextFragment } from "./context/types";
import { Id } from "./_generated/dataModel";

// ============================================================================
// VoiceField server passes. Three actions turn speech into something useful:
//   transcribe() — one short audio segment -> text, via Whisper (OpenAI-direct).
//   shape()      — clean a raw transcript into what the field is asking for.
//   prompts()    — generate contextual "say this next" nudges for Prompt Mode.
// The client records in ~4s chunks and calls transcribe() per chunk, so text
// lands incrementally and a dropped chunk costs only itself; the on-device Web
// Speech transcript is the live-display + disconnect fallback. shape/prompts are
// field-aware (they receive the field's question/descriptor/intent) and
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
 * Transcribe ONE short audio segment (a few seconds of speech) with Whisper.
 * The VoiceField records in ~4s chunks and calls this per chunk so the transcript
 * fills in as the person talks and a single dropped chunk costs only itself.
 *
 * Whisper is OpenAI-only (OpenRouter exposes no audio endpoint), so the
 * "voiceTranscribe" task pins the openai provider; the key is the person's saved
 * OpenAI key, otherwise the deployment's OPENAI_API_KEY. Returns the segment's
 * text (trimmed); "" for a too-small/near-silent segment. A thrown error (no key,
 * network, decode) is non-fatal to the take — the client keeps the on-device Web
 * Speech transcript as the fallback.
 */
export const transcribe = action({
  args: { audio: v.bytes(), mimeType: v.optional(v.string()) },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // Skip empty/near-silent segments (a webm/opus header alone is ~hundreds of bytes).
    if (args.audio.byteLength < 1200) return "";

    const mime = args.mimeType ?? "audio/webm";
    const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";

    const { client, model } = await aiForTask(ctx, "voiceTranscribe", userId);
    const file = await toFile(Buffer.from(args.audio), `segment.${ext}`, { type: mime });
    const res = await client.audio.transcriptions.create({ file, model });
    return (res.text ?? "").trim();
  },
});

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
    const system = `You are a silent text editor. You receive a person's raw, spoken-aloud answer to one question and return a cleaned-up written version of THAT SAME answer. You are not a chatbot and you never talk to the person.

The question they were answering: "${args.question}"
${args.descriptor ? `Context for the question: ${args.descriptor}\n` : ""}What a good answer looks like: ${args.intent}

Editing rules:
- Rewrite ONLY what they actually said, in their own first-person voice. Preserve their meaning, specifics, and tone.
- Remove filler ("um", "like", "you know"), false starts, stutters, and repetition. Fix obvious speech-to-text errors and punctuation.
- Do NOT add ideas, facts, encouragement, or examples they didn't say. Do NOT pad length. A short answer stays short.

Output contract (critical):
- Return ONLY the cleaned answer text. Nothing else.
- NEVER add a preamble, greeting, or meta sentence. NEVER write things like "I'm here to help…", "Sure,", "Here's your answer:", or describe what you're doing.
- NEVER address the person or offer to help. You are not in a conversation.
- If the input is empty or unintelligible, return it unchanged.

Example —
Input: "um so i guess like i wanna be more consistent at the gym but i keep skipping mondays you know"
Output: I want to be more consistent at the gym. Mondays are my weak point — I keep skipping them.`;

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

/**
 * Brain dump: turn a free-form spoken transcript into one or more captures on
 * the board. Flow:
 *   1. AI "split" pass (brainDumpSplit) segments the transcript into distinct thoughts.
 *   2. One `captures.create` mutation per segment (each auto-schedules distillCapture).
 *   3. Returns the array of capture IDs the client uses to poll distill completion
 *      and then call placement.placeCapture for each.
 *
 * Single-thought dumps gracefully produce a one-element array.
 * Any AI failure falls back to treating the whole transcript as one capture.
 */
export const brainDump = action({
  args: {
    transcript: v.string(),
    surfaceId: v.id("surfaces"),
  },
  handler: async (ctx, args): Promise<Id<"captures">[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const transcript = args.transcript.trim();
    if (!transcript) return [];

    // Step 1: split the dump into distinct thoughts (server-side, key never reaches client).
    const segments: string[] = await ctx.runAction(internal.ai.splitDump.splitDump, {
      transcript,
      userId,
    });

    if (segments.length === 0) return [];

    // Step 2: create a capture for every segment. Each capture.create auto-schedules
    // distillCapture, so distillation begins immediately for all segments in parallel.
    const captureIds: Id<"captures">[] = [];
    for (const seg of segments) {
      const id = await ctx.runMutation(api.captures.create, {
        source: "audio",
        rawType: "text",
        rawText: seg,
      });
      captureIds.push(id);
    }

    return captureIds;
  },
});
