# The Coach

**Status:** partial · **Element of:** the spine (reads all streams; curates the Core) · **Owns:** `threads`, `messages`

> The one presence. The human does not operate LifeGuide; he talks to the Coach, and the Coach operates LifeGuide.

## 1. Purpose

A lost person cannot hold the whole picture of his own life in his head, and he should not have to learn an app to work on it. The Coach is the single interface to the entire space: one presence that knows who he is and where he has been, reaches into any surface to act for him, and keeps his Core honest as he changes. It answers lostness the way nothing else in the product can, by being the one thing he can always just talk to. Everything else (the [Vision Board](../../architecture/elements-and-context.md), [Journal](../../architecture/elements-and-context.md), [Future Self](../../architecture/elements-and-context.md), [Pillars & Goals](../../architecture/elements-and-context.md)) is a surface the Coach can see and touch; the Coach is how a complex space stays simple.

## 2. User-facing behavior

The Coach is docked on every surface. On each one it sees that surface in **full detail** and stays **aware of everything else**, the tiered context promise from [`../../architecture/context-bus.md`](../../architecture/context-bus.md): full detail for where you are, awareness of the rest.

**Presentation (responsive).** On desktop (≥ `md`) the dock is a round gold-ringed button at the bottom-right that opens a dark panel beside the work. On mobile (< `md`) there is no floating button: the Coach is a **tab in the bottom navigation bar**, and tapping it slides a full-width chat sheet up over the surface (tap again to dismiss). Both presentations are the same conversation driving one shared open state (lifted into `AppShell`), so the panel and the thread are identical regardless of viewport. See [`../../design/screens.md`](../../design/screens.md) §The docked Coach.

The person talks; the Coach acts. He says "put a node for moving to Lisbon on the board," and a node appears, without him touching the board. He says "push my marathon goal to the fall," and the goal moves. He says "this matters to me," and it lands in the Core. He never navigates to do these things; the Coach **acts from far away**, on whatever surface owns the change, and tells him what it did.

It is the same Coach **on-platform** (docked, in conversation, the live single-turn reply that exists today) and, later, **off-platform** (the tether: it reaches out when it has something specific and true to say, leveraging everything it knows, never on a generic schedule). See "earned interruption only" in [`../concept-and-soul.md`](../concept-and-soul.md).

Beneath the conversation it runs the **core-curator** role: continuously internalizing board, journal, and sessions, filtering signal into the Core, and bringing contradictions back to the person to decide. It never silently overwrites who he is.

**BUILT (thin):** a single-turn `coach.ask` reply, grounded in the Mirror plus the current surface, with the user's tone setting. It can describe a board edit but cannot yet place it.

**PROPOSED:** the multi-turn loop, the tool registry (acting from far away), persistence to `threads`/`messages`, the curation pass, drift detection, and the off-platform tether.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| `ask` (single-turn reply) | user sends a message | assembles Mirror + surface fragments, replies once, grounded and toned | Coach | reads `mirror`, `nodes`/`surfaces`, `settings` · **BUILT** |
| multi-turn loop | a conversation turn | maintains a running exchange with tool calls between turns until the turn resolves | Coach | `threads`, `messages` · **PROPOSED** |
| persist conversation | any turn | appends `messages { role, content, toolCalls? }` under a `thread` | Coach | owns `threads`, `messages` · **PROPOSED** |
| act from far away | the model decides a tool is needed | invokes a registered tool (board edit, goal change, capture, vision add, calendar reconcile) on the surface that owns it; records the call on `messages.toolCalls` | Coach | writes via the owner element's mutation; logs to `messages.toolCalls`, `interactions` · **PROPOSED** |
| capture on your behalf | the Coach hears something worth keeping | writes a `capture` with `source: "agent"`, distilled async, may become a node | Coach | `captures` (`source: "agent"`) · **PROPOSED** |
| curate the Core | meaningful event or periodic pass | internalizes board + journal + sessions through a hard filter; re-synthesizes `mirror`, bumping `version`; logs a `coach.curation` event | Coach | reads all streams; writes `mirror`, `interactions` · **PROPOSED** |
| surface a contradiction | curation finds new data conflicting with the held Core | brings the conflict to the person and waits for his decision; does not overwrite | Coach (person decides) | reads `mirror`/streams; writes nothing until resolved · **PROPOSED** |
| detect drift | curation/alignment pass | compares recent Sessions and calendar against the north star and Goals; names the gap, hands back the next small move | Coach | reads `mirror`, `sessions`, `goals`; emits one move · **PROPOSED** |
| off-platform tether | the Coach has something true to say | reaches out off-app with a specific, earned message | Coach | reads everything; writes a `message` · **PROPOSED** |
| set tone | user changes a setting | adjusts how every reply is phrased | Manual | reads `settings.coachTone` · **BUILT** |

## 4. Dynamics and interactions with other elements

The Coach **owns** little (`threads`, `messages`) and **draws** everything, per the ownership-vs-draws split in [`../../architecture/context-bus.md`](../../architecture/context-bus.md). It holds no copy of any element's data; it reads through the assembler at act-time and writes back through each owner's own mutation.

- **Draws** the [Context Bus](../../architecture/context-bus.md) assembler: full detail for the current surface (`selection`/`viewport`/`surface`) plus awareness of both streams (`core`, `sessions`). It is the one consumer that draws *everything*.
- **Acts on** the surface that owns each change: a board edit goes through the Vision Board's node/edge mutations; a goal change through Pillars & Goals; a capture through `captures`. The Coach never owns those tables; it operates them from far away and records the act on `messages.toolCalls`.
- **Curates the Core.** The Coach is the curator that turns accumulated `interactions` into a re-synthesized `mirror`. This is the core-curation pass referenced in [`../../architecture/context-bus.md`](../../architecture/context-bus.md). The Core owns `mirror`; the Coach is the only writer that reshapes it, and only through the hard filter (surface conflicts, never overwrite).
- **Publishes** `coach.curation` (and `capture` with `source: "agent"`) to the `interactions` log, so its own acts become shared context like any other element's.
- **Shapes nothing it cannot see:** the [Guide](../../architecture/elements-and-context.md) renders the Core read-only; the Coach is what keeps that Core current.

Text is the shared currency throughout: the Coach blends distilled text, never raw images, and writes distilled text back.

## 5. States

- **Empty / new person.** Almost no Core or Sessions yet. The single-turn reply is welcoming and curious rather than grounded (the BUILT behavior). No threads.
- **In conversation (single-turn, BUILT).** Each `ask` is stateless beyond the `history` passed in; nothing persists.
- **In conversation (multi-turn, PROPOSED).** A live `thread` with ordered `messages`, some carrying `toolCalls`, open until the turn resolves.
- **Acting.** A tool call is in flight; the change is being written on the owning surface; the result is recorded back on the message.
- **Curating.** A core-curation pass is running over accumulated interactions; may finish by bumping `mirror.version` or by raising a contradiction.
- **Conflicted.** Curation found a contradiction; the Core is held as-is and the question is parked with the person. Nothing overwrites until he decides.
- **Tethering (PROPOSED).** Off-platform; quiet unless it has something specific and true, then one earned reach-out.

## 6. Edge cases

- **Conflicting signal.** New data contradicts the held Core. The Coach never silently overwrites; it surfaces the contradiction and the person decides (the hard rule from [`../concept-and-soul.md`](../concept-and-soul.md)).
- **Empty space.** Nothing to ground on. The Coach stays welcoming and asks rather than inventing a Core.
- **Tool fails or is ambiguous.** A from-far-away act cannot complete (target gone, request unclear). The Coach reports what it could not do instead of guessing; the `toolCall.result` records the failure.
- **Budget overflow.** Too much context for the character budget. The assembler drops low-priority fragments knowably (see [`../../architecture/context-bus.md`](../../architecture/context-bus.md)); the Coach acts on awareness, not full detail, for the dropped slices.
- **Over-reaching.** The tether risks bombarding. "Earned interruption only" governs: no message without something specific and true. Silence is the default.
- **Unauthenticated / cross-tenant.** Every read and write gates on `getAuthUserId`; the Coach can only ever see and touch one user's space.
- **Offline (off-platform, PROPOSED).** The tether queues its one earned message rather than firing blind.

## 7. AI involvement

The Coach is the most model-centric element. The model is in the loop for the reply itself, for deciding when to act (tool selection), for the curation hard filter, and for drift detection.

- **Reply (BUILT).** `coach.ask` builds a system prompt from the assembled context (Mirror + surface) and the user's `coachTone`, then calls the chat model through the dual-provider client (see [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md) and the live `convex/ai/openai.ts`). It draws context; it does not yet write anything back.
- **Acting (PROPOSED).** The model is given a tool registry; when it calls a tool, the loop runs the owner element's mutation and feeds the result back. Calls are recorded on `messages.toolCalls`.
- **Curation (PROPOSED).** A pass internalizes board + journal + sessions and re-synthesizes `mirror.structured` through the hard filter, emitting `coach.curation` and raising contradictions instead of overwriting.
- **Drift (PROPOSED).** The model compares recent Sessions and calendar against the north star and Goals and returns one next small move.

What it draws: both streams plus the current surface, budgeted. What it writes: `messages`, `mirror` (curation), `captures` (`source: "agent"`), and `interactions` events.

## 8. Data touched

Owned vs drawn, per [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Owns:**
- `threads { userId, title, createdAt }` (live, reserved).
- `messages { userId, threadId, role: user|coach, content, toolCalls?[{tool,args,result?}], createdAt }` (live, reserved). `toolCalls` is how the Coach records acting from far away.

**Writes through other owners (from far away, PROPOSED):**
- `mirror.structured` (Core) on a curation pass, bumping `version`.
- `captures` with `source: "agent"` when capturing on your behalf.
- `nodes`/`edges`, `goals`, `futureSelf` via each element's own mutation when acting.

**Draws (reads at act-time, never holds):**
- `mirror` (the Core stream), `sessions` (the Sessions stream), the current surface (`surfaces`/`nodes`/`edges`), `goals`, `settings` (for `coachTone`), and the `interactions` log.

## 9. Open questions

- **Tool registry surface.** Is each element's Coach-callable action a thin wrapper over its existing mutation, or a dedicated agent-facing tool layer? (Leaning: thin wrappers, so ownership stays stark.)
- **Curation cadence.** Every meaningful event, a periodic pass, or both? What counts as "meaningful" enough to re-synthesize the Core.
- **Drift threshold.** How much gap between calendar/sessions and the north star earns a surfaced move, without becoming nagging.
- **Tether channel and trigger.** Where the off-platform message lands (push, message, email) and the exact bar for "specific and true." Tied to `settings.reachingOut`.
- **Thread scoping.** One rolling thread per person, or threads scoped per surface (e.g. a board build-chat)? See the same open question in [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md).
