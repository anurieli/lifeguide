# The Center

**Status:** built (v1 filing) · **Element of:** the spine (curates the Core) · **Owns:** no tables (orchestrator; writes `coreFiles` through its owner)

> The orchestrator that turns what was heard into structure. After a Listener call, it files the conversation into the file system on the human — one isolated synthesis per pillar.

## 1. Purpose

The [Listener](listener.md) only listens; something has to route the raw stream into who the person is. The Center is that router. It is the **core-curator** role from [`coach.md`](coach.md) made literal and concrete, scoped for v1 to *filing* (no Mirror re-synthesis, no drift detection yet). It is how a sprawling, wandering conversation becomes durable, organized truth in the [file system on the human](file-system-on-the-human.md).

## 2. User-facing behavior

The person never sees the Center work. When a Listener call ends, they see a brief "Filing what you shared…" and then the **filing report**: "here's what I heard, and here's what got filed where" — grouped by pillar, with any contradictions raised for them to decide. That report *is* the Center's visible face.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| `synthesizeSession` | a Listener call ends | loads every pillar (+ files) + the transcript, fans out, applies the result, returns a summary | Coach (Center) | reads `pillars`/`coreFiles`/`interviewSessions`; writes `coreFiles`, `experienceEvents` · **BUILT** |
| per-pillar synthesis | inside the fan-out, once per pillar | one isolated model call deciding the file ops for *that* pillar only | Coach (Center) | reads one pillar's metadata + files + transcript · **BUILT** |
| apply ops | after each pillar's synthesis | `planFileOps` classifies create / update / pending; mutations apply | Coach (Center) | writes `coreFiles` · **BUILT** |

## 4. Dynamics and interactions with other elements

- **Owns nothing.** It *draws* `pillars` + `coreFiles` + the session transcript, and *writes* `coreFiles` through that element's own internal mutations (`convex/coreFiles.ts`) — the ownership-vs-draws split from [`../../architecture/context-bus.md`](../../architecture/context-bus.md).
- **Triggered by** the [Listener](listener.md) (`SpeakSurface` calls `center.synthesizeSession` on call end).
- **Fills** the [file system on the human](file-system-on-the-human.md); it is that store's only writer in v1.
- **Always fans out to every pillar** (product decision, 2026-06-04): each pillar gets its own pass whether or not it seems touched, so nothing subtle is missed. Independence means one pillar's failure can't sink the others.
- **Never silently overwrites.** A contradicting change becomes a `pending` file; the person resolves it in the report.

## 5. States

- **Idle.** No call in flight; nothing running.
- **Fanning out.** N isolated per-pillar passes running concurrently (`Promise.all`).
- **Applying.** Each pillar's ops being written.
- **Done.** Returns `{ created, updated, pending, pillarsTouched }`; the report renders from `coreFiles.bySession`.
- **AI-unavailable.** No key/model — returns a zero summary with `error: "ai_unavailable"`; the call still ends cleanly, nothing filed.

## 6. Edge cases

- **No pillars.** Returns a zero summary (shouldn't happen post-seed).
- **One pillar's model call fails.** Caught per-pillar; that pillar contributes nothing, the rest proceed.
- **Malformed model JSON.** `parsePillarSynthesis` recovers a `{...}` substring or yields `[]`; junk entries (missing name/content) are dropped.
- **Empty / thinking-only conversation.** Every pillar returns `[]`; the report says nothing landed, warmly.
- **Duplicate file names in one pass.** `planFileOps` collapses same-name creates (last wins) so a pass never makes two files with the same name.
- **Cost.** Always-fan-out is N model calls per session (N = pillar count, ~8). Accepted for thoroughness; revisit if it bites.

## 7. AI involvement

The Center is model-centric. Per pillar, the `center` task (`convex/ai/config.ts`, OpenRouter → OpenAI fallback) gets a strict system prompt built by `buildPillarSynthesisPrompt` (`agents/center/synthesis.ts`): the pillar's `name`/`about`/`composition`, its current files, and the transcript, with hard rules (stay in this pillar's lane, ground only in what was said, first person, never invent, flag contradictions). It must return `{"files":[{op,name,kind,content,contradiction}]}`. Parsing + the pure routing (`lib/center.ts`, unit-tested in `tests/center.test.ts`) keep the model's freedom from corrupting the store. See [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md).

## 8. Data touched

**Owns:** none. **Draws:** `pillars` + `coreFiles` (via `coreFiles.pillarsWithFiles`), the `interviewSessions` transcript. **Writes (through `coreFiles`'s owner):** `coreFiles` (create / update / pending) and a `synthesized` `experienceEvents` row. Shapes in [`../../architecture/data-model.md`](../../architecture/data-model.md).

## 9. Open questions

- **Triage vs always-fan-out.** Decided always-fan-out for v1; if cost/latency bite, add a cheap "which pillars were touched" pre-pass.
- **Mirror re-synthesis.** The Center curates files now; when does it also re-synthesize `mirror.structured` over them?
- **Cross-pillar dedup.** Two pillars could each file the same statement. No global dedup yet — acceptable, revisit.
- **Async vs inline.** Runs inline on call-end (the person waits through the report). Move to a scheduled/background action if conversations get long.
- **Guided sessions.** Same Center should file the [Journal](journal.md)'s sessions; the input adapter is unbuilt.
