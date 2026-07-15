# Interaction Principles

**Status:** the design contract (2026-06-03). Drawn from the soul in [`../product/concept-and-soul.md`](../product/concept-and-soul.md) (the "Interaction principles" section and the daily ritual). Every surface obeys these. If a screen breaks one, the screen is wrong.

> The throughline: LifeGuide is a calm room a man returns to, not an inbox demanding triage. It asks for two minutes, twice a day, and stays quiet between.

---

## The six rules

### 1. Two beats a day, not all day
The app lives in a morning beat and a night beat. Between them it is silent. It does not buzz, badge, or backfill a feed to keep you scrolling.

- **Do:** bookend the day. A direction to wake to (morning), a moment to set the day down (evening). See [`../product/concept-and-soul.md`](../product/concept-and-soul.md) (the daily ritual).
- **Don't:** notify mid-day "just to check in," run streak *meters you serve*, or punish a missed beat. No score, no streak-as-pressure (the evening screen says this out loud). The one carve-out is the gentle keeping-up run — a penalty-free current-run count that never shames a miss and is hidden at zero ([ADR 0018](../decisions/0018-gentle-keeping-up-run.md)).

### 2. One thing per screen. Never a dashboard.
Each surface holds one job and one focus. Depth is opened, never dumped. A welcoming, identity-aware home is allowed; a metrics dashboard is not (the rule forbids dumping data, not a warm front door).

- **Do:** morning shows your direction plus today's one move. Evening shows a single reflective prompt. The Guide renders one north star, then the Mirror, then pillars in sequence.
- **Don't:** stack KPIs, charts, and four panels on one view. Don't make the user triage. If a surface needs a second job, it is a second surface.

### 3. Talk, don't operate.
The Coach is the primary way a complex space stays simple. The human expresses; the Coach manipulates the space and acts "from far away" (edit the board, adjust a goal, add to the vision) without the user navigating there. Manual editing stays first-class too: the Coach is a power tool, not a gate.

- **Do:** let the user say "put a quieter life near water on my board" and have the Coach place and connect it. Keep the docked Coach reachable on every surface, scoped to that surface.
- **Don't:** force every action through a chat, and don't hide direct manipulation. Both paths are first-class. See the Coach in [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md).

### 4. Earned interruption only.
The Coach reaches out only when it has something specific and true to say, drawn from real signal, never on a schedule, never generic. The user sets the threshold (Settings: Reaching out: Leave me / Earned / Often) and quiet hours.

- **Do:** "You've kept three things about the ocean this month. Not a daydream anymore." A true, particular observation tied to what it actually noticed.
- **Don't:** "Don't forget to journal!" or any timed, content-free nudge. If the Coach has nothing true to say, it says nothing.

### 5. Progressive disclosure.
Day one is dead simple: one capture, one question. Pillars, the roadmap, the Mirror, the graph, analytics: all earned as the person goes deeper. The system reveals depth as the person fills it in, not before.

- **Do:** onboard with a single "show me something that pulls at you," then a rhythm choice. Let pillars and the Guide accrue from what the person adds.
- **Don't:** front-load setup, forms, or empty dashboards. Empty states invite ("Nothing tagged here yet."), they do not scold.

### 6. Ambient, not anxious.
The space feels like a calm room, paced and unhurried. Tone is gentle by default and tunable (Settings: Coach tone). Motion is soft; nothing flashes for attention.

- **Do:** generous whitespace, slow fades, warm paper, a Coach that says "I'll fold this into what I know about you overnight."
- **Don't:** red dots, urgency copy, countdown pressure, or guilt. Calm over engagement, always.

---

## How the rules bind the surfaces

- **Today** is rule 1 + 2 + 6: two beats, one focus each, calm. See [`screens.md`](screens.md).
- The **Guide** is rule 2 + 5: read yourself back, in sequence, only as deep as you've filled in.
- The **docked Coach** is rule 3 + 4: talk-first, context-aware, interrupts only when earned.
- **Onboarding** is rule 5 + 6: dead simple, warm, no homework.

The visual expression of "calm and ambient" lives in [`design-system.md`](design-system.md).
