# Zen Core — design spec

**Date:** 2026-06-03 · **Status:** approved (feel validated via mockups) · **Owner element:** the Core
**Mockups:** `.superpowers/brainstorm/47470-1780537855/content/` (throwaway HTML, feel only — not the build)

> A calm, one-question-at-a-time way to fill and revise the Life Blueprint. The Core is no longer a wall of forms; it is a scene you scroll through, a timeline you read at a glance, and a Core you deliberately **commit** — with every later change to a committed Core captured as a running log of how your trajectory moved.

This spec governs the **Zen Core** experience. It does not restate the Core's identity/Mirror responsibilities (see [`../../product/features/core.md`](../../product/features/core.md)); it specs the *answering, navigation, completion, commit, and change-tracking* surface layered over the existing `coreResponses` store and the fixed blueprint skeleton in [`../../../lib/blueprint.ts`](../../../lib/blueprint.ts).

---

## 1. Purpose

Filling the Core today is a 18-question grid — functional, but it bombards. The Zen Core makes the act of self-reflection feel like one calm thought after another: a single question as text on a quiet field, the previous and next faintly visible, a minimalist timeline showing where you are in the whole arc. It honors the product's "calm, never bombarding" principle and makes finishing the Core feel like a deliberate milestone, not a chore.

---

## 2. The three slices

The work ships in three deployable slices. Slice 1 is independently useful and deploys first.

### Slice 1 — The Zen view (the scene + the rail)

A focused mode over the existing Core, reachable from the Core surface (a "Zen" / "focus" entry; the existing grid stays as the alternate view).

**The scene.**
- One question centered as plain text: a small uppercase meta line (`🟢/🟡/🔴 · Section N · <section> · i / total`), the **title** in a serif (Georgia), and the **prompt** beneath it.
- **Previous** question title faint at top-center; **next** question title faint at bottom-center. These are read-only orientation, not controls.
- A **writing area** directly below the question: left-aligned, no box/underline, instant focus (cursor lands there on every question change — no click needed), with a subtle placeholder.

**The editor.** A real rich-text editor (**TipTap/ProseMirror**, or Lexical — final pick at implementation; no hand-rolled `contenteditable`). It must support, robustly:
- Markdown-style input: `- ` → bullet, `# ` → heading, continued lists on Enter, undo/redo.
- The keyboard scheme (Section 5), remappable later from Settings.
- Autosave (Section 6).
- Voice input via an embedded **"speak"** affordance (quiet text button under the editor, not a prominent mic): toggles dictation that appends transcribed text into the field, reusing the app's existing voice stack ([`../../product/features/voice-field.md`](../../product/features/voice-field.md) / `convex/ai/voice/`). Listening state is a small pulsing dot + "listening…".

**The timeline rail (left).** Minimalist, grayscale, vertical, top = earliest → bottom = latest.
- One **tick** per question. Tick **length** grows toward the current question and shrinks with distance (a fisheye that reads as depth — the "third dimension"). The current tick is thickest with a leading dot; answered ticks stay bold; far/unanswered ticks fade. A gap separates sections.
- The rail is the only progress indicator — no separate bar.

**Rail → app nav (embedded).** On mouse-hover near the rail it expands into the app's side panel, so the Zen view lives *inside* the app shell, not as a fullscreen escape:
- Top: the real rail nav — **Today · Core (active) · Board · Guide · Settings** (matches `components/shell/Rail.tsx`).
- Below: the Core's own table of contents — sections with their question titles, current highlighted, locked sections dimmed 🔒.
- Mouse-leave collapses it back to bare ticks.

**Header on scroll-to-top.** Scrolling up past the first question reveals a slim header (`◆ Core` · answered count · the **Commit Core** control). Scrolling back down tucks it away.

**Exit (built).** Three calm ways back to the grid, honoring "calm, never bombarding": (1) the expanded rail is topped by a **rail header** (`◆ Core` + an **Exit Zen** back control); (2) a **subliminal "Exit Zen"** label in the top-right corner, faint by default and brightening on hover, hidden while the scroll header is up so the affordances never double; (3) the scroll-to-top header above. All call `onExit()`. (As-built; the rail currently shows the Core TOC, not yet the full app nav described above.)

**Navigation.** Wheel/trackpad scroll moves one question per gesture with a soft slide (snappy — short threshold + cooldown). Keyboard per Section 5. Clicking a TOC entry jumps there.

**Themes.** Dark and light, following the app's theme setting.

### Slice 2 — Holes and section gating

- A **hole** = an **unanswered** question (empty/whitespace `coreResponses.content`). (Deterministic; "thin answer" detection is explicitly out of scope — see Open questions.)
- A **section is finished** when it has zero open holes.
- **Gating:** you cannot advance into section *N+1* until section *N* is finished. In the scene, scrolling/▼ stops at the last question of the current unfinished section; locked sections show 🔒 in the rail/TOC and are not enterable. (You may always move *backward* into finished sections.)
- The rail communicates the states: open holes → closing → section finished → next unlocks.

### Slice 3 — Commit, lock, and the trajectory log

- **Commit Core** becomes available only when **every section is finished** (no open holes anywhere). Committing sets the Core to **committed/locked** and stamps a commit record. This is the "it counts as done" milestone.
- A **locked** Core is read-only in the scene. To change it you **unlock → edit → re-lock**.
- Every edit made between an unlock and the next re-lock is captured as a **change entry** (question key, before, after, malleability dot, timestamp).
- A **pluggable classifier** marks each change as a **trajectory change** vs a **quiet change**. Default policy: malleability-based — 🟡/🔴 edits are trajectory changes (surfaced + documented), 🟢 edits are quiet. The policy is swappable (e.g. "red only", or an AI "did meaning materially change?" judge) **without schema rework** — the raw change log is always captured; the classifier only decides presentation/labeling.
- A **running changes** view (on the Guide and/or the Core) shows the history: commits over time and, within each unlock→relock cycle, the trajectory changes that moved the Core. This is "how I've changed," made legible.

---

## 3. Data model

Existing (unchanged): `coreResponses { userId, questionKey, content, updatedAt }`; `users.blueprintStatus: "unstarted" | "in_progress" | "complete"`.

**New (Slice 3), lands in `convex/schema.ts` with `docs/architecture/data-model.md` updated in the same change:**

- `coreCommits` — one row per commit (the lock milestone):
  `{ userId, version: number, committedAt: number, unlockedAt?: number, relockedAt?: number, status: "locked" | "unlocked" }`, indexed `by_user` over `version`.
- `coreChanges` — the running change log; one row per edited question within an unlock→relock cycle:
  `{ userId, commitVersion: number, questionKey: string, before: string, after: string, malleability: "green"|"yellow"|"red", classification: "trajectory" | "quiet", at: number }`, indexed `by_user_commit`.

Lock state can live on `coreCommits.status` (latest row) rather than a new `users` field. `blueprintStatus` continues to track unstarted/in_progress/complete; "committed" is the presence of a `locked` latest `coreCommits` row.

**Convex functions** (extend `convex/core.ts`): `save` (autosave, existing), `completion` (per-section hole counts + overall — Slice 2), `canCommit` / `commit` / `unlock` / `relock` (Slice 3, the state machine + change-log writes), `changeLog` (read the running history). The trajectory classifier is a pure server-side function the commit/relock path calls.

---

## 4. States

- **Question/answer:** unanswered (a hole) ↔ answered (has content). Autosaves continuously.
- **Section:** open (has holes) → finished (no holes) → locked-ahead (a later section, not yet enterable).
- **Core:** in_progress → fully-filled (commit available) → **committed/locked** → unlocked (editing) → re-locked (new commit version). Each unlock→relock may add trajectory entries.

## 5. Keyboard scheme (default; remappable from Settings later)

- **Enter** → newline (and continues a bullet/list).
- **⌘Enter** and **⇧Enter** → save & next question.
- **⌘Backspace** and **⇧Backspace** → previous question.
- `- `, `# `, etc. → live markdown via the editor.

(Default chosen so multi-line/bulleted answers — common in the blueprint — stay natural while keeping fast keyboard nav. If plain-Enter-advances is preferred later, it's a config flip.)

## 6. Autosave

- Every change debounces (~600ms) to `coreResponses` via `core.save`. Convex reactivity means no manual save.
- A subtle indicator under the editor: "Saving…" → "Saved". Advancing or leaving also flushes immediately.

## 7. AI involvement

- **Voice/speak:** dictation through the existing voice stack; transcript text appended to the field. No new model wiring beyond reuse.
- **Trajectory classifier (default):** deterministic (malleability), no model call. The swappable AI policy ("did meaning materially change?") is a future option, isolated behind the classifier interface.
- Hole detection is **not** AI in this spec (unanswered-only).

## 8. Edge cases

- **Empty Core / cold user:** scene starts at the first question; rail all-faint; nothing breaks.
- **Gesture spam / fast scroll:** one question per gesture (threshold + cooldown); never skip multiple.
- **Focus vs theme key:** global shortcuts must not fire while typing in the editor.
- **Jump via TOC into a locked section:** blocked; only finished/current sections are enterable.
- **Unlock then no change, re-lock:** no trajectory entries written (empty cycle).
- **Editing a 🟢 on a committed Core:** captured in `coreChanges` as `quiet`, not surfaced as a trajectory change.
- **Blueprint skeleton evolves:** entries key on stable `questionKey`; a retired question's past answers/changes are not orphaned.
- **Long answers:** editor scrolls internally; the scene stays centered.

## 9. Docs this work must update (per CLAUDE.md, same-change rule)

- `docs/product/features/core.md` — the Zen view, holes/gating, commit/lock/trajectory behavior.
- `docs/architecture/data-model.md` — `coreCommits`, `coreChanges`.
- A new ADR in `docs/decisions/` — the commit/lock + trajectory-log model and the pluggable classifier.
- `docs/design/*` — the Zen interaction (scene, rail, header) if a design doc exists/is created.
- `CHANGELOG.md` — per slice.

## 10. Open questions

- **"Enter the name of the word"** — a user note from brainstorming that came through garbled; needs clarification (possibly: naming a commit, or a per-word action). Parked until clarified.
- **Trajectory policy** — default malleability-based now; user has not chosen the final policy. Mechanism is built to allow the change.
- **Thin-answer holes** — out of scope now (unanswered-only). Revisit if "holes" should include Coach-judged shallow answers.
- **Deploy target** — confirm at Slice 1 deploy: Vercel vs running against the shared Convex deployment (`gregarious-boar-475`).
- **Running-changes surface** — does the trajectory history live on the Guide, the Core, or both?
