# Feature: The Mirror (global context / text layer)

**Summary:** The evolving "text layer behind the human" — the shared global context every surface writes deltas to and every AI call reads from. A living, structured, versioned, editable record of who the user is, what he wants, and who he's becoming. Being *known* is the value; storage is incidental.
**Status:** 🟡 outline (🟢 skeleton in Plan 1; structure + compaction in Plan 2+)
**Phase:** v1 · Plan 1 (skeleton: rows + summary + `interactions` log) → Plan 2 (delta extraction + compaction in the Coach loop) → Plan 4 (the Guide reads it as a document; per-pillar truths, goals, north star)
**Surfaces:** Global (no surface of its own; *read* by every AI call, *surfaced* through the [Guide](guide.md), *written* by every surface)
**Related:** [`guide.md`](guide.md) · [`coach.md`](coach.md) · [`whiteboard.md`](whiteboard.md) · [`intake-distillation.md`](intake-distillation.md) · [`pillars.md`](pillars.md) · [`daily-ritual.md`](daily-ritual.md) · [`../concept-and-soul.md`](../concept-and-soul.md) · [`../prd.md`](../prd.md) (§4.2) · [`../../architecture/context-bus.md`](../../architecture/context-bus.md) · [`../../architecture/data-model.md`](../../architecture/data-model.md) · [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) · [`../../architecture/security-privacy.md`](../../architecture/security-privacy.md)

---

## 1. Purpose — why it exists

A lost young man's defining problem is not a lack of tools; it is that **nothing knows him**. Every app he opens starts from zero, asks him to configure it, and forgets him the moment he closes it. He never accumulates. The Mirror is the answer to that: the one place in the product that *compounds* — every capture, edit, reflection, and conversation makes the app know him a little better, so its guidance sharpens. "We don't know what we want today, but every day we add a little and it grows." (`../concept-and-soul.md`.)

The Mirror **is** the soul of the product restated as a data structure: *the text layer behind the human — a living document of a person becoming.* It is never finished, because he is never finished; it grows as he grows (`../concept-and-soul.md`). It is the fourth and only **global** scope of the Context Bus (`../../architecture/context-bus.md`): the first three scopes (selection / viewport / surface) are local to whatever surface the user is on and vanish when he leaves; the Mirror is the persistent thing that travels with him across every surface and every session. It is what lets the Coach, on the Whiteboard, already know the goal he set in the Guide last week and the fear he spoke into the evening reflection last night.

Three things make the Mirror load-bearing rather than decorative:

1. **It is the compounding promise made concrete.** The PRD's success criterion is "what he puts in compounds: the Mirror visibly knows him better over a week" (`../prd.md` §12). If the Mirror is empty or stale, every other feature degrades to a generic notes app. Depth is the real retention engine: the longer he uses it, the better it knows him, the harder it is to leave (`../../research/extraction/04-references-and-gaps.md` §B-10).
2. **It is the substrate for the wedge no competitor has.** The future alignment engine and reflection loop (`../../research/extraction/04-references-and-gaps.md` §B-1, §B-2) can only ask "is today's life still pointing at who you're becoming?" if "who you're becoming" is written down, structured, and current. The Mirror is that written-down self.
3. **Being known is the value, not storage.** This is the design north star of the feature. We are not building a database the user maintains; we are building a *felt sense of being understood*. The measure of the Mirror is not how much it holds but how accurately and warmly it reflects — which is why it is **editable** (a draft, not a verdict) and **transparent** (the user can read what it believes about him), matching the ChatGPT-memory trust standard the references flag as table stakes (`../../research/extraction/04-references-and-gaps.md`, cross-cutting reads + §B-7).

The Mirror is mostly invisible. The user rarely thinks "I am editing the Mirror." He experiences it as: the Coach gets him, the [Guide](guide.md) reads him back, and the prompts feel personal. The structure behind that experience is this feature.

## 2. User-facing behavior

The Mirror has **no surface of its own**. It is felt in three ways, in increasing visibility:

**(a) Invisibly, as accuracy.** The dominant experience. The user never opens "the Mirror." He notices that the [Coach](coach.md) already knows his north star, references a theme he never explicitly stated ("you keep coming back to leaving the corporate track"), and that the morning prompt feels written for him. This is the Mirror doing its job silently through the Context Bus — every AI call is seeded with a budgeted slice of it (`../../architecture/context-bus.md`).

**(b) Reflectively, through the [Guide](guide.md).** The Guide is the **reading surface for the Mirror** (`guide.md`). There the user sees the Mirror's output rendered as a calm, living document:
- his **north star** in gold,
- a "**what I've noticed about you**" block (themes + a short, warm read),
- per-**pillar** sections with **learned truths** and a goal or two (`pillars.md`),
- and (later) a sense of **who he's becoming** and how that has drifted over time.

It is framed always as *a draft, never a verdict.* Tone: "Here's what I believe about you — correct me." Never "Here is your assessment."

**(c) Correctively, by editing.** Anything the Mirror believes is editable — directly in the Guide, or conversationally by telling the Coach ("that's not right, I'm not trying to get rich, I'm trying to get free"). An edit is a first-class signal, not a footnote: the user is teaching the Mirror, and a user-asserted fact outranks an inferred one (see §4, §6). This matches the trust standard from the references: a transparent, editable memory the user can inspect and correct, or trust collapses (`../../research/extraction/04-references-and-gaps.md`, cross-cutting reads).

**Happy path, narrated.** Day one, the Mirror is nearly empty; the Guide honestly says "still getting to know you." Over the first session — a few captures on the Whiteboard, an onboarding conversation with the Coach — the Mirror accumulates its first themes and a draft north-star candidate. By the end of week one the Guide shows a recognizable sketch of him: two or three themes, a tentative north star, a pillar or two with a learned truth each. He reads it and feels the small shock of being seen. He corrects one thing ("family matters more than that makes it sound"); the correction sticks and colors what the Coach says next. That loop — add a little, read it back, correct, feel known — is the product.

## 3. Functions & actions (exhaustive)

The Mirror is a back-end concept with a thin user-facing edge (mostly via the Guide and Coach). "Manual" below means *the user acting directly on the Mirror's content in the Guide*; "Via Coach" means the Coach performing it through a tool or its background extraction. Most rows are **system/async** — the Mirror's defining behavior is that it updates itself from events.

| Action | Manual | Via Coach | System/async | What it does | Data effect |
|---|---|---|---|---|---|
| Append a delta (observation) | — | ✓ (in-loop observation) | ✓ (delta extractor) | Records one atomic learned fact/theme/value/signal from a significant event | insert `interactions` (the event) → extractor writes typed record into `mirror.structured` |
| Record a value | ✓ (edit in Guide) | ✓ | ✓ (extracted) | Adds/updates a values record (e.g. "freedom over status") | patch `mirror.structured.values[]` |
| Record / reinforce a theme | ✓ | ✓ | ✓ (extracted, weighted) | Adds a recurring theme or bumps its weight/recency on repeat | patch `mirror.structured.themes[]` (weight, count, lastSeen) |
| Record a pillar truth | ✓ (in Guide pillar section) | ✓ | ✓ | A learned truth scoped to a pillar (e.g. Health: "mornings are when he has willpower") | patch `mirror.structured` (pillar-scoped) + link `pillars` |
| Record a person (post-v1 typed object) | ✓ | ✓ | ✓ | A relationship as a typed object (name, how known, what matters, last interaction) | patch `mirror.structured.people[]` (grows per `data-model.md`) |
| Record / update a goal | ✓ (Guide) | ✓ | ✓ (from reflection) | A typed goal object (statement, horizon, status, pillar) | insert/patch `goals` + reference in `mirror.structured.goals[]` |
| Propose a north-star candidate | — | ✓ (co-write only) | ✓ (surfaced from themes) | Suggests a candidate direction from converging themes; never sets it unilaterally | patch `mirror.structured.northStarCandidates[]` |
| Set / re-anchor the north star | ✓ (ceremony in Guide) | ✓ (co-write) | — | Commits the single named direction; grades future captures/moves | patch north-star record (in `mirror.structured`); new `mirror` version |
| Edit / correct a belief | ✓ (Guide) | ✓ ("that's wrong, actually…") | — | Overrides an inferred record with a user-asserted one; raises its confidence to user-asserted | patch the record + flag `source:"user"` ; log `interactions` (correction) |
| Delete / forget a belief | ✓ ("forget that") | ✓ | — | Removes a record the user rejects; suppresses re-inference of it | soft-remove from `structured`; write a tombstone signal so it isn't re-learned |
| Hold a contradiction | — | ✓ (surfaces tension) | ✓ | Keeps two conflicting records both, tagged as in-tension, rather than overwriting | both records retained + `tension` link (see §6) |
| Compact into summary | — | ✓ (triggers) | ✓ (primary path) | Regenerates the rolling natural-language "who he is right now" from structured records + recent deltas | rewrite `mirror.summary`; bump `mirror.version`; new `takenAt` |
| Snapshot / version | — | ✓ | ✓ (on cadence + on big change) | Freezes a point-in-time Mirror so growth is visible and the past is preserved | insert new `mirror` row (immutable prior versions) |
| Assemble a slice for an AI call | — | ✓ (every turn, implicitly) | ✓ | Produces the budgeted Mirror fragment for the Context Assembler | read-only; returns a `ContextFragment` (no write) |
| Semantic retrieval (long tail) | — | ✓ (when off-screen relevance helps) | ✓ | Pulls the top-K relevant off-screen memories/captures by embedding similarity for the current intent | read-only over `captures.embedding` / `nodes.embedding` (+ memory index) |
| Read the Mirror back | ✓ (open the Guide) | ✓ ("what do you know about me?") | — | Renders the current structured + summary state for the user | read-only |
| Export the Mirror | ✓ (Settings → export) | — | — | Full clean JSON of the Mirror (+ board + Guide); no lock-in | read-only dump (`security-privacy.md`) |

Notes on the table:
- **The defining action is the async one.** "Append a delta" + "compact" + "snapshot" are the Mirror's heartbeat; everything user-facing sits on top. The Mirror is primarily *written by the system reacting to events*, secondarily edited by the human.
- **The Coach never sets the north star alone.** It can *propose* candidates and *co-write*, but committing the north star is a user act (a small ceremony in the Guide) — see `guide.md`, `coach.md`. This is a deliberate dignity rule: the direction of a man's life is not auto-assigned.
- **Forgetting is first-class.** Unlike PillarOS's blob (which only ever grew), the Mirror can be *told to forget*, and that instruction persists so the same wrong belief isn't silently re-learned next week.

## 4. Dynamics & interactions

The Mirror is the hub of the Context Bus's global scope. Its dynamics are best understood as a **write path** (every surface → deltas → Mirror) and a **read path** (Mirror → Context Assembler → every AI call), plus the **maintenance loop** (compaction + versioning) that keeps it from rotting into the PillarOS blob.

### How every surface writes deltas (the write path)

Every surface emits **deltas on significant events**, never on every keystroke. The mechanism is uniform: a surface action that matters writes a row to **`interactions`** (the event log — `{userId, type, payload, at}`, `../../architecture/data-model.md`); an async **delta extractor** (see §7) reads new `interactions`, decides what, if anything, is worth learning, and patches typed records into `mirror.structured`. Deltas are processed async so they **never block the UI** (`../prd.md` §4.2). Concretely, per surface:

- **[Whiteboard](whiteboard.md):** placing a node, tagging a theme, connecting two ideas with a labeled edge, pinning a north-star node — each writes an `interactions` event. Recurring nouns/verbs across nodes become or reinforce **themes**; an edge labeled *funds*/*serves* hints at how he relates his goals. **Dismissed captures still inform the Mirror even if never placed** (`whiteboard.md` §4, `intake-distillation.md`) — the *event of inspiration* counts, not just the visual node.
- **[Intake & Distillation](intake-distillation.md):** every capture produces **three writes** — the immutable capture record, a node draft, and a **Mirror delta** (`intake-distillation.md` §3). Distillation also assigns **pillar tags**, so the Mirror learns which facets of life are loud. The capture's embedding is what later powers semantic retrieval on the read path.
- **[Coach](coach.md):** the Coach writes observations as deltas *during* its multi-turn loop ("I noticed three things touch the ocean"). It is both a reader (every turn) and a writer (per `coach.md` §4: "reads it every call; writes observations as deltas"). Crucially, **user corrections spoken to the Coach** become high-confidence (`source:"user"`) deltas that outrank inferences.
- **[Daily ritual](daily-ritual.md):** the **evening reflection** is the single richest delta source — "feeds the Mirror overnight" (`daily-ritual.md` §1, §4). Morning direction *reads* the Mirror (north star); evening reflection *writes* it. This is the AM-read / PM-write rhythm that the Stoic/Sunsama research shows out-retains streaks (`../../research/extraction/04-references-and-gaps.md`).
- **[Guide](guide.md):** direct edits to any belief, north-star ceremonies, and goal add/check-offs write straight into `mirror` (+ `goals`). The Guide is the one place the user writes the Mirror *deliberately and visibly*.
- **[Pillars](pillars.md):** the Mirror tracks **per-pillar weight/activity** (`pillars.md` §4); when a pillar goes dormant the Coach can notice. Pillars are **typed objects with fields** so the Mirror can *reason over them* (the Tana lesson — `../../research/extraction/04-references-and-gaps.md`), not just match strings.

### How the Context Assembler reads it (the read path)

Before **any** AI call, the single **Context Assembler** runs (`../../architecture/context-bus.md`, `../prd.md` §4.3). It stitches the four scopes in priority order and fits them to a token budget:

```
assembleContext(activeSurface, intent) =
    activeSurface.snapshot("selection")    // full detail, top priority — local
  + activeSurface.snapshot("viewport")     // full detail — local
  + activeSurface.snapshot("surface")      // summarized if large — local
  + otherSurfaces.map(s => s.summary())    // compact awareness — local
  + Mirror.assemble(intent)                // global, budgeted — THIS FEATURE
  → tiered truncation (keep selection/viewport whole, summarize surface, compact Mirror)
```

The Mirror's contribution is **`Mirror.assemble(intent)`** — the global, budgeted fragment, always lowest in *locality* priority (the user's immediate focus wins the budget) but highest in *durability* (it is the only part that persists across surfaces and sessions). `Mirror.assemble(intent)` is not "dump the whole Mirror." It composes a fragment from three layers, tightest-first, to a budget:

1. **Always-on identity core** — the north star + a short identity/values digest. Small, cheap, sent every call. This is the "who he is at the root" that should color every response.
2. **The rolling compacted summary** — the natural-language "who this person is right now" (`mirror.summary`), truncated to budget. The mid-resolution layer.
3. **Intent-relevant retrieval (the long tail)** — when something *off-screen* is relevant to `intent`, pull the top-K matching memories/captures by **embedding similarity** rather than sending everything (`../../architecture/context-bus.md` principles; `../prd.md` §4.3). This is the explicit fix for PillarOS's "send the whole blob every time."

The assembler is **server-side and rebuilt-from-source every call** — never trust client-passed context (`../../architecture/context-bus.md`; `../prd.md` §4.3). Because Convex is reactive, the Mirror slice is **always current the instant anything changes** anywhere (`../../architecture/context-bus.md`). The Mirror is also the **single biggest caching lever** in the cost model — it is read on every Coach call, so it is cached (`../../architecture/ai-layer.md`): the identity core + current summary are cached and only invalidated when the Mirror version bumps.

### The Coach acting "from far away" and the Mirror

When the Coach edits a surface the user isn't on (`../prd.md` §4.4), the Mirror is what makes that coherent: the Coach already holds the global picture, so "add a goal to the Guide while I'm on the Whiteboard" lands against the right pillar and north star without the user re-explaining himself. Mirror writes from such cross-surface actions flow through the same `interactions` → extractor path, so the Mirror stays the single source of truth regardless of which surface triggered the change.

### What the Mirror does not do

- It does **not** read calendar/to-dos in v1 — that scope is **reserved but unbuilt** (`../prd.md` §2.2, F6). The Mirror's structure leaves room for it so the future alignment engine plugs in cleanly, but no connector ships in v1.
- It does **not** render itself; the [Guide](guide.md) is its reading surface.
- It does **not** block the UI; all learning is async.

## 5. States

- **Empty (cold start / "still learning").** Day one. `mirror.summary` is empty or a warm placeholder; `structured` has only the seed (the default **Lifestyle** pillar, `pillars.md`). The Guide says so honestly ("still getting to know you") rather than faking depth — thin data shown honestly (`guide.md` §6). Onboarding may pre-seed the first themes and a draft north-star candidate from the user's first inputs (a conversational interview that produces a draft in the first session — `../../research/extraction/04-references-and-gaps.md` §B-9).
- **Accumulating.** The normal living state. Deltas arrive from surfaces; `structured` grows; `interactions` logs pile up between compactions. The summary may lag slightly behind the latest deltas (it is regenerated on cadence/trigger, not per event).
- **Compacting.** An async compaction run is in flight (regenerating `mirror.summary` from `structured` + recent deltas). Invisible to the user; the prior summary remains readable until the new one lands.
- **Snapshotting / versioning.** A new immutable `mirror` row is being written (on cadence or on a big change like setting the north star). Past versions are preserved so growth is visible and the past self can be revisited.
- **Named (north star set).** A milestone state: the user has a committed direction. The Mirror now has an anchor that grades future captures and moves (`guide.md`, glossary). Distinct from "forming" (candidates exist but none committed).
- **User-edited / corrected.** The user has overridden or forgotten a belief. Affected records carry `source:"user"` and outrank inferences; forgotten beliefs carry a tombstone so they aren't re-learned.
- **In-tension.** Two contradictory records are both held, tagged as a tension, awaiting nothing (the tension *is* the truth — see §6). The Guide may surface it gently.
- **Degraded (AI down).** Delta extraction and compaction are paused/queued; the Mirror still *reads* (the last good summary + structured records serve every call) and still accepts *manual* edits. No hard dependency on a live model (`../../architecture/ai-layer.md`). When AI returns, the queued `interactions` are processed.
- **Syncing.** Convex reactive updates propagate Mirror changes to every surface that reads it; last-write-wins on a given record with reconciliation (see §6).

## 6. Edge cases & failure modes

- **Contradictions — hold both, surface the tension.** A man says in January he wants to leave his job and in March that he just got promoted and loves it. The Mirror does **not** overwrite the earlier belief with the later one. It **keeps both**, tags them in-tension, and lets the [Guide](guide.md)/Coach surface it gently ("two things you've told me seem to pull against each other — which is truer right now?") rather than flattening a real human ambivalence into a single false fact (`guide.md` §6 "surface the tension, don't flatten"). A person *is* his contradictions; erasing them would make the Mirror feel wrong. Resolution is the user's, not the system's.
- **Runaway growth — the PillarOS mistake, designed out.** PillarOS's memory was **one unstructured, monotonically-growing text blob per pillar**, re-injected *whole* on every call, with a compaction prompt that explicitly *resisted shrinking* it — so it grew unbounded and would eventually dominate and overflow the context window (`../../research/extraction/02-pillaros.md` §5). The Mirror avoids this structurally, three ways: **(1) structured + indexed**, not a blob — typed records we can query, weight, and prune; **(2) the summary is regenerated, not accreted** — compaction *rewrites* `mirror.summary` to a bounded "who he is right now," it does not append forever; **(3) the long tail is retrieved, not sent** — off-screen detail lives in embeddings and is pulled top-K by relevance, never dumped. There is always a hard token budget on `Mirror.assemble()` (§4). Stale low-weight themes decay; superseded records are versioned out, not piled on.
- **Privacy — the most intimate data in the product.** The Mirror holds vision, fears, relationships, money, and (later) voice — the maximally intimate dataset (`../../research/extraction/04-references-and-gaps.md` §B-7). Posture (`../../architecture/security-privacy.md`): every row is `userId`-isolated and gated on the authenticated user (no cross-tenant reads); all AI runs server-side with keys never on the client; the Mirror is **private by default** (no sharing in v1), **fully exportable** as clean JSON (no lock-in), and **editable** so the user can correct what the app believes. This is not fine print — *trust is the precondition for honest capture*; a man won't brain-dump his real self into something he doesn't trust. The Mirror must meet the ChatGPT-memory transparency bar (viewable + editable + forgettable) or trust collapses (`../../research/extraction/04-references-and-gaps.md`).
- **Bad inference — the user can always correct it.** The extractor *will* sometimes mislabel ("he mentioned his ex once" ≠ "relationships are his top theme"). The mitigation is structural: every inferred record is a **draft, not a verdict**, visible in the Guide and overridable. A correction is a strong signal — it sets `source:"user"`, raises confidence above any inference, and is logged in `interactions`. Low-confidence inferences are surfaced tentatively ("I might be wrong, but…") rather than asserted, and never block on the user to confirm.
- **Correction & forgetting that persists.** When the user says "forget that," the belief is removed *and* a tombstone signal is written so the same fact isn't silently re-learned from the same recurring evidence next week. Forgetting is durable, not a one-time delete.
- **Over-eager surfacing.** Inference is also a UX risk: surfacing too much, too confidently, feels creepy and presumptuous (the failure mode the references flag for proactivity — `../../research/extraction/04-references-and-gaps.md` §B-5). The Mirror's job is to *be* accurate; the Coach/Guide decide *how much* to reflect, on the calm/earned-interruption contract (`../../design/interaction-principles.md`). The Mirror never pushes; it is read on demand and reflected sparingly.
- **Thin data / cold start.** With little to go on, the Mirror shows honestly that it's still learning rather than hallucinating a personality (`guide.md` §6). Generic-but-warm beats specific-but-wrong on day one.
- **Multi-device / concurrent writes.** Two devices (or a surface + a Coach action) write near-simultaneously. Convex reconciles; resolution is **last-write-wins at the record level** (not whole-Mirror), so a theme bump on one device and a goal edit on another don't clobber each other. The append-only `interactions` log is the durable trail; `mirror.structured` is the reconciled projection.
- **Compaction failure / partial run.** If a compaction run fails, the **previous good summary is retained** (never replaced with garbage), the failure is logged, and the run retries on the next trigger. The structured records are untouched by a failed summary regen, so nothing is lost.
- **Extractor backlog.** If many events arrive faster than extraction (import burst, long brain-dump session), `interactions` queues and the extractor drains it in batches (cheap, batched — §7). The Mirror is *eventually* consistent with recent events; reads still serve the last good state meanwhile.
- **Embedding/version skew.** A record edited after its embedding was computed could mis-retrieve. Mitigation: re-embed on meaningful edits; treat retrieval as *best-effort enrichment*, never as the sole basis of a claim (the structured records and summary are the source of truth; retrieval is the long-tail bonus).

## 7. AI involvement

Three distinct AI processes touch the Mirror, at three cost tiers. All run **server-side** in Convex actions; configuration (model, params, prompts) lives in the central **AI config hub** (`AI_PROCESSES`-style, with a `provider` field), `../../architecture/ai-layer.md`.

1. **Delta extraction (cheap, high-volume, batched).** Reads new `interactions` and decides what to learn: which themes to add/reinforce, which values/goals/people to record, which north-star candidates emerge. Runs on a **cheap tier** (gpt-4o-mini class) because it is the highest-frequency Mirror process, and is **batched** so silent work doesn't spike cost (`../../architecture/ai-layer.md` "batch the silent work"). Output is structured (JSON-mode) so it writes clean typed records, not prose. This is the write-time discipline the extraction research endorses: do the summarization work *once, at write time*, so the read-time payload stays cheap (`../../research/extraction/02-pillaros.md` §6).
2. **Compaction (higher tier, infrequent, triggered).** Regenerates `mirror.summary` — the rolling natural-language "who this person is right now" — from the structured records + recent deltas. Runs on a **higher tier** (it is a high-stakes, identity-defining call) but **rarely** (on cadence — e.g. nightly after the evening reflection — and on big changes like setting the north star), so the higher unit cost is amortized. **Critically different from PillarOS:** PillarOS's compaction prompt said *"do NOT summarize into a tiny paragraph; maintain a detailed, growing record,"* i.e. it accreted forever (`../../research/extraction/02-pillaros.md` §5). The Mirror's compaction does the **opposite**: it *rewrites* to a bounded, current snapshot. Growth lives in the *structured records and versions*, never in an ever-expanding summary string.
3. **Embeddings + semantic retrieval (the long tail).** Captures and nodes are embedded once at intake (`text-embedding-3-small`, 1536, Convex vector index — `../../architecture/data-model.md`, `intake-distillation.md`). At read time, `Mirror.assemble(intent)` uses embedding similarity to pull the **top-K off-screen memories** relevant to the current intent, instead of dumping everything (`../../architecture/context-bus.md`; `../prd.md` §4.3). This **activates braindump's unused embeddings** and is the single biggest upgrade over PillarOS, whose only "search" was naive substring matching with no retrieval at all (`../../research/extraction/02-pillaros.md` §13). "Embed once, reuse forever" keeps this cheap (`../../architecture/ai-layer.md`).

**Cost discipline (Mirror-specific).** The Mirror is *read on every Coach call*, so **caching it is the biggest single cost lever** in the product (`../../architecture/ai-layer.md`): the identity core + current summary are cached and invalidated only on version bump. Extraction and compaction are *silent* work and are batched/scheduled, not run synchronously. The server boundary (Convex action) is where runaway Mirror cost is logged, throttled, and aborted.

**Graceful degradation.** If the model layer is down: reads still work (the last good summary + structured records serve every call); manual edits still work; extraction and compaction **queue** and drain when AI returns. The Mirror never hard-depends on a live model (`../../architecture/ai-layer.md`).

**The "knowing the user" benchmark.** The whole AI design here is measured against ChatGPT memory and Mem: explicit + implicit memory, transparent and editable, with natural-language recall over one's own life as table stakes (`../../research/extraction/04-references-and-gaps.md`, cross-cutting reads + §B-6). The Mirror's structured + summary + retrieval design is the build that meets that bar without inheriting PillarOS's blob.

## 8. Data touched

Authoritative schema: [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Primary table — `mirror`** (read/written; versioned):
```ts
mirror { userId, summary, structured{ values[], themes[] /* grows: people[], goals[], northStarCandidates[], pillar-truths */ },
         version, takenAt }
        // index: by_user[userId, takenAt]
```
- `summary` — the rolling compacted natural-language "who he is right now" (regenerated, bounded).
- `structured` — typed records the Mirror reasons over. v1 seeds `values[]` + `themes[]`; **grows** to `people[]`, `goals[]`, `northStarCandidates[]`, and per-pillar truths (`../../architecture/data-model.md` notes; `../prd.md` §4.2). Typed objects with fields, *not* free text (the Tana lesson — `../../research/extraction/04-references-and-gaps.md`).
- `version` + `takenAt` — every snapshot is a new immutable row; prior versions are preserved so growth/drift is visible (`mirror by user+takenAt`). **Never a single growing blob** (`../../architecture/data-model.md`).

**Source of writes — `interactions`** (the event log that drives deltas):
```ts
interactions { userId, type, payload, at }   // event log → Mirror deltas
```
Every significant surface event lands here; the delta extractor reads it to patch `mirror.structured`. Append-only durable trail.

**Closely coupled tables:**
- **`goals`** `{ userId, pillarId?, statement, horizon, status, createdAt }` — typed goal objects referenced from `mirror.structured.goals[]`; written by the Guide and by reflection-derived deltas (Plan 4).
- **`pillars`** `{ userId, name, description?, weight, source, createdAt }` — the Mirror tracks per-pillar `weight`/activity; pillar truths are scoped to these (`pillars.md`).
- **`captures`** `{ …, distilled{}, embedding?, … }` — the embedded inspiration events that feed the Mirror (even when dismissed) and power semantic retrieval on the read path (`intake-distillation.md`, `../../architecture/data-model.md`).
- **`nodes`** `{ …, pillars[], embedding?, … }` — Whiteboard content whose recurring nouns/verbs become themes and whose embeddings serve the long-tail retrieval (`whiteboard.md`).
- **`threads` / `messages`** — Coach conversations whose observations and user corrections become deltas (`coach.md`).

**North star** — stored within `mirror.structured` (the single named direction; co-written; grades future captures/moves — glossary, `guide.md`). Not (yet) its own table.

**Themes** — `mirror.structured.themes[]` (weighted, recency-tracked); the glossary's separate `themes` mention resolves here in v1.

**Embeddings / vector index** — `text-embedding-3-small` (1536) on `captures.embedding` and `nodes.embedding`, Convex vector index, filtered by `userId` (`../../architecture/data-model.md`). The retrieval substrate for the Mirror's long tail.

**Reserved-but-unbuilt:** calendar/to-do signals — a context-source slot exists in the architecture for the future alignment engine, but no connector and no Mirror write path ship in v1 (`../prd.md` §2.2, F6).

## 9. Reuse & build notes

- **From PillarOS — the memory *concept* only.** Take the *idea* of a durable per-user memory distinct from transient chat history. **Rebuild everything under it.** PillarOS's memory is the single clearest "what not to do" in the extraction (`../../research/extraction/02-pillaros.md` §5, §13):
  - it was **one unstructured, monotonically-growing text blob** per pillar — **we rebuild as structured typed records + a bounded regenerated summary + a vector index**;
  - it was **re-injected whole on every call** regardless of relevance — **we send a budgeted slice** (identity core + summary) **and retrieve the long tail top-K** by embedding;
  - its compaction prompt **resisted shrinking** the blob — **our compaction rewrites to a current snapshot**, with growth living in structure + versions;
  - it had **no semantic index, no retrieval** (only naive substring search) — **we activate embeddings** (which braindump computed but never used) for true semantic recall.
  This is "the single biggest upgrade over PillarOS for the context-aware promise" (`../../research/extraction/02-pillaros.md` §5d).
- **The Tana lesson — typed objects, not free text.** Pillars, goals, people, and themes are **typed objects with fields** so the Mirror can *reason over* them (query, weight, relate), not just pattern-match strings (`../../research/extraction/04-references-and-gaps.md`, landscape table + §B-3). This is what separates "knowing the user" from "storing the user's notes."
- **The ChatGPT-memory standard — transparent + editable.** Match the explicit/implicit, viewable, correctable, forgettable memory UX or trust collapses (`../../research/extraction/04-references-and-gaps.md`, cross-cutting reads + §B-7). The Mirror's editability and the Guide's "draft, not verdict" framing are this lesson made concrete.
- **Server-side, rebuilt-from-source.** Keep PillarOS's one genuinely right instinct: assemble context server-side from the DB every call, never trust the client (`../../research/extraction/02-pillaros.md` §1, §11; `../../architecture/context-bus.md`). PillarOS *also* leaked its model key to the browser — the Mirror's reads/writes are entirely server-side (`../../architecture/security-privacy.md`).
- **People as a first-class object (post-v1, designed-for now).** The references rank a typed `Person` object among the most load-bearing missing parts (highest-emotion, highest-retention data; enables relationship resurfacing — `../../research/extraction/04-references-and-gaps.md` §B-3). The schema reserves `people[]` in `mirror.structured` so this plugs in without a migration.
- **Resurfacing rides on the Mirror (post-v1).** The decaying-recall / "on this day" / contextual-semantic resurfacing engine (`../../research/extraction/04-references-and-gaps.md` §B-4) is downstream of the Mirror's embeddings + versions; not built in v1 but designed-for.
- Build sequence: Plan 1 stands up the skeleton (`mirror` row + `summary` + `interactions` log + the assembler's Mirror slice); Plan 2 adds delta extraction + compaction inside the Coach framework; Plan 4 makes the [Guide](guide.md) read it as a document with per-pillar truths, goals, and the north-star ceremony. See `../../architecture/data-model.md` and the Plan 1 foundation plan.

## 10. Open questions

- **Snapshot/version cadence.** Nightly? On every north-star change? On a delta-count threshold? Trade-off: more snapshots = richer drift history but more storage and more compaction cost. (Lean: cadence + on-significant-change; confirm thresholds.)
- **Structured-vs-summary balance.** How much of `Mirror.assemble()` is the always-on structured identity core vs the prose summary vs retrieved long tail, and the exact token budget split between them. Needs tuning against real cost numbers (`../../architecture/ai-layer.md` "to expand: token-budget numbers").
- **How aggressively to surface inferences.** The Mirror *holds* beliefs accurately; the Coach/Guide decide how confidently and how often to reflect them back. Where is the line between "feels known" and "feels surveilled"? (Governed by the interaction contract, but the threshold is unset.)
- **Contradiction resolution UX.** When two beliefs are in-tension, when does the Guide raise it, and how — a gentle question, a side-by-side, or silent holding until the user brings it up?
- **User-facing "edit the Mirror" UX.** Full structured editor in the Guide vs conversational-only correction via the Coach in v1 (echoes `guide.md` §10: document view vs conversational-only). How much of the structured record do we expose directly?
- **North-star promotion.** When/how a `northStarCandidate` graduates to *the* north star — purely manual ceremony in v1, with auto-suggestion later (`guide.md` §10)?
- **Forgetting semantics.** How durable is "forget that" — a hard tombstone forever, or a decaying suppression? And does export include forgotten/tombstoned records?
- **Decay policy for themes.** Exact half-life for low-weight themes so the Mirror stays current without amnesia (informed by Readwise's decaying-recall model — `../../research/extraction/04-references-and-gaps.md`).
- Resolved decisions should be promoted to an ADR in `../../decisions/`.
