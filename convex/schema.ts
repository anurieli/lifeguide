import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const node_type = v.union(
  v.literal("text"),
  v.literal("quote"),
  v.literal("image"),
  v.literal("link"),
  v.literal("file"),
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
    type: node_type, // text | quote | image | link | file | generated_image
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()), // original name of an uploaded document (file nodes)
    mimeType: v.optional(v.string()), // content type of an uploaded document (file nodes)
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

  // A capture is the immutable event of a thought or inspiration; ingested async
  // (extraction + distillation); may become a node. The raw artifact is always kept
  // (rawText/rawUrl/rawFileId) so it can be reopened and re-analyzed after the fact.
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
      v.literal("audio"),
      v.literal("file"),
    ),
    rawText: v.optional(v.string()),
    rawUrl: v.optional(v.string()),
    rawFileId: v.optional(v.id("_storage")),
    // The session (living journal entry) this capture belongs to, if any.
    // Loose captures (board intake, stream composer, voice.brainDump) have none.
    sessionId: v.optional(v.id("sessions")),
    // Client context at capture time, JSON: {"device":"phone"|"desktop", ...}.
    sourceMeta: v.optional(v.string()),
    // The canonical text derived from the raw artifact: the transcript (audio), the
    // article body (link), the description + visible text (image). Distillation and
    // any later analysis read this, never the raw blob.
    extractedText: v.optional(v.string()),
    extraction: v.optional(
      v.object({
        status: v.union(
          v.literal("pending"),
          v.literal("done"),
          v.literal("error"),
          v.literal("skipped"), // nothing to extract (raw is already text)
        ),
        error: v.optional(v.string()),
        meta: v.optional(v.string()), // JSON: link {title,description,siteName,url} / audio {mime,bytes}
        at: v.optional(v.number()),
      }),
    ),
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
    .index("by_user_unplaced", ["userId", "placedAt"])
    .index("by_session", ["sessionId", "createdAt"]),

  // A session is one living journal entry: an ordered container of captures the
  // person keeps adding to over time (voice takes, typed passages, photos). Raw
  // truth stays on the captures rows; this row holds only container-level state:
  // the AI digest for the list view and light context. Created with its first
  // capture. See docs/superpowers/specs/2026-07-12-mobile-capture-sessions-design.md.
  sessions: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()), // AI digest; UI falls back to first words
    summary: v.optional(v.string()), // AI one-liner for the list view
    doing: v.optional(v.string()), // optional "what I was doing", person-entered
    device: v.union(v.literal("phone"), v.literal("desktop")), // where it was opened
    digest: v.optional(
      v.object({
        status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
        at: v.optional(v.number()),
      }),
    ),
    startedAt: v.number(),
    updatedAt: v.number(), // bumped on every appended capture
    pinnedAt: v.optional(v.number()), // set when pinned; pinned entries lead the list
    lastOpenedAt: v.optional(v.number()), // visit metadata: last time the document view was opened
  }).index("by_user_updated", ["userId", "updatedAt"]),

  // A pillar is a region of the "file system on the human" — a folder that holds the
  // textual files making up one part of a person (see docs/product/features/file-system-on-the-human.md).
  // `about` says what the pillar is; `composition` tells the Center how this pillar is
  // built from its files, so each per-pillar synthesis knows what belongs here.
  pillars: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    about: v.optional(v.string()), // what this region of the person is, in one or two sentences
    composition: v.optional(v.string()), // how the Center should build this pillar from its files
    weight: v.number(),
    source: v.union(v.literal("default"), v.literal("preset"), v.literal("custom")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // The files on the human. Each file is one durable textual unit about a person, living
  // inside a pillar (folder). The Listener captures talk; the Center files it here, one
  // isolated synthesis per pillar. `kind` is the type of thing captured. `status` is
  // "active" for held truth, or "pending" for a proposed change that CONTRADICTS an
  // existing file and is waiting on the person to decide (never silently overwritten).
  coreFiles: defineTable({
    userId: v.id("users"),
    pillarId: v.id("pillars"),
    name: v.string(), // file name within the pillar folder, e.g. "What drives me"
    content: v.string(),
    kind: v.string(), // value | belief | fact | dream | fear | tension | pattern | state
    status: v.union(v.literal("active"), v.literal("pending")),
    note: v.optional(v.string()), // for pending: why this seems to contradict what's held
    supersedes: v.optional(v.id("coreFiles")), // for pending: the active file it would replace
    sourceSessionId: v.optional(v.id("interviewSessions")), // which session last touched this file
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_pillar", ["userId", "pillarId", "status"])
    .index("by_session", ["sourceSessionId"]),

  // One step of the user's morning or night ritual (see docs/product/features/daily-ritual.md).
  // "do" is a plain checkbox task; "read" displays `content` (a mantra or short text) and
  // marking it read completes it. Ordered per ritual via `order`; user-editable.
  ritualItems: defineTable({
    userId: v.id("users"),
    ritual: v.union(v.literal("morning"), v.literal("night")),
    kind: v.union(v.literal("do"), v.literal("read")),
    title: v.string(),
    content: v.optional(v.string()), // the text to read (kind "read")
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_ritual", ["userId", "ritual", "order"]),

  // The check state + completion record of one ritual on one ritual day. `day` is a local
  // "YYYY-MM-DD" key computed client-side with the 4am rollover (lib/ritual.ts, ADR 0009).
  // Check state "resets" daily because each day gets a fresh row; rows with `completedAt`
  // persist as the completion history. `completedAt` is set once, by the explicit confirm.
  ritualDays: defineTable({
    userId: v.id("users"),
    ritual: v.union(v.literal("morning"), v.literal("night")),
    day: v.string(),
    checkedIds: v.array(v.id("ritualItems")),
    completedAt: v.optional(v.number()),
  }).index("by_user_ritual_day", ["userId", "ritual", "day"]),

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
    blueprintStatus: v.optional(
      v.union(v.literal("unstarted"), v.literal("in_progress"), v.literal("complete")),
    ),
    level: v.optional(v.number()),
    // Atmosphere (the ambient music system): durable preferences only. Live playback
    // state (current mood this session, volume, AUTO) stays client-side. See
    // docs/product/features/atmosphere.md.
    musicEnabled: v.optional(v.boolean()), // master switch; false hides the orb and silences audio
    musicAutoplay: v.optional(v.boolean()), // start on app load (first gesture permitting)
    musicDefaultMood: v.optional(
      v.union(
        v.literal("inspiration"),
        v.literal("deep-thinking"),
        v.literal("focus"),
        v.literal("calm-reset"),
      ),
    ),
    // Set once when the Daily Ritual defaults were seeded for this user, so deleting
    // every ritual item stays deleted (rituals.seedDefaults never re-seeds).
    ritualsSeededAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Per-profile AI provider keys. A user's own key (e.g. their OpenRouter key) is
  // used for their AI calls in preference to the deployment env key. Server-only:
  // `key` is never returned to the client (see convex/aiKeys.ts).
  apiKeys: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("openrouter"), v.literal("openai"), v.literal("local")),
    key: v.string(),
    last4: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_provider", ["userId", "provider"]),

  // The Core: the user's answers to the fixed Life Blueprint (3 sections, 18 questions). The
  // question/section skeleton lives in code (lib/blueprint.ts, recovered from the original app);
  // this table holds only the user's written response per question, keyed by the blueprint key.
  coreResponses: defineTable({
    userId: v.id("users"),
    questionKey: v.string(), // e.g. "s1q0" — matches lib/blueprint.ts
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_user_question", ["userId", "questionKey"]),

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

  // One run of an onboarding experience. Joinable by _id (QR encodes /interview/<_id>).
  interviewSessions: defineTable({
    userId: v.id("users"),
    experienceId: v.string(), // "text-interview" | "voice-interview"
    // "tossed" = the person discarded the session at the end of a Listener call
    // (data already exists with this status; the toss UI lives on the listener branch).
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("abandoned"),
      v.literal("tossed"),
    ),
    device: v.union(v.literal("desktop"), v.literal("phone")),
    transcript: v.array(
      v.object({
        role: v.union(v.literal("coach"), v.literal("user")),
        questionKey: v.optional(v.string()),
        text: v.string(),
        at: v.number(),
      }),
    ),
    skipped: v.array(v.string()),
    joinTokenHash: v.optional(v.string()), // sha256 of the QR join token
    joinTokenExpiresAt: v.optional(v.number()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  }).index("by_user", ["userId", "startedAt"]),

  // Telemetry stream: what each experience is doing (for A/B + funnel later).
  experienceEvents: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("interviewSessions")),
    experienceId: v.string(),
    event: v.string(), // started|question_shown|answered|skipped|circled_back|synthesized|completed|abandoned|voice_connected|qr_scanned
    questionKey: v.optional(v.string()),
    meta: v.optional(v.string()), // JSON blob
    at: v.number(),
  })
    .index("by_user", ["userId", "at"])
    .index("by_session", ["sessionId", "at"]),

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

  // Experimental brain-dump lab: one durable workspace for a spoken stream,
  // its sentence-level transcript, the evolving JSON idea graph, and the
  // per-session AI engine knobs used to maintain that graph.
  brainDumpSessions: defineTable({
    userId: v.id("users"),
    title: v.string(),
    transcript: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        capturedAt: v.number(),
        source: v.union(v.literal("speech"), v.literal("typed")),
        status: v.union(v.literal("pending"), v.literal("processed"), v.literal("error")),
      }),
    ),
    graph: v.object({
      version: v.literal(1),
      ideas: v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          summary: v.string(),
          details: v.array(v.string()),
          mentions: v.number(),
          createdAt: v.number(),
          updatedAt: v.number(),
        }),
      ),
      relations: v.array(
        v.object({
          id: v.string(),
          from: v.string(),
          to: v.string(),
          label: v.string(),
          reason: v.string(),
          strength: v.number(),
          createdAt: v.number(),
        }),
      ),
    }),
    engine: v.object({
      provider: v.union(v.literal("openrouter"), v.literal("openai"), v.literal("local")),
      model: v.string(),
      temperature: v.number(),
      systemPrompt: v.string(),
    }),
    aiCalls: v.optional(
      v.array(
        v.object({
          id: v.string(),
          kind: v.string(),
          provider: v.union(v.literal("openrouter"), v.literal("openai"), v.literal("local")),
          model: v.string(),
          status: v.union(v.literal("pending"), v.literal("success"), v.literal("error")),
          inputPreview: v.string(),
          outputPreview: v.optional(v.string()),
          error: v.optional(v.string()),
          startedAt: v.number(),
          endedAt: v.optional(v.number()),
        }),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_updated", ["userId", "updatedAt"]),

  // In-app feedback: a quick note from a user, captured with page context (route,
  // metadata, the page's recent JS/console errors, and an optional visual snapshot).
  // Surfaced in the /admin dev panel as a live ticketing queue. Self-scoped like the
  // rest of /admin: each user only ever writes/reads their own rows.
  feedback: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("bug"), v.literal("feature"), v.literal("other")),
    text: v.string(),
    route: v.string(), // window.location.pathname at submit
    view: v.string(), // app view: today | core | board | settings
    title: v.string(), // document.title
    viewport: v.object({ w: v.number(), h: v.number() }),
    userAgent: v.string(),
    errors: v.array(
      v.object({ message: v.string(), stack: v.optional(v.string()), at: v.number() }),
    ),
    shotId: v.optional(v.id("_storage")), // page snapshot (html2canvas), optional
    status: v.union(v.literal("open"), v.literal("dealt_with")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_status", ["status", "createdAt"]),
});
