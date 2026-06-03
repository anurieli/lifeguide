import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// All of the signed-in user's Core answers, as a { questionKey: content } map.
// The blueprint skeleton (sections/questions) is static config in lib/blueprint.ts; this is the data.
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};
    const rows = await ctx.db
      .query("coreResponses")
      .withIndex("by_user_question", (q) => q.eq("userId", userId))
      .collect();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.questionKey] = r.content;
    return map;
  },
});

// Upsert one answer. Autosaved from the Core surface on blur.
export const save = mutation({
  args: { questionKey: v.string(), content: v.string() },
  handler: async (ctx, { questionKey, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("coreResponses")
      .withIndex("by_user_question", (q) => q.eq("userId", userId).eq("questionKey", questionKey))
      .first();
    const now = Date.now();
    if (existing) await ctx.db.patch(existing._id, { content, updatedAt: now });
    else await ctx.db.insert("coreResponses", { userId, questionKey, content, updatedAt: now });
  },
});
