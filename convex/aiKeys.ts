import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { aiNodeSummary } from "./ai/config";

// Per-profile API keys. A user can save their own provider key (e.g. their
// OpenRouter key) and it is used for their AI calls in preference to the shared
// deployment env key. The key is stored server-side and NEVER returned to the
// client: the only thing the UI can read back is "set or not" plus the last 4.
//
// Note: keys are stored as-is in the DB (gated by userId). Encrypting at rest is
// a hardening step tracked in docs/architecture/security-privacy.md.

const PROVIDER = v.union(
  v.literal("openrouter"),
  v.literal("openai"),
  v.literal("local"),
  v.literal("todoist"),
);

// Save (or replace) the caller's key for a provider.
export const setKey = mutation({
  args: { provider: PROVIDER, key: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const trimmed = args.key.trim();
    if (!trimmed) throw new Error("Empty key");
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", args.provider))
      .first();
    const last4 = trimmed.slice(-4);
    if (existing) {
      await ctx.db.patch(existing._id, { key: trimmed, last4, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("apiKeys", {
        userId,
        provider: args.provider,
        key: trimmed,
        last4,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Remove the caller's key for a provider (falls back to the env key).
export const clearKey = mutation({
  args: { provider: PROVIDER },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", args.provider))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// Status only: which providers the caller has a personal key for (never the key).
export const status = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => ({ provider: r.provider, last4: r.last4 }));
  },
});

// The AI node registry (task -> provider + model), secret-free, for the Settings UI.
export const nodes = query({
  args: {},
  handler: async () => aiNodeSummary(),
});

// Server-only: the actual key for a user+provider, used by ai/openai.ts. Internal,
// so it is never callable from the client.
export const getKeyInternal = internalQuery({
  args: { userId: v.id("users"), provider: PROVIDER },
  handler: async (ctx, args): Promise<string | null> => {
    const row = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("provider", args.provider))
      .first();
    return row?.key ?? null;
  },
});
