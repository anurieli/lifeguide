# Pillars & Goals

**Status:** pillars **built** · goals **proposed** · **Element of:** Core and Sessions · **Owns:** `pillars` (live), `goals` (proposed)

> The domains that make a human solid, and the commitments inside each. Pillars are the cross-cutting parts of life you are strengthening; goals are what you commit to inside them, across every time horizon.

See the element in context: [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md). Soul basis ("Pillars: making a human solid"): [`../concept-and-soul.md`](../concept-and-soul.md).

## 1. Purpose

A lost person is not weak in one place; he is undefined across the whole of life. Pillars name the parts that hold a person up (physical/body, professional, social presence, and more per person) so that becoming whole means strengthening each, not over-indexing one. Goals turn that frame into commitments with a why and a deadline, anchored to the [Blueprint's "Setting Your Goals" horizons](../blueprint/the-life-blueprint.md). Together they answer the question a drifting person cannot ask himself: which part of me am I building, and toward what.

A theme that fits no current pillar is not noise; it is a **hole**, and a hole is the signal to grow a new pillar (see [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md), "Gaps are first-class").

## 2. User-facing behavior

**Pillars (built).** On bootstrap the person gets one default pillar. A preset library offers more (`Health & Fitness`, `Family & Relationships`, `Financial & Professional`, `Growth & Mind`, `Money & Freedom`, `Spirit & Meaning`); he can add any preset or define a custom pillar with its own name and description. Pillars are tags he applies to nodes, captures, and goals, never folders he files things into. The same node can carry several pillars at once.

**Goals (proposed).** Inside a pillar the person sets commitments along the Blueprint horizons: `life`, `five_year`, `yearly`, `monthly`, `daily`, and the singular `north_star`. Each goal carries a title, an optional **why** (the reason behind it, which the Blueprint insists on), an optional **deadline**, and a **malleability** tag (🟢 green freely changeable, 🟡 yellow weighty, 🔴 red core and slow-changing). Goals nest: a `life` goal parents `yearly` goals, which parent `monthly` ones, so the big aspiration decomposes into the next concrete move.

Both surfaces are first-class manual AND Coach-driven. The person can add a pillar or set a goal by hand, or talk it into existence ("make running a triathlon a health goal this year, here's why") and the Coach draws it at act-time from far away.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| List pillars | open Guide / tag picker | returns the user's pillars | Manual | `pillars` (read) |
| List presets | adding a pillar | returns the preset library | Manual | static `PRESETS` |
| Add pillar | pick preset / define custom | inserts a `pillars` row (`source: preset \| custom`, weight 0) | Manual / Coach | `pillars` (write) |
| Rename / describe pillar | edit pillar | updates `name` / `description` | Manual / Coach | `pillars` (write) |
| Apply pillar tag | tagging a node/capture/goal | adds the pillar to the target's `pillars[]` | Manual / Coach | `nodes`/`captures`/`goals` (write) |
| Set goal | "I want to…" / goal form | inserts a `goals` row (horizon, title, why?, deadline?, malleability, pillarId?) | Manual / Coach | `goals` (write) |
| Nest goal | set under a parent | sets `parentGoalId` (life → yearly → monthly) | Manual / Coach | `goals` (write) |
| Update goal | edit / Coach reconcile | edits title, why, deadline, malleability, pillar | Manual / Coach | `goals` (write) |
| Mark progress | complete / drop | sets `status: done \| dropped` | Manual / Coach | `goals` (write) |
| Surface a hole | Coach notices an unhomed theme | proposes a new pillar | Coach | `interactions`; then `pillars` |

## 4. Dynamics and interactions with other elements

Ownership is stark and consumption is open (per [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md)). This element **owns** only `pillars` and `goals`.

**Publishes** to both streams: the domains being strengthened and the goals/progress inside each go to the **Core** (who you are, what you are building) and to the **Sessions** (what to check against day to day). The `north_star` goal publishes the singular guiding beacon to the Core.

**Drawn from** by others at act-time, never held:
- **Journal / Sessions** draws Goals to shape today's prompts and to surface drift ("you said this mattered, you skipped six mornings").
- **The Core** synthesizes the domains and the north star into the Mirror; the `daily` horizon overlaps the Blueprint's daily goals the Core curates.
- **Future Self** and **Vision Board** speak in pillar tags, so a generated image of you can carry the domains it expresses.
- **The Coach** draws Goals plus Sessions plus Core to know when a commitment is being honored or dropped.

Cross-cutting by design: because pillars are tags, one goal or node can belong to several domains, and the [triathlon example](../../architecture/elements-and-context.md) (commitment here, image in Future Self, pulse in Sessions, identity in the Core) holds without any element copying another's data.

## 5. States

**Pillar:** `default` (the seeded one) · `preset` (added from the library) · `custom` (user-defined) · applied (referenced by at least one node/goal) vs unused.

**Goal:** `active` · `done` · `dropped`. A goal is also `nested` (has `parentGoalId`) or top-level; `dated` (has a deadline) or open. The `north_star` is singular and slow-changing (red by nature).

**Domain coverage (gap state):** a theme recurring across captures/sessions that maps to no pillar is a **hole**, an explicit not-yet-known the system tracks as the signal to grow a pillar.

## 6. Edge cases

- **No pillars beyond default.** Goals can still be set with `pillarId` unset; they live in the element unhomed until a pillar is chosen or proposed.
- **Goal under no pillar.** Allowed (`pillarId?` optional); the Coach may later suggest a home.
- **Conflicting goals** (two `yearly` goals that pull against each other, or a goal that contradicts the north star): the Coach surfaces the contradiction rather than silently resolving it; the person decides (the Core's no-silent-overwrite rule).
- **Deleting a pillar with tags/goals on it.** Detag rather than orphan; goals keep their other pillars or fall to unhomed. Do not cascade-delete goals.
- **Parent goal dropped/done with live children.** Children persist; the broken `parentGoalId` is surfaced for re-parenting, not auto-deleted.
- **Two north stars.** Only one `north_star` is meaningful; a second is a conflict the Coach raises.
- **Stale goal past deadline, still active.** Surfaced as drift to the Sessions stream, never auto-closed.

## 7. AI involvement

The Coach is the actor and curator. It can create pillars and set/reconcile goals from far away (manual paths exist for all of them). It runs captures, sessions, and board signals through the hard filter that strengthens or reshapes the Core, and it is what notices a **hole** and proposes a new pillar. When a new goal or a changed malleability conflicts with what the Core holds, it raises the contradiction instead of overwriting. Provider/model class and context budgeting per [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md); text is the shared currency, so what flows is the distilled meaning of a domain or a commitment, never a raw object.

## 8. Data touched

Owned (see [`../../architecture/data-model.md`](../../architecture/data-model.md)):
- **`pillars`** (live): `{ userId, name, description?, weight, source: default|preset|custom, createdAt }`. Cross-cutting tags, not containers.
- **`goals`** (proposed): `{ userId, pillarId?, horizon: life|five_year|yearly|monthly|daily|north_star, title, why?, deadline?, status: active|done|dropped, parentGoalId?, malleability: green|yellow|red, createdAt, updatedAt }`.

Drawn at act-time (read only, never held): `mirror` (Core), `sessions` (drift), `nodes`/`captures` (which carry `pillars[]`). Pillar tags are written onto other elements' `pillars[]` arrays, which those elements own.

## 9. Open questions

- Does `weight` on a pillar drive anything yet (context budgeting, ordering), or stay reserved?
- Where do the Blueprint's daily/monthly goals end (the Core backbone on `mirror.structured`) and the `goals` table begin? Likely the Core holds the synthesized intent, `goals` holds the concrete tracked commitment; settle when goals ship.
- Is the `north_star` a `goals` row or a field on the Core (the Blueprint treats it as a question)? Provisionally a row so it nests above `life` goals; revisit alongside `mirror.structured`.
- Progress beyond `done/dropped`: do we track partial progress or streaks, or keep it binary per the calm, no-streaks principle?
- Goal-to-pillar cardinality: can a single goal carry multiple pillar tags like nodes do, or stay single-`pillarId`?
