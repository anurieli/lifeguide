# Feature / Element Docs

One doc per element (the unit of the system). Each follows [`_TEMPLATE.md`](_TEMPLATE.md) and covers, completely: purpose, user-facing behavior, every function/action, dynamics with other elements (owns vs draws), states, edge cases, AI involvement, data touched, and open questions.

The element model these hang off is [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md); the data shapes are in [`../../architecture/data-model.md`](../../architecture/data-model.md); the spine is [`../../architecture/context-bus.md`](../../architecture/context-bus.md).

**Status legend:** `built` runs in dev · `partial` partly built · `proposed` specified, not yet built.

| Element | Owns | Feeds | Status |
|---|---|---|---|
| [Vision Board](vision-board.md) | `surfaces, nodes, edges, captures` | Core | partial (board built; Coach co-build proposed) |
| [Future Self](future-self.md) | `futureSelf` | Core | proposed |
| [Journal / Sessions](journal.md) | `sessions, prompts` | Sessions | proposed (Today ritual is the seed) |
| [Pillars & Goals](pillars-and-goals.md) | `pillars, goals` | Core, Sessions | partial (pillars built; goals proposed) |
| [The Core](core.md) | `mirror` | is the Core | partial |
| [The Coach](coach.md) | `threads, messages` | reads all | partial (thin single-turn) |
| [The Guide](guide.md) | view-only | renders Core | merged into Home |
| [Home (Today)](dashboard.md) | view-only | draws Core + Sessions | partial (hosts the merged Guide) |
| [Settings & Onboarding](settings.md) | `settings` | system | built (reached via the account menu) |

**Home (Today)** is the one home surface: it owns no data, renders and routes, and now hosts the former **Guide** (north star compass, Mirror, pillars) folded in. Everything else owns its tables and publishes distilled text to the two streams. Settings is reached from the account menu at the bottom of the rail, not a primary rail tab.
