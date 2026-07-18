import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { appendTranscriptTurn } from "./lib/transcript";

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Load a session and assert it belongs to the authenticated user. Throws if not found or unauthorized. */
async function requireSession(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
  sessionId: Id<"interviewSessions">,
) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId) throw new Error("Not found");
  return session;
}

/** Compute a hex SHA-256 digest using the Web Crypto API available in the Convex runtime. */
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Validate a QR join token against the session record. Returns the session on success; throws on any failure. */
async function requireValidToken(
  ctx: MutationCtx | QueryCtx,
  sessionId: Id<"interviewSessions">,
  token: string,
) {
  const session = await ctx.db.get(sessionId);
  if (!session) throw new Error("Not found");
  if (!session.joinTokenHash || !session.joinTokenExpiresAt) throw new Error("Expired");
  if (session.joinTokenExpiresAt < Date.now()) throw new Error("Expired");
  const hash = await sha256(token);
  if (hash !== session.joinTokenHash) throw new Error("Invalid token");
  return session;
}

// ─── Internal mutation ────────────────────────────────────────────────────────

/** Inserts a row into experienceEvents. Used internally; not part of the public API. */
export const logEvent = internalMutation({
  args: {
    userId: v.id("users"),
    sessionId: v.optional(v.id("interviewSessions")),
    experienceId: v.string(),
    event: v.string(),
    questionKey: v.optional(v.string()),
    meta: v.optional(v.string()),
  },
  handler: async (ctx, { userId, sessionId, experienceId, event, questionKey, meta }) => {
    await ctx.db.insert("experienceEvents", {
      userId,
      sessionId,
      experienceId,
      event,
      questionKey,
      meta,
      at: Date.now(),
    });
  },
});

// ─── Public mutations ─────────────────────────────────────────────────────────

/** Create a new interview session and record a "started" event. Returns the session id. */
export const start = mutation({
  args: {
    experienceId: v.string(),
    device: v.union(v.literal("desktop"), v.literal("phone")),
  },
  handler: async (ctx, { experienceId, device }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sessionId = await ctx.db.insert("interviewSessions", {
      userId,
      experienceId,
      status: "active",
      device,
      transcript: [],
      skipped: [],
      startedAt: Date.now(),
    });

    await ctx.db.insert("experienceEvents", {
      userId,
      sessionId,
      experienceId,
      event: "started",
      at: Date.now(),
    });

    return sessionId;
  },
});

/** Upsert a coreResponse row for a given user and questionKey. */
async function upsertCoreResponse(
  ctx: MutationCtx,
  userId: Id<"users">,
  questionKey: string,
  content: string,
) {
  const trimmed = content.trim();
  if (!trimmed) return;
  const now = Date.now();
  const existing = await ctx.db
    .query("coreResponses")
    .withIndex("by_user_question", (q) => q.eq("userId", userId).eq("questionKey", questionKey))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { content: trimmed, updatedAt: now });
  } else {
    await ctx.db.insert("coreResponses", { userId, questionKey, content: trimmed, updatedAt: now });
  }
}

/** Append a coach or user turn to the session transcript. If role==="user", also logs an "answered" event. */
export const appendTurn = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    role: v.union(v.literal("coach"), v.literal("user")),
    questionKey: v.optional(v.string()),
    text: v.string(),
  },
  handler: async (ctx, { sessionId, role, questionKey, text }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await requireSession(ctx, userId, sessionId);

    const turn: { role: "coach" | "user"; questionKey?: string; text: string; at: number } = {
      role,
      text,
      at: Date.now(),
    };
    if (questionKey !== undefined) turn.questionKey = questionKey;

    await ctx.db.patch(sessionId, {
      transcript: appendTranscriptTurn(session.transcript, turn),
    });

    if (role === "user") {
      // Persist directly to coreResponses so the text path is deterministic (no LLM dependency).
      if (questionKey && text.trim()) {
        await upsertCoreResponse(ctx, userId, questionKey, text);
      }

      await ctx.db.insert("experienceEvents", {
        userId,
        sessionId,
        experienceId: session.experienceId,
        event: "answered",
        questionKey,
        at: Date.now(),
      });
    }
  },
});

/** Mark a question as skipped (deduplicated). Logs a "skipped" event. */
export const skip = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    questionKey: v.string(),
  },
  handler: async (ctx, { sessionId, questionKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await requireSession(ctx, userId, sessionId);

    const skipped = session.skipped.includes(questionKey)
      ? session.skipped
      : [...session.skipped, questionKey];

    await ctx.db.patch(sessionId, { skipped });

    await ctx.db.insert("experienceEvents", {
      userId,
      sessionId,
      experienceId: session.experienceId,
      event: "skipped",
      questionKey,
      at: Date.now(),
    });
  },
});

/** Mark a session as completed, abandoned, or tossed. Logs an event named by the
 *  status. For a "listen" (Listener) session, this also schedules the memory-backbone
 *  summary pass (ARI-23) — filed, abandoned, AND tossed alike, since ending a call
 *  always produces a conversational memory even when nothing goes to the Core. See
 *  convex/ai/listenerMemory.ts and docs/decisions/0023-listener-memory-backbone.md. */
export const end = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    status: v.union(v.literal("completed"), v.literal("abandoned"), v.literal("tossed")),
  },
  handler: async (ctx, { sessionId, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await requireSession(ctx, userId, sessionId);

    await ctx.db.patch(sessionId, { status, endedAt: Date.now() });

    await ctx.db.insert("experienceEvents", {
      userId,
      sessionId,
      experienceId: session.experienceId,
      event: status,
      at: Date.now(),
    });

    if (session.experienceId === "listen") {
      await ctx.scheduler.runAfter(0, internal.ai.listenerMemory.summarizeSession, { sessionId });
    }
  },
});

// ─── Public queries ───────────────────────────────────────────────────────────

/** Return the session if it belongs to the authenticated user, else null. */
export const get = query({
  args: { sessionId: v.id("interviewSessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return null;
    return session;
  },
});

/** PUBLIC — redeem a QR join token and return a safe view of the session (no sensitive fields).
 *  Returns null on any validation failure (expired, missing, bad hash) so callers get a graceful state.
 */
export const joinWithToken = query({
  args: {
    sessionId: v.id("interviewSessions"),
    token: v.string(),
  },
  handler: async (ctx, { sessionId, token }) => {
    let session: Awaited<ReturnType<typeof requireValidToken>>;
    try {
      session = await requireValidToken(ctx, sessionId, token);
    } catch {
      return null;
    }
    return {
      _id: session._id,
      experienceId: session.experienceId,
      status: session.status,
      transcript: session.transcript,
      skipped: session.skipped,
    };
  },
});

// ─── Listener memory backbone plumbing (server-only, convex/ai/listenerMemory.ts) ──
// ARI-23. No auth check: these run off the scheduler (no client identity in ctx),
// same shape as sessions.ts's getForReplyInternal/getForThoughtMapInternal.

/** Internal — fetch a session by id, no auth. Used by the summarize action, which
 *  runs server-scheduled off `end`, not on a request from the session's owner. */
export const getForSummaryInternal = internalQuery({
  args: { sessionId: v.id("interviewSessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

/** Internal — write the post-call summary (ARI-23). A session gets exactly one
 *  summary; this overwrites in place if it ever reran. */
export const writeSummaryInternal = internalMutation({
  args: {
    sessionId: v.id("interviewSessions"),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
    text: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
    openThreads: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      summary: {
        status: args.status,
        text: args.text,
        topics: args.topics,
        openThreads: args.openThreads,
        error: args.error,
        at: Date.now(),
      },
    });
  },
});

/** Internal — the most recent PAST "listen" call for this person with a done,
 *  non-empty summary: the "session per speaker" continuity thread this account's
 *  Listener calls form (docs/decisions/0023-listener-memory-backbone.md). Used to
 *  ground the NEXT call's opening (convex/ai/voice/index.ts). Excludes the session
 *  currently being minted (its own future, not its past). Scans the 20 most recent
 *  sessions of ANY experience for this user — cheap at this account's call cadence;
 *  a compound index can be added if that ever stops being true. */
export const latestListenSummaryInternal = internalQuery({
  args: { userId: v.id("users"), excludeSessionId: v.optional(v.id("interviewSessions")) },
  handler: async (ctx, { userId, excludeSessionId }) => {
    const recent = await ctx.db
      .query("interviewSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
    for (const s of recent) {
      if (s._id === excludeSessionId) continue;
      if (s.experienceId !== "listen") continue;
      if (s.summary?.status === "done" && s.summary.text) {
        return {
          text: s.summary.text,
          topics: s.summary.topics ?? [],
          openThreads: s.summary.openThreads ?? [],
        };
      }
    }
    return null;
  },
});

// ─── Token-issuing mutation ───────────────────────────────────────────────────

/** Issue a short-lived QR join token for a session. Owner-only. Returns the raw token (never stored). */
export const issueJoinToken = mutation({
  args: { sessionId: v.id("interviewSessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await requireSession(ctx, userId, sessionId);

    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const joinTokenHash = await sha256(token);
    const joinTokenExpiresAt = Date.now() + 10 * 60_000; // 10 minutes

    await ctx.db.patch(sessionId, { joinTokenHash, joinTokenExpiresAt });
    return { token };
  },
});

// ─── Token-guarded public mutations ──────────────────────────────────────────

/** PUBLIC — mark that the phone scanned the QR. Validates the token and logs a qr_scanned event. */
export const markJoined = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    token: v.string(),
  },
  handler: async (ctx, { sessionId, token }) => {
    const session = await requireValidToken(ctx, sessionId, token);
    await ctx.db.insert("experienceEvents", {
      userId: session.userId,
      sessionId,
      experienceId: session.experienceId,
      event: "qr_scanned",
      at: Date.now(),
    });
  },
});

/** PUBLIC — append a turn to the transcript via token (phone side). */
export const appendTurnByToken = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    token: v.string(),
    role: v.union(v.literal("coach"), v.literal("user")),
    questionKey: v.optional(v.string()),
    text: v.string(),
  },
  handler: async (ctx, { sessionId, token, role, questionKey, text }) => {
    const session = await requireValidToken(ctx, sessionId, token);

    const turn: { role: "coach" | "user"; questionKey?: string; text: string; at: number } = {
      role,
      text,
      at: Date.now(),
    };
    if (questionKey !== undefined) turn.questionKey = questionKey;

    await ctx.db.patch(sessionId, {
      transcript: appendTranscriptTurn(session.transcript, turn),
    });

    if (role === "user") {
      // Persist directly to coreResponses so the text path is deterministic (no LLM dependency).
      if (questionKey && text.trim()) {
        await upsertCoreResponse(ctx, session.userId, questionKey, text);
      }

      await ctx.db.insert("experienceEvents", {
        userId: session.userId,
        sessionId,
        experienceId: session.experienceId,
        event: "answered",
        questionKey,
        at: Date.now(),
      });
    }
  },
});

/** PUBLIC — end the session via token (phone side). */
export const endByToken = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    token: v.string(),
    status: v.union(v.literal("completed"), v.literal("abandoned")),
  },
  handler: async (ctx, { sessionId, token, status }) => {
    const session = await requireValidToken(ctx, sessionId, token);
    await ctx.db.patch(sessionId, { status, endedAt: Date.now() });
    await ctx.db.insert("experienceEvents", {
      userId: session.userId,
      sessionId,
      experienceId: session.experienceId,
      event: status,
      at: Date.now(),
    });
  },
});
