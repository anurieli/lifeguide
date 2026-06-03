# LifeGuide: Product Requirements (v1)

**Status:** rebuilt 2026-06-03 to the evolved vision. The index that ties the per-element feature docs together. It does not restate them; it says what v1 is, what is in and out, and how the pieces form one product. For the why, read [`concept-and-soul.md`](concept-and-soul.md); for the system, [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md).

---

## 1. Problem and promise

**Young men are lost.** No one taught them how to set a goal, how to know what they want, or how to stay aligned with it once life starts pulling. They walk a path set for them (school, job, money, marriage) and wake up years later realizing they never chose the direction. The cost of that drift is a life spent walking the wrong way. The full statement of the pain is in [`concept-and-soul.md`](concept-and-soul.md).

**The promise: the space for the individual.** Not a productivity tool, not a journal app. A space he checks into twice a day (once when he wakes, once before he sleeps) that keeps him tethered to who he is becoming, and a Coach who makes sure today's life still points at it. The product runs on **two beats a day**: a morning check-in and an evening check-out, calm bookends, never streaks, never guilt.

The soul in one line: LifeGuide builds and steers one thing, a person's true self and the plan for their life, through a Core the Coach keeps honest, daily sessions that keep the pulse, pillars that make the person solid, and a vivid Future Self that keeps the direction in view.

## 2. ICP

Primary: **young men who feel lost.** Drifting, capable, aware something is off, with no framework for direction. This is the emotional truth of the target and supersedes earlier "Indy Leaders / Builders" framing. Full ICP and its sharpening are in [`concept-and-soul.md`](concept-and-soul.md).

## 3. The product in one model

LifeGuide is several large elements that each do one job, blended by a shared spine. The whole model, with ownership rules and the worked "I want to run a triathlon" example, is in [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md). In brief:

- **One Core, kept honest.** The enduring "who you are": the synthesized identity behind the human, shaped by the Life Blueprint backbone. The Coach curates it through a hard filter that strengthens or reshapes it and **surfaces conflicts instead of overwriting**. See [`features/core.md`](features/core.md).
- **Two streams.** Context is held as **the Core (who you are, slow-changing)** and **the Sessions (your days, temporal)**. Every element publishes distilled text into one stream; any element can draw both at act-time. The mechanism is the [Context Bus](../architecture/context-bus.md).
- **The Coach is the single interface and the curator.** The human does not operate the app; he talks to the Coach, and the Coach operates the app and keeps the Core honest. See [`features/coach.md`](features/coach.md).
- **Pillars make the person solid.** The domains that hold a life up (physical/body, professional, social presence, and more per person); goals are the commitments inside them. See [`features/pillars-and-goals.md`](features/pillars-and-goals.md).
- **Future Self keeps the direction in view.** The visual you as aspiration: you, placed inside the life you want. See [`features/future-self.md`](features/future-self.md).

## 4. The elements as features

One paragraph each, with a current-status tag. The feature doc is the full spec; this is the pointer.

- **Vision Board: `partial`.** The life and world you want, laid out spatially: write text, import links and video, drop images, connect with labeled edges. It is the slow-changing picture of where you are going and one of the two anchors of the Core. Built as a spatial board; co-build-with-Coach and generated-image blocks are proposed. → [`features/vision-board.md`](features/vision-board.md)
- **Future Self: `proposed`.** The visual you as aspiration: how you dress, how you carry yourself, the rooms you want to walk into. Draws the Vision Board and the Core to render you living inside that life; publishes only the text behind the visuals. → [`features/future-self.md`](features/future-self.md)
- **Journal / Sessions: `proposed` (the current "Today" ritual is its seed).** The whole Sessions stream: a chronological feed of morning, night, and triggered beats, each a feed of adaptive prompts (typed or spoken) that draw out who you are and check you are still on track. Not a blank diary. → [`features/journal.md`](features/journal.md)
- **Pillars & Goals: `pillars built, goals proposed`.** The domains that make a human solid, and the commitments inside each, across the Blueprint's time horizons. → [`features/pillars-and-goals.md`](features/pillars-and-goals.md)
- **The Core: `partial`.** The synthesized identity, the heart of the Mirror. The `mirror` table and basic assemble/curate exist; the Blueprint backbone on `mirror.structured`, gap-awareness, and the full curation pass are proposed. → [`features/core.md`](features/core.md)
- **The Coach: `partial`.** The one presence that reads everything, acts from far away, and curates the Core. Threads and messages exist and are lightly used; the curation loop and tool-use are proposed. → [`features/coach.md`](features/coach.md)
- **The Guide: `partial`.** A read-only window that renders the Core back to you in one calm page: north star, Mirror, pillars. Owns no data. → [`features/guide.md`](features/guide.md)
- **Home / Dashboard: `partial`.** The door, not the room: an identity-aware, time-aware calm home that greets you by who you are and walks you into the right session. Greets and routes; never reports. → [`features/dashboard.md`](features/dashboard.md)
- **Settings: `built` (table live).** Per-user controls for the rhythm and the Coach: morning/evening check-ins, daily exercise type, coach tone, reaching-out posture, north star. Owns the `settings` table; see [`features/settings.md`](features/settings.md).

## 5. The alignment engine (the daily killer feature)

The one thing no competitor has, and the daily reason to come back: the **reflection loop** made concrete. LifeGuide knows the gap between **the life lived** (the Sessions stream, recent state, momentum, drift, and later the calendar and to-dos) and **the life wanted** (the Core, the Vision Board, the Future Self, the goals). The Coach detects drift from the north star, surfaces it **gently**, and hands back **one next small move**, never a report, never a scolding.

This is the curation loop and the gap-awareness of the system working together: the Core is kept honest against the days, holes in the backbone become prompts, themes that fit no pillar become proposals to grow. The mechanism lives in the [Context Bus](../architecture/context-bus.md) (gap-awareness, the assembler) and the [Coach](features/coach.md) and [Core](features/core.md) curation pass. It must be designed in from phase 1, not bolted on.

## 6. Interaction principles

Every surface honors one design contract: creative, calm, never bombarding. Two beats a day not all day; one thing per screen (never a metrics dashboard); talk, don't operate; earned interruption only; progressive disclosure; ambient, not anxious. The canonical statement is [`../design/interaction-principles.md`](../design/interaction-principles.md), drawn from [`concept-and-soul.md`](concept-and-soul.md). These are non-negotiable for every build.

## 7. Scope

**IN v1**
- **Vision Board** (spatial board; Coach co-build proposed).
- **The Core** (Mirror plus the Blueprint backbone and curation, filling out over v1).
- **The Coach** (single interface, acts from far away, curates the Core).
- **Journal / Sessions** (morning and night beats, adaptive prompts, history).
- **Pillars & Goals** (pillars live; goals across the Blueprint horizons).
- **The Guide** (read-only render of the Core).
- **Home / Dashboard** (identity- and time-aware home that routes into the beat).
- **Settings** (rhythm and Coach controls).
- **Future Self** (aspiration gallery and its own data model).

**RESERVED (designed for, not built in v1)**
- **Calendar and to-do as intake.** A foundational intake source for the alignment engine, wired in once the loop is solid. The model already treats the lived day as a stream.
- **Off-platform tether.** The same Coach off-platform, proactively reaching out (~75% retention vs ~51% wait-to-be-opened). Core to the ritual, sequenced after the on-platform spine.

**OUT forever**
- Streaks, points, gamification.
- A social feed or any social layer.
- Generic blank-page journaling (the Journal is adaptive prompts, never a blank diary).
- Productivity-app framing (task manager, habit tracker, dashboard of metrics).

## 8. Success

The product works when **the person returns twice a day** (the morning and night beats become a ritual, not a chore) and **the Core sharpens over time** (the backbone fills in, gaps close, the Mirror's synthesis gets truer and the drift it catches gets more specific). Retention is the ritual; depth is the Core getting more right about who he is. No streaks, no vanity metrics: the only scoreboards are "did he come back" and "does the mirror look more like him."

---

## Sequence

Foundation first, then surfaces, per the build order in [`concept-and-soul.md`](concept-and-soul.md) ("The evolved system" / build order) and [`../roadmap.md`](../roadmap.md): (1) the two-stream context and the Coach's core-curation loop (the spine), (2) the Journal and the identity Dashboard, (3) the Future Self surface and data model.
