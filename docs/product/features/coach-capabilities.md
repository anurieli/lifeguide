# The Coach Capability Registry

**Status:** partial · **Element of:** the spine · **Kind:** canonical registry (a contract, not a narrative)

> The single, always-current list of **everything the Coach can do** (its tools) and **everything the Coach can see** (its context). This file is the source of truth for the Coach's surface area. The narrative for *why* the Coach exists and how it behaves lives in [`coach.md`](coach.md); the exact shapes it touches live in [`../../architecture/data-model.md`](../../architecture/data-model.md). This file is the *inventory* both of those point at.

The Coach is the bread and butter of LifeGuide. It is the one presence that knows the person, chooses the right context on its own, and reaches into any surface to act. Because the Coach is defined by two lists — **what it can do** and **what it can see** — this registry keeps both lists explicit and honest, so that no capability drifts undocumented and so the MCP (below) can mirror them exactly.

---

## 0. The load-bearing principle: the Coach and the MCP are two faces of one capability surface

The Coach is LifeGuide's *internal* agent: it talks to the person inside the app. The **MCP** (Model Context Protocol adapter) is the *external* face of the same thing: it lets an outside agent do, on the person's behalf and with the person's authorization, what the Coach can do from inside.

**The two must stay at parity.** Whatever the Coach can *do*, the MCP exposes as a tool. Whatever the Coach can *see*, the MCP exposes as readable context. Neither side is a superset of the other by accident:

- Every **Action / Tool** in §2 is (or, when built, will be) an MCP tool of the same name, backed by the same owner mutation. External agents get **read + propose** by default, not unrestricted direct write (ADR 0028) — the "MCP" column records each tool's external default.
- Every **Context source** in §3 is (or will be) readable through the MCP via the *same shared Core/context service* the Coach reads through. No second database, no divergent copy (ADR 0028, `docs/research/context-artifacts-governance.md`).

Practically: this registry is the one place to change when a capability is added. Add a Coach tool here, note its MCP default here, and the MCP adapter has its spec. **If the two lists ever diverge, this file is wrong and must be fixed in the same change.**

> **Today:** No MCP server exists (it is deferred — ADR 0028 lands the shared Core service and API boundary first). The MCP columns below are the forward contract, so the parity is designed in from the start rather than retrofitted.

---

## 1. What the Coach is, in one breath

- **It knows you.** It draws the Core (who you are), your Sessions (your days), your goals, your pillars, and whatever surface you are on — and picks what matters without being told (§3).
- **It figures out what you want to work on.** From the surface you are on and what you say, it routes to the right part of the platform (§4).
- **It acts for you, from far away.** You talk; it operates the surface that owns the change — the board, a goal, the Core, a scroll — and tells you what it did (§2).
- **It keeps your Core honest.** It curates accumulated signal into the Core and surfaces contradictions for *you* to decide, never overwriting who you are silently (§2, curation).

---

## 2. Actions & Tools registry — what the Coach can *do*

Every action the Coach can invoke. **BUILT** = live in dev today. **PROPOSED** = specified, not yet built. "Owner mutation" is the surface that actually owns the write — the Coach never owns another element's data; it operates it from far away. "MCP default" is the capability an external agent gets once the MCP adapter exists.

| Action / Tool | What it does | Status | Owner mutation (where the write lands) | Data touched | MCP default |
|---|---|---|---|---|---|
| `ask` (single-turn reply) | Assembles context (§3), replies once — grounded, toned, concise. The conversation itself. | **BUILT** | `convex/coach.ts:22` `ask` | reads `mirror`, `pillars`, `goals`, current surface (`surfaces`/`nodes`/`edges`), `settings` | read |
| create goal | Detects a "make a goal" intent and creates it. | **BUILT** | `api.goals.createGoal` (via `convex/coach.ts:71`) | writes `goals` | propose |
| update goal | Detects an "update this goal" intent (deadline / name / why / pillar) and applies it. Model ids are never trusted — cross-checked against real ids in context. | **BUILT** | `api.goals.updateGoal` (via `convex/coach.ts:79`) | writes `goals` | propose |
| set tone | The person's tone setting reshapes how every reply is phrased. | **BUILT** (manual) | `settings` (`coachTone`) | reads `settings.coachTone` | read |
| persist conversation | Append `messages { role, content, toolCalls? }` under a `thread`, so the Coach has memory across turns. | **PROPOSED** | owns `threads`, `messages` (`convex/messages.ts`) | `threads`, `messages` | read |
| multi-turn tool loop | Maintain a running exchange with tool calls between turns until the turn resolves. The engine that makes every "act from far away" below possible. | **PROPOSED** | `convex/coach.ts` (loop) | `messages.toolCalls` | — |
| **add to the Core** (add an artifact, e.g. *your vision*) | "This matters to me" / "my vision is…" lands in the Core as an artifact/answer — the person's own words win. | **PROPOSED** | Core: `api.core.save` (Blueprint answer) / Living-Core artifact write (ADR 0028) | `coreResponses`, later Core artifacts/containers | propose |
| edit the vision board | "Put a node for moving to Lisbon on the board" → a node/edge appears, positioned, without the person touching the board. | **PROPOSED** | Vision Board node/edge mutations (`convex/nodes.ts`, `convex/edges.ts`) | `nodes`, `edges` | propose |
| add an image to the vision board | Generate or place an image node on the board on the person's behalf. | **PROPOSED** | `api.ai.imageGen.generateInto` + `nodes.finishGeneratedImage` | `nodes`, Convex file storage | propose |
| edit the daily scrolls (morning / nightly) | Adjust the Morning or Night ritual — add/remove/reorder a step (a "do", a roadmap line, a journal beat) for the person. | **PROPOSED** | Daily Ritual mutations (`convex/rituals.ts`, `roadmapEntries`) | `ritualItems`, `roadmapEntries`, `morningNotes` | propose |
| capture on your behalf | Hears something worth keeping, writes a `capture` with `source: "agent"`; distilled async, may become a node. | **PROPOSED** | `captures` (`source: "agent"`) | `captures` | propose |
| curate the Core | Internalize board + journal + sessions through a hard filter; re-synthesize `mirror`, bump `version`; log `coach.curation`. | **PROPOSED** | Core: `mirror` | reads all streams; writes `mirror`, `interactions` | — (internal) |
| surface a contradiction | Curation finds a conflict with the held Core → brings it to the person and waits. **Never overwrites.** | **PROPOSED** | none until the person decides | reads `mirror`/streams | read |
| detect drift | Compare recent Sessions + calendar against the north star and Goals; name the gap, hand back one small next move. | **PROPOSED** | emits one move | reads `mirror`, `sessions`, `goals` | read |
| off-platform tether | Reach out off-app when it has something specific and true to say — earned interruption only, never on a schedule. | **PROPOSED** | writes a `message` | reads everything | — |

**Cost note (BUILT):** every Coach text turn today is **two** model calls — an intent-classifier (`coachGoalIntent`, `gpt-4o-mini`, JSON mode) that decides whether a goal action is wanted, then the reply (`coachReply`, `claude-sonnet-5`). Accepted tradeoff, ADR 0029. When the multi-turn tool loop lands, the classifier folds into tool selection.

---

## 3. Context registry — what the Coach can *see*

The Coach chooses context on its own: it does not hold a copy of anything, it draws through the **Context Bus** assembler at act-time and lets a character budget decide what survives. Fragments are sorted by priority (higher wins) and kept whole until the budget is spent; the rest drop knowably. See [`../../architecture/context-bus.md`](../../architecture/context-bus.md) and the pure assembler at `convex/context/assemble.ts`.

**Live budget:** `coach.ask` passes a **6000-char** budget (`convex/coach.ts`).

| Context source | What it carries | Priority | Status | Read path | MCP-readable |
|---|---|---|---|---|---|
| Mirror ("About this person") | The distilled text layer behind the human: summary + values + themes. | 6 | **BUILT** | `api.mirror.assemble` (`convex/mirror.ts`) | yes |
| Goals & Aspirations | Current goals with their real ids (so actions target real rows). | 7 | **BUILT** | `api.goals.coachContext` (`convex/goals.ts`) | yes |
| Life pillars | Domain strengths (0–100) across the life pillars. | 5 | **BUILT** | `api.pillars.assembleContext` (`convex/pillars.ts`) | yes |
| Current surface | Full detail of where the person is right now (today: the Whiteboard's nodes/edges). | 8 | **BUILT** | `api.nodes.surfaceContext` (`convex/nodes.ts`) | yes |
| Tone | The person's `coachTone` preference, shaping phrasing. | — | **BUILT** | `api.settings.get` | yes |
| Conversation history | Last 8 turns of the exchange. | — | **BUILT** (passed in) | `api.messages.list` | yes |
| The Core / Life Blueprint | The fixed-18 Blueprint answers (incl. *vision*, values, role models). | — | **PARTIAL** (`coreResponses` exists; not yet a Coach fragment) | `api.core.get` (`convex/core.ts`) | yes |
| The Living Core (artifacts/containers) | The evolved Core: artifacts grouped in containers (ADR 0028). | — | **PROPOSED** | shared Core service | yes |
| Sessions stream | The person's days — journal/thought sessions. | — | **PROPOSED** as a Coach fragment | `convex/sessions.ts` | yes |
| Interactions log | The shared event stream every element publishes to. | — | **PROPOSED** as a Coach fragment | `interactions` | read |

The promise (from the Context Bus): **full detail for where you are, awareness of everything else.** As more surfaces publish `surfaceContext`, they slot into this table without changing the Coach — the Coach already draws *everything*; it is the one consumer that does.

---

## 4. Area detection — how the Coach knows what part of the platform you mean

The Coach routes work to the right surface from two signals:

1. **Where you are.** The docked Coach is handed the current `surfaceId` / `view`, so it knows which surface owns full-detail context right now (today, primarily the Whiteboard via `surfaceContext`; `CoachDock` carries static area labels for the rest). This is the "what are we working on" signal.
2. **What you say.** The reply/tool-selection model reads intent from the message against the visible context and picks the owning element — a goal request routes to Goals, a board request to the Vision Board, "this matters to me" to the Core (§2).

**Today (BUILT):** area awareness is the surface prop + the goal-intent classifier. **PROPOSED:** full tiered area detection across every surface, so "work on my mornings" reliably routes to the Daily Ritual, "add to my vision" to the Core, etc., each as a tool call.

---

## 5. The Core artifacts the Coach can add to

"Add an artifact to the Core, e.g. *your vision*" is the headline Coach-to-Core capability (§2, **PROPOSED**). The Core artifacts today are the **Life Blueprint** answers — one row per answered question in `coreResponses`, keyed like `s1q0` (`lib/blueprint.ts`). *Vision* is the first of these: Section 1 ("Crafting Your Persona") is literally *write out the vision for who you want to become*. Alongside sit values, role to embody, role models, and the rest of the fixed 18. The derived `mirror` is the text layer the Coach reads back.

The **Living Core** (ADR 0028) generalizes this to artifacts inside containers (with a featured "Personal Code"), which is the model the "add an artifact to your Core" language ultimately targets. Until it lands, "add to the Core" writes a Blueprint answer via `api.core.save`. Either way: **the person's words win, and a contradiction is surfaced, never silently overwritten.**

---

## 6. Provider wiring (for the acting/reading engine)

One AI client, dual-provider (OpenRouter preferred, OpenAI fallback), every call logged (`convex/ai/openai.ts`, ADR 0017). Per-task model in `convex/ai/config.ts`, user-overridable in Settings:

- `coachReply` → `anthropic/claude-sonnet-5` (the conversational reply). **wired.**
- `coachGoalIntent` → `openai/gpt-4o-mini`, JSON mode (the goal classifier). **wired.**
- `curate` → `openai/gpt-5.6-terra-pro` (Core-curation pass). **unwired / PROPOSED.**

---

## 7. Maintenance rule (this file is a contract)

This registry is only useful if it never lags the code. Per the repo's **rule 5** (everything we build asks *does the Coach need this?*) and **rule 1** (docs move with code, same change):

- **Every new feature, surface, artifact, file, table, or data source** → before finishing, answer: should the Coach *act on* it (a tool) and/or *see* it (a context source)? When yes, add the row here in the same change. When no, that is a deliberate, stated decision — not a silent omission.

- **Add or change a Coach tool** → add/update its row in §2 in the same change, with its owner mutation, status, and MCP default.
- **Add or change what the Coach can see** → add/update its row in §3, with priority and read path.
- **Keep Coach ↔ MCP parity** (§0). When the MCP adapter is built, each tool/context row here is its spec. If the MCP and this file disagree, this file is the bug.
- Keep the narrative in [`coach.md`](coach.md) and the shapes in [`data-model.md`](../../architecture/data-model.md) in sync; this file links to them rather than restating them.

## 8. Open questions

- **Tool registry surface.** Thin wrappers over each element's existing mutation, or a dedicated agent-facing tool layer the Coach and MCP both call? (Leaning: thin wrappers — ownership stays stark, and one layer serves both faces.)
- **MCP write posture.** Confirm every propose-default tool's escalation path to a real write (person authorization per tool, per session, or blanket).
- **Area-detection reliability.** How the Coach disambiguates "work on X" when the person is on a different surface than the one that owns X.
- Curation cadence, drift threshold, tether channel — carried in [`coach.md`](coach.md) §9.
