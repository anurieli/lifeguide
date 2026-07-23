# Goals — the things you're chasing

**Status:** built (v2), live in local dev
**Predecessor:** the Orbit board (v1) — Big Things as projects with a task list, framed around Todoist sync. Replaced by this doc per [ADR 0029](../../decisions/0029-aspirations-goals-and-roadmap-steps.md); the v1 shape is recoverable from git history.

## Purpose

The Goals page holds the things a person is actually chasing in life — a TED talk, climbing Everest — not a project-management board. An idea starts as an **aspiration** (no deadline, "someday") and graduates into a **Goal** the instant it gets a deadline. The AI drafts a scoping roadmap the moment either is created: what it actually takes, and a starter set of steps with real dependencies between them. The daily execution mechanics (Today/Inbox/Waiting triage, Todoist sync) are kept exactly as they were, just demoted to a secondary panel — this page's identity is the gallery of things you're chasing, not the task list.

## Where it lives

Same as before: a `Goals` tab in the left rail (desktop) and the fifth slot of the bottom bar (mobile). See the account-avatar relocation note in the prior version of this doc (unchanged) if resurrecting v1 details from git history.

## User-facing behavior

### Big Things (above the gallery)
Not everything a person carries is a goal. **Big Things** is a lightweight capture layer, rendered **prominently above the Goals/Aspirations gallery**, for the active commitments that occupy real time and mental space but aren't aspirations to chase: a **pending big meeting**, an **ongoing big project**, an obligation in flight. It exists so those don't have to be forced into the goal model just to be held somewhere.

Each Big Thing is deliberately spare: a **title**, an optional free-form **context** (what it is, where it stands), and an optional **date** (the meeting day, a milestone). That's the whole shape: **no roadmap, no AI, no pillar, no status**. Capture is instant (title only is enough); title, context, and date are all **click-to-edit in place**; a Big Thing can be **archived** when it's done or no longer relevant. Live Big Things sort soonest-dated first, then undated by most recently captured.

**Crucially, creating or editing a Big Thing triggers no AI pass and creates no goal.** That is the entire reason it's a separate layer (see "Why a separate table" below). It stays a held note until the person decides otherwise.

**Promote to goal** is the one bridge. It is an explicit, per-item action that:
- creates a **normal Goal** (identical to a hand-created one: `status: "planning"`, `roadmapDraft: "pending"`) and **triggers the standard AI roadmap draft** (`convex/ai/goalEnrich.ts`); this is the first moment any AI runs for it;
- maps the Big Thing's fields into the goal: **title → name**, **`date` → the goal's `deadline`** (the minimal default: a dated Big Thing becomes a dated Goal, an undated one lands as an aspiration), and **`context` → the goal's `why`** so nothing the person wrote is lost;
- **retires the source Big Thing in place** (`archived: true` + `promotedToGoalId`), so it leaves the Big Things section and can never live in both sections at once.

Promotion happens **atomically in a single mutation** (`bigThings.promote`): the goal insert, the roadmap-draft schedule, and the source retirement all commit together. It is **ownership-safe** (another user's Big Thing is rejected) and **idempotent-guarded** (a row already promoted returns its existing goal id rather than creating a duplicate). After a promotion the UI expands the newly created goal so the person lands on its drafting roadmap.

**Why a separate table.** Big Things ride their own `bigThings` table and `convex/bigThings.ts` module rather than a `goals` row, because every goal/aspiration create **always** schedules the roadmap-drafting pass, and that coupling is the whole identity of a goal. A commitment you just want to hold must have **no** such side effect, so it can't be a goal with the AI turned off. Keeping it additive also means the goals board, Coach goal context, and enrichment paths are untouched.

### The gallery
- Goals with a `deadline` are grouped into sections by **Pillar** (Health & Fitness, Work & Money, etc. — the same `pillars` table used elsewhere in the app), plus an "Unsorted" section for goals with no pillar. Filter chips (All / each pillar / Unsorted) narrow the gallery.
- An **Aspirations** section (dimmer cards, a "Someday" tag instead of a due-date badge, no status-color border) holds everything with no deadline yet, always rendered last. **+ New — what are you chasing?** lives in this section: creating one only ever asks for a name — pillar, deadline, and why are filled in later from the expanded card.
- Each card: pillar-color dot, name, due-date badge or "Someday," the pillar name, the why (or a prompt to add one), open/done task counts.

### The expanded card (accordion, not a modal)
Clicking a card expands it **in place** — the grid reflows around it (`col-span-full`), no popup. Inside:
- Status chips (active/planning/ongoing, unchanged from v1), pillar chips (including "No pillar"), a native date input for `deadline` (setting/clearing it live-toggles the aspiration/Goal tier), and `laddersTo` chips (None / This month / 1-year goal / 5-year vision — see "Horizons" below).
- The why, editable, saves on blur (unchanged from v1).
- **The roadmap**: the AI-drafted "what this actually takes" summary (pending/done/error states — never hangs, always shows a "Regenerate" once done or "Try again" on error), then the step list. Each step has a status-cycling control (todo → doing → done), the one AI-flagged **"Next move"** badge, and a **"Blocked by: …"** chip naming any unfinished step it depends on. Steps can be added inline; the AI's own drafted steps are `source: "ai"`, anything typed by hand is `source: "manual"`.
- The goal's own open tasks (the day-to-day `goalTasks`, unchanged from v1) and a quick-add for them.
- **"Talk to the Coach about this"** — drops a prefilled message into the Coach composer (never auto-sent) so the person can ask the Coach to help refine the goal.
- Archive (unchanged from v1).

### The AI-drafted roadmap
The moment a goal or aspiration is created (or "Regenerate" is tapped), a background pass (`convex/ai/goalEnrich.ts`, cheap-tier `openai/gpt-4o-mini`) drafts a short summary of what the thing actually takes, plus 3–7 concrete steps, one flagged as the immediate next move, with real dependency edges (`blockedBy`) between steps where one genuinely can't start before another finishes. This never blocks capture — the card shows "Coach is scoping what this takes…" until it lands, and an explicit error state (with retry) if the model call fails. Regenerating replaces only the AI's own steps; anything added by hand survives.

A step's "blocked" state is **computed live**, never stored: it flips the moment its blocker is marked done. A dangling `blockedBy` reference (its step was deleted) simply resolves as non-blocking.

### The triage queue (Today / Inbox / Waiting) + Todoist sync
Functionally identical to v1 — same three tabs with live counts, same quick-add, same `⋯` menu (file to a goal/Inbox, mark/unmark waiting, delete), same Todoist "Connect"/"Sync now" flow (`convex/todoist.ts`, unchanged). Only its position moved: it now sits as a secondary side panel (`lg:flex-row-reverse`, narrower, more muted) rather than the co-equal first thing on the page. A Todoist-synced goal lands unsorted (no pillar, no deadline — Todoist carries neither) and does **not** auto-trigger a roadmap draft (a "Sync now" can create many goals in one call; auto-firing AI enrichment for all of them would be an unbounded burst) — the same on-demand "Regenerate" affordance covers it whenever it's opened.

### Horizons (`laddersTo`)
A goal can optionally point at a Horizons standing rung (`five_year`/`one_year`/`one_month` — see [`horizons.md`](horizons.md)) via `laddersTo`. This is a **light hook only**: it does not merge the `horizons` table into `goals`, and does not anchor a goal to a vision-board node. The fuller unification of the vision board, Horizons, and this page (one measurable, deadline-bearing, board-anchored object) is deliberately parked as Linear ARI-103 and was **not** resolved by this build — see [ADR 0029](../../decisions/0029-aspirations-goals-and-roadmap-steps.md).

### The Coach can create and edit goals
The Coach (`convex/coach.ts`) now always sees a goals/pillars context fragment (real ids inline, so it can reference one without guessing) and classifies every incoming message for a create/update intent **before** replying (a cheap, always-on `gpt-4o-mini` pass — an explicit tradeoff of 2 model calls per turn instead of 1). If the message asks to create or change a goal, it calls the same `goals.createGoal`/`updateGoal` mutations a person's own hand would call — never a bespoke write path — and the reply says so plainly. It will never invent a goal/pillar id: an `updateGoal` intent that can't be matched to a real id it was just shown is dropped to a no-op. The board is still advisory-only; this pass didn't touch that.

The known-ids context is built by `ai/parse.ts`'s `buildGoalIntentMessages` as a single user-role turn, deliberately never a second `role: "system"` message — that variant shipped on landing day and made every single Coach turn 400 in production (OpenAI's `json_object` response mode requires the word "json" somewhere in the prompt; a second system message skipped the classifier's real configured system prompt, which is the only place that word appeared). Same-day hotfix; the classification call is also now wrapped in try/catch, so a future provider hiccup degrades to "no goal action detected" instead of taking the whole reply down with it. Caught by a live smoke test against production, not by the unit suite — see the regression tests on `buildGoalIntentMessages` in `tests/goal-enrich-parse.test.ts` for the invariant now locked in.

## Data touched

Tables `goals`, `roadmapSteps` (new), `goalTasks`, `bigThings` (new, ARI-141), and the `pillars` table (now genuinely linked via `goals.pillarId`, not just a shared concept). API: `convex/goals.ts` (board/tasks queries, goal + enrichment + Coach-context plumbing), `convex/roadmapSteps.ts` (new: step CRUD, computed `blocked`, cycle guard), `convex/bigThings.ts` (new, ARI-141: Big Things list/create/update/archive + the atomic `promote` into a goal), `convex/todoist.ts` (unchanged sync mechanics, insert path narrowed to drop `kind`/`area`). See [`../../architecture/data-model.md`](../../architecture/data-model.md) for exact field shapes, and [`../../design/goals.md`](../../design/goals.md) for the Big Things interaction detail.

`goals.pillarId?` (ARI-11, [ADR 0022](../../decisions/0022-identity-is-not-a-pillar.md)) is an optional relation to `pillars` — which domain this goal strengthens. Added to the schema as a foundation for a future pass; nothing in this board reads or writes it yet.

## AI involvement

- **`goalEnrich`** (`convex/ai/goalEnrich.ts`, cheap tier): drafts the roadmap summary + starter steps on create/regenerate. Defensive parsing (`convex/ai/parse.ts`'s `parseGoalEnrichment`) clamps to 3–7 steps, resolves the model's local step ids to real dependency edges, silently breaks any cycle the model draws, and normalizes to exactly one "next move" step.
- **`coachGoalIntent`** (cheap tier, runs every Coach turn): classifies create/update intent from the Coach conversation; `convex/ai/parse.ts`'s `parseGoalIntent` cross-checks any returned id against ids actually fetched that call, defaulting to a no-op on any ambiguity or unrecognized id.

## Known gaps / not in v2

- Same v1 gaps carried forward: drag-and-drop reordering (goals use a `⋯`-menu-equivalent for tasks; steps reorder via `roadmapSteps.reorder` but no UI drag yet), sub-project nesting (`parentId`) rendered flat, People directory, Todoist webhooks.
- No `pillars.color` field yet — a card's pillar accent is a deterministic hash of `pillarId` into a fixed palette, not a chosen color.
- The board (Vision Board) side of the Coach is still advisory-only; only goals gained a real write path in this build.
- ARI-103 (vision board / Horizons / Goals full unification) is explicitly parked, not built here.

## Open questions

- Should `laddersTo` surface anywhere on the Horizons card itself (a "these goals ladder up to this rung" hint), or stay a one-way pointer read only from the Goals side?
- Should sync run automatically (on tab open / on a schedule) instead of a button? (carried from v1)
- Mirror Waiting to a `@waiting` Todoist label so mobile capture round-trips? (carried from v1, PRD open decision)
- Does completing all of a goal's roadmap steps mean anything for the goal's own `status` (e.g. auto-suggest "ongoing" → done), or stay fully decoupled?
