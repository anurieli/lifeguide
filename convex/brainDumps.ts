import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { aiForEngine } from "./ai/openai";
import { ProviderId } from "./ai/config";
import {
  DEFAULT_BRAIN_DUMP_ENGINE,
  BrainDumpGraph,
  normalizeBrainDumpGraph,
  parseBrainDumpGraph,
} from "../lib/brainDumpGraph";
import { internal } from "./_generated/api";

const PROVIDER = v.union(v.literal("openrouter"), v.literal("openai"), v.literal("local"));
const TRANSCRIPT_SOURCE = v.union(v.literal("speech"), v.literal("typed"));
const TRANSCRIPT_STATUS = v.union(
  v.literal("pending"),
  v.literal("processed"),
  v.literal("error"),
);

const IDEA = v.object({
  id: v.string(),
  title: v.string(),
  summary: v.string(),
  details: v.array(v.string()),
  mentions: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const RELATION = v.object({
  id: v.string(),
  from: v.string(),
  to: v.string(),
  label: v.string(),
  reason: v.string(),
  strength: v.number(),
  createdAt: v.number(),
});

const GRAPH = v.object({
  version: v.literal(1),
  ideas: v.array(IDEA),
  relations: v.array(RELATION),
});

const ENGINE = v.object({
  provider: PROVIDER,
  model: v.string(),
  temperature: v.number(),
  systemPrompt: v.string(),
});

const BRAIN_DUMP_ENFORCED_RULES = `Non-negotiable runtime rules:
- If the newest sentence is only a greeting, sign-off, filler, mic test, repeated fragment, or low-information utterance, return the current JSON unchanged.
- Do not create duplicate or redundant ideas. Merge overlapping concepts into the older stable idea id.
- Do not repeat details with slightly different wording.
- Keep transcript text and idea objects separate: ideas are conceptual summaries with supporting details, never raw transcript chunks.`;

const JUNK_WORDS = new Set([
  "bye",
  "goodbye",
  "hello",
  "hi",
  "hey",
  "okay",
  "ok",
  "yeah",
  "yes",
  "no",
  "test",
  "testing",
  "thank",
  "thanks",
  "peace",
  "you",
]);

function defaultTitle(now: number): string {
  return `Brain dump ${new Date(now).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

function entryId(now: number, text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return `T${now.toString(36)}${Math.abs(hash).toString(36).slice(0, 5)}`.toUpperCase();
}

function callId(now: number, text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33 + text.charCodeAt(i)) | 0;
  }
  return `C${now.toString(36)}${Math.abs(hash).toString(36).slice(0, 5)}`.toUpperCase();
}

function cleanSentence(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 1400);
}

function cleanTranscriptBlock(text: string): string {
  let cleaned = cleanSentence(text)
    .replace(/\b(um|uh|er|ah)\b[,\s]*/gi, "")
    .replace(/\b(you know)\s*\??/gi, "")
    .trim();
  cleaned = cleaned.replace(
    /\s*(and i'll see you next time\.?\s*)?((thank you( very much)?|thanks|bye|goodbye|peace|you bye)[.!?\s]*)+$/i,
    "",
  );
  const words = cleaned.split(/\s+/).filter(Boolean);
  const deduped: string[] = [];
  for (const word of words) {
    const prev = deduped[deduped.length - 1];
    if (prev && normalizeForCompare(prev) === normalizeForCompare(word)) continue;
    deduped.push(word);
  }
  return deduped.join(" ").replace(/\s+([,.!?])/g, "$1").trim();
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDuplicateTranscript(text: string, transcript: Array<{ text: string }>): boolean {
  const normalized = normalizeForCompare(text);
  if (!normalized) return true;
  return transcript.some((entry) => {
    const other = normalizeForCompare(entry.text);
    if (!other) return false;
    if (other === normalized) return true;
    return normalized.length >= 20 && (other.includes(normalized) || normalized.includes(other));
  });
}

function isSubstantialTranscript(text: string): boolean {
  const normalized = normalizeForCompare(text);
  if (!normalized) return false;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.every((word) => JUNK_WORDS.has(word))) return false;
  const unique = new Set(words).size;
  if (words.length < 4) return words.length >= 2 && unique >= 2 && normalized.length >= 14;
  return unique >= 3;
}

function cleanEngine(engine: {
  provider: ProviderId;
  model: string;
  temperature: number;
  systemPrompt: string;
}) {
  return {
    provider: engine.provider,
    model: engine.model.trim().slice(0, 120) || DEFAULT_BRAIN_DUMP_ENGINE.model,
    temperature: Math.min(1, Math.max(0, engine.temperature)),
    systemPrompt:
      engine.systemPrompt.trim().slice(0, 8000) ||
      DEFAULT_BRAIN_DUMP_ENGINE.systemPrompt,
  };
}

function transcriptText(
  transcript: Array<{ id: string; text: string; capturedAt: number; source: string; status: string }>,
): string {
  return transcript
    .map((entry) => `- ${entry.text}`)
    .join("\n")
    .slice(-12_000);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("brainDumpSessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .take(24);
  },
});

export const get = query({
  args: { sessionId: v.id("brainDumpSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;
    return session;
  },
});

export const create = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"brainDumpSessions">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("brainDumpSessions", {
      userId,
      title: args.title?.trim().slice(0, 80) || defaultTitle(now),
      transcript: [],
      graph: normalizeBrainDumpGraph({ version: 1, ideas: [], relations: [] }, now),
      engine: DEFAULT_BRAIN_DUMP_ENGINE,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const rename = mutation({
  args: { sessionId: v.id("brainDumpSessions"), title: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.sessionId, {
      title: args.title.trim().slice(0, 80) || session.title,
      updatedAt: Date.now(),
    });
  },
});

export const updateEngine = mutation({
  args: {
    sessionId: v.id("brainDumpSessions"),
    engine: ENGINE,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.sessionId, {
      engine: cleanEngine(args.engine),
      updatedAt: Date.now(),
    });
  },
});

export const deleteTranscriptEntry = mutation({
  args: { sessionId: v.id("brainDumpSessions"), entryId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.sessionId, {
      transcript: session.transcript.filter((entry) => entry.id !== args.entryId),
      updatedAt: Date.now(),
    });
  },
});

export const deleteIdea = mutation({
  args: { sessionId: v.id("brainDumpSessions"), ideaId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Not found");
    const graph = normalizeBrainDumpGraph(session.graph, Date.now());
    await ctx.db.patch(args.sessionId, {
      graph: {
        ...graph,
        ideas: graph.ideas.filter((idea) => idea.id !== args.ideaId),
        relations: graph.relations.filter(
          (relation) => relation.from !== args.ideaId && relation.to !== args.ideaId,
        ),
      },
      updatedAt: Date.now(),
    });
  },
});

export const getForAction = internalQuery({
  args: { sessionId: v.id("brainDumpSessions"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) return null;
    return session;
  },
});

export const appendEntryInternal = internalMutation({
  args: {
    sessionId: v.id("brainDumpSessions"),
    userId: v.id("users"),
    entry: v.object({
      id: v.string(),
      text: v.string(),
      capturedAt: v.number(),
      source: TRANSCRIPT_SOURCE,
      status: TRANSCRIPT_STATUS,
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) throw new Error("Not found");
    await ctx.db.patch(args.sessionId, {
      transcript: [...session.transcript, args.entry].slice(-240),
      updatedAt: Date.now(),
    });
  },
});

export const finishEntryInternal = internalMutation({
  args: {
    sessionId: v.id("brainDumpSessions"),
    userId: v.id("users"),
    entryId: v.string(),
    graph: GRAPH,
    status: TRANSCRIPT_STATUS,
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) throw new Error("Not found");
    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      graph: normalizeBrainDumpGraph(args.graph, now),
      transcript: session.transcript.map((entry) =>
        entry.id === args.entryId ? { ...entry, status: args.status } : entry,
      ),
      updatedAt: now,
    });
  },
});

export const startAiCallInternal = internalMutation({
  args: {
    sessionId: v.id("brainDumpSessions"),
    userId: v.id("users"),
    call: v.object({
      id: v.string(),
      kind: v.string(),
      provider: PROVIDER,
      model: v.string(),
      status: v.literal("pending"),
      inputPreview: v.string(),
      startedAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) throw new Error("Not found");
    await ctx.db.patch(args.sessionId, {
      aiCalls: [...(session.aiCalls ?? []), args.call].slice(-80),
      updatedAt: Date.now(),
    });
  },
});

export const finishAiCallInternal = internalMutation({
  args: {
    sessionId: v.id("brainDumpSessions"),
    userId: v.id("users"),
    callId: v.string(),
    status: v.union(v.literal("success"), v.literal("error")),
    outputPreview: v.optional(v.string()),
    error: v.optional(v.string()),
    endedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) throw new Error("Not found");
    await ctx.db.patch(args.sessionId, {
      aiCalls: (session.aiCalls ?? []).map((call) =>
        call.id === args.callId
          ? {
              ...call,
              status: args.status,
              outputPreview: args.outputPreview,
              error: args.error,
              endedAt: args.endedAt,
            }
          : call,
      ),
      updatedAt: Date.now(),
    });
  },
});

export const processSentence = action({
  args: {
    sessionId: v.id("brainDumpSessions"),
    text: v.string(),
    source: TRANSCRIPT_SOURCE,
  },
  handler: async (ctx, args): Promise<BrainDumpGraph> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sentence = cleanTranscriptBlock(args.text);
    const session = await ctx.runQuery(internal.brainDumps.getForAction, {
      sessionId: args.sessionId,
      userId,
    });
    if (!session) throw new Error("Not found");
    if (!sentence) return normalizeBrainDumpGraph(session.graph);
    if (!isSubstantialTranscript(sentence)) {
      console.log("brainDumps.processSentence.skip_unsubstantial", { sentence: sentence.slice(0, 160) });
      return normalizeBrainDumpGraph(session.graph);
    }
    if (isDuplicateTranscript(sentence, session.transcript)) {
      console.log("brainDumps.processSentence.skip_duplicate", { sentence: sentence.slice(0, 160) });
      return normalizeBrainDumpGraph(session.graph);
    }

    const now = Date.now();
    const id = entryId(now, sentence);
    await ctx.runMutation(internal.brainDumps.appendEntryInternal, {
      sessionId: args.sessionId,
      userId,
      entry: {
        id,
        text: sentence,
        capturedAt: now,
        source: args.source,
        status: "pending",
      },
    });

    const latest = await ctx.runQuery(internal.brainDumps.getForAction, {
      sessionId: args.sessionId,
      userId,
    });
    const baseGraph = normalizeBrainDumpGraph(latest?.graph ?? session.graph, now);
    const engine = cleanEngine(latest?.engine ?? session.engine);
    const promptPayload = JSON.stringify(
      {
        transcript: transcriptText(latest?.transcript ?? session.transcript),
        newestSentence: sentence,
        currentJson: baseGraph,
      },
      null,
      2,
    );
    const aiCallId = callId(now, sentence);
    await ctx.runMutation(internal.brainDumps.startAiCallInternal, {
      sessionId: args.sessionId,
      userId,
      call: {
        id: aiCallId,
        kind: "brainDumpGraph",
        provider: engine.provider,
        model: engine.model,
        status: "pending",
        inputPreview: promptPayload.slice(0, 900),
        startedAt: now,
      },
    });

    let nextGraph = baseGraph;
    let status: "processed" | "error" = "processed";
    try {
      const { client, model, temperature } = await aiForEngine(
        ctx,
        {
          provider: engine.provider,
          model: engine.model,
          temperature: engine.temperature,
          system: `${engine.systemPrompt}\n\n${BRAIN_DUMP_ENFORCED_RULES}`,
        },
        userId,
      );
      const res = await client.chat.completions.create({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${engine.systemPrompt}\n\n${BRAIN_DUMP_ENFORCED_RULES}` },
          { role: "user", content: promptPayload },
        ],
      });
      const rawOutput = res.choices[0]?.message?.content ?? "{}";
      nextGraph = parseBrainDumpGraph(rawOutput, now);
      await ctx.runMutation(internal.brainDumps.finishAiCallInternal, {
        sessionId: args.sessionId,
        userId,
        callId: aiCallId,
        status: "success",
        outputPreview: rawOutput.slice(0, 1200),
        endedAt: Date.now(),
      });
    } catch (err) {
      nextGraph = baseGraph;
      status = "error";
      await ctx.runMutation(internal.brainDumps.finishAiCallInternal, {
        sessionId: args.sessionId,
        userId,
        callId: aiCallId,
        status: "error",
        error: err instanceof Error ? err.message.slice(0, 500) : "AI call failed",
        outputPreview: JSON.stringify(nextGraph).slice(0, 1200),
        endedAt: Date.now(),
      });
    }

    await ctx.runMutation(internal.brainDumps.finishEntryInternal, {
      sessionId: args.sessionId,
      userId,
      entryId: id,
      graph: nextGraph,
      status,
    });

    return nextGraph;
  },
});
