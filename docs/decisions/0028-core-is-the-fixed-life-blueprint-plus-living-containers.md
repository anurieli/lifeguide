# 0028. Core is the fixed Life Blueprint plus Living Core containers

**Status:** accepted (product direction, not implemented)  
**Date:** 2026-07-20

## Context

LifeGuide is meant to become the durable database for everything meaningfully "me": what the person believes, wants, admires, remembers, is becoming, and chooses to live by. The Coach and other parts of the app must be able to draw on that record without reading a pile of unrelated notes or guessing which copy is current.

The existing product already has several partial versions of that idea:

- `coreResponses` stores the fixed 18-question Life Blueprint.
- `coreFiles` stores open-ended statements about the person inside Pillar folders.
- `mirror` stores a generated summary, values, and themes and has also been proposed as a future backbone store.
- `pillars` acts both as a life-domain model and as the folders containing `coreFiles`.
- `blueprint` stores a separate daily-conduct document also called "The Blueprint."
- `settings.northStar`, standing `horizons`, the Blueprint goal questions, and Orbit Goals can all hold competing versions of direction.
- Board nodes, Future Self captions, Thoughts, and Coach conversations can all contain material that might also belong in the person's durable record.

Adding a new `coreArtifacts` system beside all of those would create another competing truth. This decision therefore replaces and absorbs overlapping concepts. It does not add a fourth person-model.

## Decision

**Core is one product boundary with two canonical layers:**

1. **Life Blueprint:** the fixed 18-slot frame and the person's current deliberate answers.
2. **Living Core:** open-ended, source-linked artifacts that grow over time and live in clearly bounded Core containers.

Everything else is either a source, a lens, a derived readback, a presentation surface, or execution. It may link to Core, but it does not become a parallel Core store.

The short rule is:

> Blueprint is the current declaration. Artifacts are the living detail and evidence beneath it. Containers organize artifacts. Pillars locate them in life. Mirror summarizes them. Thoughts and conversations source them. Goals and calendars execute them.

Subject overlap between a Blueprint answer and Living Core is intentional. Duplicate authority is not. For example, What Moves Me may hold twenty role-model artifacts while the Blueprint's Role Models answer holds the person's current shortlist. The artifacts support the answer; they are not twenty competing Blueprint answers.

## Canonical language and ownership

| Term | Canonical job | Explicitly not |
|---|---|---|
| **Core** | Umbrella for the Life Blueprint and Living Core | A third blob or table beside them |
| **Life Blueprint** | Fixed 18 question definitions plus the person's current answers in `coreResponses` | A notes library, execution tracker, or AI-generated copy in Mirror |
| **Living Core artifact** | One durable unit of personal meaning, with current wording, history, provenance, and links | A raw capture, task, Board card, or second Blueprint answer |
| **Core container** | One semantic home used to browse and route artifacts | A life domain, task project, or duplicate data owner |
| **Pillar** | A cross-cutting life domain and optional strength reading | A folder, Core container, identity category, fear category, or aspiration category |
| **Mirror** | Disposable, versioned synthesis over canonical Core | An editable store or independent source of values and backbone answers |
| **Personal Code** | A featured Living Core artifact describing how the person chooses to conduct life | A second product called Blueprint |
| **Capture, Session, conversation** | Raw or temporal source material | Accepted Core truth by default |
| **Board** | Spatial and visual composition of the wanted world | The canonical text record of an aspiration |
| **Future Self** | Visual rendering of the desired person | A second store of future-identity meaning |
| **Goal, task, Todoist, Calendar** | Commitments, work, schedule, progress, and evidence | Living Core artifacts or Blueprint answers |
| **Interaction** | Event, audit, invalidation, and processing cursor | Content or provenance source of truth |
| **Coach Knowledge Base** | Owner-authored coaching doctrine shared by the product | Personal Core data |

Product copy should stop using `file`, `component`, `self-map entry`, or `Personal Knowledge Base` as parallel names for Living Core artifacts.

## The two Core layers

### Life Blueprint

The Life Blueprint remains the fixed 3-section, 18-question frame defined in `lib/blueprint.ts`. The frame is stable. The person's answers are deliberately authored and remain the highest-authority statements about the corresponding subjects.

- Grid, Zen, and Talk remain three ways to work on the same `coreResponses` answers.
- Existing malleability colors continue to communicate expected change weight.
- No formal draft, commit, lock, or Blueprint-edition model is introduced by this decision.
- Ambient artifacts may support a response or propose revisiting it, but never rewrite it.
- Conversational Core and onboarding remain explicit Blueprint-authoring workflows. They may map the person's own transcript into empty answers, while conflicts remain review-only and never overwrite authored text.

Add source links from a Blueprint question key to supporting artifacts and Goals. The response text remains canonical in the first release. For list-shaped questions, a later UI may render selected linked artifacts instead of maintaining a hand-copied list, but that is not required for this migration.

### Living Core

A Living Core artifact is slowly crafted over time. It has one current statement, an append-only growth/history trail, direct source backlinks, and relationships to relevant Core, Board, and execution records.

Each artifact has:

- Exactly one primary Core container.
- Zero or more Pillar tags.
- Zero or more direct source links.
- Zero or more relationships to artifacts, Blueprint questions, Goals, tasks, or Board/Future Self media.
- A representational format such as text, quote, link, media, or document. Format does not create a second semantic taxonomy.
- Active or archived state. Hard deletion is not a primary user action.

An artifact has one home so routing stays intelligible. If one source supports two genuinely different meanings, create two linked artifacts that state those different meanings, both pointing back to the same source. Do not place one ambiguous artifact into every plausible container.

### Default Core containers

1. **Who I Am:** current values, beliefs, needs, strengths, weaknesses, preferences, and recurring patterns.
2. **Who I'm Becoming:** desired character, roles, traits, identity experiments, and possible selves.
3. **The Life I Want:** desired conditions, experiences, environments, exits, and uncommitted outcomes.
4. **What Moves Me:** external inspiration, quotes, role models, media, resources, and recurring motifs.
5. **What I Want to Remember:** memories, stories, decisions, people, and lessons worth preserving.
6. **How I Choose to Live:** adopted principles, boundaries, standards, practices, and routines. The Personal Code is featured here.

Custom containers remain allowed, but each must have a distinct purpose and one routing description. If a custom container duplicates a starter's purpose, the UI should suggest merging or clarifying it rather than creating two homes for the same material.

### Container boundary rules

- **Present self versus desired self:** Who I Am describes what appears true now. Who I'm Becoming describes the person being cultivated.
- **Desired self versus desired world:** Who I'm Becoming is about character. The Life I Want is about circumstances, experiences, and outcomes.
- **External source versus adopted rule:** What Moves Me holds what influences the person. How I Choose to Live holds what the person has consciously adopted. Promotion creates or links an adopted principle; it does not mutate the inspiration into one.
- **Event versus conclusion:** What I Want to Remember holds the story. Who I Am or How I Choose to Live may hold a linked interpretation or lesson.
- **Vision versus commitment:** The Life I Want holds a possibility or desired outcome. Once actively pursued, Orbit Goals owns the commitment, status, deadline, tasks, and Todoist connection. Core keeps the aspiration and a link.
- **Free-form writing:** there is no generic Core Notes bucket. A manual reflection becomes an artifact in the container matching what it means.

### How the 18 draw from Living Core

| Blueprint subject | Supporting Living Core or external owner |
|---|---|
| Note to Self, Role to Embody | Who I'm Becoming |
| Values, Strengths, Weaknesses | Who I Am and How I Choose to Live |
| Role Models, selected quote | What Moves Me |
| Mantra, Flash Reminders | How I Choose to Live, with selected source links |
| Life Goals, 5 Year Goal, North Star | The Life I Want, with links to executable Goals |
| Yearly and Monthly Goals | Blueprint carries the declared priority; Goals owns execution and progress |
| Daily Goals | Recurring standards in Blueprint, distinct from today's tasks or calendar events |
| Expectations, WHYs | Who I Am, Who I'm Becoming, Personal Code, and linked Goals |
| Time Tracking | Blueprint carries the interpreted pattern; Calendar and Sessions retain raw activity |

## Pillars become domains only

Pillars answer **where in life** something applies. Containers answer **what kind of personal material** it is. Those are different axes.

Pillars stop being folders and stop owning files. They remain domain records with names, optional strength, history seams, and links from artifacts and Goals. The target starter domains are:

- Body & Health
- Work & Money
- Relationships
- Community & Belonging
- Mind & Growth
- Meaning & Spirit

Existing custom Pillars that truly represent life domains remain. Three current defaults are not domains and leave the Pillar model:

- Identity & Values moves into Who I Am and How I Choose to Live.
- Fears & Shadows moves into Who I Am as patterns, fears, or tensions.
- Dreams & Aspirations moves into Who I'm Becoming or The Life I Want according to whether it describes the person or the world.

This completes the cleanup that ADR 0022 explicitly deferred. Identity is no longer kept as a pseudo-pillar merely to preserve the old filing system.

## Existing concepts to keep, absorb, or retire

| Existing concept | Decision |
|---|---|
| `coreResponses` | Keep as the sole answer store for the fixed 18. Do not copy the backbone into `mirror.structured`. |
| `coreFiles` | Treat as the predecessor of Living Core artifacts. Migrate it, stop new writes, then retire the table and product metaphor. Do not run both systems indefinitely. |
| Center per-Pillar filing | Replace with one source-level routing pass that proposes distinct artifact operations, assigns one home container, and adds zero or more Pillar tags. No direct ambient AI writes. |
| `mirror` | Keep only as a regenerated read model. Values and themes are derived indexes. Remove direct delta-as-truth behavior and cancel the proposed canonical `mirror.structured.backbone`. |
| `blueprint` conduct document | Rename user-facing to **Personal Code**, migrate it to one featured document artifact in How I Choose to Live, and make ritual reads reference that artifact. Reserve "Blueprint" for the fixed 18. |
| `settings.northStar` | Make `coreResponses.s2q5` authoritative. Keep Settings only as a temporary compatibility projection during migration. |
| Standing Horizons | Convert 5-year, 1-year, and 1-month to views over the relevant Blueprint answers and linked Goals. Do not keep separate standing free-text truths. Weekly and daily priorities remain execution data outside Core. |
| Orbit Goals and `goalTasks` | Keep as the sole executable goal/task system and Todoist sync owner. Do not add a Core artifact kind called `goal`. |
| Vision Board | Keep nodes, media, edges, and layout in Board. A Board item may source or display a linked artifact, but accepted meaning is not copied into two editable records. |
| Future Self | Keep visual assets and generation metadata in its surface. Link each retained image to a Who I'm Becoming artifact; do not keep an independent canonical aspiration caption. |
| Thoughts, Sessions, interview sessions, Coach messages | Keep as chronological source records. They enter Core only through explicit artifact creation or a confirmed routing proposal. |
| Guide/Profile ideas | Keep Today as a compact readback and Core as the canonical browse/edit home. Do not create another all-of-you data owner. |
| `interactions` | Keep as event and processing infrastructure. Provenance links point directly to source entity IDs rather than opaque event payloads. |
| Personal Knowledge Base | Absorb the concept into Living Core. The owner-authored Coach Knowledge Base remains separate product doctrine. |
| Ritual inline reads, mantras, and generated tidbits | Prefer references to Blueprint selections or Personal Code. Generated tidbits remain ephemeral unless the person explicitly saves one to What Moves Me. |

## Intake, routing, and approval

Raw intake and durable meaning remain separated by a visible membrane:

1. A Thought, Brain Dump, Coach conversation, Board item, future Brain Vault import, or external API call remains intact in its source system.
2. One routing pass proposes `create artifact`, `append artifact`, `link source`, `link Goal`, or `suggest Blueprint review` operations.
3. The person sees the exact wording and destination, can correct it, and confirms selected operations.
4. Applied operations are idempotent, source-linked, and undoable without deleting the raw source.

Manual creation inside a chosen Core container writes immediately. Ambient AI interpretation always proposes. Explicit Blueprint-authoring modes may continue filling empty Blueprint responses from the person's own transcript because the destination and purpose were chosen in advance; conflicts still require review.

## Context, Coach, API, and MCP boundary

Core exposes one context service with two separately labeled outputs:

- `Core / Life Blueprint`: current non-empty answers, question keys, malleability, and supporting links.
- `Core / Living Core`: relevant accepted artifacts, container, Pillars, current wording, freshness, and provenance.

The service returns included and dropped entity metadata under its context budget. Pending proposals are excluded. A caller can request Blueprint, Living Core, or both and filter by container, Pillar, source, relationship, or search query.

Authority order is:

1. Current user-authored Blueprint answer for the exact question it governs.
2. Current accepted Living Core artifacts.
3. Derived Mirror summary.
4. Raw source material only when the active interaction explicitly includes it.

When newer artifacts conflict with a Blueprint answer, the Coach should say both: "Your Blueprint says X; newer material suggests Y." It may propose a review, not silently choose one.

Internal app consumers, authenticated API clients, and a later MCP adapter use the same service. External agents receive read and propose capabilities by default, not unrestricted direct write. No second database or network service is introduced for MCP.

## Migration sequence

1. Add the Living Core artifact, history, source-link, relationship, container, Blueprint-link, and proposal structures.
2. Seed the six starter containers idempotently.
3. Migrate every active `coreFiles` row to an accepted artifact with `legacy_core_file` provenance and its original source-session link. Convert pending rows to pending proposal operations. Preserve the original Pillar as a tag when it remains a domain.
4. Route files from the three non-domain Pillars into the appropriate Core container. Ambiguous Dreams & Aspirations rows become review proposals instead of guessed placements.
5. Migrate the user-owned conduct `blueprint` document to the featured Personal Code artifact and repoint ritual reads before retiring the old table.
6. Reconcile North Star. If only `settings.northStar` exists, copy it to `s2q5`; if both match, collapse the duplicate; if they differ, preserve both and create a review proposal.
7. Convert standing Horizon text to Blueprint/Goal references. Preserve historical weekly and daily rows as execution history.
8. Rebuild Mirror from `coreResponses` plus accepted artifacts, stamp its source watermark, and switch Coach/Today to the new context provider.
9. Stop Center and ambient curation writes to `coreFiles`, `mirror`, and Blueprint answers. Remove compatibility reads only after migration counts, source links, and context output are verified.

All migrations are idempotent and non-destructive until verification. Existing list-shaped Blueprint answers are not automatically split into artifacts because doing so would manufacture duplicate authority. They can later generate user-reviewed extraction proposals.

## Consequences

- The new feature is an evolution of `coreFiles`, not a parallel artifact system.
- Core becomes the all-of-you browse and edit home, while Today remains a calm readback.
- Every durable fact has one canonical owner and direct provenance.
- The Coach can access both selected self-definition and growing evidence without flattening them together.
- Board, Future Self, Goals, Todoist, Calendar, rituals, and Thoughts remain valuable because they keep their distinct jobs instead of becoming Core folders.
- The migration is broader than adding a Notes page because it deliberately retires old ownership models.

## Supersedes, preserves, and defers

This decision **partially supersedes**:

- [ADR 0007](0007-file-system-on-the-human-and-the-center.md): retire Pillars-as-folders, `coreFiles` as a separate product concept, and direct Center filing. Preserve the no-silent-overwrite principle and the value of source-to-structure routing.
- [ADR 0022](0022-identity-is-not-a-pillar.md): preserve domain Pillars, Life Wheel strength, and Goal relations; retire the identity pseudo-pillar and non-domain seed rows after migration.
- [ADR 0002](0002-future-self-as-its-own-element.md): preserve visual ownership and generation behavior; semantic future-self meaning belongs to linked Living Core artifacts.

This decision **preserves and clarifies**:

- [ADR 0023](0023-listener-memory-backbone.md): conversational continuity remains separate from identity knowledge.
- [ADR 0024](0024-core-conversational-mode-engine.md): the fixed 18, shared editing modes, and no-overwrite behavior remain.
- [ADR 0027](0027-one-coach-voice-and-text-as-io.md): every conversational intake is one Coach using different framings, not separate agents.

Deferred from this decision:

- Formal Blueprint draft, commit, locking, or edition behavior.
- Embedding/vector retrieval.
- Actual Brain Vault synchronization.
- Calendar OAuth, event storage, and webhook behavior.
- A standalone MCP server. The shared Core service and API boundary land first.

Where the current Core, file-system, Pillars, Mirror, Blueprint-conduct, Horizons, Guide, Board, or Future Self documentation conflicts with this accepted target state, this decision governs. Those feature and architecture documents are reconciled when the implementation is planned and built.

---

## Addendum: intuitiveness critique (2026-07-20)

This decision is defensible section by section. Every layer, container, and boundary rule earns its place *logically*. That is exactly why it needs pushback before implementation: **logical completeness is not the same as intuitiveness**, and this ADR optimized the first at the cost of the second.

### The core problem

Intuitiveness has a specific test: can a person say what Core *is* in one breath, and predict where a new thing goes without consulting a rule? Today the honest one-sentence answer is:

> "An umbrella over a fixed 18-question questionnaire *and* a six-container artifact library, cross-tagged by life domain, summarized by a disposable Mirror, feeding the Coach under a four-level authority order."

That is a system diagram, not one idea. The root cause is scope: Core is defined as "the durable database for everything meaningfully me." Because the scope is total, Core must draw a boundary against Goals, Board, Future Self, Sessions, Thoughts, Todoist, Calendar, Pillars, and Mirror. Each boundary is a rule. The sum of the rules is the unintuitiveness. Every section feels important *precisely because* the scope is total, and total scope is why no single mental model fits.

### Specific friction points

1. **One word, two objects.** Core = Life Blueprint (fixed slots, declarations, form-like) + Living Core (open-ended artifacts with provenance and history). These are two different mental models. The umbrella hides the duality rather than resolving it; the user must learn that "Core" sometimes means the 18 questions and sometimes the container library.

2. **Six containers is a taxonomy the user must master before filing anything.** The "Container boundary rules" section is the tell: present-self vs desired-self, desired-self vs desired-world, source vs adopted-rule, event vs conclusion, vision vs commitment. If five rules are needed to explain the difference, the user will never *feel* it. "Where does this go?" becomes a live decision every time, which contradicts the calm/never-bombarding principle.

3. **Two orthogonal axes per artifact.** Container (what kind of material) and Pillar (where in life) is elegant for a database and taxing for a human: two classification decisions per item.

4. **Overlap-without-authority is a data-modeling insight, not a felt one.** "What Moves Me holds twenty role-model artifacts; Blueprint's Role Models answer holds the current shortlist." Nobody intuits why their role models live in two places at two authority levels.

5. **The "canonical job / explicitly NOT" glossary is itself evidence of collision.** Having to legislate that Blueprint ≠ the-conduct-doc-now-Personal-Code, Pillars ≠ folders, Mirror ≠ editable, Core ≠ a third table means the surface names are colliding in users' heads. That table is cleanup after concepts that grew into each other.

### Proposed reshape (for pressure-testing, not yet accepted)

- **Demote the taxonomy from navigation to plumbing.** The routing pass (AI proposes destination, user confirms) already does the real filing. Lean all the way into it: the person dumps or talks, it gets filed, they browse "rooms" they never had to learn. Do not hand them six labeled buckets plus a boundary rulebook and ask them to sort.

- **The six containers are not six peers.** The intuitive spine is three, and it maps to a natural narrative: **who I am / who I'm becoming / the life I want.** The other three are different *kinds* of thing: *What Moves Me* is an inspiration library (a source), *What I Want to Remember* is memory, *How I Choose to Live* is principles. Flattening all six to one level is part of why the model reads as a wall. Consider a two-tier presentation: the three identity rooms as the spine, the other three as adjacent libraries.

- **Name the duality honestly.** "Life Blueprint" is already a distinct, ownable name for the fixed 18. Consider letting **Core = the living library**, with Blueprint standing as its own first-class thing beside it, rather than one word straining to cover two objects.

### What this addendum does not change

The ownership cleanup this ADR performs (one canonical owner per fact, Mirror as derived, Pillars as domains only, Goals/Calendar owning execution) is sound and should stand. The critique is about the **user-facing surface and vocabulary**, not the data-ownership model underneath. The reshape above should be resolved before Core's browse/edit UI is specced, since it determines navigation, not schema.
