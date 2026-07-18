# Feature / Element Docs

One doc per element (the unit of the system). Each follows [`_TEMPLATE.md`](_TEMPLATE.md) and covers, completely: purpose, user-facing behavior, every function/action, dynamics with other elements (owns vs draws), states, edge cases, AI involvement, data touched, and open questions.

The element model these hang off is [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md); the data shapes are in [`../../architecture/data-model.md`](../../architecture/data-model.md); the spine is [`../../architecture/context-bus.md`](../../architecture/context-bus.md).

**Status legend:** `built` runs in dev · `partial` partly built · `proposed` specified, not yet built.

| Element | Owns | Feeds | Status |
|---|---|---|---|
| [Vision Board](vision-board.md) | `surfaces, nodes, edges, captures` | Core | partial (board built; Coach co-build proposed) |
| [Thought Stream](thought-stream.md) | ingest pipeline over `captures` (table shared with the board) | Sessions → Core | pipeline live; surface merged into the Thoughts tab (ADR 0010) |
| [Sessions (the living entry) / Thoughts](sessions.md) | `sessions` (container; members via `captures.sessionId`) | Sessions → Core | built (v3: the app's single capture surface) |
| [Future Self](future-self.md) | `futureSelf` | Core | proposed |
| [Journal](journal.md) | `prompts` (its beats open the live `sessions`) | Sessions | proposed (Today ritual is the seed) |
| [Daily Ritual](daily-ritual.md) | `ritualItems`, `ritualDays`, `roadmapEntries`, `morningNotes` | Sessions (publishes `ritual_completed`, `ritual_question`) | built (v5, typed components — mantra, settings-driven journal, daily-quote tidbit) |
| [Horizons (goal ladder)](horizons.md) | `horizons` | spine (the plan layer of Today) | built |
| [Daily tidbit (quote agent)](daily-tidbit.md) | `dailyTidbits` | Sessions (a step in the Morning Scroll) | built |
| [The Blueprint](the-blueprint.md) | `blueprint` | Daily Ritual (the morning read resolves from it) | built |
| [Pillars & Goals](pillars-and-goals.md) | `pillars, goals` | Core, Sessions | partial (pillars built; goals proposed) |
| [File system on the human](file-system-on-the-human.md) | `pillars` (folders), `coreFiles` (files) | Core | partial (store + seed built; person-map UI proposed) |
| [The Core](core.md) | `mirror` | is the Core | partial |
| [The Coach](coach.md) | `threads, messages` | reads all | partial (thin single-turn) |
| [The Listener](listener.md) | view-only (reuses `interviewSessions`) | Core (via the Center) | built (v1) |
| [The Center](the-center.md) | orchestrator (writes `coreFiles`) | curates the Core | built (v1 filing) |
| [The Guide](guide.md) | view-only | renders Core | merged into Home |
| [Home (Today)](dashboard.md) | view-only | draws Core + Sessions | partial (hosts the merged Guide) |
| [Settings & Onboarding](settings.md) | `settings` | system | built (reached via the account menu) |
| [Onboarding (Door/Interview/Synthesis)](onboarding.md) | `interviewSessions`, `experienceEvents` | draws the Core out of a brand-new user before the shell mounts | built |
| [Product Tour (guided walkthrough)](product-tour.md) | rides `settings` (no table of its own) | walks an already-onboarded person around the shell | built |
| [Feedback Widget](feedback-widget.md) | `feedback` | dev tooling | built (draggable widget + `/admin` ticket queue) |
| [Atmosphere](atmosphere.md) | `settings.music*` + audio assets | none (ambient) | built (v1) |

**Home (Today)** is the one home surface: it owns no data, renders and routes, and now hosts the former **Guide** (north star compass, Mirror, pillars) folded in. Everything else owns its tables and publishes distilled text to the two streams. Settings is reached from the account menu at the bottom of the rail, not a primary rail tab.
