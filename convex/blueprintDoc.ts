import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// The Blueprint for Life: the person's editable conduct doctrine — how a day is
// lived — one document per user. Seeded from the 8-pillar doctrine
// (docs/research/blueprint-for-living.md), then fully theirs: edits here are the
// single source of truth, and ritual "read" steps with source="blueprint" resolve
// their words from this document live. The Core is the person (character); the
// Blueprint is conduct. They interlink; they never merge.
// ============================================================================

export const SEED_VERSION = 1;

export const BLUEPRINT_SEED_TITLE = "The Blueprint for Life";

// The seed doctrine, pillar by pillar: practice, then why it pays off. Markdown;
// the immersive reader renders it section by section.
export const BLUEPRINT_SEED = `Discipline over motivation. Environment over willpower. Creation over consumption. Depth over scatter. Presence over performance. Self-trust through kept promises. Small actions compounding. Deliberate inputs.

## 1 · The Body

Train for strength and capacity most days. Walk daily. Whole foods, protein first, stop at 80 percent full. Sleep 7 to 9 hours. Schedule recovery before burnout forces it. Cut alcohol.

*Payoff: energy, stress tolerance, confidence — the engine that funds every other pillar.*

## 2 · The Inner Game

Get clear on the why behind the goals. Work on yourself before chasing a partner. Treat mistakes as golden repair. Start before ready. Break comfort on purpose. Borrow belief from someone who already did it.

*Payoff: discipline stops feeling like force and starts feeling like direction.*

## 3 · Systems and Discipline

One small win a day. Consistency over motivation. Keep promises to yourself. Protect mornings. Automate repeat decisions — meals, workout times, wardrobe. Shape the environment. Split the day into selfless hours and selfish hours. Say no to the unaligned.

*Payoff: willpower spent only where it matters; the day stops being reactive.*

## 4 · Focus and Creation

A pre-work focus ritual. Depth on few things over scatter on many. Create more than you consume. One day a week off social media.

*Payoff: consumption drains hunger; creation feeds it.*

## 5 · Direction

One huge goal that scares you, broken down to today. Plan tomorrow before bed. Weekly audit — what gets reviewed gets improved. Journal wins and lessons. Track progress, not perfection. Never compare timelines. Become the person your younger self would look up to.

*Payoff: drift only survives when nobody is looking at it.*

## 6 · Money and Craft

Invest now — the habit, not the amount. Track every dollar. Invest in yourself before consuming. Learn one skill that makes money. Start the thing, post before ready, build the craft.

*Payoff: freedom, options, time back later in life.*

## 7 · People

You are the average of the five around you — get proximity to people ahead of you. Cut energy drains. Real time with family; calls over texts. Be a good human; feedback over criticism.

*Payoff: ceilings and energy are contagious in both directions.*

## 8 · Presence

Slow, steady movement; open posture. Eye contact, full listening, speak slower. Phone away with people. No oversharing, no gossip, no dominating the room. Respond, don't react. Simple grooming, fewer better clothes. No validation seeking, no performed confidence.

*Payoff: calm reads as confidence without a word said.*`;

// The person's Blueprint document, or null if they haven't adopted one yet.
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("blueprint")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// Ensure the user has a Blueprint document, creating it from the seed if missing.
// An existing document (edited or not) is NEVER re-seeded or clobbered. Shared by
// `adopt` and by rituals.adoptBlueprintRead.
export async function ensureBlueprint(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("blueprint")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (existing) return existing._id;
  const now = Date.now();
  return await ctx.db.insert("blueprint", {
    userId,
    title: BLUEPRINT_SEED_TITLE,
    content: BLUEPRINT_SEED,
    seedVersion: SEED_VERSION,
    createdAt: now,
    updatedAt: now,
  });
}

// Adopt the Blueprint: create the document from the seed if none exists. Idempotent.
export const adopt = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ensureBlueprint(ctx, userId);
  },
});

// Edit the document. This is the single source of truth: what is saved here is
// what a source="blueprint" read step shows tomorrow morning.
export const update = mutation({
  args: { title: v.optional(v.string()), content: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await ctx.db
      .query("blueprint")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!doc) throw new Error("No Blueprint yet — adopt it first");
    await ctx.db.patch(doc._id, {
      ...(args.title !== undefined ? { title: args.title.trim() || doc.title } : {}),
      ...(args.content !== undefined ? { content: args.content } : {}),
      updatedAt: Date.now(),
    });
  },
});
