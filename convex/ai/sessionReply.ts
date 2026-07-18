import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { chatComplete } from "./openai";
import { Doc } from "../_generated/dataModel";

// The dynamic-mode interviewer reply (ARI-18): after each appended capture in a
// "dynamic" session, the interviewer gets one short turn — a live conversation
// partner for thinking out loud, instead of a silent journal. Scheduled (debounced
// 8s) by convex/ai/ingest.ts after every capture's ingest, whatever its rawType.
//
// Guards, in order:
//   1. quiet mode (or mode absent) -> no-op, this feature is opt-in per session.
//   2. a newer capture already landed -> no-op, that capture's own scheduled run
//      supersedes this one (last-write-wins debounce, same pattern as the digest).
//   3. the newest reply already covers the newest capture -> no-op, already answered
//      (or a reply for this exact state is already in flight).
// Only after all three does this insert a pending row and call the model.
export const maybeReply = internalAction({
  args: { sessionId: v.id("sessions"), captureId: v.id("captures") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.sessions.getForReplyInternal, {
      sessionId: args.sessionId,
    });
    if (!data) return; // session deleted while this was scheduled
    const { session, captures, replies } = data;

    if (session.mode !== "dynamic") return;

    const trigger = captures.find((c) => c._id === args.captureId);
    if (!trigger) return; // the triggering capture was removed before this ran

    const newerCaptureExists = captures.some(
      (c) => c._id !== trigger._id && c.createdAt > trigger.createdAt,
    );
    if (newerCaptureExists) return;

    const latestCaptureAt = Math.max(...captures.map((c) => c.createdAt));
    const latestReplyAt = replies.length ? Math.max(...replies.map((r) => r.createdAt)) : 0;
    if (latestReplyAt > latestCaptureAt) return;

    const replyId = await ctx.runMutation(internal.sessions.insertReplyInternal, {
      sessionId: args.sessionId,
      userId: session.userId,
      afterCaptureId: args.captureId,
      persona: session.interviewer ?? "coach",
    });

    try {
      const text = await chatComplete(ctx, {
        taskId: "sessionReply",
        fn: "ai/sessionReply.maybeReply",
        userId: session.userId,
        messages: buildReplyMessages(captures, replies),
      });
      const trimmed = text.trim();
      if (!trimmed) throw new Error("empty reply");
      await ctx.runMutation(internal.sessions.finishReplyInternal, {
        replyId,
        status: "done",
        text: trimmed,
      });
    } catch (e) {
      await ctx.runMutation(internal.sessions.finishReplyInternal, {
        replyId,
        status: "error",
        error: e instanceof Error ? e.message.slice(0, 300) : "reply failed",
      });
    }
  },
});

// The interviewer opens the conversation (ARI-18 UX rework): scheduled with
// runAfter(0) by sessions.setMode the moment a session flips into "dynamic",
// so the toggle visibly does something rather than just relabeling. Shares
// insertReplyInternal/finishReplyInternal and the same "sessionReply" model
// task as maybeReply's regular turns; the only difference is the trailing
// instruction telling the model this is an opener, not a reply to new material.
//
// No double-greeting: skipped when the newest thread item (captures + replies
// merged by createdAt) is already a pending or done reply — flipping the
// toggle off and back on quickly (or a duplicate schedule) must not stack
// openers. An *error* reply doesn't count as "already answered", so a session
// whose last attempt failed still gets a fresh opener.
export const opener = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.sessions.getForReplyInternal, {
      sessionId: args.sessionId,
    });
    if (!data) return; // session deleted while this was scheduled
    const { session, captures, replies } = data;

    if (session.mode !== "dynamic") return; // mode may have flipped back before this ran

    const latestCaptureAt = captures.length ? Math.max(...captures.map((c) => c.createdAt)) : 0;
    const latestReply = replies.length
      ? replies.reduce((a, b) => (b.createdAt > a.createdAt ? b : a))
      : undefined;
    if (latestReply && latestReply.createdAt >= latestCaptureAt && latestReply.status !== "error") {
      return;
    }

    const replyId = await ctx.runMutation(internal.sessions.insertReplyInternal, {
      sessionId: args.sessionId,
      userId: session.userId,
      persona: session.interviewer ?? "coach",
    });

    try {
      const text = await chatComplete(ctx, {
        taskId: "sessionReply",
        fn: "ai/sessionReply.opener",
        userId: session.userId,
        messages: [
          ...buildReplyMessages(captures, replies),
          {
            role: "user" as const,
            content:
              "(The user just opened a live conversation. Give one short opener inviting them to talk — if there's prior material in this session, hook into it.)",
          },
        ],
      });
      const trimmed = text.trim();
      if (!trimmed) throw new Error("empty reply");
      await ctx.runMutation(internal.sessions.finishReplyInternal, {
        replyId,
        status: "done",
        text: trimmed,
      });
    } catch (e) {
      await ctx.runMutation(internal.sessions.finishReplyInternal, {
        replyId,
        status: "error",
        error: e instanceof Error ? e.message.slice(0, 300) : "reply failed",
      });
    }
  },
});

const HISTORY_CAP = 40;

type ReplyCapture = Pick<Doc<"captures">, "createdAt" | "rawText" | "extractedText" | "extraction">;
type ReplyRow = Pick<Doc<"sessionReplies">, "createdAt" | "status" | "text">;

// The conversation so far, chronologically merged: each capture's own text as
// "user", each completed reply as "assistant". Pure so it is easy to reason about
// and to unit-test without touching the model.
export function buildReplyMessages(
  captures: ReplyCapture[],
  replies: ReplyRow[],
): { role: "user" | "assistant"; content: string }[] {
  const items: { role: "user" | "assistant"; content: string; at: number }[] = [];
  for (const c of captures) {
    if (c.extraction?.status === "pending") continue; // still extracting, nothing to say yet
    const text = (c.extractedText ?? c.rawText ?? "").trim();
    if (!text) continue;
    items.push({ role: "user", content: text, at: c.createdAt });
  }
  for (const r of replies) {
    if (r.status !== "done" || !r.text) continue;
    items.push({ role: "assistant", content: r.text, at: r.createdAt });
  }
  items.sort((a, b) => a.at - b.at);
  return items.slice(-HISTORY_CAP).map(({ role, content }) => ({ role, content }));
}
