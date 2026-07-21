# Journal / Sessions

**Status:** spec (not built as the Journal; the current "Today" ritual screen is its seed) · **Element of:** the Sessions stream · **Owns:** `prompts`; its beats open and write into the live `sessions` table, owned by [Sessions](sessions.md) (see ADR 0008)

> The Journal is the whole Sessions stream: a chronological feed of beats (morning, night, triggered), each a feed of adaptive prompts whose job is to draw out who you are and check you are still on track. It is not a blank diary.

## 1. Purpose

A lost person cannot reliably ask himself the right question. The Journal asks it for him. It exists to keep the daily pulse, the "where they have been lately" half of context (see [`../../architecture/context-bus.md`](../../architecture/context-bus.md)), and to do two jobs no other element does: (1) draw out the background that makes a person who he is, so the Core backbone fills in over time, and (2) keep checking he is still pointed at his goals and surface what is drifting.

Job (1) is not a side effect — it is **the Core's main intake**. [ADR 0030](../../decisions/0030-the-journal-is-the-cores-incremental-intake.md) makes it explicit: every day the journal asks **one** thing the Core still doesn't know, and the answer writes to the Core's own `coreResponses` keys. The person is journaling; the foundation gets built underneath him, one entry at a time, without an hour-long sit-down. Any work on the journal's prompts should be read against that ADR's rules (one a day, never re-ask a settled question, one store, his words win, always skippable). It is the two calm bookends of [the daily ritual](../concept-and-soul.md): morning before the day pulls him anywhere, night to feed the text layer. Not streaks, not guilt, not a wall of forms. Two minutes, twice, plus the occasional beat the Mirror earns by noticing something true.

## 2. User-facing behavior

The home walks the person into the right session for the time of day (see [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md)). He lands in a session: not a blank page but the first prompt, one at a time. A **morning** beat orients him at where he is headed; a **night** beat reflects on the day just lived. Each prompt is answered by typing, or by speaking (a verbal interview counts; speech is transcribed by the AI layer into the same answer field). He moves prompt to prompt; he can skip one, and he can stop early. When the session closes it distills into a short summary and drops into the stream.

The Journal surface itself is that stream: timestamped, chronological, scrollable back through every past session. He can reopen history and read what he wrote on any day. Sometimes a **triggered** session appears off-rhythm because the Mirror noticed a contradiction or a gap worth one question now.

Both paths are first-class. Manually, he opens the Journal and answers. Through the Coach, he can run the whole beat as a conversation ("walk me through tonight"), and the Coach poses the same adaptive prompts and writes the answers back to the session. The Coach is a power tool over the Journal, never a gate in front of it.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Open / resume session | Home walks him in, or he opens the Journal | Creates an `open` session of the right `kind`, or resumes today's | Both | `sessions` |
| Choose today's prompts | Session opens | Draws Core + Goals + gaps to assemble the prompt feed (origins below) | System (AI) | `prompts` (writes), draws `mirror`, `goals` |
| Answer a prompt (typed) | He types and advances | Writes `answerText`, `answeredAt` | Manual | `prompts` |
| Answer a prompt (spoken) | He records | AI layer transcribes audio into `answerText`; keeps `answerAudioFileId` | Both | `prompts` |
| Skip a prompt | He skips | Leaves the prompt unanswered; it may return another day | Manual | `prompts` |
| Stop early | He leaves | Session stays partial; distills what exists | Both | `sessions` |
| Complete session | Last prompt or explicit done | Marks `complete`, sets `completedAt`, distills `summary`, publishes `session.completed` | Both | `sessions`, `interactions` |
| Run the beat as conversation | "Walk me through tonight" | Coach poses the same prompts in chat, writes answers back to the session | Coach | `sessions`, `prompts` |
| Scroll history | He opens the Journal | Reads past sessions chronologically | Manual | `sessions`, `prompts` (read) |
| Capture a triggered beat | Mirror notices drift / a gap | Opens a `triggered` session with origin `drift` / `coach` prompts | System / Coach | `sessions`, `prompts` |

## 4. Dynamics and interactions with other elements

**Owns** `prompts`, and nothing else; the `sessions` table it writes into is live and owned by [Sessions](sessions.md) (the beats are front doors that open entries there, per ADR 0008). Per the ownership rule in [`../../architecture/context-bus.md`](../../architecture/context-bus.md), it holds no copy of any other element's data.

**Publishes** to the **Sessions stream**: on completion it writes a `session.completed` interaction carrying the distilled `summary` (recent state, momentum, drift). The Coach folds that, through its core-curation pass, into the Core; the Journal never writes the Mirror itself.

**Draws** at act-time, only when a session opens, to choose the prompts:
- **The Core** (`mirror`), for who he is and which backbone questions are still unanswered (`mirror.structured.gaps`). Holes become **blueprint** prompts that draw out a missing backbone answer (see [`../blueprint/the-life-blueprint.md`](../blueprint/the-life-blueprint.md)).
- **Pillars & Goals** (`goals`), for what he committed to, so prompts can check progress and surface drift.

Per the standing wiring in [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md), Journal draws Core + Goals to shape each day's prompts. Drawing is reading, never holding; the slice is rebuilt every session.

## 5. States

- **No session today (empty).** Home offers the right beat; the Journal shows history only.
- **Open / in-progress.** Prompts assembled, some answered; resumable. Survives leaving and returning.
- **Complete.** All it will hold; `summary` distilled and published.
- **Triggered (open).** An off-rhythm beat the Mirror earned; same lifecycle, `kind: "triggered"`.
- **Partial / abandoned.** Left early; distilled from what exists, never blocked on completeness.
- **Archived (history).** Past sessions, read-only, scrollable back over `startedAt`.

A single prompt moves through: **shown** to **answered** (typed or transcribed) or **skipped** (may return another day).

## 6. Edge cases

- **Nothing to say / skips everything.** Honored, no guilt. The session distills as thin or empty; an empty beat is itself a signal.
- **Cold start, empty Core.** Almost every prompt is `blueprint` origin, drawing out backbone answers from scratch; this is the Journal seeding the Core.
- **No goals yet.** Drop the `drift`/`rhythm` progress prompts; lean on `blueprint` and reflective `rhythm` prompts.
- **Both beats in one window (late morning).** One open session per kind per day; opening morning after noon either resumes it or rolls into the night beat per the time-aware home.
- **Spoken answer fails to transcribe.** Keep `answerAudioFileId`; mark the answer pending; do not lose the audio.
- **Offline.** Answers buffer locally; the session syncs and distills when back online. Source of truth is the table, not the buffer.
- **Reopening a complete session.** History is read-only; a re-answer opens a new triggered beat rather than rewriting the past, so chronology stays honest.
- **Conflicting answer vs Core.** The Journal records it plainly; reconciliation is the Coach's job (surface the contradiction, never silently overwrite), not the Journal's.

## 7. AI involvement

The model is in the loop at three points, all per [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md):

1. **Prompt adaptation (at open).** Given the drawn Core + Goals + gaps and the beat's `kind`, the model selects and phrases today's prompts and tags each `origin`: `rhythm` (the standing daily beat), `blueprint` (fill a named backbone question, `blueprintQuestionId` set), `drift` (a goal looks off-track), `coach` (the Mirror flagged something specific).
2. **Transcription.** Spoken answers are transcribed into `answerText`; a verbal interview is a full session.
3. **Distillation (at close).** The model compresses the answers into the session `summary`, the distilled TEXT that is the shared currency. It does not write the Core; the Coach's curation pass does, downstream of the published interaction.

## 8. Data touched

Exact shapes in [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Owned:**
- `sessions`: `{ userId, kind: "morning"|"night"|"triggered", status, startedAt, completedAt?, summary?, mood?, isActive }`, indexed `by_user` over `startedAt`.
- `prompts`: `{ userId, sessionId, order, text, origin: "rhythm"|"blueprint"|"drift"|"coach", blueprintQuestionId?, answerText?, answerAudioFileId?, answeredAt? }`, indexed `by_session` over `order`.

**Drawn (read at act-time, never held):** `mirror` (the Core, including `structured.gaps`), `goals`. `blueprintQuestionId` values resolve against [`../blueprint/blueprint.json`](../blueprint/blueprint.json).

**Published:** an `interactions` row, `type: "session.completed"`, payload carrying the distilled `summary`.

## 9. Open questions

- Exact `sessions` / `prompts` schema is finalized in `convex/schema.ts` when the element is built (per [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md)); this doc updates in the same change.
- How many prompts per beat, and the budget split across `rhythm` / `blueprint` / `drift` origins.
- Whether `mood` is one signal or a small set, and whether it feeds drift detection.
- The threshold the Mirror must clear before earning a `triggered` beat (avoid bombarding; honor earned interruption).
- Whether skipped `blueprint` prompts re-surface on a schedule or only when the gap stays open.
