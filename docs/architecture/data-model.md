# Data Model

**Status:** rebuilt 2026-06-03 to the evolved vision. Source of truth for the data shape. Built from [`elements-and-context.md`](elements-and-context.md) (ownership) and the live `convex/schema.ts`.

> **Two layers here.** **Live** tables already exist in `convex/schema.ts` and run in dev. **Proposed** tables are the new elements (Sessions, Prompts, Future Self, Goals); their exact shapes are written into `convex/schema.ts` when each element is built, and this doc updates in the same change. Nothing here is speculative beyond what the elements model requires.

Every table is multi-tenant: every row carries `userId` and every query/mutation gates on `getAuthUserId`. This is the one rule that has no exceptions.

---

## Ownership map (which element owns which table)

| Element | Owns | Status |
|---|---|---|
| Vision Board | `surfaces`, `nodes`, `edges`, `captures` | live |
| Future Self | `futureSelf` | proposed |
| Journal / Sessions | `sessions`, `prompts` | proposed |
| Pillars & Goals | `pillars`, `goals` | `pillars` live; `goals` proposed |
| The Core | `coreResponses` (raw Blueprint answers) + `mirror` (synthesized) | live |
| The Coach | `threads`, `messages` | live (reserved, lightly used) |
| Mirror / Context Bus | `interactions` + the assembler | live |
| Feedback Widget | `feedback` | live |
| (system) | `profiles`, `settings`, `apiKeys`, `authTables` | live |

Ownership is stark: no element stores a copy of another's data. Cross-element needs are met by **drawing** through the Context Bus at act-time, never by holding (see [`context-bus.md`](context-bus.md)).

---

## Live tables (in `convex/schema.ts` today)

### profiles
Marks a user as seeded. `{ userId, bootstrappedAt }`. On first sign-in, bootstrap seeds the default surface, the default pillar, an empty Mirror, and settings.

### surfaces
One workspace. `{ userId, type: "whiteboard" | "guide", title, createdAt }`. The `type` union widens as surfaces are added (`vision`, `journal`, `future_self`). The Vision Board is a `whiteboard` surface today.

### nodes
The visual presence of an idea on a surface. `{ userId, surfaceId, captureId?, type: text|quote|image|link|file|generated_image, title?, text?, imageUrl?, fileId?, fileName?, mimeType?, attribution?, position{x,y,z}, dimensions{width,height}, pillars[], embedding?, isActive, createdAt, updatedAt }`. Indexed `by_surface`, `by_user`. `generated_image` is the type used by Coach-built and Future-Self-derived image nodes. `file` is a dragged-in document (PDF, doc, etc.) carrying `fileName` + `mimeType`, with an open/download link; images dragged in still become `image` nodes.

### edges
A labeled, directed connection between two nodes. `{ userId, surfaceId, fromNode, toNode, label?, note?, createdAt }`. One node to many; cycle-checked on create.

### captures
The immutable event of inspiration, distilled async, may become a node. `{ userId, source: paste|upload|url|audio|agent, rawType: text|image|link|video_link|quote, rawText?, rawUrl?, rawFileId?, distilled?{title,essence,pillars}, embedding?, placedAt?, nodeId?, isActive, createdAt }`. `source: "agent"` is how the Coach captures on your behalf; `source: "audio"` is the spoken path.

### pillars
Cross-cutting typed tags (NOT containers). `{ userId, name, description?, weight, source: default|preset|custom, createdAt }`. Seeds a single default on bootstrap; the preset library adds more.

### settings
Per-user app settings. `{ userId, onboardedAt?, morningCheckin, eveningCheckin, dailyExercise: intention|gratitude|free, coachTone: gentle|balanced|direct, reachingOut: leave|earned|often, northStar?, blueprintStatus?, level?, musicEnabled?, musicAutoplay?, musicDefaultMood?, updatedAt }`.

The three `music*` fields are the durable preferences for **Atmosphere** (the ambient music system, see [`../product/features/atmosphere.md`](../product/features/atmosphere.md)): `musicEnabled?` (master switch; absent/`true` = on, only explicit `false` hides the player), `musicAutoplay?` (start on app load, gesture permitting), and `musicDefaultMood?` (`inspiration|deep-thinking|focus|calm-reset` — what plays first each session). Live playback state (the mood sounding right now, volume, AUTO) is **not** stored here; it is ephemeral client state (React + `localStorage`).

`blueprintStatus` is a computed field (see `convex/settings.ts: recompute`): `"unstarted"` (zero boxes filled), `"in_progress"` (some boxes filled), or `"complete"` (all 18 filled by user or synthesis). `level` is the numeric level derived from status: `0` = blueprint unfinished, `1` = all 18 boxes filled (app fully unlocked), `2+` deferred (engagement-driven, rules TBD). Both are set by `settings.recompute` and re-read by the Home banner and the Guide marker.

### apiKeys
Per-profile AI provider keys. `{ userId, provider: openrouter|openai|local, key, last4, createdAt, updatedAt }`, indexed `by_user_provider`. A user's own key wins over the deployment env key for that provider when their AI tasks run (see [`ai-layer.md`](ai-layer.md)). Server-only: `key` is never returned to the client (`convex/aiKeys.ts` exposes only status plus `last4`, and an `internalQuery` for server use). Encryption at rest is a tracked hardening step (see [`security-privacy.md`](security-privacy.md)).

### interviewSessions (onboarding interviews)

One run of an onboarding experience. The QR phone-handoff encodes `/interview/<_id>` so any device can join the same row.

```
interviewSessions {
  userId,                       // owner of the session
  experienceId: string,         // "text-interview" | "voice-interview"
  status: "active" | "completed" | "abandoned",
  device: "desktop" | "phone",  // device that started the session
  transcript: Array<{
    role: "coach" | "user",
    questionKey?: string,       // which blueprint key this turn addresses
    text: string,
    at: number,                 // unix ms
  }>,
  skipped: string[],            // questionKeys deferred this run (for circle-back)
  joinTokenHash?: string,       // sha256 of the QR join token (raw token never stored)
  joinTokenExpiresAt?: number,  // token expiry in unix ms (10-minute window)
  startedAt: number,
  endedAt?: number,
}
```

Indexes: `by_user` over `["userId", "startedAt"]`.

A join token is minted by `interview.issueJoinToken` (owner-only), hashed with SHA-256 via Web Crypto, stored as `joinTokenHash`. The raw token is returned once and embedded in the QR URL as `?t=<token>`. Public mutations (`markJoined`, `appendTurnByToken`, `endByToken`) validate the token by rehashing and comparing to `joinTokenHash`.

---

### experienceEvents (telemetry)

A row per notable moment in an interview run. Used for A/B funnel analysis and debugging; never read by the interview engine itself.

```
experienceEvents {
  userId,
  sessionId?: id("interviewSessions"),
  experienceId: string,
  event: string,   // started | question_shown | answered | skipped | circled_back
                   // | synthesized | completed | abandoned | voice_connected | qr_scanned
  questionKey?: string,
  meta?: string,   // JSON blob for extra fields (e.g. conflict keys from synthesis)
  at: number,
}
```

Indexes: `by_user` over `["userId", "at"]`, `by_session` over `["sessionId", "at"]`.

---

### coreResponses (the Core's raw backbone)
The person's own answers to the fixed Life Blueprint. `{ userId, questionKey, content, updatedAt }`, indexed `by_user_question`. The question/section skeleton (3 sections, 18 questions, malleability) is code config in `lib/blueprint.ts` (generated from [`../product/blueprint/blueprint.json`](../product/blueprint/blueprint.json)); `questionKey` is `s{section}q{index}` (e.g. `s1q0`). This is the raw text the Coach curates into the synthesized `mirror`. See [`../product/features/core.md`](../product/features/core.md).

### mirror (the Core's store)
The evolving text layer behind the human. `{ userId, summary, structured{ values[], themes[] }, version, takenAt }`, indexed `by_user` over `takenAt` (versioned history). This is what the Core **owns** and the Coach **curates**. The `structured` shape grows as the Core fills the Blueprint backbone (see Proposed: the Core backbone).

### interactions (the Bus event log)
`{ userId, type, payload (JSON string), at }`. Every element publishes events here; deltas roll into the Mirror.

### threads / messages (the Coach)
`threads { userId, title, createdAt }`. `messages { userId, threadId, role: user|coach, content, toolCalls?[{tool,args,result?}], createdAt }`. `toolCalls` is how the Coach records acting from far away (board edits, goal changes).

### feedback (the Feedback Widget)
`feedback { userId, type: bug|feature|other, text, route, view, title, viewport {w,h}, userAgent, errors[{message, stack?, at}], shotId?: _storage, status: open|dealt_with, createdAt, resolvedAt? }`. Indexes: `by_user [userId, createdAt]`, `by_status [status, createdAt]`. A user's in-app feedback, each captured with the page context at submit time (route, metadata, the page's recent JS/console errors, and an optional `html2canvas` snapshot in `_storage`). Surfaced as a live ticketing queue in `/admin`; self-scoped like the rest of that panel. See [`../product/features/feedback-widget.md`](../product/features/feedback-widget.md).

---

## Proposed tables (new elements, written into schema when built)

These shapes are the contract the feature docs assume. Field names are chosen to match the live conventions (`userId`, `createdAt`, `isActive`, soft-delete via flags).

### sessions (Journal / Sessions stream)
One self-session: a morning or night beat. Owns the temporal stream.
```
sessions {
  userId,
  kind: "morning" | "night" | "triggered",   // triggered = Mirror-noticed, off-rhythm
  status: "open" | "complete",
  startedAt, completedAt?,
  summary?,            // distilled text the session publishes into the Sessions stream
  mood?,              // optional lightweight signal
  isActive,
}  // index by_user over startedAt (chronological, scrollable history)
```

### prompts (the adaptive questions inside a session)
A session is a feed of prompts, each with a typed or spoken answer.
```
prompts {
  userId,
  sessionId,
  order,
  text,                          // the question shown
  origin: "rhythm" | "blueprint" | "drift" | "coach",  // why this prompt now
  blueprintQuestionId?,          // when origin = blueprint, which backbone question it fills
  answerText?,                   // typed answer
  answerAudioFileId?,            // spoken answer (transcribed into answerText)
  answeredAt?,
}  // index by_session over order
```

### futureSelf (Future Self element)
The visual you. Owns images; publishes only the distilled text behind them.
```
futureSelf {
  userId,
  kind: "upload" | "generated",
  fileId,                        // the image in storage
  prompt?,                       // generation prompt (when generated)
  sourceFileIds?,                // your photos used as likeness input
  caption?,                      // the aspiration text behind the visual (what flows to the Core)
  pillars[],                     // domains it speaks to
  isActive, createdAt,
}  // index by_user over createdAt
```

### goals (inside Pillars & Goals)
A commitment in a pillar, across the Blueprint's time horizons.
```
goals {
  userId,
  pillarId?,                     // the domain it strengthens (a goal lives inside a pillar)
  horizon: "life" | "five_year" | "yearly" | "monthly" | "daily" | "north_star",
  title,
  why?,                          // the reason behind it (Blueprint asks for this)
  deadline?,
  status: "active" | "done" | "dropped",
  parentGoalId?,                 // life -> yearly -> monthly nesting
  malleability: "green" | "yellow" | "red",
  createdAt, updatedAt,
}  // index by_user, by_pillar
```

### Proposed: the synthesized backbone on `mirror.structured`
The raw Blueprint answers live in `coreResponses` (built, above). What is proposed here is the *synthesized* layer: as the curation pass lands, the Mirror's `structured` object grows to hold the Coach's distillation of those answers plus gap-awareness:
```
structured {
  values[], themes[],                 // (live today)
  backbone: {                         // (proposed) one entry per Blueprint question
    [blueprintQuestionId]: {
      text,                           // the synthesized answer
      malleability: "green"|"yellow"|"red",
      confidence,                     // how settled this is
      sources[],                      // interactions/captures/sessions that fed it
    }
  },
  gaps[],                             // unanswered backbone questions + themes that fit no pillar
}
```
The Blueprint question set and `blueprintQuestionId` values come from [`../product/blueprint/blueprint.json`](../product/blueprint/blueprint.json).

---

## Notes
- **Embeddings deferred** (per the prior OpenRouter decision, re-recorded in `docs/decisions/`): `embedding` fields stay optional and unused; no vector index until semantic recall lands.
- **Text is the shared currency.** Images (`nodes.image`, `futureSelf`) live in their element; only their distilled `caption`/`essence` text is published to the Bus.
- **Migrations:** `threads`/`messages` were defined ahead of use to avoid churn; the proposed tables follow the same discipline (define when the element's first mutation ships, document here in the same change).
