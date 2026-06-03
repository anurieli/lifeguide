# <Element / Feature name>

**Status:** <draft | spec | built | partial> · **Element of:** <which stream it feeds: Core / Sessions / spine> · **Owns:** <tables, or "view-only">

> One-line statement of what this element is and the one job it does.

## 1. Purpose
Why this element exists, in terms of the soul (answering lostness). What it gives the person that nothing else does.

## 2. User-facing behavior
What the person sees and does, in plain language. The happy path, start to finish. Manual interaction AND Coach-driven interaction are both first-class.

## 3. Functions / actions
Every action this element supports. One row per action. Cover both manual and Coach paths.

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|

## 4. Dynamics and interactions with other elements
How this element **owns** vs **draws** (per [`../../architecture/context-bus.md`](../../architecture/context-bus.md)). What it publishes to the streams; what it draws at act-time and why. Name the specific other elements.

## 5. States
The states this element and its objects move through (empty, in-progress, complete, conflicted, archived). What each looks like.

## 6. Edge cases
The awkward, the conflicting, the empty, the offline, the malformed. What happens and why.

## 7. AI involvement
Where the model is in the loop: distillation, prompt adaptation, curation, generation. Which provider/model class, what context it draws, what it writes back. See [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md).

## 8. Data touched
The exact tables and fields, referencing [`../../architecture/data-model.md`](../../architecture/data-model.md). Owned vs drawn, clearly split.

## 9. Open questions
What is not yet settled, to decide as we build.
