# The Core

**Status:** partial · **Element of:** Core · **Owns:** `coreResponses` (the raw Blueprint answers) + `mirror` (the synthesized self)

> The Core is the enduring "who you are" stream and the heart of the Mirror. Its one job: hold and keep honest the text layer behind the human, shaped by the Life Blueprint, published to everything.

The Core has two halves: the **raw backbone** (the person's own answers to the Life Blueprint) and the **synthesized self** (the Mirror, distilled from those answers and everything else).

### Modes of the Core
The Core can be filled three ways, all writing the **same** answers (`coreResponses`, keyed by the 18 blueprint keys) so progress carries across modes. The mode machine lives in `components/core/Core.tsx` (`grid | zen | conversational`):
- **Grid** — all 18 questions at once, autosave on blur (the default surface; each field is a `VoiceField`).
- **Zen** — the calm, one-question-at-a-time scene (below).
- **Conversational** (`components/core/ConversationalCore.tsx`) — building the Core by talking, a guided back-and-forth that fills the same Blueprint. **Scaffold only (ARI-2, Slice 0):** the mode, the switch affordances, and the shared data binding (reads `core.get`, shows the same answered-count) are built; the real conversation engine — the voice/chat loop that maps free-flowing talk onto the question keys — plugs in as a thin surface over the `voice-field` work (marked in the component). Honors the concept's "manual AND Coach are both first-class" principle.

**Switching:** the grid offers the **Zen** pill; inside Zen, the rail header offers **Talk** (→ Conversational) and **Exit Zen** (→ grid); Conversational's header offers **Zen** and **Grid**. No data is lost switching, since all three bind the same `coreResponses`.

### Zen view (built — Slice 1 of the Zen Core)
- **Zen** (`components/core/ZenCore.tsx`): a calm, one-question-at-a-time scene. The question is plain text (serif title + prompt) on a quiet field; the previous and next question titles sit faint above and below. The **prompt shows in full** (no line clamp — the whole invitation is readable), and `*word*` spans in the prompt source render **bold** (e.g. the *HUMAN* you want to be), letting a prompt land its emphasis. The answer is a real **TipTap/ProseMirror** editor (`components/core/ZenEditor.tsx`, `.zen-prose` in `app/globals.css`): markdown input rules (`- ` → bullet, `# ` → heading), content persisted as **Markdown** into `coreResponses.content` (Mirror-readable), instant focus, debounced autosave (~600ms) with a "Saving…/Saved" indicator. The editor is **remounted per question** (keyed) so each field is isolated; the scene waits for `core.get` before mounting so the first question shows its saved answer.
  - **Keyboard** (defaults, to become remappable in Settings): `Enter` = newline / continue list · `⌘/⇧+Enter` = next · `⌘/⇧+Backspace` = previous.
  - **Scroll** (wheel/trackpad): one question per gesture with a soft slide.
  - **Timeline rail** (left): grayscale ticks whose length grows toward the current question (a fisheye for "where am I"); current is thickest with a dot, answered stay bold, far ones fade, gaps mark sections. On hover it expands into the Core **table of contents** (sections/questions, current highlighted, click to jump), topped by a **rail header** (`◆ Core` + a **Talk** switch to Conversational + an **Exit Zen** back control that returns to the grid). The global app rail sits to its left — Zen is embedded in the shell, not a fullscreen escape.
  - **Exit affordances** (three calm ways out, never bombarding): the rail header's **Exit Zen** control (above); a **subliminal "Exit Zen"** in the top-right corner, faint by default (opacity ~0.3) and brightening on hover, hidden while the scroll header is showing so the two never double up; and the scroll-revealed header below.
  - **Header**: scrolling up at the first question reveals a slim header (Core · answered count · grid toggle).
  - **Speak**: a quiet text affordance under the editor dictates via the browser Web Speech API, appending into the field (to later swap to the app's voice stack).
  - **Theme**: ships in the app's light/paper theme (no dark mode app-wide yet).
- Full design + the not-yet-built slices (holes + section gating; commit/lock + the trajectory change log) live in `docs/superpowers/specs/2026-06-03-zen-core-design.md`.

**Built today (the Core surface):** the Life Blueprint is now a real surface in the app, not just recovered files. A **Core** rail item (gem icon) shows the 3 sections and 18 questions, each with its malleability dot (green / yellow / red), prompt, and an editable answer that autosaves on blur. The fixed skeleton is code config in [`../../../lib/blueprint.ts`](../../../lib/blueprint.ts) (auto-generated from [`../blueprint/blueprint.json`](../blueprint/blueprint.json), keys `s{section}q{index}`); the user's answers live in the `coreResponses` table via `get` / `save` in [`../../../convex/core.ts`](../../../convex/core.ts). The Mirror (`mirror` table, basic `assemble` / `current` / `recordDelta` in [`../../../convex/mirror.ts`](../../../convex/mirror.ts)) is the distinct synthesized layer.

**Proposed:** gap-awareness, and the Coach's curation pass that (re)generates the Mirror from the raw backbone plus the streams. This doc specs the whole; the proposed parts ship as the curation loop lands.

## 1. Purpose

A lost person cannot see himself. The Core is the part of LifeGuide that holds, in plain text, who he is and who he is becoming, and keeps it current as he changes. It is the "text layer behind the human" from [`../concept-and-soul.md`](../concept-and-soul.md), made into a single owned store. Nothing else in the app holds identity; the Vision Board holds the world he wants, the Journal holds his days, the Future Self holds his image. The Core holds the synthesized *him*, so that every surface can greet him, prompt him, and pull him back toward the same one self.

Its skeleton is the **Life Blueprint** (3 sections, 18 malleability-tagged questions). The full backbone lives in [`../blueprint/the-life-blueprint.md`](../blueprint/the-life-blueprint.md) and [`../blueprint/blueprint.json`](../blueprint/blueprint.json); it is not restated here. The Core is not a wall of forms. The Blueprint is the frame; the Mirror fills it in over time, ambiently.

## 2. User-facing behavior

The person rarely touches the Core directly. He lives in the surfaces; the Core fills behind them.

- **Manual.** He answers Blueprint questions when he chooses (in onboarding, or later from the Guide), and he can edit any synthesized answer he disagrees with. He sees the Core rendered back to him on the **Guide** (north star, the Mirror summary, the pillars, the backbone answers) and can correct it there.
- **Ambient.** Most of the Core accrues without him filling forms. A capture placed on the Vision Board, a Coach exchange, a morning or night session, an image added to the Future Self: each emits distilled text, and the Coach curates that signal into the Core. Over weeks the backbone fills itself.
- **Coach-driven.** The Coach asks the unanswered questions when the moment fits, reflects back what it has synthesized ("here is who I think you are"), and when new signal contradicts what the Core holds, it surfaces the conflict and the person decides. It never silently overwrites.

The happy path: onboarding seeds an empty Mirror and a north star. Days pass; captures, sessions, and Coach exchanges accumulate as `interactions`. The Coach's curation pass re-synthesizes the Mirror, filling backbone entries, raising confidence, bumping `version`. The Guide shows a fuller and fuller picture of him. When something conflicts, he is asked, not overridden.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| `assemble` | any element drawing the Core slice | Returns the Core context fragment (summary, values, themes, north star, settled backbone) for the assembler | system (draw) | reads `mirror` |
| `current` | Guide render, Coach load | Returns the latest `mirror` snapshot | system (draw) | reads `mirror` |
| `recordDelta` | meaningful event (today: a theme) | Appends a delta to the latest snapshot; minimal path until full curation lands | Coach / system | patches `mirror` |
| Curate (re-synthesize) | curation pass, on meaningful `interactions` or schedule | Runs accumulated signal through the hard filter; rewrites `summary` + `structured`, fills backbone entries, recomputes confidence and gaps, bumps `version` | Coach | reads `interactions`; writes new `mirror` version |
| Surface conflict | curation detects signal contradicting a held entry | Holds the change, raises it to the person via the Coach; does not write until he decides | Coach | reads `mirror` + `interactions`; writes only on decision |
| Answer a backbone question | onboarding, Guide, or a blueprint-origin prompt | Fills or strengthens one backbone entry; clears that gap | Manual or Coach | writes `mirror.structured.backbone[id]` |
| Edit a synthesized answer | person corrects the Core on the Guide | Overrides the synthesized text; raises confidence; marks it person-authored | Manual | writes `mirror.structured.backbone[id]` |
| Recompute gaps | after any curation or answer | Recomputes unanswered backbone questions + themes that fit no pillar | system | writes `mirror.structured.gaps` |
| Publish curation event | after a curation pass | Writes `coach.curation` to the Bus so other elements know the Core moved | Coach | writes `interactions` |

## 4. Dynamics and interactions with other elements

Per [`../../architecture/context-bus.md`](../../architecture/context-bus.md), the Core's edges split cleanly into owns and draws.

**Owns (publishes "who you are").** The Core owns `mirror` and nothing else. It publishes the synthesized identity into the **Core stream**, the slow-changing half of the two streams. Everything that renders or reasons about the person draws this:

- **Guide** draws the Core to render him (north star, Mirror, pillars, backbone). The Guide owns no data; it is the Core's read-only face.
- **Journal / Sessions** draws the Core (with Goals) to shape each day's prompts, and turns Core gaps into `blueprint`-origin prompts.
- **Future Self** draws the Core (with the Vision Board) to generate him living the life he wants.
- **Coach** draws the Core every time it speaks about *him* rather than his day.

**Draws (to synthesize).** The Core does not pull other elements' tables directly. It is built by the **Coach's curation pass** reading the `interactions` log, where every element has already published distilled text: `node.created` and `capture.distilled` from the Vision Board, `session.completed` from the Journal, `goal.set` from Pillars & Goals, `futureSelf.added` from the Future Self. The Coach is the one curator; the Core is the store it writes. Curation is async ownership, never an act-time draw.

**The north star** is shared: it is a `red` Blueprint answer (Paint a North Star) and also surfaces on `settings.northStar`. The Core holds the synthesized version; the Guide renders it; the Journal and Coach use it to detect drift.

## 5. States

The Core itself, and each backbone entry, move through states.

**The Mirror (whole):**
- **Empty:** bootstrapped, `summary` blank, `structured.values`/`themes` empty, no backbone. The default after onboarding. Drawn slices read "(still learning)".
- **Filling:** backbone entries accruing, confidence rising, gaps shrinking. The normal long-lived state; the person is becoming and the Core is keeping up.
- **Conflicted:** a held entry and fresh signal disagree; the change is staged, awaiting the person's decision. The entry's prior value still stands until he chooses.
- **Settled (per entry):** a `red` answer with high confidence and a north star painted. Settled is never frozen; a `red` answer can still change, rarely, with weight.

**A backbone entry:** unanswered (a gap) → synthesized (Coach-filled, confidence < 1, source-tagged) → person-authored (manually answered or corrected, high confidence) → conflicted (staged change pending). Malleability (🟢/🟡/🔴) tags how much weight a change carries, not whether it can change.

Versioning: every meaningful rewrite is a new `mirror` row (`version` + `takenAt`), so the Core has full history; the Guide can show how he has changed.

## 6. Edge cases

- **Empty Core.** Drawn fragments return "(still learning)" placeholders rather than nothing, so surfaces never break on a cold user. Onboarding seeds one empty Mirror.
- **Conflicting signal.** The hard filter never overwrites silently. The contradiction is staged and surfaced to the person; until he decides, the held value stands. A `red` entry conflicting carries the most weight and the gentlest surfacing.
- **Noisy or thin signal.** A single offhand capture should not reshape identity. Curation weighs corroboration and recency; low-confidence synthesis stays low-confidence and is marked as such, and is the first dropped under a tight context budget.
- **Person edits, then signal disagrees.** Person-authored entries outrank synthesized ones; the Core surfaces the new signal as a question, it does not quietly revert his words.
- **Theme that fits no pillar.** Recorded as a gap, not forced into a wrong pillar. The Coach may propose a new pillar (sometimes a whole new element).
- **Stale Core.** If `interactions` have accrued with no curation, the next pass catches up; drawn slices are always the latest `mirror` version, never a cached blob.
- **Backbone evolves.** The Blueprint is meant to keep evolving. A question added or retired upstream must not orphan answers; entries key on stable `blueprintQuestionId` from [`../blueprint/blueprint.json`](../blueprint/blueprint.json).

## 7. AI involvement

The model is in the loop as the **curator**, the hard filter that turns raw signal into identity. See [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md).

- **Distillation** happens upstream, in each producing element (a capture is distilled to text before it ever reaches the Core). The Core consumes text, never raw media. Text is the shared currency.
- **Curation / re-synthesis** is the Core's own AI step: the Coach reads accumulated `interactions`, runs them through a filter that strengthens or reshapes the backbone, decides what is corroborated enough to write, what to stage as a conflict, and what is still a gap. It rewrites `summary` and `structured`, recomputes confidence and gaps, and bumps `version`.
- **Conflict surfacing, not overwriting** is a hard rule of the curation prompt: contradictions are returned for the person to resolve, not applied.
- The Core writes back only text plus a small structured envelope (the backbone map and gaps); the embeddings on `mirror`-adjacent tables stay deferred per the data model.

## 8. Data touched

Per [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Owned:**
- `mirror`: `{ userId, summary, structured{ values[], themes[] }, version, takenAt }`, indexed `by_user` over `takenAt` (versioned history). The Core owns this and nothing else.
- Proposed growth on `mirror.structured`: `backbone{ [blueprintQuestionId]: { text, malleability, confidence, sources[] } }` and `gaps[]` (unanswered backbone questions + themes that fit no pillar). Shapes land in `convex/schema.ts` when curation ships, and this doc updates in the same change.

**Drawn (read at act-time, never held):**
- `interactions`: the Bus log the curation pass reads to re-synthesize.
- `settings.northStar`: the surfaced north star, kept aligned with the `red` backbone answer.

The backbone question set and `blueprintQuestionId` values come from [`../blueprint/blueprint.json`](../blueprint/blueprint.json).

## 9. Open questions

- **Curation cadence.** On every meaningful `interaction`, on a schedule, on session close, or a blend? Trade synthesis cost against freshness.
- **Confidence model.** How is `confidence` computed (corroboration count, recency, person-authored override) and what threshold promotes a synthesized entry to "settled"?
- **Conflict surfacing channel.** Does the Core surface conflicts only through the Coach, or can the Guide show a pending-conflict badge on the affected backbone entry?
- **Versioning depth.** Keep every `mirror` version forever, or compact old versions while preserving a change log? Affects "show me how I've changed."
- **Backbone evolution.** When the upstream Blueprint changes a question, how are existing answers migrated or re-mapped without loss?
