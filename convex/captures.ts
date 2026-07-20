import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const SOURCE = v.union(
  v.literal("paste"),
  v.literal("upload"),
  v.literal("url"),
  v.literal("audio"),
  v.literal("agent"),
);
const RAWTYPE = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("link"),
  v.literal("video_link"),
  v.literal("quote"),
  v.literal("audio"),
  v.literal("file"),
);

// Raw types whose text must be derived before distillation (vs. already textual).
const NEEDS_EXTRACTION = new Set(["image", "link", "video_link", "audio", "file"]);

// The board's "to place" inbox tray. Unplaced + active is necessary but NOT
// sufficient: a capture must also be board-bound — either the person put it there
// on purpose (target="board") or the vision sieve judged it a piece of the life
// they want (boardWorthy.verdict). Ambient captures (sessions, thought stream,
// dumps) without a positive verdict stay on their own surfaces (ADR 0014).
export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const unplaced = await ctx.db
      .query("captures")
      .withIndex("by_user_unplaced", (q) => q.eq("userId", userId).eq("placedAt", undefined))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
    return unplaced.filter((c) => c.target === "board" || c.boardWorthy?.verdict === true);
  },
});

// One-time repair for ADR 0015: captures distilled before the vision sieve existed
// have neither `target` nor `boardWorthy`, so the inbox filter above drops them —
// per the ADR, that's the *intended* junk-tray cleanup, not a bug. What the ADR
// promises as the escape hatch is that any of them "can earn a verdict via
// captures.reprocess." This re-runs distillation on exactly that stale set so the
// sieve actually judges them, instead of either leaving them stuck forever or
// bypassing the sieve to force them all back in. Safe to call more than once: a
// capture that's already been re-verdicted (boardWorthy set either way) is excluded.
export const reverdictPreSieveInbox = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { queued: 0 };
    const unplaced = await ctx.db
      .query("captures")
      .withIndex("by_user_unplaced", (q) => q.eq("userId", userId).eq("placedAt", undefined))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const stale = unplaced.filter(
      (c) => c.target === undefined && c.boardWorthy === undefined && c.distilled !== undefined,
    );
    for (const c of stale) {
      await ctx.db.patch(c._id, {
        extraction: {
          status: NEEDS_EXTRACTION.has(c.rawType) ? ("pending" as const) : ("skipped" as const),
          at: Date.now(),
        },
      });
      await ctx.scheduler.runAfter(0, internal.ai.ingest.ingestCapture, { captureId: c._id });
    }
    return { queued: stale.length };
  },
});

// Server-only read for the distill action (runs without an authenticated user).
export const getByIdInternal = internalQuery({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args) => await ctx.db.get(args.captureId),
});

// Client-readable: fetch multiple captures by ID (the caller must own them).
// Used by BrainDump to poll distillation status for a batch of captures.
export const getMany = query({
  args: { captureIds: v.array(v.id("captures")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const results = await Promise.all(args.captureIds.map((id) => ctx.db.get(id)));
    // Return only captures owned by the authenticated user; filter narrows to non-null.
    return results.filter(
      (c): c is NonNullable<typeof c> => c !== null && c.userId === userId,
    );
  },
});

export const create = mutation({
  args: {
    source: SOURCE,
    rawType: RAWTYPE,
    rawText: v.optional(v.string()),
    rawUrl: v.optional(v.string()),
    rawFileId: v.optional(v.id("_storage")),
    sessionId: v.optional(v.id("sessions")),
    sourceMeta: v.optional(v.string()),
    // "board" = deliberate vision-board intake (canvas paste, onboarding seed);
    // such captures skip the vision sieve and always surface in the board Inbox.
    target: v.optional(v.literal("board")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId);
      if (!session || session.userId !== userId) throw new Error("Session not found");
    }
    const id = await ctx.db.insert("captures", {
      userId,
      ...args,
      extraction: {
        status: NEEDS_EXTRACTION.has(args.rawType) ? ("pending" as const) : ("skipped" as const),
        at: Date.now(),
      },
      isActive: true,
      createdAt: Date.now(),
    });
    // A session is a living entry: every appended capture bumps it to the top.
    if (args.sessionId) await ctx.db.patch(args.sessionId, { updatedAt: Date.now() });
    // Ingest in the background: extract text from the raw artifact (transcribe audio,
    // fetch a link, read an image), then distill. No-op degrades gracefully without keys.
    await ctx.scheduler.runAfter(0, internal.ai.ingest.ingestCapture, { captureId: id });
    return id;
  },
});

// The Thought Stream: every active capture for the current user, newest first, with
// the raw file resolved to a servable URL (audio player / image src).
export const stream = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("captures")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(Math.min(args.limit ?? 100, 200));
    return await Promise.all(
      rows.map(async (c) => ({
        ...c,
        fileUrl: c.rawFileId ? await ctx.storage.getUrl(c.rawFileId) : null,
      })),
    );
  },
});

// Re-run extraction + distillation on a capture (error retry, or re-analyzing an old
// thought after the pipeline improves). The raw artifact is durable, so this is always safe.
export const reprocess = mutation({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const c = await ctx.db.get(args.captureId);
    if (!c || c.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.captureId, {
      extraction: {
        status: NEEDS_EXTRACTION.has(c.rawType) ? ("pending" as const) : ("skipped" as const),
        at: Date.now(),
      },
    });
    await ctx.scheduler.runAfter(0, internal.ai.ingest.ingestCapture, {
      captureId: args.captureId,
    });
  },
});

// Server-only write from the ingest action.
export const updateExtraction = internalMutation({
  args: {
    captureId: v.id("captures"),
    extractedText: v.optional(v.string()),
    extraction: v.object({
      status: v.union(
        v.literal("pending"),
        v.literal("done"),
        v.literal("error"),
        v.literal("skipped"),
      ),
      error: v.optional(v.string()),
      meta: v.optional(v.string()),
      at: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.captureId, {
      ...(args.extractedText !== undefined ? { extractedText: args.extractedText } : {}),
      extraction: args.extraction,
    });
  },
});

// Server-only write from the distill action.
export const updateDistilled = internalMutation({
  args: {
    captureId: v.id("captures"),
    distilled: v.object({
      title: v.string(),
      essence: v.string(),
      pillars: v.array(v.string()),
    }),
    boardWorthy: v.optional(
      v.object({ verdict: v.boolean(), reason: v.string(), at: v.number() }),
    ),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.captureId, {
      distilled: args.distilled,
      ...(args.boardWorthy ? { boardWorthy: args.boardWorthy } : {}),
      embedding: args.embedding,
    });
  },
});

// The person reopens a previously committed text/quote capture and corrects or
// extends it (SessionDoc: click a note to edit, blur to save — same idiom as
// the horizons/rituals click-to-edit fields). Other raw types (audio, image,
// link, file) aren't editable here: their "text" is a derived transcript/
// description, not something the person typed. A no-op on unchanged/empty
// text leaves the capture untouched. Because distilled/boardWorthy/embedding
// were computed over the old wording, an edit re-runs distillation exactly as
// a fresh append does; a session member also re-bumps updatedAt and schedules
// the digest refresh on the same 30s debounce ingest itself uses, so a burst
// of edits costs one model call.
export const update = mutation({
  args: { captureId: v.id("captures"), rawText: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const c = await ctx.db.get(args.captureId);
    if (!c || c.userId !== userId) throw new Error("Not found");
    if (c.rawType !== "text" && c.rawType !== "quote") {
      throw new Error("Only text captures can be edited");
    }
    const rawText = args.rawText.trim();
    if (!rawText || rawText === (c.rawText ?? "")) return;
    await ctx.db.patch(args.captureId, { rawText, extractedText: rawText });
    if (c.sessionId) {
      await ctx.db.patch(c.sessionId, { updatedAt: Date.now() });
      await ctx.scheduler.runAfter(30_000, internal.ai.sessionDigest.digestSession, {
        sessionId: c.sessionId,
      });
    }
    await ctx.scheduler.runAfter(0, internal.ai.distill.distillCapture, {
      captureId: args.captureId,
    });
  },
});

export const softDelete = mutation({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const c = await ctx.db.get(args.captureId);
    if (!c || c.userId !== userId) throw new Error("Not found");
    // Dismissed captures still feed the Mirror later; keep the row, flag inactive.
    await ctx.db.patch(args.captureId, { isActive: false });
  },
});
