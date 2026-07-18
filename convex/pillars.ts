import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { ContextFragment } from "./context/types";

// Preset library offered for users who want to add more pillars. Pillars are folders
// in the file system on the human, never throwaway tags.
export const PRESETS = [
  "Health & Fitness",
  "Family & Relationships",
  "Financial & Professional",
  "Growth & Mind",
  "Money & Freedom",
  "Spirit & Meaning",
];

// The canonical skeleton outline: the regions of a person every new account starts with.
// `about` says what the region is; `composition` tells the Center how to build that pillar
// from its files (see agents/center/). New users are seeded with this whole set.
//
// `role` (ARI-11, docs/decisions/0022-identity-is-not-a-pillar.md): "Identity & Values" is
// marked "identity" — it is what the other seven pillars hold up, not a domain of its own —
// so it is filed and synthesized exactly as before (the Listener/Center machinery from ADR
// 0007 is unchanged) but is excluded from strength scoring and the Life Wheel. Everything
// else is "domain". The skeleton stays 8 canonical pillars for now rather than collapsing to
// the brainstormed 5 (Body/Craft/Bonds/Tribe/Mind); see the ADR for why.
export const DEFAULT_PILLARS: { name: string; about: string; composition: string; role: "domain" | "identity" }[] = [
  {
    name: "Identity & Values",
    about: "Who this person is at the core: their values, the principles they live by, and how they see themselves.",
    composition: "Files capturing stated values, self-image, principles, and the 'who I am' statements a person makes about themselves.",
    role: "identity",
  },
  {
    name: "Body & Health",
    about: "The physical foundation: energy, fitness, sleep, health, and the person's relationship with their body.",
    composition: "Files about physical state, habits, health concerns, how they feel in their body, and what they want it to be.",
    role: "domain",
  },
  {
    name: "Work & Money",
    about: "Vocation, ambition, and material stability: what they do, what they're building, and their relationship with money.",
    composition: "Files about career, work they care about, financial situation and goals, ambition, and professional identity.",
    role: "domain",
  },
  {
    name: "Relationships",
    about: "The people in their life: family, partner, friends, and how they show up in connection.",
    composition: "Files about specific relationships, patterns in how they relate, what they need from others, and where they struggle.",
    role: "domain",
  },
  {
    name: "Mind & Growth",
    about: "The inner life of learning and becoming: how they think, what they're working on in themselves, and how they grow.",
    composition: "Files about learning, mindset, self-work, intellectual interests, and the ways they are trying to change.",
    role: "domain",
  },
  {
    name: "Meaning & Spirit",
    about: "The why beneath it all: purpose, faith, the bigger picture, and what makes life feel worth it.",
    composition: "Files about purpose, spirituality or faith, what gives life meaning, and the questions they sit with.",
    role: "domain",
  },
  {
    name: "Fears & Shadows",
    about: "What they're afraid of and avoid: insecurities, the patterns that hold them back, the things hard to say.",
    composition: "Files about fears, insecurities, avoidance, self-sabotage, and the shadow side they're reluctant to face.",
    role: "domain",
  },
  {
    name: "Dreams & Aspirations",
    about: "Where they're going: the future self they want, the life they're reaching for, what they'd do if nothing held them back.",
    composition: "Files about goals, dreams, the future self, and vivid pictures of the life they want.",
    role: "domain",
  },
];

// A pillar with no manual rating yet plots here — dead center of the wheel, neither a
// strength nor a gap, so an unrated skeleton doesn't read as "empty" or "failing."
export const NEUTRAL_STRENGTH = 50;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("pillars")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const presets = query({
  args: {},
  handler: async () => PRESETS,
});

export const add = mutation({
  args: {
    name: v.string(),
    source: v.union(v.literal("preset"), v.literal("custom")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("pillars", {
      userId,
      name: args.name,
      description: args.description,
      weight: 0,
      source: args.source,
      // role omitted -> "domain" (see schema comment); a person adding their own pillar is
      // always naming another thing they're building, never redefining who they are.
      createdAt: Date.now(),
    });
  },
});

// The Life Wheel's data: every "domain" pillar (identity excluded — see DEFAULT_PILLARS
// comment and the ADR) with a strength to plot, 0-100. Unrated pillars fall back to
// NEUTRAL_STRENGTH rather than 0, so a fresh account's wheel reads as "not yet known,"
// not "failing at everything."
export const wheel = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const all = await ctx.db
      .query("pillars")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return all
      .filter((p) => p.role !== "identity")
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        about: p.about ?? p.description,
        strength: p.strength ?? NEUTRAL_STRENGTH,
        rated: p.strength !== undefined,
        source: p.source,
      }));
  },
});

// Set (or clear) a pillar's manual strength rating. v1 is the whole story: no inferred
// scoring yet (that's ARI-16, the current-state/gap engine). Clamped to [0, 100];
// `strength: undefined` resets to "never rated" so the wheel shows it neutral again.
export const setStrength = mutation({
  args: {
    pillarId: v.id("pillars"),
    strength: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const pillar = await ctx.db.get(args.pillarId);
    if (!pillar || pillar.userId !== userId) throw new Error("Pillar not found");
    const clamped =
      args.strength === undefined ? undefined : Math.max(0, Math.min(100, Math.round(args.strength)));
    await ctx.db.patch(args.pillarId, {
      strength: clamped,
      strengthUpdatedAt: Date.now(),
    });
  },
});

// The domains as a context fragment — what the Coach sees about how each part of this
// person's life is currently standing. Identity is deliberately not listed here either:
// the Coach reads who the person is from the Mirror (convex/mirror.ts), not from a pillar
// strength score.
export const assembleContext = query({
  args: {},
  handler: async (ctx): Promise<ContextFragment | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const all = await ctx.db
      .query("pillars")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const domains = all.filter((p) => p.role !== "identity");
    if (domains.length === 0) return null;
    const lines = domains
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((p) => `${p.name}: ${p.strength ?? NEUTRAL_STRENGTH}/100${p.strength === undefined ? " (unrated)" : ""}`)
      .join("\n");
    return {
      surfaceId: "pillars",
      scope: "summary" as const,
      label: "Life pillars (current strength, 0-100)",
      text: lines,
      priority: 5,
    };
  },
});
