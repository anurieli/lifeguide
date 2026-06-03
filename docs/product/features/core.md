# Feature: The Core (Life Blueprint surface)

## Purpose
The Core is the enduring "who you are" layer beneath the daily Sessions, the long-lived context stream. It is the in-app home of the recovered **Life Blueprint**: 3 sections, 18 questions, that the person answers in their own words. It is what was missing when the blueprint existed only as recovered files (`docs/product/blueprint/`) with no screen to hold or edit it.

## User-facing behavior
- A **Core** item in the rail nav (gem icon), between Today and Board.
- The surface shows the three blueprint sections in order — **Crafting Your Persona**, **Setting Your Goals**, **Forging Your Mindset** — each with its section intro.
- Each of the 18 questions renders as a card: title, a **malleability** indicator (colored dot + label), the question's prompt/description, and an editable multi-line answer.
- Malleability levels (from the original blueprint): **green** = freely changeable, **yellow** = change with weight, **red** = core, change rarely.
- Answers **autosave on blur** (when the field loses focus and the value changed); a brief "Saved ✓" confirms.
- Empty questions show the original example as placeholder text (`e.g. …`).

## Functions / actions
- `convex/core.ts` → `get` (query): returns the signed-in user's answers as a `{ questionKey: content }` map.
- `convex/core.ts` → `save` (mutation): upserts one answer by `(userId, questionKey)`.
- `lib/blueprint.ts`: the fixed skeleton (sections, questions, malleability, description, example), auto-generated from `docs/product/blueprint/blueprint.json`. Question keys are `s{sectionOrder}q{index}` (e.g. `s1q0`).

## Dynamics & interactions
- **Mirror / Guide**: the Core is the raw, structured self-description; the Guide's Mirror is a *synthesized* reflection. They are distinct (raw answers vs. distilled summary). Future: the Mirror can be (re)generated from the Core.
- **Coach**: the Coach dock context label includes a "sees your Core" state for the Core view. Feeding actual Core content into the Coach's assembled context is a follow-up (today it reads the Mirror).
- **Today / north star**: `settings.northStar` (shown on Today and Guide) is independent of the Core's "Paint a North Star" question for now.

## States
- Loading: `core.get` returns `undefined` until loaded; fields render empty then populate.
- Empty (new user): all fields blank with example placeholders; nothing is written until the user types and blurs.
- Populated: answers shown; editing + blur upserts.

## Edge cases
- The blueprint has two section-1 questions sharing `order = 6` ("My Mantra", "Strengths"); keys use array index, so both are distinct (`s1q5`, `s1q6`).
- Whitespace in recovered titles (e.g. "Strengths ") is trimmed when mapping recovered answers to keys.

## AI involvement
- None at write time (manual reflection). The Core is intended as a future context source for Mirror generation and Coach grounding.

## Data touched
- New table `coreResponses` (`userId`, `questionKey`, `content`, `updatedAt`; index `by_user_question`). See `docs/architecture/data-model.md` when rebuilt.
- The section/question skeleton is **code config** (`lib/blueprint.ts`), not a table — the blueprint is fixed and rarely changes.

## Reuse source
- Structure + content recovered from the original LifeGuide (`~/lifeguide`, Supabase `guide_sections`/`guide_subsections`/`user_responses`), preserved in `docs/product/blueprint/`.

## Open questions
- Should the Core surface the section/question *subdescriptions* and *malleability_details* (richer guidance) the original stored, behind a "why this matters" expander?
- Should completing/editing the Core trigger Mirror regeneration?
- Multi-user blueprint seeding: today the skeleton is in code; if questions become user/admin-editable, move the skeleton into a table.
