# Pillars & Goals

**Status:** built · **Element of:** Core and Sessions · **Owns:** `pillars`, `goals`, `roadmapSteps`, `goalTasks` (all live)

> The domains that make a human solid, and the things a person commits to inside each. Pillars are the cross-cutting parts of life you are strengthening; goals are the things you're chasing inside them, from a someday aspiration to a dated commitment.

See the element in context: [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md). Soul basis ("Pillars: making a human solid"): [`../concept-and-soul.md`](../concept-and-soul.md). Full goal behavior (the gallery, the AI-drafted roadmap, the Coach, the triage queue): [`goals.md`](goals.md) — this doc covers the cross-cutting Pillar/Goal relationship and defers to that one for detail, per the docs' own DRY rule.

## 1. Purpose

A lost person is not weak in one place; he is undefined across the whole of life. Pillars name the parts that hold a person up (physical/body, professional, social presence, and more per person) so that becoming whole means strengthening each, not over-indexing one. Goals turn that frame into things actually being chased, each optionally carrying a why and a pillar home. Together they answer the question a drifting person cannot ask himself: which part of me am I building, and toward what.

A theme that fits no current pillar is not noise; it is a **hole**, and a hole is the signal to grow a new pillar (see [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md), "Gaps are first-class").

## 2. User-facing behavior

**Pillars (built).** On bootstrap the person gets the canonical skeleton (`DEFAULT_PILLARS` in `convex/pillars.ts`). A preset library offers more; he can add any preset or define a custom pillar with its own name and description. Pillars are tags/homes he applies to nodes, captures, and goals, never folders he files things into — a goal has at most one `pillarId`, but a node/capture can carry several pillar tags.

**Goals (built).** A goal starts as an **aspiration** — a name, optionally a why, no deadline — and graduates into a dated **Goal** the moment a deadline is set; this tiering is purely deadline presence, not a separate field. A goal can optionally sit inside a pillar (`pillarId`) and optionally point at a Horizons standing rung (`laddersTo: five_year|one_year|one_month`) — a light hook, not a merge of the two tables (see §9). The full behavior — the gallery grouped by pillar, the accordion-in-place card, the AI-drafted roadmap of dependency-linked steps, the Coach's ability to create/edit goals conversationally, and the daily triage queue — lives in [`goals.md`](goals.md); this doc does not repeat it.

Both surfaces are first-class manual AND Coach-driven. The person can add a pillar or set a goal by hand, or talk it into existence ("make running a triathlon a goal, here's why") and the Coach creates or edits it directly (a thin wrapper over the same mutations a person's hand would call — see [`goals.md`](goals.md)'s Coach section).

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| List pillars | open Guide / tag picker | returns the user's pillars | Manual | `pillars` (read) |
| List presets | adding a pillar | returns the preset library | Manual | static `PRESETS` |
| Add pillar | pick preset / define custom | inserts a `pillars` row (`source: preset \| custom`, weight 0) | Manual / Coach | `pillars` (write) |
| Rename / describe pillar | edit pillar | updates `name` / `description` | Manual | `pillars` (write) |
| Apply pillar tag | tagging a node/capture | adds the pillar to the target's `pillars[]` | Manual / Coach | `nodes`/`captures` (write) |
| Create a goal/aspiration | "+ New" / Coach intent | `goals.createGoal({name, why?, pillarId?, deadline?, laddersTo?})` — inserts, schedules the AI roadmap draft | Manual / Coach | `goals` (write) |
| Update a goal | expand a card / Coach intent | `goals.updateGoal({...})` — edits name/why/status/pillarId/deadline/laddersTo; `deadline`/`pillarId`/`laddersTo` accept `null` to clear | Manual / Coach | `goals` (write) |
| Regenerate the roadmap | "Regenerate" / error retry | `goals.regenerateRoadmap` — re-drafts AI steps, keeps manually-added ones | Manual | `goals`, `roadmapSteps` (write) |
| Add / edit / reorder a step | the expanded card's roadmap | `roadmapSteps.add` / `updateStatus` / `updateTitle` / `setBlockedBy` / `reorder` | Manual | `roadmapSteps` (write) |
| Mark progress | archive | `goals.archiveGoal` sets `archived: true` | Manual | `goals` (write) |
| Surface a hole | Coach notices an unhomed theme | proposes a new pillar | Coach | `interactions`; then `pillars` |

Day-to-day task triage (Today/Inbox/Waiting, Todoist sync) is a separate concern owned by the same element (`goalTasks`) — see [`goals.md`](goals.md).

## 4. Dynamics and interactions with other elements

Ownership is stark and consumption is open (per [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md)). This element **owns** `pillars`, `goals`, `roadmapSteps`, and `goalTasks`.

**Publishes** to both streams: the domains being strengthened and the goals/progress inside each go to the **Core** (who you are, what you are building) and to the **Sessions** (what to check against day to day).

**Drawn from** by others at act-time, never held:
- **Journal / Sessions** draws Goals to shape today's prompts and to surface drift ("you said this mattered, you skipped six mornings").
- **The Core** synthesizes the domains into the Mirror.
- **Future Self** and **Vision Board** speak in pillar tags, so a generated image of you can carry the domains it expresses.
- **The Coach** draws Goals plus Sessions plus Core to know when a commitment is being honored or dropped, and can now write to Goals directly (see [`goals.md`](goals.md)).
- **Horizons** (a sibling element, not owned here) is drawn from only via a goal's optional `laddersTo` pointer — a one-way hook, not a shared table.

Cross-cutting by design: because pillars are tags on most things but a single home on a goal, one node/capture can belong to several domains while a goal sits in at most one.

## 5. States

**Pillar:** `default` (the seeded one) · `preset` (added from the library) · `custom` (user-defined) · applied (referenced by at least one node/goal) vs unused.

**Goal:** tiered purely by `deadline` presence — **aspiration** (no deadline) vs **Goal** (dated); independently, `status: active|planning|ongoing`; `archived` vs not. A goal's roadmap has its own `roadmapDraft.status: pending|done|error`; each step is `todo|doing|done`, and separately **blocked** (a computed property, not stored) while any of its `blockedBy` steps isn't done.

**Domain coverage (gap state):** a theme recurring across captures/sessions that maps to no pillar is a **hole**, an explicit not-yet-known the system tracks as the signal to grow a pillar.

## 6. Edge cases

- **No pillars beyond default.** Goals can still be set with `pillarId` unset; they live unhomed until a pillar is chosen or proposed. The "Unsorted" gallery section is exactly this state made visible.
- **Deleting a pillar with goals/tags on it.** Detag rather than orphan; goals fall to unhomed (`pillarId` cleared), never cascade-deleted.
- **Conflicting goals** (two goals that pull against each other): the Coach surfaces the contradiction rather than silently resolving it; the person decides (the Core's no-silent-overwrite rule).
- **A `roadmapSteps.blockedBy` cycle.** An AI-drafted batch silently breaks it (same technique as the thought map's cycle guard); a person's own edit is rejected outright with an error rather than silently dropped — see [ADR 0022](../../decisions/0022-aspirations-goals-and-roadmap-steps.md).
- **Stale goal past deadline, still active.** Surfaced as drift to the Sessions stream, never auto-closed.

## 7. AI involvement

The Coach is the actor and curator: it can create pillars, and it can create/edit goals directly (a thin wrapper over `goals.createGoal`/`updateGoal`, gated by an id-cross-check so it never invents a goal/pillar id — see [`goals.md`](goals.md)). A separate cheap-tier node (`goalEnrich`) drafts each goal/aspiration's "what this takes" roadmap on create/regenerate. The Coach is also what notices a **hole** and proposes a new pillar, and raises a contradiction instead of overwriting when a new goal conflicts with what the Core holds. Provider/model class and context budgeting per [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md).

## 8. Data touched

Exact field shapes: [`../../architecture/data-model.md`](../../architecture/data-model.md) (`### pillars`, `### goals`, `### roadmapSteps`, `### goalTasks`).

Owned: `pillars`, `goals`, `roadmapSteps`, `goalTasks`. Drawn at act-time (read only, never held): `mirror` (Core), `sessions` (drift), `nodes`/`captures` (which carry their own `pillars[]` tags), `horizons` (one-way, via `laddersTo`).

## 9. Open questions

- **Full Horizons/vision-board unification.** A parked research note (Linear ARI-103) proposes merging the vision board, Horizons, and this element into one measurable, deadline-bearing, board-anchored `goal` object. Deliberately **not** resolved here — this build only added the light `laddersTo` pointer. Revisit as its own decision.
- **`weight` on a pillar** — does it drive anything yet (context budgeting, ordering), or stay reserved?
- **`pillars.color`** — cards currently derive their accent from a deterministic hash of `pillarId`; a real color field is a reasonable follow-on.
- **Does completing every roadmap step mean anything for a goal's own `status`?** Currently fully decoupled.
