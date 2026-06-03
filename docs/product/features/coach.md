# Feature: The Coach (Conversational Guide)

**Summary:** One AI presence, available on every surface, that holds the context of what you're looking at *plus* global context about you (the Mirror), reasons in a real multi-turn loop, and acts across any surface — on-platform now and (v1.5) off-platform — so you talk and it operates the space.
**Status:** 🟡 outline → expanding toward ✅ specified
**Phase:** v1 · Plan 2 (on-platform agent) · off-platform tether → v1.5
**Surfaces:** Global — a floating presence + panel on every surface, and a dedicated conversation surface (threads). The Coach is *not* a surface itself; it is the actor that reads from and writes to all surfaces via the [Context Bus](../../architecture/context-bus.md).
**Related:** [`../concept-and-soul.md`](../concept-and-soul.md) · [`../prd.md`](../prd.md) (§4, F2) · [`../../architecture/context-bus.md`](../../architecture/context-bus.md) · [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) · [`mirror.md`](mirror.md) · [`guide.md`](guide.md) · [`whiteboard.md`](whiteboard.md) · [`settings.md`](settings.md) · [`daily-ritual.md`](daily-ritual.md) · [`../../design/interaction-principles.md`](../../design/interaction-principles.md) · [`../../architecture/security-privacy.md`](../../architecture/security-privacy.md) · [`../../research/extraction/02-pillaros.md`](../../research/extraction/02-pillaros.md)

> **Naming (per [glossary](../glossary.md)):** **Coach** = the single AI agent/presence described here. **The Guide** = the readable text-layer document surface ([`guide.md`](guide.md)) that the Coach can edit. **The Mirror** = the global context the Coach reads on every turn ([`mirror.md`](mirror.md)). This doc keeps the historical "Conversational Guide" subtitle but the noun for the agent is always *Coach*.

---

## 1. Purpose — why it exists
A lost person's problem is not a missing feature — it is that he can't ask himself the right questions and can't operate a system deep enough to actually hold his life. LifeGuide answers both with **one move: the human doesn't operate the app, he talks to the Coach, and the Coach operates the app.** ("Talk, don't operate" — [interaction principle 3](../../design/interaction-principles.md).)

This is how something deep stays simple. The Whiteboard, the Mirror, the Guide, pillars, goals — all of it has real depth, but the surface a person *touches* is a calm conversation with someone who already knows them. The Coach is the concierge through which the whole space is eventually lived: the single point of contact that makes a multi-surface, context-aware platform feel like one warm room with one familiar voice.

It serves the mission three ways:
- **It is the guide a lost man never had** — a sharp older friend who knows where he's trying to go and whether today still points there ([concept-and-soul](../concept-and-soul.md), "The Coach").
- **It is the alignment engine's mouth** — the surfaced form of the gap between the calendar and the vision (full engine post-v1; in v1 the Coach already reflects scatter/drift from what's on the board and in the Mirror).
- **It is the tether** — the same presence on-platform *and* off (v1.5), so the relationship survives the moment he closes the app. Proactive tethering out-retains wait-to-be-opened (~75% vs ~51%, [interaction-principles](../../design/interaction-principles.md)).

The deepest design claim: the Coach acts **"from far away."** You can be on the Whiteboard and say "add that to my goals," and it just happens on the Guide — no navigation, no mode switch. The Coach reaches into any surface and changes it, because every surface publishes its state and its tools to one bus. This single capability is why the Context Bus is non-negotiable: the whole "one Coach, every context, acts anywhere" promise depends on it ([concept-and-soul](../concept-and-soul.md), "What this means for the build").

## 2. User-facing behavior
**The presence.** A soft, persistent presence anchored bottom-right on *every* surface (not a separate destination you navigate to). Tapping it opens a calm panel — warm paper, generous space, no harsh chrome ([interaction principle 6](../../design/interaction-principles.md)). It never demands attention; it waits.

**Context-awareness made visible.** The panel's subtitle quietly reflects *what the Coach can currently see* — e.g. "looking at your board" on the Whiteboard, "looking at 3 selected nodes" when you have a selection, "looking at your Guide" on the Guide. This makes the otherwise-invisible Context Bus legible: the user *feels* that it knows what's in front of him. (It always also has the Mirror; the subtitle names the *local* scope because that's the part that changes.)

**The first message.** Opening an empty thread is never a blank box. The Coach opens context-aware: on a populated board it might note a pattern it sees; on the Guide it might reflect the north star back; on a fresh account it greets simply and asks one small thing (progressive disclosure — [principle 5](../../design/interaction-principles.md)). One thing, never a wall of text.

**The happy path, narrated.** A man is on his Whiteboard with twenty scattered nodes. He opens the Coach and types: *"this is a mess — what do you actually see here?"* The Coach, already holding the whole board (surface scope) plus what it has learned about him (Mirror), replies with the two or three real themes — *"Three of these keep circling money-as-freedom; two are about your father."* He says *"group them like that and hide the rest."* The Coach calls board tools — arrange the money cluster, arrange the father cluster, hide the noise — and the board rearranges itself under him *while he watches*. He says *"the freedom one — make that a goal."* The Coach writes a goal to the Guide (a different surface he isn't even looking at) and confirms it in one line. He never touched a menu. He talked; it operated.

**Earned, never spammy.** Unprompted, the Coach speaks at most ~1–2 times a day, and only when it has something *specific and true* — never a generic "how's it going?" ([principle 4](../../design/interaction-principles.md)). Its proactivity, tone, and reach are all governed by [Settings](settings.md) (Gentle ↔ Direct; Leave-me ↔ Often; quiet hours respected absolutely).

**Tone.** A sharp older friend: direct, warm, unhurried. Never therapy-speak ("I hear you"), never hype ("crush it"), never filler encouragement ([interaction-principles](../../design/interaction-principles.md), Tone).

## 3. Functions & actions (exhaustive)
The Coach has two kinds of action: **its own conversational/agentic capabilities** (things only the Coach does — reason, reflect, decide), and **every surface tool in the registry** (the union of all "Via Coach" actions documented per-surface; the Coach can invoke any of them). Both are listed so this table is the single complete picture of what the Coach can do.

**Legend.** *Manual* = can the user trigger the same effect by hand on the relevant surface? *Via Coach* = the Coach can do it through the agent loop. *Surface* = which surface's provider owns the tool. Rows marked *(agent)* are Coach-intrinsic and have no manual equivalent.

### 3a. Coach-intrinsic capabilities (no surface tool — the agent itself)
| Action | Manual | Via Coach | Surface | What it does | Data effect |
|---|---|---|---|---|---|
| Hold a conversation | n/a | ✓ *(agent)* | global | Multi-turn chat in a thread, always over assembled context | insert `messages` (role `user`/`coach`) |
| Assemble context | n/a | ✓ *(agent)* | global | First step every turn: `assembleContext(activeSurface, intent)` (selection▸viewport▸surface▸Mirror, budgeted) | read-only across surfaces + `mirror` |
| Answer about the board/Guide/self | n/a | ✓ *(agent)* | global | Reflective + factual Q&A grounded in context ("what do you see here?", "what did I say I wanted?") | read-only |
| Surface a pattern | n/a | ✓ *(agent)* | global | Names recurring themes/tensions across nodes + Mirror ("three cards touch the ocean") | read-only (may write a Mirror delta) |
| Reflect / hold the long view | n/a | ✓ *(agent)* | global | Connects today's input to who he's becoming; the daily-ritual whisper | read `mirror`; may insert `interactions` |
| Decide *whether* to act | n/a | ✓ *(agent)* | global | Chooses talk-only vs tool-use; asks before destructive/ambiguous ops | none |
| Run the multi-turn tool loop | n/a | ✓ *(agent)* | global | model → tool calls → execute → feed results back → re-call until done (cap ~5) | per tool below |
| Report tool results | n/a | ✓ *(agent)* | global | Folds `{success,message,…richData}` into a natural reply (+ optional rich UI) | read tool returns |
| Earned proactive nudge | n/a | ✓ *(agent)* | global | Unprompted message when it has something specific/true (≤~1–2/day, gated by Settings + quiet hours) | insert `messages`; insert `interactions` |
| Crisis hand-off | n/a | ✓ *(agent)* | global | Detects crisis → refers to a human/helpline; **non-overridable** safety rule | insert `messages` (flagged); no autonomous external action |
| Off-platform outreach *(v1.5)* | n/a | ✓ *(agent)* | global | SMS/push the tether message when off-app, honoring channels + quiet hours | insert `messages`; write channel log — see [`off-platform-coach.md`] |

### 3b. Whiteboard tools (full set in [`whiteboard.md`](whiteboard.md) §3)
| Action | Manual | Via Coach | Surface | What it does | Data effect |
|---|---|---|---|---|---|
| Create node (text/quote/image/link) | ✓ | ✓ | whiteboard | Adds a card (smart-positioned if no coords) | insert `nodes` (+`_storage` for media) |
| Edit node text | ✓ | ✓ | whiteboard | Updates card content | patch `nodes.text` |
| Move / arrange node(s) | ✓ | ✓ | whiteboard | Repositions one or many (grid/cluster/radial) | patch `nodes.position` (batch) |
| Group / arrange by theme | ✓ | ✓ | whiteboard | Lays a set into thematic clusters | patch many `nodes.position` |
| Hide / show by filter | ✓ | ✓ | whiteboard | Visually filters (e.g. by pillar/theme) | client state |
| Delete node | ✓ | ✓ | whiteboard | Soft-deletes node + its edges | `nodes.isActive=false` |
| Connect nodes (labeled) | ✓ | ✓ | whiteboard | Labeled, cycle-checked edge | insert `edges` |
| Label / relabel / remove edge | ✓ | ✓ | whiteboard | Sets/changes/deletes a connection | patch/delete `edges` |
| Place from Inbox | ✓ | ✓ | whiteboard | Turns a capture into a placed node | insert `nodes`, patch `captures.placedAt` |
| Generate an image node | ✓ (opt-in) | ✓ | whiteboard | Creates an image card from a prompt | insert `nodes`(generated_image) +`_storage` |
| Summarize the board | n/a | ✓ | whiteboard | Reads `surface` scope, returns a synthesis (no mutation) | read-only |

### 3c. Guide / Mirror / goals tools (see [`guide.md`](guide.md), [`mirror.md`](mirror.md))
| Action | Manual | Via Coach | Surface | What it does | Data effect |
|---|---|---|---|---|---|
| Co-write / re-anchor north star | ✓ (Guide) | ✓ | guide | Proposes/refines the single named direction; **never unilateral** — confirmed by user | patch north-star record in `mirror`/`goals` |
| Add / edit / check off a goal | ✓ (Guide) | ✓ | guide | Creates or updates a typed goal under a pillar | insert/patch `goals` |
| Edit a Guide element | ✓ (Guide) | ✓ | guide | Edits a pillar truth / noticed-theme line conversationally | patch `mirror`/`goals` |
| Correct the Mirror | ✓ (Guide) | ✓ | mirror | Writes a user-confirmed correction ("that's not true of me") | patch `mirror.structured` |
| Tag against a pillar | ✓ | ✓ | global | Associates a node/goal with one or more pillars | patch `pillars[]` on target row |
| Add a pillar from presets | ✓ (Settings) | ✓ | pillars | Adds a preset/custom pillar | insert `pillars` |
| Write an observation (Mirror delta) | n/a *(agent)* | ✓ | mirror | Logs a noticed value/theme/fear as a delta (async, never blocks) | insert `interactions` → `mirror` |

### 3d. Settings / ritual tools (see [`settings.md`](settings.md), [`daily-ritual.md`](daily-ritual.md))
| Action | Manual | Via Coach | Surface | What it does | Data effect |
|---|---|---|---|---|---|
| Adjust tone / cadence | ✓ (Settings) | ✓ | settings | "Be gentler with me" → updates Coach tone/intensity | patch `settings.coachTone`/`alerts` |
| Set quiet hours / channels | ✓ (Settings) | ✓ | settings | Changes when/how the Coach may reach out | patch `settings.alerts` |
| Configure the daily exercise | ✓ (Settings) | ✓ | settings | Switch the morning/evening prompt type | patch `settings.dailyExercise` |
| Run a daily check-in prompt | ✓ (Today) | ✓ | daily-ritual | Generates the morning direction / evening reflection prompt | read `mirror`; insert `interactions` |

> **The bar:** every "Via Coach" cell above is *also* a row in that surface's own feature doc — there is exactly one definition of each tool, owned by its surface, and the Coach gains it for free by the surface registering it (see §4, tool registry). When a new surface (Vision Board, Journaling) ships, its tools appear here automatically with **no Coach code change.**

## 4. Dynamics & interactions
The Coach is the consumer end of the Context Bus and the executor of the tool registry. Everything below is *how it is wired*, grounded in [`context-bus.md`](../../architecture/context-bus.md) and the corrected PillarOS loop in [`02-pillaros.md`](../../research/extraction/02-pillaros.md).

### 4a. Context Bus — what it reads
**Every turn begins with assembly.** Before any model call the server runs `assembleContext(activeSurface, intent)`, which stitches the [four scopes](../../architecture/context-bus.md#the-four-scopes-priority-high--low) in priority order and fits them to a token budget:

```
assembleContext(activeSurface, intent) =
    activeSurface.snapshot("selection")     // full detail, top priority
  + activeSurface.snapshot("viewport")      // full detail
  + activeSurface.snapshot("surface")       // summarized if large
  + otherSurfaces.map(s => s.summary())     // compact awareness
  + Mirror.assemble(intent)                 // global, budgeted (cached)
  → fit to budget (keep selection/viewport whole, summarize surface, compact Mirror)
```

- **Server-side, rebuilt from source every call.** The Coach never trusts client-passed context; the assembler refetches from Convex each turn (the security + freshness win PillarOS got right, [`02-pillaros.md` §1b](../../research/extraction/02-pillaros.md), §11). The client sends only the message + `activeSurface` + optional `selection` ids.
- **Tiered detail.** Full fidelity where the user *is* (selection/viewport of the active surface), compact summaries for every other surface. This is the generalization of PillarOS's `generateBoardContext()` from one board to all surfaces, and it fixes PillarOS's "stuff the whole board in untruncated" cost flaw ([`02-pillaros.md` §2](../../research/extraction/02-pillaros.md)).
- **Semantic retrieval for the long tail.** When something off-screen is relevant, the Mirror slice is pulled by embedding similarity, not by dumping everything ([context-bus principles](../../architecture/context-bus.md#principles-baked-from-extraction)).
- **IDs are first-class.** Snapshots are resolved, ID-first JSON, so the Coach references *real* node/goal IDs in tool calls — no fuzzy matching (the key reason PillarOS tool calls worked, [`02-pillaros.md` §2](../../research/extraction/02-pillaros.md)).
- **Reactive.** Convex keeps every scope current the instant anything changes, including changes the Coach itself just made.

### 4b. Tool registry — what it can do
Each surface implements `SurfaceContextProvider` and contributes `tools(): ToolDef[]` ([context-bus](../../architecture/context-bus.md#the-provider-interface)). The Coach's available toolset is the **union of all registered surfaces' tools** (optionally filtered/ranked by the active surface for relevance and token budget). Concretely, the rebuild replaces PillarOS's single-file `if/else` dispatch with a **typed per-surface registry** ([`02-pillaros.md` §3c](../../research/extraction/02-pillaros.md)):

```ts
type Tool = {
  name: string; description: string;     // description doubles as the model's usage instruction
  schema: ZodSchema;                       // provider-agnostic (OpenAI tool / JSON-schema)
  surface: "whiteboard" | "guide" | "mirror" | "settings" | "global";
  execute: (ctx, args, userCtx) => Promise<ToolResult>;   // ToolResult = { success, message, ...richData }
};
```

- **Rich-data return contract (kept verbatim from PillarOS).** Tools return more than `{success,message}`: e.g. a board summary returns the themes, an alignment-style reflection returns a scored breakdown. The Coach can fold these into prose *and* the panel can render interactive UI (scorecards, lists with action buttons) — "a tool can drive UI, not just data" ([`02-pillaros.md` §3](../../research/extraction/02-pillaros.md)).
- **"From far away."** To act on a surface the user isn't on, the Coach calls that surface's `resolve(query)` for full current state, runs the registered tool → Convex mutation → reactive sync to wherever that surface renders ([context-bus, cross-surface action](../../architecture/context-bus.md#cross-surface-action-from-far-away)). User on the Whiteboard → "add a goal to the Guide" → it just happens.
- **Tool-as-nested-agent.** Some tools (e.g. "reflect on my board/journal") themselves call the model — a sub-agent — mirroring PillarOS's `check_alignment` precedent ([`02-pillaros.md` §3](../../research/extraction/02-pillaros.md)). These are budgeted carefully (see §7).

### 4c. The agent loop — a REAL multi-turn loop (the central fix)
**This is the single most important correction from the extraction.** PillarOS's loop is **single-pass / one-shot tool use**: one model call → execute N tool calls → return to client. Tool results are *never fed back to the model* — it cannot see whether `create_item` succeeded, cannot chain "search then update," cannot self-correct. The "loop" there is cosmetic client-side text-appending ([`02-pillaros.md` §1, CRITICAL GAP](../../research/extraction/02-pillaros.md)). **LifeGuide rebuilds this as a genuine ReAct-style loop** (PRD F2; roadmap Plan 2):

```
loop (cap ~5 iterations):
  1. model call  (system = assembled context + behavioral contract; tools attached)
  2. if no tool calls → return the assistant message  (done)
  3. execute each tool call → collect { success, message, ...richData }
  4. append results as tool-role messages back into the conversation
  5. go to 1   (the model now SEES outcomes and can chain / correct / continue)
```

On the OpenAI stack this is native: assistant `tool_calls` → `role:"tool"` result messages → re-invoke until the model returns a plain message ([`02-pillaros.md` §1c](../../research/extraction/02-pillaros.md)). This is what lets the Coach do real work: *"find the nodes about money, cluster them, and turn the strongest one into a goal"* requires search → observe results → arrange → observe → write goal — impossible in a single pass. The **iteration cap (~5)** bounds cost and prevents runaway loops; hitting the cap returns the best partial result with an honest note (see §6).

### 4d. The Mirror — what it writes
- **Reads:** the Mirror is included (budgeted, **cached** — the biggest cost lever, [ai-layer](../../architecture/ai-layer.md)) in *every* Coach call as the global scope.
- **Writes deltas, never prose-into-a-blob.** When a turn reveals something durable (a value, a fear, a recurring theme, a north-star candidate), the Coach emits a **delta** via `interactions` → async Mirror update ([mirror](mirror.md) §4). It never edits the Mirror inline mid-turn or blocks the UI on it. This deliberately avoids PillarOS's monotonic single-text-blob memory that re-sends everything every call and eventually overflows the window ([`02-pillaros.md` §5](../../research/extraction/02-pillaros.md)).
- **Co-authors the north star.** The Coach proposes and refines the north star but **never sets it unilaterally** — the user confirms; it's a draft, not a verdict ([guide](guide.md), [mirror](mirror.md)).

### 4e. Other surfaces & features
- **Whiteboard:** the Coach's most tool-rich surface; reads its three local scopes and can perform any board action "from far away" ([whiteboard](whiteboard.md) §4).
- **The Guide:** the readable form of what the Coach learns; the Coach edits it conversationally (goals, north star, pillar truths) ([guide](guide.md)).
- **Intake & Distillation:** the Coach can *trigger* a capture (e.g. "save this") which enters the same distill pipeline as manual capture — the modality never forks the intelligence layer ([intake-distillation](intake-distillation.md); [`02-pillaros.md` §4d/§6d](../../research/extraction/02-pillaros.md)).
- **Daily ritual:** the Coach generates the morning direction / evening reflection prompt from Mirror context and may add one earned whisper ([daily-ritual](daily-ritual.md)).
- **Settings:** governs the Coach's tone, proactive intensity, quiet hours, and (v1.5) off-platform channels — and these are themselves adjustable *by talking to the Coach* (§3d). Hand-off rules are the one thing Settings can **not** override ([security-privacy](../../architecture/security-privacy.md)).
- **Pillars:** the Coach tags content against pillars and can add presets; pillars are typed so the Coach can reason over them ([pillars](pillars.md)).

### 4f. On-platform now, off-platform (the tether) v1.5
The Coach is **the same presence on- and off-platform** ([concept-and-soul](../concept-and-soul.md), "The Coach"). In v1 it lives in-app. In v1.5 it keeps a **tether**: it can reach out over SMS/push when the user is on the go, leveraging everything it knows, and an inbound reply re-enters the same agent loop and context assembly — it's the same brain, a different channel. The **alerts/treatment/quiet-hours model is built in v1** ([settings](settings.md)) so the channel can light up later with no schema churn; the channel itself ships in v1.5 ([`off-platform-coach.md`], roadmap v1.5). Crucially this is *earned interruption* extended off-app: still ≤~1–2/day, still quiet-hours-absolute, still only when specific and true.

## 5. States
- **Idle (collapsed presence).** The floating presence sits quietly; subtitle reflects the current local scope. No activity, no demand.
- **Empty thread (first message).** Never a blank box — the opening message is context-aware (board pattern / Guide reflection / simple greeting for a fresh account). One thing.
- **Thinking.** A calm indicator while the model call(s) run; the panel does not thrash. If the loop iterates (tool → re-call), the state persists smoothly rather than flickering per iteration.
- **Acting (tool running).** When a tool mutates a surface, the change appears *on that surface reactively* (even if it's not the visible one). On the active surface the user watches it happen; off-surface, a one-line confirmation names what changed and where.
- **Reporting.** Results are folded into a natural reply; rich returns may render an inline card (themes, a goal confirmation, a scored reflection).
- **Reaching-out (proactive).** An earned, unprompted message — gated by Settings intensity + quiet hours, ≤~1–2/day. Visually identical to a normal Coach message; never an alarm.
- **Handed-off (referral).** On crisis detection the Coach shifts to a careful, human-referral message and stops tool-acting on that thread; non-overridable.
- **Off-platform (v1.5).** The same Coach delivering/receiving over SMS/push; inbound replies resume the in-app thread/context.
- **Loading / syncing.** Context assembles server-side per call; Convex applies any mutations optimistically and reconciles across devices. The panel never blocks on the Mirror (deltas are async).
- **Error / degraded.** Model or tool failure surfaces honestly in-line (see §6); the underlying surfaces remain fully usable by hand.

## 6. Edge cases & failure modes
- **Crisis / safety hand-off.** If the conversation indicates crisis or self-harm, the Coach refers to a human/helpline and ceases autonomous action on that thread. This rule is **non-overridable by Settings or by the user's tone preference** ([security-privacy](../../architecture/security-privacy.md), [settings](settings.md) §7). Documented as a hard behavioral-contract "Never."
- **Ambiguous request → ask, don't guess.** If intent or target is unclear ("move that" with no selection; "the money one" when three match), the Coach asks a single clarifying question rather than mutating the wrong thing. Destructive ops (delete, hide-all, re-anchor north star) are confirmed before execution.
- **Tool failure → report + recover.** Because the loop feeds results back (§4c), a failed tool (`{success:false,message}`) is *seen* by the model: it reports the failure plainly, retries if sensible, or proposes an alternative — it never silently swallows an error or claims a change that didn't land.
- **Loop cap reached.** If the task needs more than ~5 iterations, the Coach stops, returns the best partial result, and says so honestly ("I got the first two grouped; want me to keep going?"). No infinite loops, bounded cost.
- **No / cold context (fresh account).** With an empty Mirror and empty board, the Coach degrades to a warm, generic-but-honest opener and asks for one small input — it does not fabricate knowledge of the user ([mirror](mirror.md) §6 "still learning").
- **Stale / racing context.** Context is rebuilt from the DB each turn, so a mutation by another device (or the Coach itself) is reflected on the next assembly; mid-loop, tool results (not the client) are the source of truth. Last-write-wins on positions; Convex reconciles ([whiteboard](whiteboard.md) §6).
- **Ambiguous "from far away" target.** If a cross-surface action names a surface/object that doesn't resolve, `resolve()` returns empty and the Coach asks rather than creating a stray object.
- **Hallucinated IDs / drift.** Mitigated by ID-first resolved snapshots; if the model references an ID not in context, the tool rejects it and the failure feeds back for self-correction (vs PillarOS, which had no feedback path).
- **Rate / cost limits.** The server boundary is where runaway cost dies — log, throttle, abort ([ai-layer](../../architecture/ai-layer.md)). The Mirror is cached; the cheap tier is default; nested-agent tools are budgeted. A throttled turn degrades gracefully with a clear message, never a crash.
- **Proactivity conflicts.** "Often" intensity + wide quiet hours → **quiet hours win, absolutely** ([settings](settings.md) §6). The ≤~1–2/day ceiling holds regardless of intensity.
- **Privacy / over-reach.** The Coach reads the most intimate data a person owns; it acts only within the user's tenant (every query gates on `userId`), never shares, and the Mirror it relies on is user-correctable ([security-privacy](../../architecture/security-privacy.md)).
- **AI fully down.** The Coach is unavailable but **every surface remains fully operable by hand** — manual manipulation never depends on the model ([ai-layer](../../architecture/ai-layer.md), Degradation; [interaction principle 3](../../design/interaction-principles.md)). The panel says so plainly.
- **Multi-device / multi-thread.** Threads and messages are user-isolated and reactive; a conversation continued on another device picks up the same context. Concurrent Coach actions reconcile via Convex.

## 7. AI involvement
- **The central agent process** (`gpt-4o` family) — the Coach itself, in `convex/ai/coach.ts` (Plan 2). It runs the real multi-turn loop (§4c) with the assembled context + tool registry attached ([ai-layer](../../architecture/ai-layer.md)).
- **Behavior is configured, not hard-coded.** A Coach configuration declares its **voice + behavioral contract (the Always/Never list) + cadence**, assembled into the system prompt alongside the budgeted context. This lives in the central [`AI_PROCESSES`-style config hub](../../architecture/ai-layer.md) (one file owns model, params, prompts per process — the single best structural idea from PillarOS, [`02-pillaros.md` §7](../../research/extraction/02-pillaros.md)), with a `provider` field so the model is swappable. Pluggable later as **Coach Playbooks** (roadmap, "Later").
- **Models / cost profile** ([ai-layer](../../architecture/ai-layer.md), Cost discipline):
  - **Cache the Mirror** — read on every Coach call; the single biggest cost lever.
  - **Tiered context** — full where the user is, summaries elsewhere; enforced token budget (vs PillarOS's untruncated dump).
  - **Cheap tier by default;** higher tier only for high-stakes calls (north-star ceremony, Mirror compaction).
  - **Nested-agent tools** (reflect/summarize) are themselves model calls — budgeted and used sparingly.
  - **Server boundary** is where cost is logged, throttled, aborted.
- **Adjacent processes the Coach orchestrates but does not own:** distillation (gpt-4o-mini, JSON mode — [intake-distillation](intake-distillation.md)), embeddings (`text-embedding-3-small`, for semantic Mirror/board retrieval), Mirror compaction (higher tier, batched — [mirror](mirror.md)), transcription (Whisper, Plan 3 audio → nodes).
- **Graceful degradation:** if the model is down the Coach is unavailable but no surface breaks (§6); transient failures retry; the loop's feedback path means in-flight tool errors are recovered rather than hidden.
- Full config, prompt texts, per-process params, and the behavioral-contract assembly: [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md).

## 8. Data touched
- **Owns:** `threads` (Coach conversations), `messages` (`role: "user"|"coach"`, `content`, `toolCalls[]?`) — Plan 2 ([data-model](../../architecture/data-model.md)).
- **Reads every call:** `mirror` (global context, cached) + whatever each active/other surface's `snapshot()`/`resolve()` exposes (read-only assembly across `nodes`, `edges`, `captures`, `goals`, `pillars`, `settings`).
- **Writes via deltas:** `interactions` (the event log → async Mirror updates) and, through compaction, `mirror.structured` + `mirror.summary` + `version`.
- **Mutates via tools (indirect):** any table a registered tool targets — `nodes`, `edges`, `_storage`, `captures.placedAt`, `goals`, `pillars`, `mirror` (north star / corrections), `settings` (tone/cadence/quiet-hours/exercise). The Coach itself owns no surface table; it acts *through* surface tools.
- All access is user-isolated (`userId` gate on every query/mutation; no cross-tenant reads — [security-privacy](../../architecture/security-privacy.md)). Authoritative schema: [`../../architecture/data-model.md`](../../architecture/data-model.md).

## 9. Reuse & build notes
**From PillarOS — reuse the shape, fix the flaws** ([`02-pillaros.md`](../../research/extraction/02-pillaros.md)):
- **Context-injection mechanic** — generalize `generateBoardContext()` from one pillar's board to the multi-surface `assembleContext()` (tiered + budgeted + RAG memory). *Reuse the philosophy 1:1* (resolved JSON, IDs first-class, layout/structure included, optional scoping); *rebuild the implementation* as a multi-surface aggregator ([`02-pillaros.md` §2c](../../research/extraction/02-pillaros.md)).
- **Server-side, DB-rebuilt context every call** — port verbatim (`agent.ts:88-98` pattern). Security + freshness in one move.
- **Tool registry + rich-data return contract** — keep the `{success, message, ...richData}` contract exactly; **rebuild dispatch** as a typed per-surface registry instead of the single-file `if/else` switch (`tools.ts:388-910`) so surfaces are plugins ([`02-pillaros.md` §3c](../../research/extraction/02-pillaros.md)).
- **`AI_PROCESSES` config hub** — port nearly verbatim; add a `provider` field. One file owns the Coach's model/prompt/params ([`02-pillaros.md` §7c](../../research/extraction/02-pillaros.md)).

**Rebuild (do not port):**
- **The agent loop → genuinely multi-turn.** PillarOS is single-pass with a cosmetic client-side "loop"; LifeGuide feeds tool results back as `tool`-role messages and re-invokes until done (cap ~5). On OpenAI this is the native `tool_calls`→`role:"tool"`→re-call pattern ([`02-pillaros.md` §1, §11C](../../research/extraction/02-pillaros.md)). **This is the headline rebuild.**
- **Move the model key server-side.** PillarOS leaked its Gemini key to the browser via the Live session (`vite.config.ts:14-15` → `PillarCreator.tsx:196`). All Coach AI runs in Convex actions; keys never reach the client; off-platform/voice channels use server-minted ephemeral tokens ([`02-pillaros.md`, Security gotchas](../../research/extraction/02-pillaros.md); [security-privacy](../../architecture/security-privacy.md)).
- **Memory → structured + indexed, not a blob.** The Coach relies on the Mirror, which is rebuilt as structured records + a compacted, versioned summary with semantic retrieval — never PillarOS's monotonic single-string memory ([mirror](mirror.md); [`02-pillaros.md` §5c](../../research/extraction/02-pillaros.md)).

**Gotchas to avoid (from extraction):**
- No fuzzy matching — always reference real IDs from resolved snapshots.
- Don't let nested-agent tools or an untruncated context blow the budget — enforce the token budget the assembler owns.
- De-Gemini the schemas/tool format on the way to OpenAI (Zod/JSON-schema, `tools`/`tool_calls`, structured outputs) — porting touches every AI file ([`02-pillaros.md`, Key gotchas](../../research/extraction/02-pillaros.md)).
- Plan: roadmap **Plan 2 — The Coach** (multi-turn loop, tool registry, context-assembler consumer, cross-surface action, Mirror compaction). Build sequence: [`../prd.md`](../prd.md) §10 (steps 0–3 are the spine the Coach sits on; step 6 is the Coach surface).

## 10. Open questions
- **Proactivity thresholds.** What concretely earns an unprompted nudge, and how the ≤~1–2/day ceiling interacts with intensity tiers — needs a crisp rule, candidate for an ADR.
- **"Selection from far away."** How a cross-surface selection/target is *expressed* in language and resolved by `resolve()` when the user can't point at it (granularity of selection context — open in [whiteboard](whiteboard.md) §10 too).
- **The behavioral contract's exact Always/Never list.** Drafted in spirit in [`concept-and-soul.md`](../concept-and-soul.md) and [`interaction-principles.md`](../../design/interaction-principles.md); the literal prompt-level list (with the non-overridable hand-off rule) needs to be finalized and versioned in the AI config.
- **Loop iteration cap.** Is ~5 right, or should it be task-class-dependent? Needs telemetry once built.
- **Coach surface vs. global panel.** Final UX for the dedicated conversation surface vs. the floating per-surface panel (one thread store, two entry points) — confirm in [`../../design/screens.md`](../../design/screens.md).
- **Tone implementation.** Slider vs. presets for Gentle↔Direct, and how strongly tone is allowed to bend the contract (never the safety rule) — shared open question with [settings](settings.md).
