# Research: The micro-interview as the universal brain-dump valve

> **Type:** research / investigation note (not spec, not committed design).
> **Tracked in:** [ARI-15](https://linear.app/cuttheedge/issue/ARI-15) · **Item issue:** [ARI-18](https://linear.app/cuttheedge/issue/ARI-18)
> Parked from the commitment gate, brainstorm 2026-06-04. Ariel flagged this one as **very important.**

---

## 0. The question, stated plainly

> **Is the micro-interview the single, universal way a person writes into their own model — and if so, do onboarding and journaling collapse into one mechanism?**

Ariel's framing: the micro-interview is basically a **brain dump.** It can be a *question of the day*, or it can be a *journal entry*. Same valve.

---

## 1. The idea

The micro-interview is the **one universal write** into the person-model. Two flavors over the same mechanism:

- **Prompted** — a "question of the day," aimed at a component that is empty or going stale.
- **Freeform** — an open brain dump / journal entry that lands wherever it fits.

This unifies three things otherwise built separately: **onboarding, journaling, and gap-filling are one act** (brain dump) writing into **one model** (components), watched from **one map** (admin). **Onboarding is just the first heavy round of brain dumps; the journal is the same valve, forever.**

## 2. What it implies for the data model

Today there are two intake stores:
- **`interviewSessions`** (live) — onboarding interviews (one session fills all 18 Blueprint questions, transport text or voice).
- **`sessions` / `prompts`** (proposed, `data-model.md`) — the temporal journal stream.

The "it's all a brain dump" insight means these likely **converge into one dump stream** that targets components and is synthesized into `current`/`desired` readings ([ARI-16](https://linear.app/cuttheedge/issue/ARI-16)). This is a real merge, flagged here, not assumed.

## 3. The gate becomes principled

The hard onboarding gate Ariel wants ("you earn your space; finish before you can use the app for real") stops being arbitrary. "Done" is no longer **N screens clicked** — it's **the model is sufficiently filled for the Coach to be genuinely useful.** The gate reads the component registry's fill/freshness, not a wizard step count. (This reverses the current docs' "never trapped in the wizard" stance — a deliberate decision to record in an ADR.)

## 4. Existing pieces to reuse (no duplication)

- The **interview engine** (`convex/interview.ts`, `lib/interview/policy.ts`, the experience registry) already does one-question-at-a-time over any transport, with skip/circle-back. The brain-dump valve generalizes its *target* from "Blueprint keys" to "components."
- **[ARI-8](https://linear.app/cuttheedge/issue/ARI-8)** (board brain-dump: speak → populates the board) is a **special case** of this valve aimed at the Vision Board.
- **[ARI-2](https://linear.app/cuttheedge/issue/ARI-2)** (Core Zen ↔ Conversational mode) is the same intake family — written vs spoken on-ramps to the same write.

## 5. Open questions

- Does the freeform dump get *routed* to components by the synthesizer, or does the user tag the target? (Leaning: synthesizer routes, user can correct.)
- Voice as the primary brain-dump transport (building on the existing Realtime voice stack) vs text-first?
- What is the "sufficiently filled" threshold for the gate, per component or aggregate?
- Does merging the intake streams break the existing onboarding flow mid-flight? Sequencing matters (ARI-17 registry → ARI-16 readings → this).

## 6. Where it lands when committed

`docs/product/features/interview.md`, `onboarding.md`, and a `journal.md` (the valve), plus `docs/architecture/data-model.md` (the unified dump stream), and an **ADR** for both the stream merge and the gate-stance reversal.
