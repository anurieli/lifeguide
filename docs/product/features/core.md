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

### Zen view (built — Slice 1 of the Zen Core)
The Core surface has two modes, toggled by an inviting **Zen** pill at the top of the grid:
- **Grid** (above): all 18 questions at once, autosave on blur.
- **Zen** (`components/core/ZenCore.tsx`): a calm, one-question-at-a-time scene. The question is plain text (serif title + prompt) on a quiet field; the previous and next question titles sit faint above and below. The answer is a real **TipTap/ProseMirror** editor (`components/core/ZenEditor.tsx`, `.zen-prose` in `app/globals.css`): markdown input rules (`- ` → bullet, `# ` → heading), content persisted as **Markdown** into `coreResponses.content` (Mirror-readable), instant focus, debounced autosave (~600ms) with a "Saving…/Saved" indicator. The editor is **remounted per question** (keyed) so each field is isolated; the scene waits for `core.get` before mounting so the first question shows its saved answer.
  - **Keyboard** (defaults, to become remappable in Settings): `Enter` = newline / continue list · `⌘/⇧+Enter` = next · `⌘/⇧+Backspace` = previous.
  - **Scroll** (wheel/trackpad): one question per gesture with a soft slide.
  - **Timeline rail** (left): grayscale ticks whose length grows toward the current question (a fisheye for "where am I"); current is thickest with a dot, answered stay bold, far ones fade, gaps mark sections. On hover it expands into the Core **table of contents** (sections/questions, current highlighted, click to jump). The global app rail sits to its left — Zen is embedded in the shell, not a fullscreen escape.
  - **Header**: scrolling up at the first question reveals a slim header (Core · answered count · grid toggle).
  - **Speak**: a quiet text affordance under the editor dictates via the browser Web Speech API, appending into the field (to later swap to the app's voice stack).
  - **Theme**: ships in the app's light/paper theme (no dark mode app-wide yet).
- Full design + the not-yet-built slices (holes + section gating; commit/lock + the trajectory change log) live in `docs/superpowers/specs/2026-06-03-zen-core-design.md`.

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
