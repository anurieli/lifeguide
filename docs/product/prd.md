# LifeGuide — Product Requirements Document (v1)

**Date**: 2026-05-20
**Status**: Draft for review → implementation planning
**Build**: Net-new, inside the `Life Board` parent folder, reusing components from `braindump` and `PillarOS`
**One-line**: The central command for a man's mind, soul, and spirit — a shared space where a whiteboard and a conversational Coach run on one evolving context about who he is.

---

## 1. Overview

### 1.1 The pain
Young men are lost. No one taught them how to know what they want or how to stay aligned with it once life starts pulling. They drift down a path that was set for them and realize too late they never chose the direction.

### 1.2 The product
LifeGuide is **the space for the individual** — his central command. A place he checks into morning and night to reflect, hold himself accountable, set goals relevant to him, and stay aligned with them as he grows. Behind it, the app continuously writes **the text layer behind the human**: an evolving record of who he is and what he wants.

We start as **central command for the mind, soul, and spirit.** A productivity layer (actively managing calendar and to-dos) is a deliberate *later* addition — not v1.

### 1.3 The soul line
> LifeGuide is the space that keeps a man tethered to who he's becoming — and a Coach who makes sure today's life still points at it.

### 1.4 What v1 is, concretely
**Two surfaces under one roof, sharing one global context:**
1. **The Whiteboard** — a spatial canvas to dump, connect, and organize the mind (ideas, notes, inspiration, captures).
2. **The Conversational Guide** — the Coach: a conversational surface that has the context of whatever you're looking at *plus* global context about you, and can act across the whole space.

The hard, defining problem v1 must solve well: **how context is stored and retrieved across what's in view and what's global** (Section 4). Everything else is built on that.

---

## 2. Goals & Non-Goals

### 2.1 Goals (v1)
- A working **Whiteboard** surface: capture, nodes, labeled multi-target edges, manual manipulation, AI manipulation, and **audio → nodes** (talk, transcribe, segment onto the board).
- A working **Conversational Guide** (Coach): chat that sees in-view + global context and can act on any surface "from far away."
- A real **shared context system**: global Mirror + in-view/focused context, with a clean assembler that feeds every AI call.
- **Both interaction modes**: manual direct manipulation AND Coach-driven action, everywhere.
- **Settings**: a configurable daily exercise + alert/treatment preferences.
- The foundation built so additional surfaces (Vision Board, Journaling, the roadmap document) plug in later as thin modules.

### 2.2 Non-Goals (explicitly out of v1)
- **Active productivity management AND calendar/to-do integration.** v1 does not create, edit, manage, *or read* calendar/to-dos. The Context Bus reserves a slot for calendar/to-do signals (Section 4) so the future alignment engine plugs in cleanly, but no connector is built in v1. This whole area is a later phase.
- **The full life-roadmap document surface** (the rendered "Guide" doc) — the *text layer* exists in the Mirror; a dedicated document view is later.
- **Vision Board** and **Journaling** as separate surfaces — designed-for, not built in v1.
- **Off-platform Coach** (SMS/push tether) — the settings/alerts scaffold exists; the actual off-platform channel is a fast-follow, not core v1.
- **Marketplace, multi-tenant Coach Studio, print/ship, native apps** — far later.
- **Streaks / gamification** — never.

---

## 3. Personas

**Primary**: A capable young man, 22–40, who feels directionless. Aware something's off, no framework for it. Lives on his phone, impatient with complexity, allergic to anything that feels like a chore or a productivity lecture. Wants a space that *gets* him and gently keeps him pointed somewhere.

**Anti-persona**: Someone shopping for a better to-do app or a GTD system. LifeGuide is upstream of that; they'll bounce, correctly.

---

## 4. Core Architecture — The Context System

This is the heart of v1. Two surfaces, one roof, one shared context "separated amongst those two." The whole product depends on getting this right.

### 4.1 The four context scopes
Context exists at four resolutions, prioritized highest-to-lowest when assembling any AI interaction:

| Scope | What it is | Example (Whiteboard) | Example (Guide) |
|---|---|---|---|
| **Selection** | What's highlighted/selected right now | The 3 nodes you've selected | The message/passage referenced |
| **Viewport / In-view** | What's currently visible | Nodes inside the current viewport | The current thread on screen |
| **Surface** | The whole current surface's state | The entire board (all nodes + edges) | The full conversation history |
| **Global (the Mirror)** | The evolving text layer behind the human | — shared across surfaces — | — shared across surfaces — |

The first three are **local to the active surface** ("in view"). The fourth is **global** and shared. This is the "separated amongst the two" model: each surface owns its local context; both share the Mirror.

### 4.2 The Mirror (global context)
The persistent, cross-surface text layer about the person. Structured + summarized:
- **Structured records**: identity/values, pillars, goals, people, themes, north-star candidates (typed objects with fields — the Tana lesson).
- **Compacted summary**: a rolling natural-language "who this person is right now," regenerated from significant events.
- **Versioned**: snapshots over time so growth is visible and the past is preserved.

The Mirror is updated by **deltas** from significant events on any surface (a capture, a reflection, a goal change), processed async so it never blocks the UI.

### 4.3 The Context Bus — publish & assemble
Every surface implements a small publisher interface:

```ts
interface SurfaceContextProvider {
  surfaceId: string;
  // Local state at two resolutions:
  snapshot(scope: "selection" | "viewport" | "surface"): ContextFragment;
  // Tools this surface contributes to the Coach:
  tools(): ToolDef[];
  // On-demand full state when the Coach acts on this surface "from far away":
  resolve(query: ContextQuery): ContextFragment;
}
```

Before any AI call, a single **Context Assembler** runs:

```
assembleContext(activeSurface, intent) =>
  [ activeSurface.snapshot("selection")    // full detail, top priority
  + activeSurface.snapshot("viewport")     // full detail
  + activeSurface.snapshot("surface")      // summarized if large
  + otherSurfaces.map(s => s.summary())    // compact awareness
  + Mirror.assemble(intent) ]              // global, budgeted
  → fit to token budget (tiered truncation: keep selection/viewport whole,
     summarize surface, compact Mirror) → context payload
```

**Principles** (lessons baked in from the extraction):
- **Server-side, rebuilt-from-source every call.** Never trust client-passed context. (PillarOS got this right.)
- **Tiered by a token budget.** Full detail where the user is; summaries everywhere else. (Generalize PillarOS `generateBoardContext()` from one board to all surfaces.)
- **Semantic retrieval for the long tail.** When something off-screen is relevant, pull it by embedding similarity, not by dumping everything. (Activates BrainDump's unused embeddings.)
- **Reactive.** Convex real-time means context is always current the instant anything changes.

### 4.4 The Coach acting "from far away"
When the Coach edits a surface the user isn't on, it calls that surface's `resolve()` for full state, executes a registered tool that maps to a Convex mutation, and the change syncs reactively to wherever that surface is rendered. The user can be on the Whiteboard and tell the Coach to add a goal to the Guide; it just happens.

### 4.5 Why this forces the stack
A shared, always-current context layer every surface reads/writes is a real-time reactivity problem. **Convex** makes real-time the default and bundles reactive DB + file storage + vector index + secure server-side AI in one runtime. **Next.js** owns the shell, routing, and renders the surfaces. **OpenAI** is the model layer. (Full rationale in the Foundation Blueprint.)

---

## 5. Feature Specifications

### F1 — The Whiteboard
**What**: An infinite spatial canvas to externalize the mind. The man throws ideas, notes, inspiration, and captures onto it and connects them.

**Capabilities**:
- Infinite canvas: pan, zoom-toward-cursor, drag, box-select, multi-select.
- **Nodes**: text, quote, image, link, captured-media. Instant create from a persistent input ("type anywhere" focuses it). Optimistic render.
- **Edges**: labeled, multi-target relationships (one idea → many, for different reasons), with cycle detection. This is how the man maps that one idea connects to two others for two reasons.
- **Capture → node**: paste, drop, upload, URL, and (later) share-sheet. Any media distilled to a text-meaning node (OCR, link preview, PDF, image analysis).
- **Manual manipulation**: move, edit, connect, group, hide, delete — all directly, by hand.
- **AI manipulation**: ask the Coach to arrange, group by theme, connect, hide, summarize, or create — it acts on the board via tools.
- **Audio → nodes** (in v1, sequenced right after the core board): talk → transcribe → the Coach segments the transcript into discrete nodes and drops them on the board, sequential thoughts optionally linked. Record-then-process (Whisper) first; live streaming later.

**Reuse**: `braindump` — coordinate system, geometry/collision toolkit, edge graph + cycle detection, capture loop, media→node pipeline. (Rebuild canvas cleanly as DOM+CSS+SVG; Konva is dead there. Drop its undo singleton and optimistic plumbing — Convex handles sync.)

### F2 — The Conversational Guide (Coach)
**What**: The Coach. A conversational surface, present across the app, that has the context of whatever you're looking at plus global context about you, and can act on any surface.

**Capabilities**:
- Chat anywhere; the Coach always sees assembled context (Section 4).
- **Tool-use across surfaces**: real multi-turn agent loop (fixing PillarOS's single-pass flaw) — tool results feed back to the model until the task is done.
- Acts "from far away": edits the Whiteboard, updates the Mirror/goals, etc., without the user navigating there.
- Answers reflective questions, surfaces patterns, holds the long view.
- Tone/behavior governed by a Coach configuration (voice + behavioral contract + the interaction principles in Section 7). Pluggable later; one default Coach in v1.

**Reuse**: `PillarOS` — the context-injection mechanic, the tool registry + rich-data tool-return contract, the AI config hub (`AI_PROCESSES`, add a `provider` field, port to OpenAI). Rebuild the agent loop as genuinely multi-turn. Move the API key server-side (PillarOS leaked it).

### F3 — The Mirror (global context / text layer)
**What**: The evolving text layer behind the human. The shared global context both surfaces read and write.

**Capabilities**:
- Structured records (identity, values, pillars, goals, people, themes, north-star candidates) as typed objects.
- Rolling compacted summary, regenerated from deltas.
- Versioned snapshots over time.
- Read by every AI call (budgeted); written by significant events on any surface.

**Reuse**: `PillarOS` memory *concept* only — rebuild structured + indexed (its blob-memory won't scale).

### F4 — Intake & Distillation
**What**: One pipeline turning any input into a clean node + embedding + Mirror delta.

**Capabilities**:
- Sources: paste, drop, upload, URL, (share-sheet later), (calendar/todo read-only context later).
- Distill: extract textual meaning + title + tags/pillars + suggested placement.
- Embed for semantic retrieval and grouping.
- Route: to the board's inbox, or directly placed, or just folded into the Mirror.

**Reuse**: `braindump` media pipeline + `PillarOS` `analyzeIntakeItem`.

### F5 — Settings
**What**: How the man wants the space to treat him.

**Capabilities (v1)**:
- **Daily exercise**: choose a daily practice (e.g., morning intention, evening reflection, gratitude, one-line check-in) and when it runs. A small set of templates; extensible.
- **Alerts / treatment**: notification preferences — when and whether the Coach reaches out, intensity ("leave me alone" → "check on me"), quiet hours. (The off-platform channel itself is a fast-follow; the preferences model is built now.)
- **Tone**: how direct vs gentle the Coach is.
- Profile basics, data export, privacy controls.

**Reuse**: none specific; new. Lightweight.

### F5b — Pillars
**What**: The facets of a life, as cross-cutting typed tags (not rigid containers). Everything — nodes, captures, goals — can be tagged against one or more.

**Capabilities (v1)**:
- Every user starts with a **single default pillar: "Lifestyle."** No setup screen, no forced configuration — onboarding stays dead simple (progressive disclosure).
- Additional pillars are added **on tap from a preset library** (e.g., Health & Fitness, Family & Relationships, Financial & Professional, Growth & Mind, Money & Freedom, Spirit & Meaning) — or created custom.
- Pillars are typed objects with fields, so the Mirror can reason over them (the Tana lesson).

**Reuse**: the preset-selection UX pattern echoes PillarOS's template picker; the data model is new (tag, not container).

### F6 — Calendar & To-dos (deferred; slot reserved)
**What**: Deferred out of v1. The Context Bus *reserves* a slot for calendar/to-do signals so the future alignment engine plugs in cleanly, but no connector is built in v1 — we neither manage nor read them yet.

**v1 scope**: architecture only — the context-source interface exists and is documented; no integration ships.

**Later**: a read-only connector feeds the Coach's drift/scatter reflections; active management comes in the productivity layer after that.

**Reuse**: none.

### F7 — The Daily Ritual (lightweight v1)
**What**: Two calm check-ins — morning and evening — as the core rhythm.

**Capabilities (v1)**:
- Morning: open to your direction + the daily exercise.
- Evening: the daily exercise reflection; feeds the Mirror.
- No streaks, no guilt. Configurable in Settings (F5).

---

## 6. Data Model (Convex, sketch)

```
users            { id, email, name, authProvider, createdAt, settingsId }
settings         { userId, dailyExercise{type,schedule}, alerts{intensity,quietHours,channels},
                   coachTone, privacy }
surfaces         { id, userId, type: "whiteboard" | "guide", title, createdAt }   // extensible to vision/journal
nodes            { id, userId, surfaceId, type, title, text, imageUrl, fileId, attribution,
                   position{x,y,z}, dimensions, isHero, pillars[], embedding, captureId?,
                   isActive, createdAt, updatedAt }
edges            { id, userId, surfaceId, fromNode, toNode, label, note, createdAt }   // multi-target, cycle-checked
captures         { id, userId, source, rawType, rawText?, rawUrl?, rawFileId?, distilled{...},
                   embedding, placedAt?, nodeId?, isActive, createdAt }
threads          { id, userId, surfaceId, title, createdAt }                  // Coach conversations
messages         { id, userId, threadId, role, content, toolCalls[], createdAt }
mirror           { id, userId, structured{identity,values,pillars[],goals[],people[],themes[],
                   northStarCandidates[]}, summary, version, takenAt }
pillars          { id, userId, name, description, weight, source }            // typed, cross-cutting; source: "default"|"preset"|"custom"; v1 seeds one default "Lifestyle"
goals            { id, userId, pillarId?, statement, horizon, status, createdAt } // typed objects
interactions     { id, userId, type, payload, at }                           // event log → Mirror deltas
```

Indexes: per-user everywhere; vector index on `nodes.embedding` and `captures.embedding`; `nodes by surface`, `messages by thread`, `mirror by user+takenAt`.

---

## 7. Interaction Model

**Both modes, everywhere**: the man can operate the app by hand *or* by talking to the Coach. Neither is privileged; the Coach is a power tool, not a gate.

**The interaction contract (every surface obeys)**:
1. Two beats a day, not all day.
2. One thing per screen — never a dashboard. Depth is opened, never dumped.
3. Talk *or* operate — both are first-class.
4. Earned interruption only — the Coach speaks when it has something specific and true.
5. Progressive disclosure — day one is dead simple; complexity is earned.
6. Ambient, not anxious — a calm room, not an inbox.

---

## 8. Tech Stack

| Layer | Choice |
|---|---|
| Shell / routing / SSR | Next.js (App Router) |
| Backend / real-time / DB / storage / vector | Convex |
| AI | OpenAI (gpt-4o family), via a central config hub with a `provider` field |
| Canvas | Custom DOM + CSS transform + SVG (not Konva) |
| Auth | Convex auth (multi-tenant from day one) |
| Embeddings | OpenAI text-embedding-3-small → Convex vector index |
| Hosting | Vercel (web) + Convex cloud |

---

## 9. Reuse Map — What We Pull From Where

| Capability | Pull from | Verdict |
|---|---|---|
| AI config/runner/cost-logging module | braindump `src/lib/ai/` | Reuse (bump models) |
| Coordinate system, geometry/collision, capture loop | braindump | Reuse |
| Labeled multi-target edge graph + cycle detection | braindump | Reuse |
| Media → text-node pipeline (OCR, PDF, link preview) | braindump | Adapt |
| Context-injection mechanic (`generateBoardContext`) | PillarOS | Generalize → Context Bus |
| Tool registry + rich-data tool returns | PillarOS | Reuse |
| `AI_PROCESSES` config-hub pattern | PillarOS | Reuse (add provider) |
| Intake analysis (`analyzeIntakeItem`) | PillarOS | Adapt |
| Memory concept | PillarOS | Rebuild structured |
| Live-audio UX | PillarOS | Rebuild on OpenAI (Realtime/Whisper) |
| Agent loop | PillarOS | Fix → real multi-turn |
| Undo singleton, job queue, optimistic plumbing | braindump | Drop (Convex) |
| Pillar→Zone→Item hierarchy, client-trusted auth, leaked keys | both | Drop |

---

## 10. Build Sequence (foundation-first; detailed plan to follow)

0. **Platform** — Next.js + Convex, multi-tenant auth, schema, empty Context Bus registry.
1. **Context system** — the four scopes, the Assembler, the Mirror (structured + summary). The spine.
2. **Intake & distillation** — any source → node + embedding + Mirror delta; the AI config hub.
3. **Agent / Coach framework** — real multi-turn loop, tool registry, cross-surface action.
4. **Surface 1: Whiteboard** — canvas + nodes + edges + capture + manual & AI manipulation. First proof of the spine.
5. **Audio → nodes** — record → transcribe → Coach segments the transcript → places nodes on the board.
6. **Surface 2: Conversational Guide** — the Coach surface, context-aware, acting across surfaces.
7. **Pillars + Settings + daily ritual** — default "Lifestyle" pillar + preset library; daily exercise; alerts/treatment; morning/evening bookends.

(Calendar/to-do context: slot reserved in step 1; connector deferred out of v1.)

Surfaces 1 and 2 share the context system from step 1, proving the "one roof, one shared context, separated amongst the two" requirement end-to-end.

---

## 11. Open Questions / Decisions To Confirm

1. ~~Audio → nodes in v1?~~ **RESOLVED: in v1, sequenced right after the core board.**
2. ~~Calendar/todo context in v1?~~ **RESOLVED: deferred. Reserve the context slot in the architecture; build no connector in v1.**
3. **Does the "Conversational Guide" render the text-layer as a readable document in v1, or stay purely conversational?** (Recommend: conversational in v1; document view later.)
4. ~~Default pillar set?~~ **RESOLVED: every user starts with a single default "Lifestyle" pillar (no setup screen). More are added on tap from a preset library (Health & Fitness, Family & Relationships, Financial & Professional, Growth & Mind, Money & Freedom, Spirit & Meaning, …) or created custom.**
5. **Off-platform tether** — confirm it's a fast-follow (settings scaffold in v1, channel later).
6. **Naming** — LifeGuide = platform; the conversational surface = "the Guide"; the AI = "Coach". Lock?

---

## 12. Success Criteria for v1

- A man can sign in, land in a calm space, and within minutes dump his mind onto the Whiteboard.
- He can talk to the Coach from anywhere and it clearly knows what's in front of him *and* what it's learned about him.
- The Coach can change any surface from anywhere, by request.
- What he puts in compounds: the Mirror visibly knows him better over a week.
- It never feels like a productivity app, never bombards, and gives him one calm reason to return each morning and night.
