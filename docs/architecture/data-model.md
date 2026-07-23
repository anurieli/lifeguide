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
| Sessions (the living entry) | `sessions` (container; members via `captures.sessionId`), `sessionReplies`, `thoughtMaps` | live |
| Journal | `prompts` (its beats open the live `sessions`) | proposed |
| Pillars & Goals | `pillars`, `goals`, `goalTasks`, `roadmapSteps` | live |
| The Core | `coreResponses` (raw Blueprint answers) + `mirror` (synthesized) | live |
| The Coach | `threads`, `messages` | live (reserved, lightly used) |
| Mirror / Context Bus | `interactions` + the assembler | live |
| Feedback Widget | `feedback` | live |
| What's New | `whatsNew`, `whatsNewSeen` | live |
| Daily Ritual (the Scrolls) | `ritualItems`, `ritualDays`, `roadmapEntries`, `morningNotes` | live |
| Horizons (goal ladder) | `horizons` | live |
| Daily tidbit (quote agent) | `dailyTidbits` | live |
| The Blueprint (conduct doctrine) | `blueprint` | live |
| (system) | `profiles`, `settings`, `apiKeys`, `authTables` | live |
| Product Tour (guided walkthrough) | rides `settings` (no table of its own) | live |

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
The event of a thought or inspiration, ingested async (extraction then distillation), may become a node. `{ userId, source: paste|upload|url|audio|agent, rawType: text|image|link|video_link|quote|audio|file, rawText?, rawUrl?, rawFileId?, sessionId?, sourceMeta?, target?: "board", extractedText?, extraction?{status: pending|done|error|skipped, error?, meta?, at?}, distilled?{title,essence,pillars}, boardWorthy?{verdict, reason, at}, readable?{summary, cleaned}, embedding?, placedAt?, nodeId?, isActive, createdAt }`. `target: "board"` is **explicit destination intent**, recorded at capture time (canvas paste, onboarding seed): such captures enter the board Inbox unconditionally. `boardWorthy` is the **vision sieve's** verdict, written by the distill pass for every capture: whether this is a piece of the life the person wants (an aspiration, a want, a vision) or ambient noise. The board Inbox admits only `target: "board"` OR `boardWorthy.verdict: true` (unplaced + active as before) — see [ADR 0015](../decisions/0015-vision-sieve-for-the-board-inbox.md). `sessionId` marks membership in a living entry (index `by_session [sessionId, createdAt]`); loose captures have none and behave exactly as before. `source: "agent"` is how the Coach captures on your behalf. The raw artifact (`rawText`/`rawUrl`/`rawFileId`) is always kept so a capture can be re-ingested after the fact. `extractedText` is the canonical derived text (Whisper transcript for `audio`, fetched title/description/body for `link`/`video_link`, vision description + verbatim visible text for `image`); the ingest pipeline is `convex/ai/ingest.ts` + `lib/extractHtml.ts`, and distillation reads `extractedText` first. `readable{summary, cleaned}` (ARI-145) is set by the distill pass for a **long** audio capture only — one whose transcript passes `lib/audioReadable.ts`'s `LONG_AUDIO_READABLE_THRESHOLD`: `summary` is a concise gist (shown at the collapsed card top), `cleaned` is the full transcript with filler/false-starts removed and grammar repaired (shown on expand, capped at `LONG_AUDIO_DISTILL_INPUT_CAP`). It is purely additive: `extractedText` (the raw machine transcript) and `rawFileId` (the audio blob) are untouched, and it comes from the same distill model call (`parseReadable` in `convex/ai/parse.ts`, returns null unless both fields are present). Absent for short notes, pre-feature captures, or an AI failure, in which case the card falls back to the raw transcript. `sourceMeta` is client context at capture time (JSON, currently `{device}`). `rawType: "file"` is stored durably but not parsed yet. **A `text`/`quote` capture's `rawText` is the one field that isn't fixed at creation** (ARI-123, `captures.update`): the person can reopen and correct or extend it after the fact (Sessions' click-to-edit note, `CaptureItem.tsx`'s `EditableText`, expanded from a capture's itemized card), which mirrors the new text onto `extractedText` and re-schedules distillation over the corrected wording. Every other raw type's artifact (the stored audio/image blob, the fetched link) stays fixed once ingested — only its *derived* text can be regenerated wholesale via `captures.reprocess`, never hand-edited. See [`../product/features/thought-stream.md`](../product/features/thought-stream.md) and [`../product/features/sessions.md`](../product/features/sessions.md).

### pillars
The folders of the **file system on the human** — the regions of a person (see [`../product/features/file-system-on-the-human.md`](../product/features/file-system-on-the-human.md)) and, as of ARI-11, the canonical domain entity the Core, Sessions, goals, and the Coach all read/write ([`../product/features/pillars.md`](../product/features/pillars.md)). `{ userId, name, description?, about?, composition?, weight, source: default|preset|custom, role?: domain|identity, strength?, strengthUpdatedAt?, createdAt }`, indexed `by_user`. `about` says what this region of the person is; `composition` tells the **Center** how to build this pillar from its files. Bootstrap seeds the **canonical skeleton** (the `DEFAULT_PILLARS` set in `convex/pillars.ts`: Identity & Values, Body & Health, Work & Money, Relationships, Mind & Growth, Meaning & Spirit, Fears & Shadows, Dreams & Aspirations); `seedDefaultPillars` is idempotent and tops up older accounts. The preset library adds more; users can define custom pillars.

`role` (absent = `"domain"`, back-compat): `"identity"` marks the one pillar ("Identity & Values") that IS the person's identity rather than a domain it holds up — see [ADR 0022](../decisions/0022-identity-is-not-a-pillar.md). It is filed into exactly as before (ADR 0007 is unchanged) but is excluded from `pillars.wheel` and `pillars.assembleContext`, i.e. from strength scoring and the Life Wheel. `strength` is a manual 0-100 rating of how strong/attended-to a domain currently is — v1 has no automatic derivation (deferred to ARI-16, the current-state/gap engine); unset reads as a neutral 50 (`NEUTRAL_STRENGTH`), never as 0. `strengthUpdatedAt` is set whenever `strength` changes, the seam a future history/over-time view plugs into. `pillars.wheel` (query) returns the domain pillars with their strengths for the Life Wheel; `pillars.setStrength` (mutation, owner-checked, clamps to [0,100]) is the read/write path; `pillars.assembleContext` (query) publishes a `ContextFragment` of domain strengths that `coach.ask` includes alongside the Mirror, so the Coach can see how each part of a person's life is currently standing.

### coreFiles (the files on the human)
The durable textual units that make up a person, each living inside a pillar (folder). `{ userId, pillarId, name, content, kind, status: active|pending, note?, supersedes?, sourceSessionId?, createdAt, updatedAt }`, indexed `by_user_pillar` (`[userId, pillarId, status]`) and `by_session` (`[sourceSessionId]`). `kind` is the type of thing captured (`value|belief|fact|dream|fear|tension|pattern|state`). `status: "active"` is held truth; `status: "pending"` is a proposed change that **contradicts** an existing file (`supersedes` points at it, `note` says why) and is waiting on the person to decide — never silently overwritten. Written by the **Center** during its post-call fan-out (`convex/center.ts` via internal mutations in `convex/coreFiles.ts`); the **filing report** reads `bySession`. See [`../product/features/the-center.md`](../product/features/the-center.md).

### goals

The things a person is chasing in life — a TED talk, climbing Everest — through to the measurable commitments they've dated. `{ userId, name, parentId?, status: active|planning|ongoing, pillarId?, why?, deadline?, laddersTo?: five_year|one_year|one_month, roadmapDraft?{status: pending|done|error, summary?, model?, error?, generatedAt?}, sortOrder, archived?, todoistProjectId?, createdAt, updatedAt }`, indexed `by_user`, `by_user_todoist [userId, todoistProjectId]`, `by_user_pillar [userId, pillarId]`. **The aspiration/Goal tier is purely `deadline` presence** — no `deadline` is a someday aspiration; setting one graduates it into a dated Goal, and clearing it ungraduates back. `pillarId` optionally homes it in a domain from the live `pillars` table (a real link — this did not exist before this shape shipped). `laddersTo` is a light, optional pointer at a Horizons standing rung (`five_year`/`one_year`/`one_month`) — deliberately not a full merge of the two tables; the fuller vision-board/Horizons/Orbit unification is parked as Linear ARI-103 (see [ADR 0029](../decisions/0029-aspirations-goals-and-roadmap-steps.md)). `roadmapDraft` tracks the async AI scoping pass (`convex/ai/goalEnrich.ts`, scheduled on create/regenerate): a short "what this actually takes" summary, with an explicit `pending`/`done`/`error` status so the UI never hangs. `parentId` is unchanged sub-project nesting; `todoistProjectId` is the unchanged two-way Todoist link. Two deprecated validate-only optionals, `area?` and `kind?`, linger from the pre-0029 Orbit shape solely so existing prod rows validate; nothing reads or writes them, and they are deletable once `goals.migrateDropAreaKind` has run against the deployment. See [`../product/features/goals.md`](../product/features/goals.md).

### goalTasks

Day-to-day, Todoist-synced execution items — Today/Inbox/Waiting triage, distinct from a goal's own `roadmapSteps` scoping. `{ userId, goalId?, content, description?, dueDate?, priority?, checked, completedAt?, waiting?, waitingOn?, waitingSince?, sortOrder, todoistTaskId?, createdAt, updatedAt }`, indexed `by_user`, `by_user_goal [userId, goalId]`, `by_user_todoist [userId, todoistTaskId]`. `goalId` unset = the Inbox. Unchanged by the aspiration/Goal rework. See [`../product/features/goals.md`](../product/features/goals.md).

### roadmapSteps

The AI-drafted (and user-editable) roadmap for a goal/aspiration: a small dependency graph, not a flat checklist. `{ userId, goalId, title, status: todo|doing|done, isNextMove?, blockedBy: Id<roadmapSteps>[], source: ai|manual, sortOrder, createdAt, updatedAt }`, indexed `by_user_goal [userId, goalId]`. Whether a step is **blocked is computed**, never stored (any `blockedBy` step not yet `done` blocks it; a dangling id whose step was deleted resolves as non-blocking, avoiding fan-out cleanup on delete). Cycle handling is trust-split ([ADR 0029](../decisions/0029-aspirations-goals-and-roadmap-steps.md)): an AI-drafted batch silently breaks cycles (same technique as `thoughtMaps`' cycle guard, below); a user's live edit (`roadmapSteps.setBlockedBy`) is rejected outright rather than silently dropped. Drafted by `convex/ai/goalEnrich.ts` on goal create/regenerate; `source: "manual"` steps a person adds by hand are never touched by a regenerate. See [`../product/features/goals.md`](../product/features/goals.md).

### ritualItems / ritualDays / roadmapEntries / morningNotes (the Daily Ritual)
The two ordered component sequences that bookend the day, plus the roadmap loop (see [`../product/features/daily-ritual.md`](../product/features/daily-ritual.md)).

`ritualItems { userId, ritual: morning|night|any, kind: do|read|mantra|question|roadmap|tidbit, title, content?, source?, order, createdAt, updatedAt }`, indexed `by_user_ritual [userId, ritual, order]`. One row per **typed component** of a ritual ([ADR 0011](../decisions/0011-typed-ritual-components.md)), user-editable (add/edit/delete/reorder). `do` is a permanent practice (rendered on the rituals rail); `read` is a long readout behind the immersive reader — `content` inline, or resolved live from the user's [Blueprint document](../product/features/the-blueprint.md) when `source: "blueprint"`; `mantra` is a short line shown **inline** (no reader, no Read tap) — `content` fixed, or drawn from the rotating pool (`lib/mantras.ts`) when absent, differing by the day; `question` is a reflection prompt — `content` fixed, or drawn from the rotating bank (`lib/questions.ts`) when absent; `roadmap` is the evening builder / morning display of the roadmap loop; `tidbit` is a daily inspirational quote shown inline — `content` fixed (a pinned line), or generated by the Haiku [daily-quote agent](../product/features/daily-tidbit.md) into `dailyTidbits` when absent. `ritual: "any"` marks a **time-indifferent practice** (kind `do` only, enforced in `rituals.addItem`): it lives on the rituals rail, checks against an `any` day row, and belongs to neither seal (`rituals.complete` accepts only morning/night). New kinds widen the union; rows are never rewritten. New users are seeded with the typed default set (`DEFAULT_RITUAL_ITEMS` in `convex/rituals.ts`, derived from [`../research/blueprint-for-living.md`](../research/blueprint-for-living.md)); seeding is one-shot via `settings.ritualsSeededAt`, and older accounts are offered the new component kinds exactly once via `rituals.upgradeToSeedVersion` + `settings.ritualsSeedVersion` (non-empty rituals only, so delete-all sticks either way).

`roadmapEntries { userId, day, text, note?, goalTaskId?, order, doneAt?, createdAt }`, indexed `by_user_day [userId, day, order]`. One line of a day's roadmap, keyed by its **TARGET ritual day** ([ADR 0012](../decisions/0012-roadmap-targets-next-ritual-day.md)): the evening builder writes to `nextRitualDayKey(now)`, the morning display reads today's own key. An entry at 23:00 and one at 1:30am both land on the same upcoming morning. `note` carries the where / the info needed to just execute; `doneAt` is the morning tap.

`goalTaskId?` makes the entry a **pointer at a canonical `goalTasks` row** instead of a free-form line (ARI-144): the roadmap is a *selection* over goals the person already tracks, not a second to-do list. `roadmap.addFromTask` sets it and writes `text` (and `note` from the task's description) as an initial snapshot. While the link is live, `roadmap.forDay` resolves the task's **current** `content` (a rename on the Goals board shows through) and its **current** `checked` state (a completion or reopen there is reflected, and a stale local `doneAt` never wins), and `roadmap.setDone` **mirrors a morning check back** to the canonical task (`checked` / `completedAt`) and reuses its Todoist push (`internal.todoist.pushChecked`). When the linked task is **deleted** through `goals.deleteTask`, that mutation **freezes the LATEST resolved snapshot into the row before the task disappears** (indexed lookup `by_goal_task [goalTaskId]`): it copies the task's current `content` into `text`, mirrors the task's current `checked` state into `doneAt` (a not-checked task clears any stale local `doneAt`, since the canonical state is the single source of truth), and clears `goalTaskId` so the row lives on as a plain frozen line. The freeze only touches entries whose `userId` matches the task owner (defense in depth against corrupt cross-user links). If the task vanishes some other way (or is not owned at read time), `roadmap.forDay` still falls back to the row's stored `text` + its own `doneAt`. **Legacy / free-form entries** (written before ARI-144, or via the retained `roadmap.add`) leave `goalTaskId` unset and behave exactly as before. The `by_goal_task` index also lets a delete find its linked entries without scanning.

`morningNotes { userId, day, text, createdAt, updatedAt }`, indexed `by_user_day [userId, day]`. The **note to tomorrow-morning-you**: one free-form message written during the night scroll, keyed by the TARGET morning's ritual day (same convention as `roadmapEntries`), read at the top of that morning's scroll. One note per user per morning — `morningNote.set` upserts, and an empty text deletes the row so a morning never opens on a blank note (`convex/morningNote.ts`).

`ritualDays { userId, ritual: morning|night|any, day: "YYYY-MM-DD", checkedIds: Id<ritualItems>[], completedAt? }`, indexed `by_user_ritual_day [userId, ritual, day]`. One row per ritual per **ritual day**: the live check state while the day is open, and the completion record once `completedAt` is stamped by the explicit confirm (`rituals.complete`, which also publishes a `ritual_completed` interaction). The `day` key is computed client-side from local time with a **4am rollover** (`lib/ritual.ts`, [ADR 0009](../decisions/0009-ritual-day-boundary.md)); daily reset is structural because each new day is a new, initially absent row. Stale ids in `checkedIds` (items deleted later) are ignored by completion logic. `rituals.history(sinceDay)` reads both rituals' rows from a day key onward (lexicographic range over the index) for the Today log's quiet keeping-up strip.

### settings
Per-user app settings. `{ userId, onboardedAt?, morningCheckin, eveningCheckin, dailyExercise: intention|gratitude|free, coachTone: gentle|balanced|direct, reachingOut: leave|earned|often, northStar?, blueprintStatus?, level?, musicEnabled?, musicAutoplay?, musicDefaultMood?, ritualsSeededAt?, ritualsSeedVersion?, thoughtMapMemo?, tourStep?, tourCompletedAt?, tourSkippedAt?, updatedAt }`.

`thoughtMapMemo?` (ARI-18 teachable map, 2026-07-18) is the person's standing, plain-language steering memo for the [Thought Map](../product/features/sessions.md) — how they want their thinking mapped (fewer/bigger nodes, what counts as the root, what to ignore). Trimmed and capped ~2000 chars server-side (`convex/settings.ts`'s `update`, sharing the `THOUGHT_MAP_MEMO_CAP` constant with `lib/thoughtMap.ts`); an empty/whitespace memo saves as unset (default behavior, unchanged mapping). Read server-side only by `ai/thoughtMap.ts`'s `generate` (via `settings.getMemoInternal`) and folded into the model's system prompt by `lib/thoughtMap.ts`'s `buildMapSystemPrompt`. Editable from the session's "Teach it" panel (`components/sessions/ThoughtMapView.tsx`) and from Settings (`components/settings/ThoughtMapMemoField.tsx`), both wired to the same `settings.update` mutation.

`ritualsSeededAt?` marks the one-shot seeding of the Daily Ritual defaults (see `ritualItems` above); once set, `rituals.seedDefaults` never inserts again. `ritualsSeedVersion?` marks the one-shot typed-component upgrade ([ADR 0011](../decisions/0011-typed-ritual-components.md)); at the current version (5 — v3 added the inline `mantra` and the morning journal, v4 reconciles the v3 duplicate-mantra fallout into one inline mantra and makes the morning journal follow `settings.dailyExercise`, v5 adds the daily-quote `tidbit`), `rituals.upgradeToSeedVersion` is a no-op forever. `dailyExercise` (`intention|gratitude|free`) drives the morning journal prompt and is editable both in Settings and inline in the morning scroll.

`tourStep?`, `tourCompletedAt?`, `tourSkippedAt?` back the in-app **guided product tour** ([`../product/features/product-tour.md`](../product/features/product-tour.md), `convex/tour.ts`) — distinct from the Door/Interview onboarding above, which draws out the Core before the shell ever mounts; the tour walks an already-onboarded person around the shell itself. All three are optional/undefined by default, so existing rows are untouched by the migration: undefined reads as "never started," and the tour only fires once `onboardedAt` is set and neither terminal stamp (`tourCompletedAt` finished, `tourSkippedAt` dismissed early) is present. `tourStep` mirrors the current stop so a reload resumes mid-tour instead of restarting. Settings' "Restart tour" control clears both stamps and resets the step to re-fire it.

### horizons (the goal ladder)

`horizons { userId, scope: five_year|one_year|one_month|weekly|daily, period, text, order, doneAt?, createdAt, updatedAt }`, indexed `by_user_scope_period [userId, scope, period, order]`. The nested plan from the far 5-year vision down to today (see [`../product/features/horizons.md`](../product/features/horizons.md)). `period` addresses which instance of a rung: `"std"` for the standing rungs (five_year/one_year/one_month — one evolving line, order 0), the week's **Monday key** for `weekly`, the **ritual day key** for `daily` (all from `lib/horizons.ts periodKeyFor`, timezone-stable). Weekly/daily rungs hold up to 3 (`MAX_PER_PERIOD`) ordered, checkable goals (`doneAt`); standing rungs are single-line and not checkable (enforced in `convex/horizons.ts`). North Star is **not** here — it stays in `settings.northStar` and renders as the ladder's crown.

### goals / goalTasks (the Goals board, "Orbit")

`goals { userId, name, parentId?, kind: big|shelf, status: active|planning|ongoing, area: business|personal|people, why?, sortOrder, archived?, todoistProjectId?, pillarId?, createdAt, updatedAt }`, indexed `by_user` and `by_user_todoist [userId, todoistProjectId]`. The Big Things board (see [`../product/features/goals.md`](../product/features/goals.md)) — this is the **live** shape, distinct from the horizon-based `goals` sketched in "Proposed" below, which that feature superseded when it actually shipped. `pillarId?` (ARI-11) is the relation from a goal to the domain (`pillars`) it strengthens; optional and not yet set by any UI — it exists so the pillar entity is a sane foundation for wiring goals into the Life Wheel/Coach later, not something this change builds out. `goalTasks { userId, goalId?, content, description?, dueDate?, priority?, checked, completedAt?, waiting?, waitingOn?, waitingSince?, sortOrder, todoistTaskId?, createdAt, updatedAt }`, indexed `by_user`, `by_user_goal`, `by_user_todoist`. Tasks on the board; `goalId` unset = the Inbox.

### dailyTidbits (the daily quote)

`dailyTidbits { userId, day, kind: "quote", status: pending|done|error, text?, attribution?, model?, error?, generatedAt?, createdAt }`, indexed `by_user_day_kind [userId, day, kind]`. One cached row per (user, ritual `day`, kind): the morning scroll's [daily inspirational quote](../product/features/daily-tidbit.md), generated at most once per day by the cheap Haiku `dailyQuote` agent (`convex/ai/dailyQuote.ts`) and streamed reactively. `dailyTidbits.ensureForDay` writes the `pending` row and schedules the agent (idempotent); `refresh` re-runs it; `contextForInternal` draws `settings.northStar` + `mirror` + standing `horizons` + recent quotes for personalization. `kind` is a union so future tidbit kinds slot in without a rewrite.

### blueprint (the conduct doctrine)
The person's editable Blueprint for Living — how a day is lived — one document per user (see [`../product/features/the-blueprint.md`](../product/features/the-blueprint.md)). **STRUCTURED, not free text (2026-07-20):** `{ userId, title, header?, pillars?, content (markdown, derived), seedVersion, createdAt, updatedAt }`, indexed `by_user`.

- `header?: { kicker?, title, intro?, source?, compiled?, structure?, howToRead? }` — the doctrine's front matter: the "Personal Operating System" kicker, the title shown inside the immersive view, the intro paragraph, the Source/Compiled/Structure meta line, and the "How to read this" paragraph.
- `pillars?: [{ id, name, subtitle?, items: [{ id, practice, why }] }]` — the 8-pillar (extensible) body. Every pillar and item carries a stable string `id` (generated with `crypto.randomUUID()`-based ids), so a mutation can target one exact unit. One **item** (`practice` + `why`) is the smallest editable unit; one **pillar** (name + subtitle + its items) is the larger unit.
- `content: string` is **DERIVED**, never hand-edited: `convex/blueprintDoc.ts`'s `renderMarkdown(header, pillars)` regenerates it on every structured mutation, in the same markdown shape the read path already knows (`## N · Name` headings, plain paragraphs for each practice, `*italic*` for its why). This is the read-path seam: ritual `read` steps with `source: "blueprint"` still resolve their words from `content` at render time, so `components/today/ImmersiveReader.tsx` / `DailyRead.tsx` needed **zero changes** — deliberately its own table, NOT a `coreFiles` row: the Core is the person, the Blueprint is conduct.
- `header`/`pillars` are `optional` in the schema specifically so a pre-2026-07-20 row (free-text-only shape) stays schema-valid until it is lazily upgraded (`blueprintDoc.ts`'s `upgradeIfNeeded`, run from `ensureBlueprint` the next time the doc is touched): an untouched legacy seed is replaced outright with the new structured seed; genuinely edited free text is preserved, wrapped into one pillar (`"Your Blueprint"`) rather than discarded. `seedVersion` bumped 1 → 2 for this migration.
- **The coach-editable surface** (`convex/blueprintDoc.ts`): `updateHeader`, `addPillar`, `removePillar`, `updatePillar`, `addItem`, `removeItem`, `updateItem` — the exact granularity a Coach agent should call later to edit a person's Blueprint on their behalf (not wired to the Coach yet). `update({ title?, content? })` remains as a legacy raw-content escape hatch; it does not touch `header`/`pillars`, so a later structured mutation regenerates `content` from the structured data again.
- **UI:** `components/settings/BlueprintCard.tsx` opens `components/settings/BlueprintImmersive.tsx`, a full-screen structured view/editor reusing `ImmersiveShell` (`components/today/ImmersiveReader.tsx`) for its overlay chrome — see ADR 0013's 2026-07-20 revision for why the reader no longer auto-closes.

The three `music*` fields are the durable preferences for **Atmosphere** (the ambient music system, see [`../product/features/atmosphere.md`](../product/features/atmosphere.md)): `musicEnabled?` (master switch; absent/`true` = on, only explicit `false` hides the player), `musicAutoplay?` (start on app load, gesture permitting), and `musicDefaultMood?` (`inspiration|deep-thinking|focus|calm-reset` — what plays first each session). Live playback state (the mood sounding right now, volume, AUTO) is **not** stored here; it is ephemeral client state (React + `localStorage`).

`blueprintStatus` is a computed field (see `convex/settings.ts: recompute`): `"unstarted"` (zero boxes filled), `"in_progress"` (some boxes filled), or `"complete"` (all 18 filled by user or synthesis). `level` is the numeric level derived from status: `0` = blueprint unfinished, `1` = all 18 boxes filled (app fully unlocked), `2+` deferred (engagement-driven, rules TBD). Both are set by `settings.recompute` and re-read by the Home banner and the Guide marker.

### apiKeys
Per-profile AI provider keys. `{ userId, provider: openrouter|openai|local, key, last4, createdAt, updatedAt }`, indexed `by_user_provider`. A user's own key wins over the deployment env key for that provider when their AI tasks run (see [`ai-layer.md`](ai-layer.md)). Server-only: `key` is never returned to the client (`convex/aiKeys.ts` exposes only status plus `last4`, and an `internalQuery` for server use). Encryption at rest is a tracked hardening step (see [`security-privacy.md`](security-privacy.md)).

### aiLogs (the universal AI call log — ADR 0017)
One row per model call, every call, success or failure. `{ userId?, taskId, fn (call site), provider, model, kind: chat|transcription|image|realtime, ok, error?, inputTokens?, outputTokens?, costUsd? (estimate from the dated PRICING snapshot; undefined when unknown), durationMs, at }`, indexed `by_user_at` and `by_at`. Written best-effort by the helpers in `convex/ai/openai.ts` (`chatComplete` / `transcribeLogged` / `logAi`) — a failed log write never breaks the feature. Read by the Settings AI hub (`aiLogs.recent`, `aiLogs.monthSpend`). `realtime` rows mark a voice-session mint; that conversation's usage runs client-side over WebRTC and is unknowable server-side. Unbounded growth; pruning/rollup deferred.

### aiOverrides (per-user model dials — ADR 0017)
The Settings AI hub's model picker. `{ userId, taskId, provider: openrouter|openai|local, model, updatedAt }`, indexed `by_user_task`. `aiForTask` resolves the person's override before the config default in `convex/ai/config.ts`; deleting the row (the "yours · reset" chip) falls back. Mutations in `convex/aiModels.ts` (`setModel` / `clearModel`; `nodes` returns the registry overlaid with the caller's overrides).

### interviewSessions (onboarding interviews + the Listener's calls)

One run of an onboarding experience, OR one Listener (`/speak`) call, OR — since ADR 0024 — one run of the Core's Conversational mode (the table is shared: the same shape fits a transcript, a status, a device, and `experienceId` distinguishes them; ADR 0007/the-center.md). The QR phone-handoff encodes `/interview/<_id>` so any device can join the same onboarding row; Listener calls never use tokens (auth-gated only).

```
interviewSessions {
  userId,                       // owner of the session — the one speaker this thread belongs to
  experienceId: string,         // "text-interview" | "voice-interview" | "listen" (the Listener,
                                 // components/voice/SpeakSurface.tsx) | "core" (Core Conversational
                                 // mode, components/core/ConversationalCore.tsx, ADR 0024)
  status: "active" | "completed" | "abandoned" | "tossed",
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
  summary?: {                   // Listener memory backbone (ARI-23, ADR 0023) — "listen" only
    status: "pending" | "done" | "error",
    text?: string,               // 2-4 plain sentences: what was talked about, where it landed
    topics?: string[],           // short topic tags
    openThreads?: string[],      // left unresolved, worth picking back up next call
    error?: string,
    at?: number,
  },
}
```

Indexes: `by_user` over `["userId", "startedAt"]`.

A join token is minted by `interview.issueJoinToken` (owner-only), hashed with SHA-256 via Web Crypto, stored as `joinTokenHash`. The raw token is returned once and embedded in the QR URL as `?t=<token>`. Public mutations (`markJoined`, `appendTurnByToken`, `endByToken`) validate the token by rehashing and comparing to `joinTokenHash`.

**`summary` — the Listener's memory backbone (ARI-23, [ADR 0023](../decisions/0023-listener-memory-backbone.md)).** Distinct from the Center's identity filing (`coreFiles`, below): this answers "what have this person and the Listener been talking about lately," not "who is this person." Written by `convex/ai/listenerMemory.ts`'s `summarizeSession` (the `listenerSummary` AI node), scheduled by `interview.end` on EVERY "listen" call end — completed, abandoned, or **tossed alike** (`end`'s `status` union now includes `"tossed"`; a toss only withholds the Center's Core-filing pass, never this memory). An empty transcript short-circuits to `status: "done"` with no `text` and no model call. `interview.latestListenSummaryInternal` walks one user's own `interviewSessions` newest-first for the most recent done, non-empty summary — this per-user scan over rows already scoped to exactly one `userId` **is** the "session per speaker" continuity thread (ADR 0023 §1: a new person-level memory concept was unnecessary, the existing per-user scoping already provides it). `convex/ai/voice/index.ts`'s `instructionsFor` reads that one prior summary and appends it to `LISTENER_INSTRUCTIONS` (`agents/listener/persona.ts`'s `buildListenerInstructions`) when minting the NEXT "listen" session, so the orb opens grounded instead of cold. v1 depth is last-session-only, not last-N or a rolling memo (ADR 0023 §4, tracked as an open question). Pure assembly/parsing/handoff logic lives in `lib/listenerMemory.ts`.

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
`{ userId, type, payload (JSON string), at }`, indexed `by_user [userId, at]`. Every element publishes events here; deltas roll into the Mirror. The read side: `interactions.forRange(sinceMs, untilMs)` returns the person's own events in a time span — the Today surface passes the current ritual day's span (4am→4am, `lib/ritual.ts ritualDayRange`) to render the day's log (see [`../product/features/dashboard.md`](../product/features/dashboard.md)).

### threads / messages (the Coach)
`threads { userId, title, createdAt }`. `messages { userId, threadId, role: user|coach, content, toolCalls?[{tool,args,result?}], createdAt }`. `toolCalls` is how the Coach records acting from far away (board edits, goal changes).

### sessions (the living entry)
One journal session a person keeps adding to: a container over captures, never a second store. `{ userId, title?, titleEditedAt?, summary?, doing?, device: phone|desktop, digest?{status: pending|done|error, at?}, mode?: quiet|dynamic, interviewer?, startedAt, updatedAt, pinnedAt?, lastOpenedAt? }`. Index: `by_user_updated [userId, updatedAt]`. Members are `captures` rows carrying `sessionId` (their raw artifacts, ingest, and distillation are untouched by session membership). `title` is the person-entered name when `titleEditedAt` is set (`sessions.setTitle`, ≤80 chars; the digest write guards on `titleEditedAt` and never overwrites a person's name; clearing the field unsets both and hands naming back to the AI), otherwise the AI digest title. `summary` is the AI **living description** — what an agent traversing entries pulls — written by the digest (`convex/ai/sessionDigest.ts`, debounced ~30s off member ingest completion, and additionally schedulable via `sessions.refreshDigest`, called by the document view on every open and leave; it no-ops when `digest.at >= updatedAt` with status done, or when the entry has no active members). The list falls back to the entry's first words via `lib/sessionDigest.ts`. `doing` is optional person-entered context. `pinnedAt` (`sessions.setPinned`) floats an entry to the top of the list; `lastOpenedAt` (`sessions.touchOpened`) is visit metadata and deliberately does not bump `updatedAt`. Audio members carry `durationMs` and `recordingStartedAt` inside their `sourceMeta` JSON; every member's `createdAt` is the exact add time. Created empty by the main-action flow (phone bar ➕; desktop rail + list-header pen; phone auto-records, desktop opens ready to type). `sessions.seedDemo` inserts two demo entries with packed members (voice/photo files uploaded client-side; extraction pre-done, digest stamped, `sourceMeta.demo: true`) — ordinary rows, no schema impact; a container left with no active members is deleted on exit (`sessions.deleteIfEmpty`), which never touches captures. `sessions.remove` (swipe delete) deletes the container and soft-deletes members (`isActive: false`, `sessionId` kept), so the raw archive is never thinned. `sessions.merge` re-parents every member of the selected sessions onto the earliest-started one and deletes the emptied rows; member `createdAt` ordering makes the merged document chronological for free, a person-entered name survives (earliest such session wins), and the digest re-runs. **`mode`** (ARI-18, 2026-07-18) switches the entry between `"quiet"` (absent counts as quiet too — just held, no AI voice) and `"dynamic"` (an interviewer replies after each capture, `sessionReplies` below); `sessions.setMode` writes it directly and it only gates whether *new* turns generate, never what already rendered. **`interviewer`** is a persona hook for the dynamic interviewer — an arbitrary string, applied in code (not schema) as `session.interviewer ?? "coach"`; multiple personas are deliberately deferred. See [`../product/features/sessions.md`](../product/features/sessions.md), [ADR 0008](../decisions/0008-sessions-as-container-over-captures.md), [ADR 0010](../decisions/0010-merge-thoughts-into-dumps.md), and [ADR 0021](../decisions/0021-dynamic-sessions-and-post-hoc-thought-maps.md).

### sessionReplies (the dynamic-mode interviewer, ARI-18)
One row per interviewer turn inside a dynamic-mode session. `{ userId, sessionId, afterCaptureId?, persona, status: pending|done|error, text?, error?, createdAt }`. Index: `by_session [sessionId, createdAt]`. Scheduled by `convex/ai/ingest.ts` 8s after every member capture's ingest completes (whatever its `rawType`); `convex/ai/sessionReply.ts`'s `maybeReply` no-ops outside dynamic mode, no-ops if a newer capture has landed since (that capture's own scheduled run supersedes it), and no-ops if the newest reply already covers the newest capture — only then does it insert a `pending` row and call the model (the `sessionReply` node), writing `done`+`text` or `error`+`error` on completion. `afterCaptureId` is the capture that triggered the turn; `persona` is stamped from `session.interviewer ?? "coach"` at insert time. Superseded replies are never written at all (no retraction to render) — the guard runs *before* the pending row exists. Read via `sessions.replies` (oldest first) and merged into the document by timestamp alongside captures; a failed turn shows inline and does not auto-retry (the next capture's own scheduled reply is the recovery). See [`../product/features/sessions.md`](../product/features/sessions.md) §6 and [ADR 0021](../decisions/0021-dynamic-sessions-and-post-hoc-thought-maps.md).

### thoughtMaps (the post-hoc thought map, ARI-18)
One live, replaceable map per session — the person's own captures (never the interviewer's replies) distilled into a hierarchy of distinct thoughts. `{ userId, sessionId, status: pending|done|error, error?, nodes: [{id, label, detail?, level, status: active|superseded, parentId?}], edges: [{from, to, kind: leads_to|part_of|relates, label?}], rootId?, generatedAt, createdAt }`. Index: `by_session [sessionId, createdAt]`. Requested on demand (`sessions.requestThoughtMap`, not on every capture): upserts this session's row to `pending` (patched in place — one row per session, never duplicated) and schedules `convex/ai/thoughtMap.generate`, which assembles the session's own capture text (chronological, 8k-char cap, `convex/ai/thoughtMap.ts`'s `assembleThoughtMapInput`) into one model call (the `thoughtMap` node, strict JSON), then runs the untrusted response through `lib/thoughtMap.ts`'s pure `normalizeThoughtMap` — dedupes node ids, drops edges referencing missing/invalid nodes, breaks parent-chain cycles, derives each node's `level` (depth from its nearest root) and `rootId` (the root with the most descendants) — before writing `done`+`nodes`/`edges`/`rootId` or `error`+`error`. A retracted thought ("never mind X") is marked `status: "superseded"` and kept (never deleted), with its replacement inserted as a sibling, not a child. Read via `sessions.thoughtMap` (latest row); `lib/thoughtMapLayout.ts`'s `layoutThoughtMap` is a pure client-side layered-tree layout consumed only by the desktop graph view — the phone's collapsible outline reads the same nodes/edges directly. Per-session only today; merging maps across sessions ("latching" a recurring root theme) is deferred. See [`../product/features/sessions.md`](../product/features/sessions.md) §6 and [ADR 0021](../decisions/0021-dynamic-sessions-and-post-hoc-thought-maps.md).

### feedback (the Feedback Widget)
`feedback { userId, type: bug|feature|other, text, route, view, title, viewport {w,h}, userAgent, errors[{message, stack?, at}], shotId?: _storage, imageIds?: _storage[], status: open|pending|dealt_with, linear?: {issueId, identifier, url, at}, createdAt, pendingAt?, resolvedAt? }`. Indexes: `by_user [userId, createdAt]`, `by_status [status, createdAt]`. A user's in-app feedback, each captured with the page context at submit time (route, metadata, the page's recent JS/console errors, and an optional `html2canvas` snapshot in `_storage`). `imageIds` holds photos the person attached deliberately (pasted into the composer or picked from the photo library, max 4); `listAll` resolves them to `imageUrls`. Surfaced as a live ticketing queue in `/admin`. **Triage lifecycle** (ADR 0019): `open` (needs you) → `pending` (being dealt with — you replied, or it was pushed to Linear) → `dealt_with` (closed, a separate pile); `reopen` clears both marks. **`linear`** is set once the ticket is exported to Linear as a tracked issue (`convex/linear.ts`), either by the owner's manual "Export to Linear" (ADR 0019) or automatically on submit when `FEEDBACK_AUTOFORWARD` is set (ADR 0031, off by default) — the app keeps the support-inbox side and links out to the card either way. **Access is owner-aware** (`convex/owner.ts`): the owner reads every user's feedback (joining the submitter's identity from `users`) as a support inbox and may export/triage any row; everyone else is self-scoped to their own rows. See [`../product/features/feedback-widget.md`](../product/features/feedback-widget.md), [`../decisions/0019-feedback-to-linear.md`](../decisions/0019-feedback-to-linear.md), and [`../decisions/0006-owner-gated-admin.md`](../decisions/0006-owner-gated-admin.md).

### whatsNew / whatsNewSeen (What's New)
`whatsNew { title, body, view: today|core|board|goals|sessions|settings, publishedAt, createdBy: Id<users>, componentTarget?: coach|settings-restart }`, indexed `by_publishedAt`. One owner-authored, user-facing announcement of a shipped feature, shown as a click-through feed docked near the bottom of the app shell (see [`../product/features/whats-new.md`](../product/features/whats-new.md)). `view` is a Rail `View` key, not a URL (the app has no per-surface route; see the `sessions`/`view` field on `feedback` above for the same pattern), so "the linked page" means "the tab the click switches to." **`componentTarget` is optional and additive** (ARI-142): a key from the closed registry in `convex/whatsNewTargets.ts` naming one component ON the `view` to spotlight after navigation; absent means the entry is page-level. The client registry `components/whatsnew/targets.ts` maps each key to a stable `data-tour` anchor, so the closed union can only ever name a live selector. Manually authored, never generated from `CHANGELOG.md` (see [ADR 0026](../decisions/0026-whats-new-manual-authorship.md)).

`whatsNewSeen { userId, whatsNewId: Id<whatsNew>, seenAt }`, indexed `by_user` and `by_user_entry [userId, whatsNewId]`. One row per `(user, entry)`, written when that user clicks that *specific* entry through (`markSeen`) or runs **Clear all** (`clearAll`). An entry's absence from this table for a given user means it is still unseen for them. `clearAll` is a **gap-fill**: it reads the caller's existing rows and inserts only for currently published entries not already present, so it never duplicates a row, and entries published *later* stay unread (it is a catch-up, not a permanent mute). Reads: `whatsNew.feed` returns every published entry **not** yet in `whatsNewSeen` for the caller (the unread list); `whatsNew.history` returns **every** published entry tagged with a per-caller `seen` boolean (the See all list, and what keeps the pill present whenever any entry exists).

**Access is owner-aware** on the write side only (`convex/owner.ts`): `listAll`/`create`/`update`/`remove` (the `/admin` authoring surface) gate purely on `isOwner`, with **no** `isDev` bypass. Unlike the `/admin` *page's* `isDev || isOwner` UX gate (ADR 0006), this is genuine cross-user content (every account's feed), so it follows the stricter pattern `feedback.listAll` uses for the owner's cross-user reads, not the page-render gate. The read/self-scoped side (`feed`, `history`, `markSeen`, `clearAll`) is open to any authenticated user, scoped to their own `whatsNewSeen` rows.

---

## Proposed tables (new elements, written into schema when built)

These shapes are the contract the feature docs assume. Field names are chosen to match the live conventions (`userId`, `createdAt`, `isActive`, soft-delete via flags).

### ~~sessions (Journal / Sessions stream)~~ — superseded
The June draft reserved a beats-shaped `sessions` table here. The capture-first reframe (2026-07-02) redefined the Session entity as "raw capture + metadata," and that shape is now **live** (see the sessions section above and [ADR 0008](../decisions/0008-sessions-as-container-over-captures.md)). When the Journal lands, its morning/night/triggered beats become front doors that open rows in the live table (a `beat`/`kind` field or convention decided then); the Journal owns only `prompts`.

### prompts (the adaptive questions inside a session)
Dynamic-mode `sessionReplies` (live, ARI-18) now cover the *conversational* half of an in-session AI presence — a live interviewer replying to whatever the person says. `prompts` remains the future mechanism for the other half: a **question-of-the-day**, aimed at a Blueprint gap or component going stale, chosen by the Journal rather than reacting to what was just said. A session is a feed of prompts, each with a typed or spoken answer.
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
