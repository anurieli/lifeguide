# Data Model (Convex)

**Status:** ✅ specified (v1). The authoritative schema; Plan 1 implements it. Update this file in the same change as any schema change.

All tables are user-isolated (multi-tenant from day one): every row carries `userId`, every query gates on the authenticated user. Soft deletes via `isActive` where applicable.

## Tables

```ts
// auth tables provided by @convex-dev/auth (users, authSessions, …)

profiles      { userId, bootstrappedAt }                          // marks a user as seeded

surfaces      { userId, type: "whiteboard"|"guide", title, createdAt }   // extensible to vision/journal

nodes         { userId, surfaceId, captureId?, type, title?, text?, imageUrl?, fileId?, attribution?,
                position{x,y,z}, dimensions{width,height}, pillars[], embedding?, isActive, createdAt, updatedAt }
              // type: text | quote | image | link | generated_image
              // indexes: by_surface[surfaceId,isActive], by_user[userId,isActive], vector by_embedding(1536, filter userId)

edges         { userId, surfaceId, fromNode, toNode, label?, note?, createdAt }   // labeled, multi-target, cycle-checked
              // indexes: by_surface, by_from

captures      { userId, source, rawType, rawText?, rawUrl?, rawFileId?,
                distilled?{title,essence,pillars[]}, embedding?, placedAt?, nodeId?, isActive, createdAt }
              // source: paste|upload|url|audio|agent ; rawType: text|image|link|video_link|quote
              // indexes: by_user[userId,createdAt], by_user_unplaced[userId,placedAt]

pillars       { userId, name, description?, weight, source, createdAt }    // source: default|preset|custom; v1 seeds "Lifestyle"

settings      { userId, onboardedAt?, morningCheckin, eveningCheckin, dailyExercise, coachTone, reachingOut, northStar?, updatedAt }
              // one row/user (seeded by bootstrap): onboarding state + daily rhythm + Coach behavior + the north star
              // dailyExercise: intention|gratitude|free ; coachTone: gentle|balanced|direct ; reachingOut: leave|earned|often
              // index: by_user[userId]

mirror        { userId, summary, structured{values[],themes[]}, version, takenAt }   // grows: people, goals, north-star candidates
              // index: by_user[userId,takenAt]

goals         { userId, pillarId?, statement, horizon, status, createdAt }   // typed objects (Plan 4)

interactions  { userId, type, payload, at }                       // event log → Mirror deltas

threads       { userId, title, createdAt }                        // Coach conversations (Plan 2)
messages      { userId, threadId, role: "user"|"coach", content, toolCalls[]?, createdAt }
```

## Notes
- **Captures vs nodes:** a capture is the *event of inspiration* (immutable raw); a node is its *visual presence*. Dismissed captures still feed the Mirror.
- **Embeddings:** **deferred in v1** (OpenRouter has no embeddings endpoint, and nothing reads vectors until post-v1 recall/grouping — ADR [0006](../decisions/0006-openrouter-for-generative-ai.md)). The `embedding` field stays optional; the Convex vector index is added when embeddings are wired, with provider + dimensions chosen then.
- **Mirror:** structured records + a compacted summary, versioned. Never a single growing blob (PillarOS's mistake).
- **Edges:** cycle detection via DFS (`wouldCreateCycle`) + persisted check; one node → many; self/duplicate edges disallowed.
- Forward-defined tables (`goals`, `threads`, `messages`) exist in the schema from Plan 1 to avoid migration churn even though consumed later.

Source of truth for build: [`../plans/2026-05-20-lifeguide-v1-plan1-foundation-whiteboard.md`](../plans/2026-05-20-lifeguide-v1-plan1-foundation-whiteboard.md) Task 1.
