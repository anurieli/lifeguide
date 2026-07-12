"use node"; // audio transcription needs Buffer + the OpenAI SDK's toFile (node-only).

import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { toFile } from "openai";
import { aiForTask } from "./openai";
import { extractFromHtml, pageToExtractedText } from "../../lib/extractHtml";

// ============================================================================
// INGEST: every capture passes through here after create (and on reprocess).
// One job: turn the raw artifact into extractedText, durably, then hand off to
// distillation. The raw blob/url/text is never modified, so any capture can be
// re-ingested later ("go back and extrapolate after the fact").
//   text/quote  -> extractedText = rawText (no work)
//   audio       -> Whisper transcription of the stored blob
//   image       -> vision pass: what the image shows + any visible text
//   link/video  -> fetch the page, pull title/description/body
//   file        -> stored as-is for now (parsing is a follow-up)
// Every failure lands as extraction.status = "error" on the capture (visible in
// the Thought Stream with a retry), and distillation still runs on whatever
// text exists so the thought is never silently dropped.
// ============================================================================

const FETCH_TIMEOUT_MS = 15_000;
const EXTRACT_CAP = 8_000;

export const ingestCapture = internalAction({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args) => {
    const capture = await ctx.runQuery(internal.captures.getByIdInternal, {
      captureId: args.captureId,
    });
    if (!capture || !capture.isActive) return;

    let extractedText: string | undefined;
    let meta: string | undefined;
    let status: "done" | "skipped" | "error" = "done";
    let error: string | undefined;

    try {
      switch (capture.rawType) {
        case "text":
        case "quote":
          extractedText = capture.rawText?.trim() || undefined;
          status = "skipped";
          break;
        case "audio": {
          const r = await transcribeAudio(ctx, capture);
          extractedText = r.text;
          meta = r.meta;
          break;
        }
        case "image": {
          extractedText = await describeImage(ctx, capture);
          break;
        }
        case "link":
        case "video_link": {
          const r = await fetchLink(capture);
          extractedText = r.text;
          meta = r.meta;
          break;
        }
        case "file":
          // Durably stored; text extraction for documents is a follow-up.
          status = "skipped";
          break;
      }
    } catch (e) {
      status = "error";
      error = e instanceof Error ? e.message.slice(0, 300) : "extraction failed";
    }

    await ctx.runMutation(internal.captures.updateExtraction, {
      captureId: args.captureId,
      ...(extractedText ? { extractedText } : {}),
      extraction: { status, ...(error ? { error } : {}), ...(meta ? { meta } : {}), at: Date.now() },
    });

    // Distill regardless: it reads extractedText first, then rawText/rawUrl, so even a
    // failed extraction still yields a receipt from whatever is there.
    await ctx.scheduler.runAfter(0, internal.ai.distill.distillCapture, {
      captureId: args.captureId,
    });

    // A session-member capture refreshes its session's digest, debounced: the run
    // 30s out reads current state, so a burst of appends costs one model call.
    if (capture.sessionId) {
      await ctx.scheduler.runAfter(30_000, internal.ai.sessionDigest.digestSession, {
        sessionId: capture.sessionId,
      });
    }
  },
});

async function transcribeAudio(
  ctx: ActionCtx,
  capture: Doc<"captures">,
): Promise<{ text?: string; meta?: string }> {
  if (!capture.rawFileId) throw new Error("audio capture has no stored file");
  const blob = await ctx.storage.get(capture.rawFileId);
  if (!blob) throw new Error("stored audio not found");

  const mime = blob.type || "audio/webm";
  const bytes = blob.size;
  const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";

  // Whisper is OpenAI-only (OpenRouter exposes no audio endpoint); the
  // voiceTranscribe task pins the openai provider.
  const { client, model } = await aiForTask(ctx, "voiceTranscribe", capture.userId);
  const file = await toFile(Buffer.from(await blob.arrayBuffer()), `dump.${ext}`, { type: mime });
  const res = await client.audio.transcriptions.create({ file, model });
  const text = (res.text ?? "").trim();
  return {
    text: text || undefined,
    meta: JSON.stringify({ mime, bytes }),
  };
}

async function describeImage(ctx: ActionCtx, capture: Doc<"captures">): Promise<string | undefined> {
  if (!capture.rawFileId) throw new Error("image capture has no stored file");
  const url = await ctx.storage.getUrl(capture.rawFileId);
  if (!url) throw new Error("stored image not found");

  const { client, model, temperature, system } = await aiForTask(ctx, "extractImage", capture.userId);
  const res = await client.chat.completions.create({
    model,
    temperature,
    messages: [
      { role: "system", content: system! },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: capture.rawText?.trim()
              ? `The person attached this note to the image: "${capture.rawText.trim().slice(0, 500)}"`
              : "Describe this image for the person's file.",
          },
          { type: "image_url", image_url: { url } },
        ],
      },
    ],
  });
  const text = (res.choices[0]?.message?.content ?? "").trim();
  return text ? text.slice(0, EXTRACT_CAP) : undefined;
}

async function fetchLink(capture: Doc<"captures">): Promise<{ text?: string; meta?: string }> {
  if (!capture.rawUrl) throw new Error("link capture has no url");
  const url = capture.rawUrl;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some sites serve bots an empty shell; a browser UA gets the real page.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`fetch failed (${res.status})`);

  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();

  if (contentType.includes("html")) {
    const page = extractFromHtml(body, EXTRACT_CAP);
    return {
      text: pageToExtractedText(page, EXTRACT_CAP) || undefined,
      meta: JSON.stringify({
        title: page.title,
        description: page.description,
        siteName: page.siteName,
        url,
      }),
    };
  }
  if (contentType.includes("text/")) {
    return { text: body.slice(0, EXTRACT_CAP).trim() || undefined, meta: JSON.stringify({ url }) };
  }
  // Binary or unknown content: keep the url itself as the signal.
  return { text: undefined, meta: JSON.stringify({ url, contentType }) };
}
