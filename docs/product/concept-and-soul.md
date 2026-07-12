# LifeGuide — Concept & Soul

**Date**: 2026-05-20
**Status**: The philosophical core. Everything else serves this.

> **Reading order (updated 2026-06-03).** The current source of truth is the section **"The evolved system"** near the end of this file. The earlier sections are kept for history; where they conflict, the evolved section wins. The original **Life Blueprint** app at `~/lifeguide` (GitHub `anurieli/lifeguide`) is the working model for the Journal and the Core. As of this date, every other doc under `docs/` was cleared to remove stale, conflicting specs; the docs are being rebuilt from this file and the Blueprint.

---

## The pain

**Young men are lost.** No one taught them how to set a goal, how to know what they want, how to stay aligned with it once life starts pulling. They walk a path that was set for them — school, job, money, marriage — and wake up years later realizing they never chose the direction. The cost of that drift is a life spent walking the wrong way.

LifeGuide exists to answer that one pain: **being lost.**

## The promise

LifeGuide is **the space for the individual.** His place to:

- reflect
- hold himself accountable
- set goals that are actually relevant to him
- stay aligned with them
- get pulled back on track when he drifts
- adapt the plan as he grows

Not a productivity tool. Not a journal app. A **space** he checks into — once when he wakes up, once before he sleeps — that keeps him tethered to who he's trying to become.

## The soul — the text layer behind the human

Every life has pillars:

- Health & fitness
- Family & relationships
- Financial & professional
- (more, evolving — defined per person)

Behind those pillars, LifeGuide is building **the text layer behind the human** — an evolving, growing representation of who he is, what he wants, and where he's going. It is never finished, because he is never finished. It grows as he grows. This is the Mirror, restated as the product's soul: *a living document of a person becoming.*

The **LifeGuide itself** (the roadmap document) is the surfaced form of this text layer — continuously developed, never static.

## The Coach

One presence. Named **Coach.** It is the way the human interacts with the entire space.

- **On every page, it has the context of that page** — and **global context about the person** at the same time. (Tiered context: full detail for where you are, awareness of everything else.)
- It can **reach into any surface and act "from far away"** — edit the board, adjust a goal, add to the vision, reconcile the calendar — without the user navigating there.
- It is the same Coach **on-platform and off.** Off-platform, it keeps a **tether** to the human who's on the go, leveraging everything it knows to stay connected when he's not in the app.

The Coach is how a complex space stays simple: the human doesn't operate the app, he talks to the Coach, and the Coach operates the app.

## The daily ritual

The core loop is two beats a day:

- **Morning check-in** — when he wakes up. Sees where he's headed before the day pulls him anywhere.
- **Evening check-out** — before bed. Reflects on the day, feeds the text layer.

Not streaks. Not guilt. Two calm bookends. The references research confirmed ritual bookends out-retain streak mechanics, and proactive tethering (~75% retention) beats wait-to-be-opened (~51%).

## The alignment engine

LifeGuide knows the person's **to-do list and calendar.** With that, the Coach can answer the questions a lost person can't ask themselves:

- Is what I'm doing actually fitting my goals and vision?
- Is something pulling me in a different direction?
- Am I too scattered? What could I do to move forward?

This is the **reflection loop** made concrete and daily: the gap between the life on the calendar and the life on the vision board, surfaced gently, with one next move. This is the feature no competitor has, and it's the daily reason to come back.

## Interaction principles — the creative constraint

The way it's interacted with must be **creative, calm, and never bombarding.** Design rules:

1. **Two beats a day, not all day.** The app asks for two minutes, twice. It does not buzz between.
2. **One thing per screen.** Never a dashboard. Morning shows your direction + today. Evening shows one reflective prompt. Depth is opened, never dumped.
3. **Talk, don't operate.** The primary interface is the Coach. The human expresses; the Coach manipulates the space.
4. **Earned interruption only.** The Coach reaches out when it has something specific and true to say — not on a schedule, not generic.
5. **Progressive disclosure.** Day one is dead simple (one capture, one question). Pillars, roadmap, the graph, the analytics — all earned as the person goes deeper.
6. **Ambient, not anxious.** The space feels like a calm room he returns to, not an inbox demanding triage.

## ICP — sharpened

Primary: **young men who feel lost** — drifting, capable, aware something's off, no framework for direction. (This supersedes the earlier "Indy Leaders/Builders" framing — overlapping, but this is the emotional truth of the target.)

## What this means for the build

This concept validates the Foundation Blueprint and adds emphasis:

- The **Context Bus** is non-negotiable — the "one Coach, every context, acts from far away" promise depends on it entirely.
- The **reflection loop + alignment engine** (calendar/todos vs goals) is the daily killer feature and must be designed in from phase 1, not bolted on.
- **Off-platform Coach** (the tether) moves up in importance — it's core to the "two beats a day" ritual, not a v1.5 nicety.
- **Calendar + todo integration** becomes a foundational intake source, not an afterthought.
- The **interaction principles** above are the design contract for every surface — calm, talk-first, progressive.

The soul in one line: **LifeGuide is the space that keeps a man tethered to who he's becoming — and a Coach who makes sure today's life still points at it.**

---

## The evolved system (2026-06-03)

This section captures the fuller architecture worked out in conversation. It extends, and in places sharpens, everything above, and it is the current source of truth for what LifeGuide is.

### Two context streams

LifeGuide runs on two kinds of context, different in kind, both feeding the Mirror but held separately:

1. **The core (who you are).** The enduring identity layer: the vision board plus the deep questions and sections about your vision. Slow changing. This is the inner person, and it is what the Coach reaches into when it relates to *you*, not your day. It is the heart of the Mirror.
2. **The sessions (your days).** The daily self-sessions, a morning beat and a night beat. Time and day aware, ordered, and scrollable back through history. Fast, recurring. Its own surface (the Journal). Each session feeds the core.

The Coach and the Context Bus hold these as two distinct streams: "here is who they are" and "here is where they have been lately." Assembling context means drawing from both, weighted by what the moment needs.

### The journal is adaptive prompts, not a diary

The Journal is not a blank page. It is a feed of relevant prompts whose job is to (1) draw out the background that makes a person who they are, and (2) keep checking they are still on track toward their goals and surface what is drifting. Some prompts are daily (the morning and night beats); some are triggered by what the Mirror notices. Answers can be typed or spoken (a verbal interview session counts). The signal is what matters, not the format.

### The Coach as core-curator

The core is never static. The Coach continuously internalizes everything (board, journal, sessions) and runs it through a hard filter that repackages the signal to strengthen or reshape the core. Two rules govern it:

- It does not silently overwrite. When new data conflicts with what it already holds, it brings the contradiction to the person, and the person decides.
- The aim is the real thing: a true vision and an actual plan for life, kept aligned as the person changes.

This is the alignment engine made concrete: detect drift from the north star, surface it gently, hand back the next small move.

### Pillars: making a human solid

Pillars are the domains that hold a person up, and the framework for becoming whole across all of them, not just one:

- **Physical / body** (the backbone, support and backup),
- **Professional** (stability, income),
- **Social presence**,
- and more, defined per person.

Each pillar is something to strengthen. The pillars are how the app helps a person decide who they are across every part of life.

### Future Self (its own data model)

A distinct surface and data model from the vision board. Where the board holds ideas and inspiration, the Future Self holds *you as aspiration*: images, attires, and scenes of who you want to be and the life you want to live. Its purpose is to remind you, vividly, where you are going.

### The surfaces

- **Home / Dashboard.** Greets you by who you are (drawn from the core and the vision board), is aware of the time and day, and walks you into the right session. This is an identity aware calm home, not a metrics dashboard, so it stays consistent with "one thing per screen" (the rule forbids dumping data, not a welcoming home).
- **Journal (self-sessions).** Its own surface. A chronological feed of morning and night sessions, prompt driven, scrollable back, each feeding the Mirror.
- **Board (vision).** The vision board, the core identity context.
- **Future Self.** The aspiration gallery.
- **Guide.** The synthesized you: Mirror, north star, pillars.
- **Coach.** Reads both streams and curates the core.

### Build order

Foundation first, then surfaces:

1. The two-stream context and the Coach's core-curation loop (the spine).
2. The Journal (self-sessions with history and time awareness) and the identity Dashboard.
3. The Future Self surface and data model.

The soul, restated: LifeGuide builds and steers one thing, a person's true self and the plan for their life, through a core that the Coach keeps honest, daily sessions that keep the pulse, pillars that make the person solid, and a vivid Future Self that keeps the direction in view.

---

## The promise, the system thesis, and the observation contract (2026-07-12)

This section sharpens the promise and defines how a new person enters. It is canon for product and branding language alike.

### The promise: the zone of genius

The single outcome everything aims at: **help the person find their zone of genius**, the version of themselves they wake up excited to be and go to sleep excited to return to. Once that is found, everything else starts falling into place; that belief is the product's engine. "Zone of genius" is the internal term; user-facing language translates it plainly ("there's a mode of you where everything clicks; we're going to find it", "finding your ultimate self"). The broader system (Core, pillars, sessions, plan) is the machinery in service of this one search.

### The system thesis: you are a system, so first, track

Any system you want to optimize, you first track. A person is a system: states, ebbs and flows, inputs (environment, what you listen to, what you do, who you're around). LifeGuide's first move is therefore always observation: capture **when, where, and how you're thinking about what you're thinking about**, read between the lines, and hand back a roadmap for getting ahead. This is why capture (the Thought Stream) precedes coaching, and why every raw artifact is kept durable and re-analyzable.

### The observation contract

Onboarding states the deal out loud instead of hiding it behind a form:

> Give me two weeks. A morning and a night check-in, two minutes each, phone or computer. And when your head gets full, let it out: at least seven or eight brain dumps. It takes about a week of real communication to understand somebody. By day seven I'll start showing you what I see.

Honesty about what the system needs IS the frictionless design. No long intake; a clear ask, and visible proof the system is holding up its end: after every dump and session, the person sees what was heard and what was taken from it. **They keep coming back because they can see it learning them.** That visible learning, insight that feels truer than what they could articulate themselves, is the retention engine and the product's proof.
