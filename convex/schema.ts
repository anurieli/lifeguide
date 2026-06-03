import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const node_type = v.union(
  v.literal("text"),
  v.literal("quote"),
  v.literal("image"),
  v.literal("link"),
  v.literal("generated_image"),
);

export default defineSchema({
  ...authTables,

  // Marks a user as seeded (default surface + Lifestyle pillar + mirror created).
  profiles: defineTable({
    userId: v.id("users"),
    bootstrappedAt: v.number(),
  }).index("by_user", ["userId"]),

  // A surface is one workspace (whiteboard now; guide/vision/journal later).
  surfaces: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("whiteboard"), v.literal("guide")),
    title: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // A node is the visual presence of an idea on a surface.
  nodes: defineTable({
    userId: v.id("users"),
    surfaceId: v.id("surfaces"),
    captureId: v.optional(v.id("captures")),
    type: node_type, // text | quote | image | link | generated_image
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    attribution: v.optional(v.string()),
    position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
    dimensions: v.object({ width: v.number(), height: v.number() }),
    pillars: v.array(v.string()),
    embedding: v.optional(v.array(v.float64())),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_surface", ["surfaceId", "isActive"])
    .index("by_user", ["userId", "isActive"]),
  // NOTE: nodes.vectorIndex("by_embedding") is DEFERRED (ADR 0006). Nothing reads vectors in
  // v1 and OpenRouter has no embeddings endpoint; the index + dimensions are chosen when
  // semantic recall/grouping lands (post-v1). The `embedding` field stays optional until then.

  // A labeled, directed connection between two nodes. One node -> many; cycle-checked.
  edges: defineTable({
    userId: v.id("users"),
    surfaceId: v.id("surfaces"),
    fromNode: v.id("nodes"),
    toNode: v.id("nodes"),
    label: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_surface", ["surfaceId"])
    .index("by_from", ["fromNode"]),

  // A capture is the immutable event of inspiration; distilled async; may become a node.
  captures: defineTable({
    userId: v.id("users"),
    source: v.union(
      v.literal("paste"),
      v.literal("upload"),
      v.literal("url"),
      v.literal("audio"),
      v.literal("agent"),
    ),
    rawType: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("link"),
      v.literal("video_link"),
      v.literal("quote"),
    ),
    rawText: v.optional(v.string()),
    rawUrl: v.optional(v.string()),
    rawFileId: v.optional(v.id("_storage")),
    distilled: v.optional(
      v.object({
        title: v.string(),
        essence: v.string(),
        pillars: v.array(v.string()),
      }),
    ),
    embedding: v.optional(v.array(v.float64())),
    placedAt: v.optional(v.number()),
    nodeId: v.optional(v.id("nodes")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_unplaced", ["userId", "placedAt"]),

  // Cross-cutting typed tags (NOT containers). v1 seeds a single default "Lifestyle".
  pillars: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    weight: v.number(),
    source: v.union(v.literal("default"), v.literal("preset"), v.literal("custom")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Per-user app settings: onboarding state, daily rhythm, Coach behavior, and the north star.
  settings: defineTable({
    userId: v.id("users"),
    onboardedAt: v.optional(v.number()),
    morningCheckin: v.boolean(),
    eveningCheckin: v.boolean(),
    dailyExercise: v.union(v.literal("intention"), v.literal("gratitude"), v.literal("free")),
    coachTone: v.union(v.literal("gentle"), v.literal("balanced"), v.literal("direct")),
    reachingOut: v.union(v.literal("leave"), v.literal("earned"), v.literal("often")),
    northStar: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // The Mirror: the evolving "text layer behind the human". Structured records + summary, versioned.
  mirror: defineTable({
    userId: v.id("users"),
    summary: v.string(),
    structured: v.object({
      values: v.array(v.string()),
      themes: v.array(v.string()),
    }),
    version: v.number(),
    takenAt: v.number(),
  }).index("by_user", ["userId", "takenAt"]),

  // Event log -> Mirror deltas.
  interactions: defineTable({
    userId: v.id("users"),
    type: v.string(),
    payload: v.string(),
    at: v.number(),
  }).index("by_user", ["userId", "at"]),

  // Reserved for Plan 2 (Coach) — defined now to avoid migration churn.
  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  messages: defineTable({
    userId: v.id("users"),
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("coach")),
    content: v.string(),
    toolCalls: v.optional(
      v.array(v.object({ tool: v.string(), args: v.string(), result: v.optional(v.string()) })),
    ),
    createdAt: v.number(),
  }).index("by_thread", ["threadId", "createdAt"]),
});
