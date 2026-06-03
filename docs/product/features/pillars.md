# Feature: Pillars

**Summary:** The facets of a life as cross-cutting **typed tags** (not rigid containers). Any node, capture, or goal can belong to one or more. v1 starts with a single default **Lifestyle** pillar and a preset library to add from on tap — or create custom.
**Status:** ✅ specified
**Phase:** v1 · Plan 4 (seeded at bootstrap in Plan 1; tagging wired through Plan 2 distillation; full management UI in Plan 4)
**Surfaces:** Cross-cutting — seeded globally, managed in Settings, surfaced in the Guide, applied as tags on nodes/captures/goals, used as a filter on the Whiteboard
**Related:** [`guide.md`](guide.md) · [`settings.md`](settings.md) · [`mirror.md`](mirror.md) · [`whiteboard.md`](whiteboard.md) · [`intake-distillation.md`](intake-distillation.md) · [`coach.md`](coach.md) · [`../../decisions/0005-pillars-as-tags.md`](../../decisions/0005-pillars-as-tags.md) · [`../../architecture/data-model.md`](../../architecture/data-model.md)

---

## 1. Purpose — why it exists
A life isn't one thing. A lost young man drifts not because he has *no* direction but because the facets of his life — health, relationships, work, money, meaning — pull against each other and he can't see the whole picture at once. Pillars let the app hold the **whole person**: they give every truth, capture, and goal a place to belong, and they let the Mirror notice when one facet has gone loud and another has gone silent.

Crucially, they do this **without forcing rigid folders.** This is the deliberate inversion of PillarOS's `Pillar → Zone → Item` hierarchy (see [`../../research/extraction/02-pillaros.md`](../../research/extraction/02-pillaros.md) §8, and [`../../decisions/0005-pillars-as-tags.md`](../../decisions/0005-pillars-as-tags.md)): there, everything lived *inside* exactly one pillar, and one idea that touched both "Career" and "Health" had to be filed in one or duplicated. Real life doesn't partition that cleanly. Here a pillar is a **tag** — one idea, many facets — so the structure follows the person instead of the person bending to the structure.

Pillars keep the Guide **balanced, not just busy.** They are the dimension along which the Mirror measures attention and the Coach notices imbalance ("you've poured everything into Financial & Professional for three weeks; Family & Relationships has gone quiet"). They serve the mission — the text layer behind the human — by being the *axes* of that layer: the named facets along which "who you're becoming" is organized and read back. Ties to [`../concept-and-soul.md`](../concept-and-soul.md).

## 2. User-facing behavior
- **Day one: exactly one pillar, no setup screen.** Every user is seeded with a single default pillar — **Lifestyle** — at bootstrap. There is no onboarding wizard, no "pick your life areas" gate, no forced configuration. This is progressive disclosure (interaction contract #5): day one is dead simple; complexity is earned. The user can capture, place, and talk to the Coach for as long as they like while everything quietly tags to **Lifestyle**.
- **Pillars are ambient, not loud.** They render as subtle **chips** and **color-accents** on nodes, in the Inbox, in the Guide, and on goals — never as a heavy navigation rail or a folder tree. A node tagged `Health & Fitness` carries a small colored chip; that's the whole footprint. They are visible when relevant and invisible otherwise (interaction contract #6: ambient, not anxious).
- **Adding a pillar is one tap.** When the user wants more structure, they open the pillar manager (in Settings, and reachable inline from the Guide) and tap from a **preset library**: **Health & Fitness · Family & Relationships · Financial & Professional · Growth & Mind · Money & Freedom · Spirit & Meaning**. Each preset arrives pre-named, pre-described, and pre-colored — one tap and it exists. This echoes PillarOS's template-picker UX (the "choose from a set of pre-built starts" pattern), but produces a *tag*, not a container.
- **Or create a custom one.** A "+ Custom" affordance lets the user name their own pillar (e.g., *Music*, *Fatherhood*, *Recovery*), optionally pick a color and write a one-line description. Custom pillars behave identically to presets thereafter.
- **The Coach can do all of this conversationally.** "Add a Health pillar," "split my work stuff out into its own pillar," "tag this to relationships" — the Coach performs the same actions the user could perform by hand, from anywhere (see §3, §4).
- **Tagging is mostly automatic.** The user rarely tags anything by hand. Distillation suggests pillar tags as content comes in (§4, §7); the user can accept, change, or add. Manual tagging is always available (a chip-picker on any node/capture/goal) but is the exception, not the rule.
- **Reading by pillar.** In the Guide, the person can read a single pillar's accumulated **truths** (what the Mirror has learned about that facet) and its **goals**. On the Whiteboard, they can filter to show only one pillar's nodes. This is how scattered captures resolve into a per-facet picture.
- **Happy path, narrated:** A new user dumps thoughts for a week — gym plans, a fight with his girlfriend, a side-project idea, a quote about purpose — all silently tagged **Lifestyle**. The Coach notices the spread and offers: "Your board is touching a few different parts of your life. Want me to split them into pillars so we can track each?" He taps yes; the Coach proposes **Health & Fitness**, **Family & Relationships**, **Financial & Professional**, **Spirit & Meaning**, retags the existing nodes, and now the Guide shows four facets, each with a truth or two forming. Nothing was filed away or hidden — the same board, newly legible.

## 3. Functions & actions (exhaustive)

| Action | Manual | Via Coach | What it does | Data effect |
|---|---|---|---|---|
| Seed default pillar | — (automatic at bootstrap) | — | On first run, creates the single **Lifestyle** pillar for the user | insert `pillars` (source=`default`, weight=0) |
| Add preset pillar | ✓ (tap from preset library) | ✓ | Instantiates a library preset (name + description + color pre-filled) as a new tag | insert `pillars` (source=`preset`) |
| Create custom pillar | ✓ (name + optional color/desc) | ✓ | Creates a user-named pillar tag | insert `pillars` (source=`custom`) |
| Rename pillar | ✓ (inline edit) | ✓ | Changes a pillar's display name; tags follow (referenced by id, not string) | patch `pillars.name` |
| Recolor / edit description | ✓ | ✓ | Updates accent color or one-line description | patch `pillars.color` / `pillars.description` |
| Remove pillar | ✓ (delete control + confirm) | ✓ | Removes the pillar and detaches it from all tagged content (see §6 for retag/orphan handling) | `pillars` delete + strip id from `nodes.pillars[]`, `captures.distilled.pillars[]`, null `goals.pillarId` |
| Tag a node | ✓ (chip-picker, multi-select) | ✓ | Adds one or more pillar ids to a node | patch `nodes.pillars[]` (append) |
| Tag a capture | ✓ (in Inbox) | ✓ (auto at distill) | Adds pillar ids to a capture's distilled metadata | patch `captures.distilled.pillars[]` |
| Tag a goal | ✓ (on goal create/edit) | ✓ | Associates a goal with one pillar | patch `goals.pillarId` |
| Accept AI-suggested tag | ✓ (one tap on the suggestion) | n/a (Coach already wrote it) | Confirms a distillation-suggested pillar on a node/capture | patch `nodes.pillars[]` / `captures.distilled.pillars[]` |
| Reject / change suggested tag | ✓ (swap chip) | ✓ | Removes a suggested tag and/or substitutes another | patch the relevant `pillars[]` |
| Untag | ✓ (remove chip) | ✓ | Removes one pillar id from a node/capture/goal | patch (remove id) |
| Bulk-tag (board selection) | ✓ (tag the selection) | ✓ (e.g. "tag these to Health") | Applies a pillar to all selected nodes | patch many `nodes.pillars[]` |
| Re-tag / split into pillars | n/a | ✓ ("split my board into pillars") | Coach proposes a pillar set, creates missing ones, and re-tags existing nodes/captures in one pass | insert `pillars` + patch many `nodes.pillars[]`, `captures.distilled.pillars[]` |
| Filter Whiteboard by pillar | ✓ (filter control) | ✓ ("show me only Health") | Visually filters the canvas to one (or a set of) pillar's nodes — see [`whiteboard.md`](whiteboard.md) "Hide / show by filter" | client state (no write) |
| View pillar in the Guide | ✓ (open a pillar section) | ✓ ("how's my Health pillar?") | Shows that pillar's learned truths + goals (assembled from the Mirror) | read `mirror`, `pillars`, `goals` |
| Merge two pillars | ✗ (post-v1; see §10) | ✗ (post-v1) | Would fold one pillar's tags into another | — |

Notes:
- **Removal is not a soft-delete on tagged content.** Deleting a pillar deletes the pillar row and *detaches* the tag everywhere; the nodes/captures/goals themselves are untouched (only un-tagged or orphaned). See §6.
- **Weight is never set by hand.** `pillars.weight` is a derived/accumulated signal owned by the Mirror (§4), not a user-editable field.
- Every "Via Coach" action is a registered tool the Coach can invoke from any surface "from far away" (§4, and [`../../architecture/context-bus.md`](../../architecture/context-bus.md)).

## 4. Dynamics & interactions
- **Context Bus:** Pillars are not a surface and publish no `selection`/`viewport`/`surface` snapshot of their own; they are a **cross-cutting dimension** of other surfaces' context. The Whiteboard's `surface` snapshot already serializes each node's `pillars[]`, so the Coach sees the pillar distribution of the board for free. The pillar set itself (names, ids, weights, source) is part of the **Mirror's** structured records (`structured.pillars[]`) and therefore rides in the global slice of every assembled context. Pillars contribute their **management tools** (add preset/custom, rename, remove, tag, re-tag, filter) to the Coach's registry. See [`../../architecture/context-bus.md`](../../architecture/context-bus.md).
- **Intake & Distillation:** the front door for tags. When a capture is distilled (gpt-4o-mini, JSON-mode), the model returns `distilled.pillars[]` — the pillar(s) the content most belongs to, **chosen only from the user's existing pillar set** (the prompt is given the current pillars so it can't invent ones). On placement the node inherits the capture's tags. Most tagging in the system happens here, silently. See [`intake-distillation.md`](intake-distillation.md) §3, §7.
- **The Mirror:** pillars are the **axes of balance**. The Mirror tracks **per-pillar weight/activity** — a rolling measure of how much recent attention (captures, placements, edits, reflections, goal activity) each pillar is receiving, written as deltas from significant events. This is what makes "one facet loud, another quiet" *measurable* rather than vibes. The Mirror stores pillars as typed records (id, name, weight, source) so it can reason over them — the Tana lesson (typed objects, not a prose blob): see [`mirror.md`](mirror.md) and PRD §4.2.
- **The Guide:** the **reading** surface for pillars. The Guide organizes "who you're becoming" *by pillar* — each pillar gets a section with its learned truths and a goal or two. A pillar with thin data shows honestly ("still learning"); a dormant pillar (low recent weight) may be surfaced gently. See [`guide.md`](guide.md).
- **The Coach:** reads the per-pillar weights and the board's pillar distribution and can **rebalance attention**: it notices scatter (too many shallow pillars), notices imbalance (one pillar starved), proposes splits/merges, retags, and frames goals against under-served pillars. It performs every §3 "Via Coach" action through its tool registry, acting on pillars from whatever surface the user is on. Its interventions obey the contract — earned interruption only (it speaks when it has a specific, true observation about balance, not on a timer). See [`coach.md`](coach.md).
- **Goals:** each goal optionally hangs off one pillar (`goals.pillarId`), which is how the Guide can show "this pillar's goals" and how the Coach can notice a pillar that has truths but no goals (or goals but no recent activity).
- **The Whiteboard:** consumes pillars as a **filter/accent dimension** (color chips on nodes; filter-by-pillar view) and as a write target (tag/bulk-tag/re-tag). It does not own pillars. See [`whiteboard.md`](whiteboard.md).
- **Settings:** hosts the pillar **management** UI (the preset library, custom creation, rename/recolor/remove). See [`settings.md`](settings.md).

## 5. States
- **Default-only (new user):** exactly one pillar, **Lifestyle**, source=`default`. No chips compete for attention; everything tags here. The system is fully functional in this state — pillars never gate anything.
- **Expanding:** the user (or Coach) has added presets and/or custom pillars; content begins to spread across several tags; the Guide grows per-pillar sections.
- **Custom:** the pillar set includes user-named pillars beyond the presets; behaves identically.
- **Balanced:** several active pillars with comparable, healthy recent weight — the implicit "good" state the Coach is steering toward.
- **Imbalanced:** one or two pillars dominate recent weight while others starve — the Coach may notice and gently reflect it.
- **Dormant (per-pillar):** a pillar with little or no recent activity (low weight). Not deleted, just quiet — the Coach may ask whether it still matters, or surface a truth from it to re-engage.
- **Scattered:** too many pillars relative to actual activity — many shallow tags, none deep (see §6). The Coach flags this as a *scatter* signal, the inverse of focus.
- **Loading / syncing:** pillar set and tags load reactively (Convex); newly created pillars and tag changes appear optimistically and sync across devices.
- **Error:** a failed pillar create/rename/tag surfaces inline; the underlying content (node/capture/goal) is never blocked by a pillar operation failing.

## 6. Edge cases & failure modes
- **Too many pillars (scatter).** A man who adds twelve pillars and feeds two of them is scattering, not organizing. There is **no hard cap** (we don't punish), but the Mirror's per-pillar weights make scatter visible, and the **Coach gently flags it** ("you've got a lot of pillars but most are empty — want to fold the quiet ones together or drop a couple?"). Scatter is treated as a reflection prompt, never an error.
- **Overlapping tags (one idea, many pillars).** Fully **allowed and expected** — this is the entire point of tags-over-containers. A node about *training for a marathon to prove something to my dad* can be tagged `Health & Fitness` **and** `Family & Relationships` **and** `Spirit & Meaning`. No deduplication, no "primary pillar," no conflict. `nodes.pillars[]` is a set; the same content contributes weight to each pillar it carries.
- **Deletion with tagged content.** Removing a pillar **detaches** it, it never deletes the tagged content:
  - the pillar id is stripped from every `nodes.pillars[]` and `captures.distilled.pillars[]` that held it;
  - any `goals.pillarId` pointing at it is set to null (the goal becomes **orphaned / unpillared**, still fully present);
  - a node that had only that one tag becomes **untagged** (it does not auto-fall-back to `Lifestyle` — untagged is a valid state);
  - the removal is confirmed first, and the Coach can offer to **retag** affected content to another pillar instead of dropping it ("Delete *Money & Freedom* — want me to move its 8 items to *Financial & Professional*?").
- **Deleting the last/default pillar.** The default **Lifestyle** pillar can be renamed and recolored, and *can* be removed if the user has others — but the system guards against a user ending up with **zero** pillars by ever forcing one; if all are removed, the next bootstrap/seed check re-creates a default. (Untagged content is fine; *no pillars existing at all* is the state we avoid so the Guide always has at least one axis.)
- **Duplicate / near-duplicate pillars.** Adding a preset that already exists is a no-op (or surfaces "you already have this"); two custom pillars with the same name are allowed (ids differ) but the Coach may suggest merging. Merge is post-v1 (§10) — until then, the Coach's workaround is retag-then-delete.
- **AI suggests a pillar the user doesn't have.** Distillation is constrained to the existing set, so this shouldn't happen for tagging. If the Coach *proposes a new* pillar (e.g. during a "split my board" flow), creation is **always user-confirmed** — the AI never silently creates a custom pillar (see §7 and §10).
- **Stale tag after rename.** Tags reference pillar **ids**, not name strings, so renaming a pillar never orphans its tags. (This is why no string-rewrite migration is needed on rename.)
- **Multi-device race on tagging.** Concurrent tag edits reconcile last-write-wins on the array via Convex; because `pillars[]` is a set keyed by id, duplicate-add is idempotent and removal is order-independent.
- **Weight skew from bulk import.** A single large paste/audio dump could spike one pillar's weight; the Mirror's weight is a *rolling* recency-aware measure, so a one-time spike decays and doesn't permanently distort balance.

## 7. AI involvement
- **Pillar-tag suggestion (distillation).** During Intake & Distillation, **gpt-4o-mini** (JSON-mode, structured output) returns `pillars[]` for each capture, selecting from the user's current pillar set passed into the prompt. Highest-volume pillar-related AI call — kept cheap and batched alongside the rest of distillation. Prompts live with the AI config hub. See [`intake-distillation.md`](intake-distillation.md) §7 and [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md).
- **Balance / scatter detection (Coach).** Reading per-pillar weights from the Mirror plus the board's pillar distribution, the Coach reasons about imbalance (a starved pillar), scatter (too many shallow pillars), and dormancy (a quiet pillar), and decides whether there's something specific and true enough to say (earned interruption). This is reasoning over the already-assembled context, not a separate model.
- **Split / re-tag proposals (Coach, agent loop).** When asked (or when it has a strong observation), the Coach proposes a pillar set and a re-tagging, then — on user confirmation — executes creates + tag patches via its tools across the multi-turn loop.
- **AI does not auto-create custom pillars unprompted.** Creation of a *new* pillar is always surfaced and confirmed by the user; the model suggests, the human decides. (Open question on relaxing this: §10.)
- **Degradation:** if AI is down, pillars are fully usable by hand — seed, add preset/custom, rename, remove, tag, filter, and read-by-pillar all work without the model. Only *automatic* tag suggestion and *balance reflections* pause; captures still land (untagged or user-tagged), distillation retries, and nothing about pillars hard-depends on the model. See [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md).

## 8. Data touched
- **`pillars`** — the typed tag table: `{ userId, name, description?, weight, source, createdAt }`, where `source: "default" | "preset" | "custom"` and `weight` is the Mirror-owned per-pillar activity signal. v1 seeds exactly one row, **Lifestyle** (source=`default`), at bootstrap. (Reads/writes: create, rename, recolor/describe, remove, weight updates.)
- **`nodes.pillars[]`** — array of pillar ids tagging a node (set; multi-pillar; written manually, by bulk-tag, or inherited from a placed capture). See [`../../architecture/data-model.md`](../../architecture/data-model.md).
- **`captures.distilled.pillars[]`** — pillar ids suggested at distillation and/or set in the Inbox; a placed node inherits these.
- **`goals.pillarId?`** — optional single-pillar association for a goal (nulled on pillar removal).
- **`mirror.structured.pillars[]`** — the pillar set as typed records inside the Mirror (id, name, weight, source), so global context and the Guide can reason over balance; updated by deltas.
- **`interactions`** — pillar events (add/remove/rename/tag/re-tag) logged as the source of Mirror weight deltas.
- Schema: [`../../architecture/data-model.md`](../../architecture/data-model.md). Pillar seeding is part of bootstrap (Plan 1, `profiles.bootstrappedAt`).

## 9. Reuse & build notes
- **From PillarOS (echo the UX, invert the model):** the **preset/template-picker** interaction — "choose from a set of pre-built starts, one tap to instantiate" — echoes PillarOS's pillar **template chooser / architect** flow (see [`../../research/extraction/02-pillaros.md`](../../research/extraction/02-pillaros.md) §10). We keep that one-tap-to-add feel for the preset library.
- **Deliberately do NOT port the container model.** PillarOS's `Pillar → Zone → Item` hierarchy (everything filed *inside* one pillar; spatial zone-snap assigning items to a single pillar; `pillarId` baked into the canvas render filter — extraction §8, §9) is exactly the rigidity we invert. Here a pillar is a **tag** (`nodes.pillars[]`, a set), not a parent: no zones, no single-owner filing, no `pillarId` on the node. This is the core decision recorded in [`../../decisions/0005-pillars-as-tags.md`](../../decisions/0005-pillars-as-tags.md).
- **Data model is new.** No PillarOS table maps over; `pillars` is a fresh tag table with `source` and a Mirror-owned `weight`. Soft-delete/`userId`-isolation conventions are reused from the extraction's general schema lessons, but pillar *removal* is a detach (strip ids), not an `isActive=false` on the tagged content.
- **Tagging piggybacks on existing pipelines.** Tag-on-distill reuses the Intake & Distillation structured-output call (one extra field), and the Coach's pillar tools reuse the standard tool-registry + rich-data-return contract — no bespoke pillar machinery.
- Plan: pillars are **seeded** in Plan 1 (bootstrap), **tagged** through Plan 2 distillation, and get their **management UI + Guide-by-pillar + Coach rebalancing** in Plan 4. See the roadmap and [`../prd.md`](../prd.md) (F5b, build sequence step 7).

## 10. Open questions
- **Final default preset list.** Current set: Health & Fitness · Family & Relationships · Financial & Professional · Growth & Mind · Money & Freedom · Spirit & Meaning. *Money & Freedom* and *Financial & Professional* overlap — keep both, merge, or rename one? (PRD Q4 resolved the *approach*; the exact roster is still tunable.)
- **AI auto-creation of custom pillars vs always user-confirmed.** v1 is always-confirmed. Should a high-confidence Coach be allowed to create a clearly-needed pillar and tell the user after, rather than asking first?
- **Merge support.** Merging two pillars (fold one's tags into another) is post-v1; until then the workaround is Coach retag-then-delete. When does merge become first-class?
- **Whether pillars get their own mini-surface later.** v1 surfaces them only as chips + Guide sections + a Settings manager. A dedicated pillar view (per-facet dashboard) may come later — does that conflict with "one thing per screen / never a dashboard"?
- **A "primary" pillar per node?** Currently all tags are equal. Is there ever value in a weighted/primary tag for accent-color and Guide-placement tie-breaks, or does that reintroduce container-thinking we deliberately rejected?
- **Scatter threshold.** How many empty/low-weight pillars before the Coach flags scatter, and how to tune it so it reflects rather than nags.
