// The in-app guided product tour (ARI-19). Distinct from the Door/Interview
// onboarding in convex/settings.ts + components/onboarding/ — that flow draws
// the Core out of a brand-new user before the app shell ever mounts; this one
// walks an already-onboarded person around the shell itself (Core, Whiteboard,
// Today, Coach, Settings) once they land inside it. See
// docs/product/features/product-tour.md.
//
// State rides the same per-user `settings` row (three optional columns —
// tourStep / tourCompletedAt / tourSkippedAt) rather than a new table: it is a
// single small piece of per-user state with no history to keep, exactly like
// onboardedAt already there.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getOrCreate } from "./settings";

// Progress, shaped for the client: `completedAt`/`skippedAt` are the two
// terminal states (either suppresses re-fire); `step` resumes an in-progress
// tour at the right stop. Returns null only when signed out — before the
// settings row exists this still reads as "never started" (all undefined).
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const s = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return {
      step: s?.tourStep ?? 0,
      completedAt: s?.tourCompletedAt ?? null,
      skippedAt: s?.tourSkippedAt ?? null,
    };
  },
});

// Persist the current step as the person clicks through, so a reload or a
// tab switch mid-tour resumes at the same stop instead of restarting.
export const advance = mutation({
  args: { step: v.number() },
  handler: async (ctx, { step }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const s = await getOrCreate(ctx, userId);
    await ctx.db.patch(s._id, { tourStep: step, updatedAt: Date.now() });
  },
});

// Reached the last step. Terminal: the tour will not fire again until restart().
export const complete = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const s = await getOrCreate(ctx, userId);
    await ctx.db.patch(s._id, { tourCompletedAt: Date.now(), updatedAt: Date.now() });
  },
});

// Dismissed early (the "Skip" control). Also terminal — a skip is still a
// choice to stop seeing it, not a request to see it again next login.
export const skip = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const s = await getOrCreate(ctx, userId);
    await ctx.db.patch(s._id, { tourSkippedAt: Date.now(), updatedAt: Date.now() });
  },
});

// The Settings "Restart tour" control: clears both terminal stamps and resets
// the step, so the tour fires again from the top on the very next render.
export const restart = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const s = await getOrCreate(ctx, userId);
    await ctx.db.patch(s._id, {
      tourStep: 0,
      tourCompletedAt: undefined,
      tourSkippedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});
