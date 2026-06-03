import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// v1 keeps a single Coach thread per user. (Multi-thread is a Plan 2 concern; the schema
// already supports it via threads.title, so this stays forward-compatible.)
async function defaultThreadId(
  ctx: { db: any },
  userId: Id<"users">,
): Promise<Id<"threads">> {
  const existing = await ctx.db
    .query("threads")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (existing) return existing._id;
  return await ctx.db.insert("threads", {
    userId,
    title: "Coach",
    createdAt: Date.now(),
  });
}

// Reactive history for the Coach dock. Returns the user's default-thread messages oldest-first,
// or [] before any conversation exists (the dock renders a static welcome in that case).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const thread = await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!thread) return [];
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
      .collect();
    return msgs.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt }));
  },
});

// Append one message to the user's default thread, creating the thread on first use.
// Called from the coach action (for both the user turn and the coach reply).
export const add = mutation({
  args: {
    role: v.union(v.literal("user"), v.literal("coach")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const threadId = await defaultThreadId(ctx, userId);
    await ctx.db.insert("messages", {
      userId,
      threadId,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});
