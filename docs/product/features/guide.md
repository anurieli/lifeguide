# Feature: The Guide (text-layer surface)

**Summary:** The reading and editing surface for the Mirror — "who you're becoming" rendered as a living, editable document: your north star, the app's "what I've noticed," and per-pillar truths + goals. The surfaced form of the text layer behind the human, and the destination the whole product points at.
**Status:** 🟡 outline
**Phase:** v1 · Plan 4 (conversational / Mirror-backed; a richer document view + drift visualization come later)
**Surfaces:** The Guide (a surface; implements the standard `SurfaceContextProvider`)
**Related:** [`mirror.md`](mirror.md) · [`pillars.md`](pillars.md) · [`coach.md`](coach.md) · [`daily-ritual.md`](daily-ritual.md) · [`../concept-and-soul.md`](../concept-and-soul.md) · [`../../architecture/context-bus.md`](../../architecture/context-bus.md) · [`../../architecture/data-model.md`](../../architecture/data-model.md)

---

## 1. Purpose — why it exists
A lost person can capture endlessly and still never *see themselves*. The Whiteboard gets what's in your head out; the Mirror quietly learns from it; the Guide is where that learning becomes a picture you can read and feel known by. It is the surfaced form of the "text layer behind the human" — the [LifeGuide roadmap document itself](../concept-and-soul.md), continuously developed, never static — and the destination the whole product points at: scattered captures resolved into a coherent direction.

It answers the question a drifting man can't answer alone — *who am I becoming, and is it still true?* The **north star** at its top is the single named direction that makes that answerable; once set, it stops being decoration and becomes the grader every future capture and move is measured against (the closed reflection loop's anchor — see [ADR 0003](../../decisions/0003-reflection-loop-as-wedge.md)). The Guide is where vision gets **read**, and where it gets **revised**.

Framed always as a **draft, never a verdict** ([`mirror.md`](mirror.md) §2): being *known* is the value, and the only way to be known accurately is to let the person correct the record.

## 2. User-facing behavior
- Opens as a calm, single-column document — not a dashboard. One thing in focus, depth opened on tap, honoring the interaction contract (PRD §7, [`../../design/interaction-principles.md`](../../design/interaction-principles.md)).
- **Top: the north star** (gold). Either a co-written named direction, or — before one exists — a gentle invitation to find it. Tapping it opens the [north-star ceremony](#7-ai-involvement).
- **Then: "What I've noticed"** — the Mirror's read of you: a few recurring **themes** (chips) and a short, warm natural-language summary ("you keep returning to building something of your own; freedom shows up more than money does"). Sourced from `mirror.summary` + `mirror.structured`.
- **Then: per-pillar sections** — one block per [pillar](pillars.md), in pillar color-accent, each holding the **learned truths** the Mirror has accumulated for that facet and a **goal or two** ([`goals`](../../architecture/data-model.md)). New users see only **Lifestyle** (the single default pillar); sections appear as pillars are added.
- **Everything is editable in place.** Tap any element — the north star, a theme, a truth, a goal — to refine, confirm, or remove it. Edits are framed as *correcting the draft*, and feed straight back into the Mirror.
- **The Coach can do all of it conversationally.** From the Guide or from any other surface, "add a goal to grow my network this quarter" or "that's not quite my north star — it's about freedom, not money" just happens (the [Coach acting "from far away"](../../architecture/context-bus.md#cross-surface-action-from-far-away)).
- **The happy path:** a man who's been dumping onto the Whiteboard and checking in for a week opens the Guide. He sees three themes he recognizes, a truth per pillar that lands, and a prompt to name his north star. He talks it through with the Coach for two minutes, names it, and from then on the morning ritual greets him with that direction and the Coach grades his drift against it.

## 3. Functions & actions (exhaustive)

| Action | Manual | Via Coach | What it does | Data effect |
|---|---|---|---|---|
| Read assembled text layer | ✓ (open Guide) | ✓ (ask "what do you know about me?") | Renders north star + themes + summary + per-pillar truths + goals | reads `mirror`, `pillars`, `goals` (no write) |
| Edit a noticed theme | ✓ (tap chip) | ✓ | Rename / confirm / remove a recurring theme | patch/remove `mirror.structured.themes[]` |
| Edit a learned truth | ✓ (inline) | ✓ | Refine or delete a per-pillar truth | patch `mirror.structured` (+ snapshot) |
| Correct the "what I've noticed" read | ✓ (inline edit) | ✓ | Adjusts the compacted summary the user disagrees with | patch `mirror.summary` → new `version` |
| Co-write the north star | ✓ (start ceremony) | ✓ (Coach-led) | Values-clarification dialogue → a single named direction | write north-star record (`mirror.structured.northStar*`) |
| Re-anchor the north star | ✓ | ✓ | Revise/replace an existing north star (growth, not failure) | new north-star version; prior preserved (snapshot) |
| Confirm / dismiss a north-star candidate | ✓ | ✓ | Promote a Mirror-suggested candidate to the star, or reject it | patch `mirror.structured.northStarCandidates[]` |
| Add a goal | ✓ (per-pillar +) | ✓ | New typed goal under a pillar, with horizon | insert `goals` |
| Edit a goal | ✓ (inline) | ✓ | Change statement / horizon / pillar | patch `goals` |
| Check off / complete a goal | ✓ (check) | ✓ | Marks a goal done | patch `goals.status` |
| Re-open / drop a goal | ✓ | ✓ | Reactivate or remove a goal | patch `goals.status` |
| Re-tag a truth/goal to a pillar | ✓ | ✓ | Moves an element between pillars | patch `goals.pillarId` / `mirror.structured` |
| View drift over time (versions) | ✓ (later) | ✓ (later) | See past selves / how the picture changed | reads `mirror` history (`by_user[userId,takenAt]`) |
| Grade a capture/move against the star | n/a (automatic) | ✓ (surfaces it) | North star scores whether new captures/moves point at it | reads north star; writes `interactions` (alignment signal) |

*Manual and Coach are both first-class everywhere on this surface ([ADR 0004](../../decisions/0004-manual-and-coach-both.md)); the Coach is a power tool, not a gate.* The "view drift" row is **deferred** (see §5, §10); everything else is v1.

## 4. Dynamics & interactions
- **Context Bus:** the Guide implements `SurfaceContextProvider`. It publishes `selection` (the message/passage/element referenced — highest priority), `viewport` (the section on screen), and `surface` (the whole assembled text layer, summarized if large). It contributes the Guide tools above to the Coach's registry, and answers `resolve()` with full state when the Coach edits it from another surface. See [`../../architecture/context-bus.md`](../../architecture/context-bus.md) and PRD §4.1.
- **The Mirror — fully backed by it.** The Guide owns no primary store of its own; it is a **read/edit view onto the Mirror + pillars + goals**. Reads come from `mirror.summary` + `mirror.structured` (themes, values, north-star candidates) and the `goals`/`pillars` tables. Edits write Mirror deltas / patches and snapshot a new `version`, so a user correction is a first-class Mirror event ([`mirror.md`](mirror.md) §3–4). This is the user-facing realization of ChatGPT-memory-grade transparency — *"here's what I believe about you," viewable and editable* ([references §7, the trust standard](../../research/extraction/04-references-and-gaps.md)).
- **Pillars** organize the document: per-pillar truths + goals, in pillar accent color. The Mirror tracks per-pillar weight/activity; the Guide is where a dormant pillar becomes visibly quiet and the Coach can rebalance attention ([`pillars.md`](pillars.md) §4).
- **Every other surface feeds it.** Whiteboard placements, captures (even dismissed ones), and ritual reflections all write Mirror deltas; those deltas are exactly what the Guide later reflects back. The Guide reads *from every surface's contributions* without reading those surfaces directly — the Mirror is the join.
- **The north star grades forward.** Once named, the star is read by the Context Assembler on relevant calls and by the daily ritual: future captures and moves are scored against it (does this point where I said I'm going?), which is the anchor of the alignment/reflection loop ([ADR 0003](../../decisions/0003-reflection-loop-as-wedge.md); alignment engine itself is post-v1).
- **The Coach acts here from anywhere.** Because the Guide is Mirror-backed and exposes tools, the Coach can add a goal, refine a truth, or re-anchor the star while the user is on the Whiteboard — it calls `resolve()`, runs the tool → Convex mutation → reactive sync to wherever the Guide is rendered ([context-bus "from far away"](../../architecture/context-bus.md#cross-surface-action-from-far-away)). The north-star ceremony is **never unilateral** — the Coach co-writes, it never declares ([`coach.md`](coach.md) §3).
- **The daily ritual** reads the north star for the morning "direction" beat and writes evening reflections as Mirror deltas that surface here next time ([`daily-ritual.md`](daily-ritual.md) §4).

## 5. States
- **Empty (still learning):** the Mirror is thin. The Guide says so **honestly and warmly** — "I'm still getting to know you. Keep dumping onto the board and checking in; this fills in." No fabricated themes, no hollow truths. The north star shows as an invitation, not a blank.
- **Forming:** a handful of themes and one or two per-pillar truths have accumulated; the summary is short and hedged. Goals may be empty. The north-star slot shows **candidates** the Mirror has noticed ("freedom," "build something of my own") without yet committing.
- **Named (north star set):** the gold star holds a committed, co-written direction. The document feels anchored; the morning ritual greets the user with it; future captures/moves are graded against it. Truths and goals deepen under each pillar.
- **Evolving (re-anchored):** the user has revised the star or corrected the read at least once. Prior versions are preserved (Mirror snapshots), so growth is visible rather than overwritten — the seed of the **drift / past-selves view** (rendered later; data captured now).
- **Loading / syncing:** Convex reactive reads stream in; Coach edits made from far away appear live. Optimistic on local edits.
- **Error:** a failed assembly/compaction shows the last good version with a quiet "couldn't refresh" note; the document is never blank because the model hiccuped (see §6).

## 6. Edge cases & failure modes
- **Thin data:** never invent. Below a confidence/volume threshold, show "still learning" rather than a generic horoscope (the Reflectly failure mode — shallow, generic insight churns users; [references §10](../../research/extraction/04-references-and-gaps.md)).
- **User disagreement:** the user is always right about themselves. Any element is freely editable/removable; a correction overrides inference and is recorded as a Mirror event so the same wrong inference doesn't reappear.
- **Contradictory themes:** **hold both, surface the tension, don't flatten** ([`mirror.md`](mirror.md) §6). "Part of you wants stability; part of you keeps reaching for risk" — the contradiction is data, not an error to resolve.
- **North star vs reality drift:** when graded captures/moves consistently point away from the named star, the Guide/Coach surfaces the gap gently (one observation, not a scold) and offers to **re-anchor** — drift can mean the life is off-course *or* the star is stale; the user decides which.
- **Re-anchoring loss:** replacing the north star never destroys the prior one — it snapshots, preserving the past self (no silent overwrite of something this intimate).
- **Goal sprawl / too many pillars:** if goals or pillars proliferate into scatter, the Coach gently flags it rather than the Guide silently bloating ([`pillars.md`](pillars.md) §6).
- **Empty pillar:** a pillar with no truths/goals renders as a quiet, honest "nothing here yet" — a cue, not a void.
- **Stale summary after big change:** a large edit (or batch of new captures) can leave the compacted "what I've noticed" behind; compaction is async, so the Guide shows the latest structured records immediately and the prose catches up on the next compaction pass.
- **AI/compaction failure:** assembly degrades to the **last good Mirror version** plus directly-stored structured records and goals (which are plain DB reads, no model needed) — the Guide stays readable and editable with zero AI available (see §7).
- **Multi-device edit race:** last-write-wins per field via Convex reconciliation; snapshots mean no lost history even under a race.
- **Privacy:** this is the most intimate surface in the app (direction, fears, identity claims). It inherits the Mirror's privacy stance — the user's data, not training fodder, exportable and deletable ([`../../architecture/security-privacy.md`](../../architecture/security-privacy.md), [references §7](../../research/extraction/04-references-and-gaps.md)).

## 7. AI involvement
- **Assembly / compaction (Mirror → readable Guide):** the per-pillar truths and "what I've noticed" read are produced by the Mirror's compaction step — structured records + a rolling natural-language summary, regenerated from deltas, **never a single growing blob** (the PillarOS mistake; [`mirror.md`](mirror.md) §6–7, [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md)). Compaction is **batched/triggered and async** (higher-tier model), so the Guide read never blocks on a live call.
- **North-star ceremony (values-clarification style):** a deliberate, **higher-tier** Coach dialogue, not a form. The Coach interviews across the pillars and what the Mirror already knows, reflects patterns back, and helps the person *name* a single direction in their own words — values-clarification, drawing on the conversational-onboarding / goal-quiz lineage ([references §9](../../research/extraction/04-references-and-gaps.md)). Hard rules: **co-written, never unilateral**; output is a draft the user confirms; re-runnable any time to re-anchor ([`coach.md`](coach.md) §3, §7).
- **Edit understanding:** when the user corrects a truth or the read in natural language ("that's not quite right — it's about freedom"), the Coach maps the correction onto the right structured record and writes the patch as a Mirror delta.
- **North star grades forward:** the named star is injected by the Context Assembler on relevant calls; the daily ritual and (post-v1) alignment engine use it to score whether new captures/moves point where the user said they're going.
- **Models / config:** all processes live in the central AI config hub, server-side only ([`../../architecture/ai-layer.md`](../../architecture/ai-layer.md)). Compaction and the ceremony use the higher tier (high-stakes, low-volume); routine reads are plain DB reads.
- **Cost profile:** **cache the Mirror** (read on every relevant call — the biggest lever); compaction is batched, not per-open; the ceremony is rare and deliberate. The Guide adds little marginal cost because it mostly *renders already-computed* Mirror state.
- **Graceful degradation:** with AI down, the Guide still **reads** (last good summary + structured records + goals/pillars from the DB) and still **accepts manual edits**; only fresh compaction and the ceremony pause. The surface never hard-depends on a live model (AI-layer degradation contract).

## 8. Data touched
`mirror` (read: `summary`, `structured{values[], themes[]}` + forward fields `people[]`, `goals[]`, `northStarCandidates[]`; write: corrections/deltas + new `version`/`takenAt` snapshots), the **north-star record** (committed direction + version history, held in `mirror.structured`), `pillars` (read: per-pillar sections, accent, weight), `goals` (read/write: add/edit/check/re-tag — typed objects with `pillarId?`, `statement`, `horizon`, `status`), `interactions` (alignment/grading signals, edit events → Mirror deltas), `surfaces` (the Guide's own `surfaces` row, `type:"guide"`). Schema: [`../../architecture/data-model.md`](../../architecture/data-model.md).

## 9. Reuse & build notes
- **New surface, no direct code reuse.** Implements the standard `SurfaceContextProvider` (snapshot / tools / resolve) like every surface ([context-bus](../../architecture/context-bus.md)); concept descends from the Northbound / "life-roadmap document" design lineage and the [concept-and-soul](../concept-and-soul.md) "text layer behind the human."
- **From PillarOS (concept only):** the memory idea — but the Guide reads the **rebuilt, structured + indexed** Mirror, never PillarOS's re-sent-whole growing blob ([`mirror.md`](mirror.md) §9).
- **Data-model lesson (Tana):** goals and (later) people are **typed objects with fields**, not free text, so the Guide can render and the Mirror can reason over them ([references landscape + §3](../../research/extraction/04-references-and-gaps.md), PRD §4.2).
- **Trust-UX standard (ChatGPT memory):** the Guide *is* the "here's what I believe about you, viewable and editable" page — match that transparency or trust collapses ([references §7](../../research/extraction/04-references-and-gaps.md)).
- **v1 scope discipline:** v1 is **conversational / Mirror-backed** with an editable document read; the **richer document view and drift/past-selves visualization are deferred** (PRD §2.2 / §11 Q3, [roadmap](../../roadmap.md)). Build the Mirror-backed read + edit + north-star ceremony now; render history later (the version data is captured from day one).
- Plan: surfaces land after the spine — see PRD §10 step 7 and [`../../plans/`](../../plans/) (Plan 4: Pillars + Settings + daily ritual; the Guide is the text-layer surface in that phase).

## 10. Open questions
- **Document view vs conversational-only in v1:** how much rendered document ships in v1 vs how much stays Coach-conversational (PRD §11 Q3 leans conversational-first).
- **North-star ceremony trigger:** manual/user-initiated in v1 vs auto-suggested when the Mirror reaches enough confidence (auto later).
- **Versioning / drift visualization scope:** when and how to render past-selves and the north-star-vs-reality drift (data captured now; visualization later — depends on the alignment engine).
- **Edit granularity:** how finely the user can edit the compacted "what I've noticed" prose vs only the structured records beneath it.
- **Truth-confidence surfacing:** how aggressively to show low-confidence inferences as truths vs hold them back until reinforced ([`mirror.md`](mirror.md) §10).
