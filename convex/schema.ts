import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Minimal schema for Task 0 (auth verification). The full v1 schema lands in Task 1.
export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.id("users"),
    bootstrappedAt: v.number(),
  }).index("by_user", ["userId"]),
});
