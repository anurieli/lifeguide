# Research: Current-state layer + the gap engine

> **Type:** research / investigation note (not spec, not committed design).
> **Tracked in:** [ARI-15](https://linear.app/cuttheedge/issue/ARI-15) · **Item issue:** [ARI-16](https://linear.app/cuttheedge/issue/ARI-16)
> Parked from the commitment gate, brainstorm 2026-06-04.

---

## 0. The question, stated plainly

The product's job is "helping them get there." To do that the system must know two things per part of a life: **where you want to be** and **where you actually are right now.** The schema today holds the first and almost none of the second.

> **What is the smallest data addition that lets us hold "where you are now," compute the gap to "where you want to be," and track whether that gap is closing over time?**

---

## 1. The engine (one line)

> **desired − current = gap → goals close the gap → daily sessions execute → new current readings → recompute the gap.**

That loop *is* the product. Goals are the bridge across the gap; sessions are the execution; the gap is the thing every surface and agent orients toward.

## 2. What the schema holds today, by layer

- **Desired / identity (live):** `coreResponses` (the 18-question Blueprint, mostly aspirational) + `mirror` (synthesized you). This is "where you want to be" and "who you are."
- **Execution (proposed):** `goals` (life→daily horizons, with `why`) + `sessions`/`prompts` (the temporal stream). The bridge and the daily work.
- **Current standing (missing):** there is **no held, per-domain reading of where you are right now.** The Sessions stream starts empty and runs forward; the Core is aspirational. Nothing captures present state per life area.

The retrospective Ariel wanted ("the last 6–12 months, meticulously") is the **first deposit into this missing layer.**

## 3. Proposed shape (to validate, not commit)

Per component (pillar), a **versioned reading**:

```
reading {
  userId, componentId,
  kind: "current" | "desired",
  text, structured?,
  confidence,
  takenAt,
  sources[],            // interactions/dumps that fed it
}
```

- **Versioned** because the *sequence of `current` readings over time is the trajectory* — closing the gap vs drifting.
- The **gap** is derived from latest-`current` vs `desired` and **cached on the component** so the Coach + per-pillar agents act on it cheaply and staleness/reminders work without recomputing everything.
- "Desired" likely **mirrored onto the component** (not only in Core/goals) so current and desired sit side by side and the gap is local. (Open question — see §5.)

## 4. How it touches the spine

- **Context Bus:** the gap becomes a first-class **drawable fragment** per component. Gap-awareness generalizes from "this is missing" to "this is missing / aging / widening."
- **Depends on** the living component registry ([ARI-17](https://linear.app/cuttheedge/issue/ARI-17)) for the components the readings hang off.
- **Fed by** the brain-dump valve ([ARI-18](https://linear.app/cuttheedge/issue/ARI-18)): a dump synthesizes into `current`/`desired` readings.

## 5. Open questions

- Does `desired` live only in Core/goals, or is it mirrored onto each component? (Leaning: mirror it, so the gap is local and computable in one place.)
- Is the gap purely derived, or is a human/AI-authored "gap statement" also held per component?
- How is "current" decayed? A 6-month-old `current` reading is not current. Ties to `refreshCadence`/freshness in ARI-17.
- Trajectory math: is "closing the gap" a model judgment over the readings history, or a structured signal?

## 6. Where it lands when committed

`docs/architecture/data-model.md` (the readings + cached gap) and `docs/architecture/context-bus.md` (gap as a drawable fragment, gap-awareness section). An ADR for "current-state as a versioned readings layer" is likely warranted.
