# Pillars

**Status:** partial (domain data + Life Wheel visualization built; Temple/Orbit/Tree not built; the goals relation is schema-only) · **Element of:** the Core · **Owns:** `pillars` (shared with [the file system on the human](file-system-on-the-human.md))

> The large life domains that make a person, as one master data object every surface can read and write — and a first visual lens onto it, the Life Wheel. Identity is not one of them; it is what they hold up (see [ADR 0022](../../decisions/0022-identity-is-not-a-pillar.md)).

## 1. Purpose

A lost person is not weak in one place; he is undefined across the whole of life. Pillars name the parts that hold him up — body, work, relationships, mind, and more — so that becoming whole means strengthening each, not over-indexing one. Where [the file system on the human](file-system-on-the-human.md) treats a pillar as a **folder of textual files**, this feature treats the same row as a **domain with a current-state reading** — a number the person (or eventually the Coach) can look at and say "this part of my life is strong" or "this one needs attention." The Life Wheel is the first place that reading becomes visible: one glance at the whole shape of a life, not eight separate documents.

## 2. User-facing behavior

Opening the **Core** shows the Life Wheel above the Blueprint sections: a radar chart with one axis per domain pillar (the canonical skeleton minus "Identity & Values" — see ADR 0022), each axis plotted at that pillar's current strength (0-100). Below the chart, each domain has a slider; dragging it and releasing rates that pillar directly, which redraws the wheel immediately. A pillar nobody has rated yet sits at the dead center-ish neutral point (50) rather than at zero, so a fresh account reads as "not yet known," not "failing."

There is no separate "add/remove domain" flow here — that already exists via [Pillars & Goals](pillars-and-goals.md)'s preset/custom pillar picker (unchanged by this feature) and [the file system on the human](file-system-on-the-human.md)'s canonical-skeleton seeding. This feature only adds a **reading** on top of pillars that already exist, plus the chart that shows it.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| View the Life Wheel | open the Core | renders every domain pillar's current strength as a radar chart | Manual | reads `pillars` · **BUILT** |
| Rate a pillar's strength | drag a slider under the wheel | sets `pillars.strength` (clamped 0-100) + `strengthUpdatedAt` | Manual | writes `pillars` · **BUILT** |
| Clear a rating | `pillars.setStrength` with `strength: undefined` | pillar reverts to "unrated" (neutral 50 on the wheel) | Manual | writes `pillars` · **BUILT** (no UI entry point yet — callable, not wired to a button) |
| Coach reads domain strengths | any Coach reply | `pillars.assembleContext` publishes a context fragment of each domain's strength | Coach | reads `pillars` · **BUILT** |
| Coach rates a pillar | (not built) | the Coach could call `pillars.setStrength` from a conversation the way it can propose pillars elsewhere | Coach | **PROPOSED** |
| Link a goal to a pillar | (not built) | `goals.pillarId?` exists on the schema; no UI sets it, no query reads it back for the wheel yet | — | **PROPOSED** (schema only) |
| Infer strength from activity | (not built, ARI-16) | derive `strength` from session/coreFiles signal instead of a manual dial | system | **PROPOSED**, explicitly out of scope here |
| Temple / Orbit / Tree visualizations | (not built) | the three other brainstormed hero visualizations over the same data | — | **PROPOSED**, out of scope here |

## 4. Dynamics and interactions with other elements

- **Owns** nothing new — it extends `pillars`, already owned by [the file system on the human](file-system-on-the-human.md) (ADR 0007). One table, two lenses: folders-of-files (Center/Listener) and domain-with-a-strength (this feature). Per [ADR 0022](../../decisions/0022-identity-is-not-a-pillar.md), a second table was deliberately rejected.
- **The Core** hosts the Life Wheel directly (`components/core/Core.tsx` renders `components/core/PillarWheel.tsx` above the Blueprint sections).
- **The Coach** draws domain strengths at act-time via `pillars.assembleContext`, alongside the Mirror (`convex/coach.ts`), so a reply can be grounded in "your Work & Money pillar reads low right now" without holding a copy of pillar state.
- **Sessions** and **goals** do not read pillar strength yet; `goals.pillarId?` is the relation ARI-11 was asked to lay down so a later goals-board pass (or the Coach) can connect "what I'm doing" to "what it builds" without another schema change. Nothing reads or writes it today.
- **Explicitly not wired here** (named out of scope by the ticket that shipped this): ARI-17 (Core living person-model), ARI-16 (current-state/gap engine — would replace manual `strength` with an inferred one and add history), ARI-13 (self-elements), ARI-2 (Zen/Conversational Core). `role`, `strength`, `strengthUpdatedAt`, and `goals.pillarId?` are shaped as the foundation those plug into.

## 5. States

- **Unrated.** `strength` absent. Plots at neutral (50); UI shows "unrated."
- **Rated.** `strength` set 0-100; `strengthUpdatedAt` stamped.
- **Identity pillar.** `role: "identity"` — filed into like any other pillar (unchanged from ADR 0007) but excluded from the wheel and from `assembleContext`; never rated.
- **Domain pillar.** `role: "domain"` (or absent, back-compat) — everything else: seeded canonical, preset, or custom.

## 6. Edge cases

- **No pillars yet (mid-bootstrap).** `pillars.wheel` returns `[]`; the component shows "No pillars yet" rather than an empty chart.
- **A pillar added after the skeleton (preset/custom).** Defaults to `role: "domain"`, unrated — appears on the wheel at neutral immediately, no special-casing needed.
- **Only the identity pillar exists (degenerate account state).** The wheel would render zero axes; the component guards `n === 0` the same as the empty-pillars case.
- **Two users' pillars.** `setStrength` checks `pillar.userId === userId` and throws otherwise — the same ownership pattern as `horizons.update`/`remove`.
- **Rapid re-rating.** Each `setStrength` call is a full patch (last write wins); no queuing/merge logic needed since the client already reflects local drag state before the mutation lands.

## 7. AI involvement

Read-only for now: the Coach *sees* domain strengths (`pillars.assembleContext`, priority 5 alongside the Mirror's priority 6, so identity/values still outrank domain strength when the context budget is tight) but does not yet *write* them. Provider/model class and context budgeting follow [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) — this fragment is plain text, no separate model call.

## 8. Data touched

**Extends (shared with [the file system on the human](file-system-on-the-human.md)):** `pillars { …, role?: domain|identity, strength?, strengthUpdatedAt? }`. **Extends:** `goals { …, pillarId? }` (relation only, unread/unwritten by any UI yet). Exact shapes + indexes in [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Reads:** nothing beyond `pillars` itself.

## 9. Open questions

- **Does a slider read as too clinical for a "soulful" self-rating?** The brief paired the Life Wheel with a soulful hero view (Orbit/Tree) precisely because the wheel is the *precise* one. A future pass may want a gentler input (e.g., a short Coach-guided check-in that sets the number for you) rather than a raw 0-100 drag.
- **When does `strength` become partly inferred?** ARI-16 owns this; the field and its "unset = neutral 50" convention should hold either way, but the exact blend of manual vs. inferred (does a Coach-set value defer to the person's last manual override?) isn't decided.
- **Should `goals.pillarId?` be single or multi- (like `nodes.pillars[]`)?** Left single for symmetry with `coreFiles.pillarId` and because no UI exists yet to stress-test the choice; revisit when goals-board pillar linking actually ships.
- **Temple / Orbit / Tree.** Which one becomes the soulful hero pairing, and does it get its own feature doc or live as a mode of this one? Not decided; not started.
- **Custom pillars and the wheel.** A person could add many custom pillars, making the wheel crowded. No cap or "pin to wheel" mechanism exists yet.
