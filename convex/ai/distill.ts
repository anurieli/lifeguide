import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { chatComplete } from "./openai";
import { parseBoardWorthy, parseDistilled, parseReadable } from "./parse";
import { isLongAudioTranscript, LONG_AUDIO_DISTILL_INPUT_CAP } from "../../lib/audioReadable";

// Default character cap on the distilled input: enough for title/essence/pillars/sieve.
const DEFAULT_INPUT_CAP = 6000;

// Appended to the distill call ONLY for a long spoken take (ARI-145; see
// lib/audioReadable.ts's threshold). It asks the SAME model call to also return the two
// readable fields, so a long audio capture gets a concise summary + a grammar-cleaned
// full transcript without a second model call. Short notes never send this and keep
// their raw-transcript experience unchanged (no extra tokens, no cleanup).
const READABLE_INSTRUCTION =
  `This capture is a long spoken transcript that may ramble, with filler words and false starts. In the SAME JSON object, also include these two fields:\n` +
  `"summary": 2-3 warm, plain sentences capturing the gist of what they said, what was on their mind and where it landed.\n` +
  `"cleaned": the FULL transcript rewritten for reading. Remove filler ("um", "like", "you know"), false starts, and stutters, and fix grammar and punctuation, but keep the person's own words, voice, and EVERY point they made. Do not summarize, shorten, or add anything; this is the whole thought, just tidied.`;

// Distill a capture into {title, essence, pillars}. Scheduled by captures.create.
// Internal: only the server schedules it; the key never reaches the client.
export const distillCapture = internalAction({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args) => {
    const capture = await ctx.runQuery(internal.captures.getByIdInternal, {
      captureId: args.captureId,
    });
    if (!capture || !capture.isActive) return;

    // A long spoken take earns two extra derived fields from THIS same call (ARI-145):
    // a concise summary and a grammar-cleaned full transcript. Short notes skip it. Its
    // "cleaned" output must be the whole thought, so the long path sends the full
    // transcript up to a larger documented cap (LONG_AUDIO_DISTILL_INPUT_CAP) instead of
    // the default 6000-char slice that suits the title/essence/sieve job.
    const wantReadable = isLongAudioTranscript(capture.rawType, capture.extractedText);
    const input = buildInput(capture, wantReadable ? LONG_AUDIO_DISTILL_INPUT_CAP : DEFAULT_INPUT_CAP);
    if (!input) return; // nothing textual to distill yet (e.g. a bare image) — placed as-is

    const messages: { role: "user"; content: string }[] = [{ role: "user", content: input }];
    if (wantReadable) messages.push({ role: "user", content: READABLE_INSTRUCTION });

    // Uses the user's own provider key if they saved one, else the deployment env key.
    // chatComplete prepends the config system prompt and logs the call (ADR 0017).
    const raw =
      (await chatComplete(ctx, {
        taskId: "distill",
        fn: "ai/distill.distillCapture",
        userId: capture.userId,
        jsonMode: true,
        messages,
      })) || "{}";
    const distilled = parseDistilled(raw);
    // The vision sieve rides the same response: ambient captures (no explicit
    // target) only reach the board Inbox if this verdict says they're a piece
    // of the life the person wants (ADR 0014).
    const boardWorthy = { ...parseBoardWorthy(raw), at: Date.now() };
    // Read the readable pair from the same response. Null (partial/garbled) leaves
    // `readable` unset, and the card falls back to the raw transcript — never a loss.
    const readable = wantReadable ? parseReadable(raw) : null;
    await ctx.runMutation(internal.captures.updateDistilled, {
      captureId: args.captureId,
      distilled,
      boardWorthy,
      ...(readable ? { readable } : {}),
    });
  },
});

function buildInput(capture: Doc<"captures">, textCap: number): string | null {
  // Prefer the ingested text (transcript, article body, image description): it is the
  // richest signal. Fall back to the raw text, then the bare URL. `textCap` is the
  // default 6000 for most captures, raised on the long-audio readable path so the
  // cleaned output isn't silently truncated (ARI-145).
  if (capture.extractedText && capture.extractedText.trim()) {
    const note =
      capture.rawText && capture.rawText.trim() && capture.rawText !== capture.extractedText
        ? `The person's own note: ${capture.rawText.trim().slice(0, 500)}\n\n`
        : "";
    return (note + capture.extractedText.trim()).slice(0, textCap);
  }
  if (capture.rawText && capture.rawText.trim()) return capture.rawText.trim().slice(0, 4000);
  if (capture.rawUrl) return `A link the person saved and found worth keeping: ${capture.rawUrl}`;
  return null;
}
