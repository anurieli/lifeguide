# Roadmap

## Capture-first reframe (2026-07-02)

The product's center of gravity is **capture**: quickly get a thought out, and have it decomposed, labeled, and routed into a pillar-clean brain. The life-coach vision board is the **destination** that capture fills, not the starting point. Shipping is now cut into two concrete milestones (tracked in the [LifeGuide Linear project](https://linear.app/cuttheedge/project/lifeguide-67aceaa648cf)):

- **MVP — the capture spine.** Hosted + mobile-accessible. One pipeline, three front doors (brain dump, morning beat, night beat): `capture → decompose into atomic thoughts → sentiment + labels → propose+confirm routing → session stream OR a pillar-clean main thought`. Entities: **Session** (raw capture + metadata: time, day, duration, voice/text, and where known location, activity, source media), **Atomic thought** (text + sentiment + labels), **Main thought** (persistent, one pillar per thought). Two rules govern it: **clean storage, associative reading** (no forced cross-links written into storage; connections are found at read time) and the **transient ↔ durable membrane** (everything lands in the Session stream; only confirmed thoughts promote into the durable Brain via propose+confirm). Home screen is a plain, warm, identity-aware greeting. No read-back intelligence yet.
- **V1 — the insight engine.** The read-time layer that mines the clean corpus: cross-pillar patterns and hidden connections (how you feel now ↔ where you are in life; ideas ↔ hobbies), the two "maps of how you think" (session-scoped and all-time), smart morning/night surfacing, the auto-routing upgrade, and core enrichment. It cannot exist until the MVP has filled the reservoir with pillar-clean main thoughts.

**Terminology reconciliation:** the sections below still call the full evolved build "v1." That "v1" is the *whole vision*; the *shippable slices* are now **MVP** then **V1 (insight)**. Read the spine sections (two-stream Context Bus, the Coach's core-curation loop, the Journal as adaptive-prompt capture) as the **MVP capture spine**; read the alignment-engine sections (the alignment engine and §v1.5) as the **V1 insight engine**; the Vision Board sections are the **destination surface**, deferred behind both.

---

**Status:** the rebuilt roadmap (2026-06-03), re-sequenced by the capture-first reframe above (2026-07-02). It replaces the old Plan-1-to-4 sequence and re-sequences the build to the evolved order from [`product/concept-and-soul.md`](product/concept-and-soul.md) ("The evolved system" → "Build order") and the element model in [`architecture/elements-and-context.md`](architecture/elements-and-context.md).

The build order is **spine first, then surfaces**: stand up the two-stream Context Bus and the Coach's core-curation loop, then hang the Journal, Dashboard, Future Self, Pillars & Goals, and the co-build board off it.

---

## Already built (the starting line)

This is live and verified (see [`../CHANGELOG.md`](../CHANGELOG.md)). It is the floor everything below builds on.

- **Foundation.** Convex dev deployment, anonymous auth (Google OAuth wired, pending env), the v1 schema, user bootstrap (seeds a default pillar, an empty Mirror, a board).
- **Vision Board.** The board surface with capture intake (type/paste/image/link) and live distillation on OpenRouter (OpenAI fallback). This **is** the Vision Board; the old Whiteboard-vs-Vision-Board ambiguity is resolved.
- **App shell + rail nav.** The Today/Board/Guide/Settings rail, the docked Coach.
- **Onboarding (rebuilt 2026-06-03).** The five-step wizard is replaced with a real first-pass Core draw: the Door question, a one-question text interview (skip + circle-back policy), a voice interview (OpenAI Realtime mini via WebRTC), a QR phone handoff (join token), synthesis into `coreResponses`, and blueprint status/level tracking. See [`product/features/onboarding.md`](product/features/onboarding.md) and [`product/features/interview.md`](product/features/interview.md).
- **Today ritual.** The morning/evening beats wired to the interactions log.
- **Partial Guide / Settings.** Guide renders the north star, the live Mirror, pillar blocks, and the blueprint progress marker; Settings persists rhythm/tone and manages pillars.
- **Thin Coach.** Single-turn `coach.ask` with persisted threads/messages; assembles the Mirror plus the current surface. Not yet the real curator.
- **The Core.** The Life Blueprint surface: 3 sections, 18 questions, editable answers in `coreResponses`.

**Deferred items from the onboarding rebuild** (designed for, architecture ready, not yet built):
- A/B testing harness on `experienceEvents` telemetry.
- Level 2+ engagement-driven ranking rules.
- Personal/branded onboarding variant.
- Cross-device auth hardening for the QR join.
- Session resume for abandoned mid-interview sessions.

---

## v1: the spine, then the surfaces

### 1. Two-stream Context Bus + the Coach core-curation loop

Turn the spine on. This is the non-negotiable foundation; everything else draws through it.

- Split shared context into the two streams from [`architecture/elements-and-context.md`](architecture/elements-and-context.md): **the Core** (who you are) and **the Sessions** (your days). Wire the assembler to draw from both, weighted by the moment.
- Promote the thin Coach into the **real curator**: it internalizes every signal (board, sessions, captures) and runs the hard filter that strengthens or reshapes the Core. It does not silently overwrite; conflicts are surfaced to the person to decide.
- Bind the Core to the recovered Life Blueprint as its backbone (3 sections, 18 questions); answers accrue ambiently.

### 2. The Journal + the identity Dashboard

The daily pulse and the calm home.

- **Journal (self-sessions).** Its own surface and data model (`sessions`, `prompts`). A chronological feed of morning and night beats, **adaptive prompts** (not a blank diary), scrollable back through history, time- and day-aware. **Typed AND spoken** are both first-class; the old standalone "audio" plan is folded in here as the Journal's spoken path. Each session feeds the Sessions stream and, through the Coach, the Core.
- **Dashboard (Home).** An identity-aware, calm home that greets you by who you are and walks you into the right session for the time of day. Not a metrics dashboard.

### 3. Future Self

Its own element: the visual you as aspiration.

- New surface and data model (`futureSelf`), distinct from the Vision Board.
- **Image generation** of you living the life you want; draws the Vision Board (the world) and the Core (who you are) to place you inside it. Emits the distilled text behind the visuals into the Core.

### 4. Fill in Pillars & Goals; the board as Coach co-build

Rounds out v1 against the element model.

- **Pillars & Goals.** Add the `goals` table and goal **horizons**; goals live inside pillars. Pillars publish the domains you are strengthening and progress within each.
- **Vision Board co-build.** Turn the board into the **Coach co-build experience**: talk the vision into existence and the Coach lays down nodes and fills image blocks asynchronously.

---

## v1.5: the alignment engine goes active

The reflection loop made daily, and the Coach off-platform.

- **Off-platform Coach tether.** The same Coach, keeping a connection to the person on the go (proactive, earned). Moved up because it is core to the two-beats ritual.
- **Calendar + to-do as intake.** Read the calendar and the to-do list as a context source, and run the **reflection loop**: surface the gap between the life on the calendar and the life on the board, gently, with one next move.
- **Resurfacing.** Bring back the right past signal at the right moment.

---

## v2: deeper, richer, native

- A **deeper alignment engine** (more sources, sharper drift detection, better next-move).
- **Video** for Future Self.
- **People as first-class** (the relationships in a life modeled directly).
- **Drift visualization** (seeing the gap between trajectory and north star over time).
- **Native apps.**

---

## Out forever

Never built, by design (they cut against the soul in [`product/concept-and-soul.md`](product/concept-and-soul.md)):

- Streaks / gamification.
- A social feed.
- Generic blank-page journaling.
- Productivity-app framing.
