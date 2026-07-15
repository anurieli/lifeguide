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
    // Explicit destination intent, recorded at capture time. "board" = the person
    // deliberately put this on the vision board (canvas paste, onboarding seed) —
    // it enters the board Inbox unconditionally, bypassing the vision sieve.
    // Absent = ambient (sessions, thought stream, dumps): only sieve-approved
    // captures reach the board Inbox (ADR 0014).
    target: v.optional(v.literal("board")),
    // The vision sieve's verdict, written by the distill pass: is this a piece of
    // the life this person wants (an aspiration, a want, a vision) — board-worthy —
    // or ambient noise (logistics, work notes, venting, diary happenings)?
    boardWorthy: v.optional(
      v.object({
        verdict: v.boolean(),
        reason: v.string(), // one short line, for the inbox UI + future 👍/👎 learning (ARI-28)
        at: v.number(),
      }),
    ),
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
    title: v.optional(v.string()), // person-entered name, else AI digest; UI falls back to first words
    titleEditedAt: v.optional(v.number()), // set when the person named the entry; the digest never overwrites a person's name
    summary: v.optional(v.string()), // AI living description, refreshed as content lands and on open/leave; what an agent traversing sessions pulls
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

  // One typed component of the user's morning or night ritual (ADR 0011; see
  // docs/product/features/daily-ritual.md). A ritual is an ordered list of typed
  // components. Kinds: "do" (plain checkbox task, lives on the to-do rail), "read"
  // (a readout — inline `content`, or the Blueprint document when source="blueprint"),
  // "question" (a reflection prompt: fixed `content`, or drawn from the rotating bank
  // in lib/questions.ts when absent), "roadmap" (the evening builder / morning display
  // of tomorrow's roadmap, ADR 0012). New kinds are added by widening this union +
  // optional per-kind fields — never by rewriting rows.
  ritualItems: defineTable({
    userId: v.id("users"),
    // "any" = a ritual practice indifferent to the time of day: it lives on the
    // rituals rail, is checkable every day, and belongs to neither seal. Only
    // "do" items may be "any"; sequence components always belong to a bookend.
    ritual: v.union(v.literal("morning"), v.literal("night"), v.literal("any")),
    kind: v.union(
      v.literal("do"),
      v.literal("read"),
      v.literal("question"),
      v.literal("roadmap"),
    ),
    title: v.string(),
    content: v.optional(v.string()), // read: inline text · question: fixed prompt
    // read only: where the words come from. Absent/"inline" = `content`;
    // "blueprint" = resolved live from the user's Blueprint document.
    source: v.optional(v.union(v.literal("inline"), v.literal("blueprint"))),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_ritual", ["userId", "ritual", "order"]),

  // One entry of a day's roadmap: what tomorrow starts with, captured the evening
  // before (ADR 0012). `day` is the TARGET ritual day key (the morning it belongs
  // to), so an entry added at 23:00 and one at 1:30am both land on the upcoming
  // morning. `note` carries the where / the info needed to just execute.
  roadmapEntries: defineTable({
    userId: v.id("users"),
    day: v.string(), // "YYYY-MM-DD" ritual day key (lib/ritual.ts)
    text: v.string(), // what to do
    note: v.optional(v.string()), // where / info needed
    order: v.number(),
    doneAt: v.optional(v.number()), // tapped done the next morning
    createdAt: v.number(),
  }).index("by_user_day", ["userId", "day", "order"]),

  // A note to tomorrow-morning-you: one short free-form message written during the
  // night scroll and read at the top of the next morning scroll — the last thing
  // written at night is the first thing read in the morning. `day` is the TARGET
  // morning's ritual day key (same convention as roadmapEntries, ADR 0009/0012).
  // One note per user per morning; editing at night upserts, emptying deletes.
  morningNotes: defineTable({
    userId: v.id("users"),
    day: v.string(), // "YYYY-MM-DD" ritual day key of the morning it addresses
    text: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_day", ["userId", "day"]),

  // The Blueprint for Life: the person's editable conduct doctrine (how a day is
  // lived), one document per user, seeded from the 8-pillar doctrine. A knowledge-base
  // entity at the pillar level, deliberately NOT a coreFiles row: the Core is the
  // person (character); the Blueprint is conduct. Ritual "read" steps with
  // source="blueprint" resolve their words from here, so an edit in Settings changes
  // what is read tomorrow morning. See docs/product/features/the-blueprint.md.
  blueprint: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(), // markdown, fully user-editable
    seedVersion: v.number(), // which seed it was adopted from; edits never re-seeded
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // The check state + completion record of one ritual on one ritual day. `day` is a local
  // "YYYY-MM-DD" key computed client-side with the 4am rollover (lib/ritual.ts, ADR 0009).
  // Check state "resets" daily because each day gets a fresh row; rows with `completedAt`
  // persist as the completion history. `completedAt` is set once, by the explicit confirm.
  ritualDays: defineTable({
    userId: v.id("users"),
    // "any" rows carry the daily check state of time-indifferent rituals; they
    // are never sealed (completedAt stays unset — only morning/night complete).
    ritual: v.union(v.literal("morning"), v.literal("night"), v.literal("any")),
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
    // The typed-component upgrade marker (ADR 0011): 2 once question/roadmap
    // components were offered to this account's non-empty rituals. One-shot, so
    // deleting the added components sticks.
    ritualsSeedVersion: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Per-profile AI provider keys. A user's own key (e.g. their OpenRouter key) is
  // used for their AI calls in preference to the deployment env key. Server-only:
  // `key` is never returned to the client (see convex/aiKeys.ts). "todoist" rides
  // the same table: it is the user's Todoist API token for the Goals sync.
  apiKeys: defineTable({
    userId: v.id("users"),
    provider: v.union(
      v.literal("openrouter"),
      v.literal("openai"),
      v.literal("local"),
      v.literal("todoist"),
    ),
    key: v.string(),
    last4: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_provider", ["userId", "provider"]),

  // Goals (the Orbit board): Big Things — the few projects/goals the board is
  // organized around, each carrying a "why" so priorities stay honest. A goal
  // with parentId set is a sub-project (part) of a Big Thing. Seeded from
  // _source-apps/goal-manager/Orbit-PRD.md.
  goals: defineTable({
    userId: v.id("users"),
    name: v.string(),
    parentId: v.optional(v.id("goals")),
    // big = a card on the board; shelf = a quick everyday list (Groceries, Someday).
    kind: v.union(v.literal("big"), v.literal("shelf")),
    status: v.union(v.literal("active"), v.literal("planning"), v.literal("ongoing")),
    area: v.union(v.literal("business"), v.literal("personal"), v.literal("people")),
    why: v.optional(v.string()),
    sortOrder: v.number(),
    archived: v.optional(v.boolean()),
    // Two-way Todoist link: set when this goal mirrors a Todoist project.
    todoistProjectId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_todoist", ["userId", "todoistProjectId"]),

  // Tasks on the Goals board. goalId unset = the Inbox (unfiled capture bucket).
  // "waiting" is the Orbit Phase-1 task state: blocked on someone/something,
  // surfaced in its own view with aging.
  goalTasks: defineTable({
    userId: v.id("users"),
    goalId: v.optional(v.id("goals")),
    content: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.string()), // YYYY-MM-DD
    priority: v.optional(v.number()), // Todoist convention: 1 normal … 4 urgent
    checked: v.boolean(),
    completedAt: v.optional(v.number()),
    waiting: v.optional(v.boolean()),
    waitingOn: v.optional(v.string()), // free text who/what until People ships
    waitingSince: v.optional(v.number()),
    sortOrder: v.number(),
    todoistTaskId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_goal", ["userId", "goalId"])
    .index("by_user_todoist", ["userId", "todoistTaskId"]),

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

  // (brainDumpSessions — the experimental brain-dump idea-graph lab — was removed
  // 2026-07-13. The lab was unreachable (no route/nav) and Ariel tossed it; the
  // shipped brain-dump flow lives on captures via voice.brainDump. See ADR 0016.)

  // Universal AI call log (ADR 0017): one row per model call, every call, no matter
  // what — chat, transcription, image. Written best-effort (a logging failure never
  // breaks the feature) by the helpers in convex/ai/openai.ts. Cost is a best-effort
  // estimate from the pricing snapshot in config (undefined when unknown).
  aiLogs: defineTable({
    userId: v.optional(v.id("users")),
    taskId: v.string(), // the AI node id from convex/ai/config.ts
    fn: v.string(), // the server call site, e.g. "ai/distill.distillCapture"
    provider: v.string(),
    model: v.string(),
    kind: v.union(
      v.literal("chat"),
      v.literal("transcription"),
      v.literal("image"),
      // realtime rows mark a voice-session mint; usage runs client-side over WebRTC,
      // so tokens/cost are unknowable server-side — the row is the session marker.
      v.literal("realtime"),
    ),
    ok: v.boolean(),
    error: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    durationMs: v.number(),
    at: v.number(),
  })
    .index("by_user_at", ["userId", "at"])
    .index("by_at", ["at"]),

  // Per-user AI model overrides (ADR 0017): the Settings AI hub lets a person
  // re-point any node at a different provider/model for THEIR account. An override
  // row wins over the config default in aiForTask; deleting it falls back.
  aiOverrides: defineTable({
    userId: v.id("users"),
    taskId: v.string(),
    provider: v.union(v.literal("openrouter"), v.literal("openai"), v.literal("local")),
    model: v.string(),
    updatedAt: v.number(),
  }).index("by_user_task", ["userId", "taskId"]),

  // In-app feedback: a quick note from a user, captured with page context (route,
  // metadata, the page's recent JS/console errors, and photos/snapshot). Surfaced in
  // the /admin inbox as a live ticketing queue with a triage lifecycle, and pushable
  // to Linear as a tracked issue (owner-gated). The owner sees every user's feedback
  // (support inbox); everyone else is self-scoped — enforced in convex/feedback.ts.
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
    imageIds: v.optional(v.array(v.id("_storage"))), // user-attached photos (pasted/picked)
    // Triage lifecycle: open (needs you) → pending (being dealt with — replied or
    // pushed to Linear) → dealt_with (closed, a separate pile). See ADR 0019.
    status: v.union(v.literal("open"), v.literal("pending"), v.literal("dealt_with")),
    // Set once this ticket is pushed to Linear as a tracked issue (convex/linear.ts).
    // Linear becomes the place the bug/feature is actually worked; this row keeps the
    // support-inbox side (who to reply to, its lifecycle) and links out to the card.
    linear: v.optional(
      v.object({
        issueId: v.string(),
        identifier: v.string(), // e.g. "ARI-42"
        url: v.string(),
        at: v.number(),
      }),
    ),
    createdAt: v.number(),
    pendingAt: v.optional(v.number()), // moved to "being dealt with"
    resolvedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_status", ["status", "createdAt"]),
});
