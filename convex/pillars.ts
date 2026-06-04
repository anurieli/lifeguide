import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
export const DEFAULT_PILLARS: { name: string; about: string; composition: string }[] = [
  {
    name: "Identity & Values",
    about: "Who this person is at the core: their values, the principles they live by, and how they see themselves.",
    composition: "Files capturing stated values, self-image, principles, and the 'who I am' statements a person makes about themselves.",
  },
  {
    name: "Body & Health",
    about: "The physical foundation: energy, fitness, sleep, health, and the person's relationship with their body.",
    composition: "Files about physical state, habits, health concerns, how they feel in their body, and what they want it to be.",
  },
  {
    name: "Work & Money",
    about: "Vocation, ambition, and material stability: what they do, what they're building, and their relationship with money.",
    composition: "Files about career, work they care about, financial situation and goals, ambition, and professional identity.",
  },
  {
    name: "Relationships",
    about: "The people in their life: family, partner, friends, and how they show up in connection.",
    composition: "Files about specific relationships, patterns in how they relate, what they need from others, and where they struggle.",
  },
  {
    name: "Mind & Growth",
    about: "The inner life of learning and becoming: how they think, what they're working on in themselves, and how they grow.",
    composition: "Files about learning, mindset, self-work, intellectual interests, and the ways they are trying to change.",
  },
  {
    name: "Meaning & Spirit",
    about: "The why beneath it all: purpose, faith, the bigger picture, and what makes life feel worth it.",
    composition: "Files about purpose, spirituality or faith, what gives life meaning, and the questions they sit with.",
  },
  {
    name: "Fears & Shadows",
    about: "What they're afraid of and avoid: insecurities, the patterns that hold them back, the things hard to say.",
    composition: "Files about fears, insecurities, avoidance, self-sabotage, and the shadow side they're reluctant to face.",
  },
  {
    name: "Dreams & Aspirations",
    about: "Where they're going: the future self they want, the life they're reaching for, what they'd do if nothing held them back.",
    composition: "Files about goals, dreams, the future self, and vivid pictures of the life they want.",
  },
];

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
      createdAt: Date.now(),
    });
  },
});
