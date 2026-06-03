# Feature: The Daily Ritual (morning / evening)

**Summary:** Two calm check-ins a day — a morning that sets direction and surfaces today's one small move, and an evening that reflects and feeds the Mirror — as the core rhythm of the space. No streaks, no guilt, no buzzing in between.
**Status:** 🟡 outline
**Phase:** v1 · Plan 4 (Pillars + Settings + daily ritual; PRD §10 step 7)
**Surfaces:** Today (the home surface the user lands on)
**Related:** [`settings.md`](settings.md) · [`mirror.md`](mirror.md) · [`coach.md`](coach.md) · [`guide.md`](guide.md) · [`../concept-and-soul.md`](../concept-and-soul.md) · [`../../design/interaction-principles.md`](../../design/interaction-principles.md) · [`../../architecture/data-model.md`](../../architecture/data-model.md)

---

## 1. Purpose — why it exists
Drift happens in the gap between intentions. A lost young man wakes up and the day pulls him before he's chosen a direction; he goes to sleep without ever setting the day down. The cost of that, compounded, is a life spent walking the wrong way (`../concept-and-soul.md`, "The pain").

The Daily Ritual is the answer to that one pain made into a rhythm: **two beats a day** (`../concept-and-soul.md`, "The daily ritual"). The **morning** lets him see where he's headed before the day pulls him anywhere — his north star plus today's one small move. The **evening** lets him put the day down and reflect, which feeds the Mirror so the app knows him a little better tomorrow. This is the heartbeat that turns LifeGuide from a tool he opens when he remembers into a space he checks into — "once when he wakes up, once before he sleeps" (`../concept-and-soul.md`, "The promise").

Why a ritual and not a streak: the references research found **ritual bookends out-retain streak mechanics** (Stoic's AM/PM loop drives retention; Reflectly's streaks produce churn and "generic insight" fatigue), and a **proactive tether retains ~75% vs ~51% for wait-to-be-opened** (`../../research/extraction/04-references-and-gaps.md`, Part B §5, §10). So the ritual is built as two earned, low-commitment moments — never a scold, never a guilt mechanic. It is the daily reason to return, and the most reliable source of the Mirror's deltas.

This is the lightweight v1 expression of the bigger arc. The full **reflection loop** (act → did it work → revise the vision) and the **alignment engine** (calendar/to-dos vs goals) are the killer features that close the loop, but they are explicitly post-v1 (`../concept-and-soul.md`, "The alignment engine"; PRD §2.2, F6/F7; glossary). v1 ships the bookends and the daily-exercise scaffold so those plug in cleanly later.

## 2. User-facing behavior
- The user lands on the **Today** surface. It shows **one thing**, time-of-day appropriate — never a dashboard (interaction principle #2).
- **Morning (the direction beat):**
  - A calm card opens to **where he's headed**: his **north star** (his single named direction) rendered as a quiet line, read from the Guide/Mirror — not editable here, just *seen*.
  - Below it, **today's one small move** — the **daily exercise** prompt, generated for him (e.g., a one-line intention, a gratitude, a single focus). The exercise *type* is whatever he chose in Settings; the *wording* is personal, drawn from his Mirror.
  - He writes a line, or taps a suggested move, and he's done. **Two minutes.** The card settles into a "set for today" state.
- **Evening (the reflection beat):**
  - One reflective prompt — *"What pulled at you today?"* (or a variant matched to his exercise type). Soft, open, never a form.
  - He answers in a sentence or two (typed or, later, spoken — see `../../research/extraction/`/audio reuse). He's done. The reflection is acknowledged warmly, not graded.
  - Overnight, that reflection is distilled into **Mirror deltas** (themes, values, what's tugging at him), so tomorrow's morning is a little sharper.
- A **time-of-day toggle** lets him flip between morning and evening on the Today surface (e.g., glance at the morning card in the evening, or pre-write tomorrow). The default view follows local clock + his configured schedule.
- **Both are skippable without penalty.** Skip shows no broken-streak shame, no red mark — just a calm "tomorrow's here when you are." Missing a day leaves no debt.
- **Earned Coach whisper:** at most ~1–2/day (interaction principle #4), and only when the Coach has something *specific and true* to say (a pattern it noticed, a resurfaced line he wrote, a gentle "this keeps coming up"). Never a generic "good morning!" Most days, no whisper.
- The whole thing feels **ambient, not anxious** (interaction principle #6): warm paper, soft shadows, generous space. A calm room he returns to, not an inbox demanding triage.

## 3. Functions & actions (exhaustive)
Every action possible on the Today surface — **manual** (by hand) and **via the Coach** (talk; the Coach acts through its tool registry, including "from far away" while the user is on another surface). The check-in actions write to `interactions`; reflection content flows to the `mirror` via deltas.

| Action | Manual | Via Coach | What it does | Data effect |
|---|---|---|---|---|
| Show morning direction | ✓ (open Today, AM) | ✓ (summon: "what's my direction today?") | Renders north star + framing read from the Guide/Mirror | reads `mirror` (north-star candidate / Guide), `goals`; no write |
| Show daily exercise prompt | ✓ (open Today, AM) | ✓ | Renders today's generated exercise of the configured type | reads `settings.dailyExercise`, `mirror`; on first render insert `interactions` (type=`exercise_shown`) |
| Capture today's move | ✓ (type a line / tap a suggestion) | ✓ ("set my intention to …") | Records the morning intention / move | insert `interactions` (type=`morning_checkin`, payload=move) |
| Mark move **done** | ✓ (tap done) | ✓ | Marks today's move complete (acknowledgment only in v1 — no scoring) | patch `interactions` (status=`done`); emit delta |
| Mark move **skip** | ✓ (tap skip / dismiss) | ✓ | Skips today's move, no penalty, no guilt copy | patch `interactions` (status=`skipped`) |
| Mark move **snooze** | ✓ (snooze) | ✓ ("remind me later") | Defers the move within the day (re-surfaces later / next beat) | patch `interactions` (status=`snoozed`, snoozeUntil) |
| Show evening reflection prompt | ✓ (open Today, PM) | ✓ ("let's reflect") | Renders the one reflective prompt for the day | reads `settings.dailyExercise`, `mirror`; insert `interactions` (type=`reflection_shown`) |
| Capture evening reflection | ✓ (type / speak a sentence) | ✓ (reflect conversationally with the Coach) | Records the reflection text | insert `interactions` (type=`evening_checkin`, payload=text) → queues Mirror delta |
| Flip morning ⇄ evening | ✓ (toggle) | n/a | Switches which beat the Today surface shows | client-only view state |
| Skip a beat entirely | ✓ (close / ignore) | n/a | No check-in today for that beat; no debt recorded | no row (absence is not an error); never a streak |
| Edit/replace today's move | ✓ (re-type) | ✓ | Overwrites today's morning move before day's end | patch `interactions` (payload) |
| Configure which beats run | ✓ (Settings) | ✓ ("turn off morning check-ins") | Enables/disables morning and/or evening | patch `settings` (rhythm toggles) — see `settings.md` |
| Configure exercise type | ✓ (Settings) | ✓ ("make my morning a gratitude") | Chooses the daily-exercise template (Intention / Gratitude / Free / …) | patch `settings.dailyExercise.type` |
| Configure schedule / quiet hours | ✓ (Settings) | ✓ | Sets when each beat is offered + quiet hours | patch `settings.dailyExercise.schedule`, `settings.alerts.quietHours` |
| Open depth from a beat | ✓ (tap into Guide / a node) | ✓ | Progressive disclosure: a beat can open the Guide, a related capture, or the Whiteboard | navigates surface; reads only |

Notes: in v1 "today's move" is **lightweight** — capture + done/skip/snooze as acknowledgment, not a scored objective. The richer "move" mechanics (a concrete proposed action graded against the vision) deepen post-v1 with the reflection loop and Strategist (PRD F7; `../concept-and-soul.md`, "The alignment engine"; glossary). Configuration lives in **Settings**, not on the Today surface — see `settings.md` §3.

## 4. Dynamics & interactions
How the Daily Ritual connects to the rest of the system:

- **Settings (`settings.md`) — the dial.** The ritual is *driven by* Settings: which beats run (morning/evening toggles), the **exercise type** (Intention / Gratitude / Free / one-line check-in / …), the schedule (when each beat is offered), and quiet hours all come from `settings`. Changing a Setting changes the next beat reactively. The alerts/treatment intensity ("Leave me" → "Earned" → "Often") and quiet hours govern *whether and when* a Coach whisper may accompany a beat. Settings is the only place the ritual is configured; the Today surface only *runs* it.

- **The Mirror (`mirror.md`) — read in the morning, written in the evening.**
  - **Reads (morning):** the morning direction reads the **north star** / Guide framing and relevant `goals` from the Mirror, so "where you're headed" is *his*, not generic. The daily-exercise prompt is generated *from Mirror context* (recent themes, what's been tugging at him) so the morning move feels personal.
  - **Writes (evening):** the evening reflection is the single richest source of Mirror deltas in v1. The reflection text is distilled into typed deltas — themes, values, recurring nouns/verbs, fears, north-star candidates — and queued for the Mirror async (never blocking the UI). Done/skip signals on the morning move also emit lightweight deltas. See `mirror.md` §4 (writes/reads) and §7.

- **The Guide (`guide.md`).** The morning's "where you're headed" is the Guide's surfaced north star/text-layer, read-only on Today. Reflections, by feeding the Mirror, change what the Guide reflects back over time ("who you're becoming"). A user can tap from a beat *into* the Guide for depth (progressive disclosure).

- **The Coach (`coach.md`) — the earned whisper, and acting from far away.** The Coach reads the assembled Today context (the active beat, today's move, the Mirror slice) and may add an **earned whisper** — specific, true, budgeted to ~1–2/day and gated by Settings intensity + quiet hours (interaction principle #4). The Coach can also *run* the ritual conversationally: set today's move, capture a reflection, mark done/skip/snooze, or flip a Setting — all via its tool registry, including while the user is on the Whiteboard or Guide ("from far away," PRD §4.4). The Coach never *forces* a check-in; it offers.

- **Context Bus (`../../architecture/context-bus.md`).** Today is a thin surface implementing `SurfaceContextProvider`: it publishes the current beat and today's move as its **surface** snapshot (selection/viewport are minimal here — there is one thing on screen), and contributes the check-in tools above to the Coach's registry. The Mirror (global scope) is shared, not owned by this surface.

- **Off-platform tether (post-v1, scaffold now).** The two beats are the natural anchor points for the off-platform Coach (the SMS/push tether that retains ~75% vs ~51%). v1 builds the **preferences model** (channels, intensity, quiet hours in `settings.alerts`) and the ritual's beat structure so the tether plugs in as a fast-follow — the actual channel is not shipped in v1 (PRD §2.2; `../concept-and-soul.md`, "What this means for the build").

- **Alignment engine (post-v1).** The calendar-aware "is today's life still pointing at your vision?" reconciliation is the eventual reason the morning move gets *smart* (drift/scatter/next-move). It is **explicitly out of v1** — no calendar/to-do is read or written (PRD §2.2, F6; glossary). The ritual is designed so that when the alignment engine lands, the morning move becomes "here's the one thing that moves you toward your vision today" instead of a freeform intention.

## 5. States
- **Not-yet-checked-in (the default each day):** the beat's card is open and inviting — morning shows direction + a fresh exercise prompt; evening shows the reflective prompt. Calm, not nagging.
- **Morning-done:** today's move is set; the card settles to a quiet "set for today" state. The move can still be edited, marked done/skip/snooze.
- **Evening-done:** the reflection is captured and warmly acknowledged; the card shows a gentle "set down for the day." A delta is queued for the Mirror.
- **Skipped:** the beat was dismissed or the day passed. Shown as a neutral, no-shame state — *never a broken streak, never a scold*. Tomorrow's beat returns clean.
- **Loading:** the exercise prompt is being generated from the Mirror — shows a soft placeholder ("a moment…"), with a generic-but-warm fallback ready if generation is slow (see §6).
- **Syncing:** check-ins and reflections write through Convex reactively; state is current across devices the instant it changes (PRD §4.5).
- **First-use / empty Mirror:** the very first morning has no north star and a thin Mirror — see §6 (gentle generic-but-warm prompt; onboarding may seed it). 

There is **no streak state, no counter, no progress bar**. By design (interaction principle #6; PRD §2.2 "Streaks / gamification — never"). The only "progress" the user sees is the Mirror knowing him better over time, surfaced through the Guide — not a number on this surface.

## 6. Edge cases & failure modes
- **Missed days — no guilt.** A skipped or missed beat records no debt and shows no broken-streak shame. There is no "you missed 3 days" copy, ever. The next beat returns clean and inviting. This is a hard product rule, not a soft preference (PRD §2.2; interaction principle #6).
- **Timezone / travel.** Beats follow the user's **local** clock and configured schedule. Crossing timezones must not double-fire a beat or skip one: the "day" is resolved against the device's current local date, and a beat already completed for the local day is not re-offered. A long-haul jump that compresses or stretches a day resolves to at most one morning and one evening per local calendar day.
- **Disabled rituals (respect Settings).** If the user turned off a beat in Settings, **never** show it and never nudge about it — the Today surface stays useful with whatever remains (or shows a calm neutral home if both are off). Disabling all rituals is allowed; the app does not break or beg (mirrors `settings.md` §6).
- **Empty Mirror (cold start).** On day one (or after a reset), there's no north star and little to personalize from. The morning falls back to a **gentle, generic-but-warm** prompt ("What's one thing you want today to be about?") and the evening to a soft open reflection ("What stayed with you today?") — never a blank form, never an error. Onboarding may pre-seed a first north-star candidate so the morning has *something* to show (PRD §9 / cold-start; `mirror.md` §5 "empty").
- **AI prompt-generation failure / slow.** If the exercise-prompt generation (from Mirror) fails or is slow, fall back to the warm generic prompt for that beat — the check-in is **never blocked** by the model. The user can always write his line. Generation retries silently next beat.
- **Reflection-distillation failure.** If distilling the evening reflection into Mirror deltas fails, the **raw reflection is still saved** to `interactions`; the delta is retried async. The user never loses what he wrote, and the failure is invisible to him (degrades gracefully, like the Whiteboard's distillation — see `whiteboard.md` §6).
- **Double check-in / rapid re-entry.** Re-opening a completed beat shows the "done/set" state, not a fresh prompt; editing overwrites rather than creating a duplicate `interactions` row for the same beat+day.
- **Multi-device.** Completing a beat on phone reflects on web reactively (Convex); last-write-wins on the move's content if edited on two devices near-simultaneously.
- **Quiet hours vs a due beat.** If a beat's schedule lands inside quiet hours, the *card* is still available when the user opens the app, but **no proactive whisper/nudge** is sent during quiet hours (Settings governs cadence; the ritual never overrides quiet hours — `settings.md` §6).
- **No Coach whisper most days.** The absence of a whisper is the correct, common state — never pad it with a generic message to "fill the slot" (interaction principle #4). 

## 7. AI involvement
- **Daily-exercise prompt generation (per beat, cheap tier — gpt-4o-mini class):** generates the morning move / daily-exercise wording **from Mirror context** (the configured exercise type + recent themes, the north star, what's been tugging at him). Personal, not templated. Prompts location: `../../architecture/ai-layer.md`; config via the central hub (`AI_PROCESSES`, PRD F2/§9).
- **Evening-reflection distillation (async, cheap/batched):** turns the captured reflection text into **typed Mirror deltas** — themes, values, recurring nouns/verbs, fears, north-star candidates — written to the Mirror without blocking the UI (the same delta path the Whiteboard uses; `mirror.md` §7, `whiteboard.md` §7). Lightweight done/skip signals emit minimal deltas too.
- **Earned Coach whisper (agent, gated):** the Coach's multi-turn loop, run over the assembled Today context, may surface one specific, true observation — budgeted to ~1–2/day and gated by Settings intensity + quiet hours. Drives nothing on its own; offers, never forces.
- **Embeddings:** reflections are embedded (text-embedding-3-small) so they're retrievable later by the Mirror's semantic recall and (post-v1) the resurfacing engine ("on this day," `../../research/extraction/04-references-and-gaps.md` §4) — letting a line he wrote months ago resurface in a future beat.
- **Graceful degradation:** if AI is down, the ritual **still works fully** — generic-but-warm prompts render, the user writes his line, and reflections are saved raw and distilled later on retry. The check-in never hard-depends on the model (mirrors the Whiteboard's degradation stance). Config + cost profile: `../../architecture/ai-layer.md`.

## 8. Data touched
- **`settings`** — read every beat: `dailyExercise{type,schedule}` (which exercise, when), rhythm/beat toggles, `alerts{intensity,quietHours,channels}` (whisper cadence + future tether). Written only via Settings (`settings.md` §8).
- **`interactions`** — the check-in event log and the ritual's primary write target: `morning_checkin` / `evening_checkin` rows (with payload = the move / the reflection), `exercise_shown` / `reflection_shown`, and the move's `status` (done / skipped / snoozed). This log is the source of Mirror deltas (PRD §6, `interactions { id, userId, type, payload, at }`).
- **`mirror`** — written via deltas from the evening reflection (and lightweight done/skip signals); **read** in the morning for the north star + personalization slice. Structured records + summary, never blocking (`mirror.md` §8).
- **`goals`** (read) — the north star / direction shown in the morning may reference typed `goals` / north-star candidates.
- (Reads only, post-v1) the reserved calendar/to-do context slot — **not touched in v1** (PRD F6).

Schema: `../../architecture/data-model.md`. The ritual writes no new tables — it rides `interactions` (events) and the Mirror's delta path; configuration lives in `settings`.

## 9. Reuse & build notes
- **New surface, thin.** Today is a small `SurfaceContextProvider` over existing infrastructure — it adds no new tables and no new AI process beyond a prompt template + the existing distillation/delta path. Build it after the spine (Plan 4 / PRD §10 step 7), once Mirror, Settings, and the Coach exist.
- **From `PillarOS` (concept only):** the daily-exercise *templating* echoes PillarOS's template-picker UX (surfaced in Settings), but the data model is new — exercises are `settings` config + `interactions` events, not a content hierarchy. Do **not** port PillarOS memory-as-blob; reflections go through the structured Mirror delta path (`mirror.md` §9).
- **Ritual-bookends thesis (research-grounded):** the whole shape — two earned beats, no streaks — comes directly from the references research (`../../research/extraction/04-references-and-gaps.md` §5, §10): **ritual bookends out-retain streaks** (Stoic vs Reflectly), and a **proactive tether retains ~75% vs ~51%**. Honor the "no dark patterns / no streak-guilt" rule absolutely.
- **Degradation pattern reused from the Whiteboard:** distillation/generation never blocks the user; raw content is always saved; AI retries silently (`whiteboard.md` §6–§7).
- **Off-platform scaffold now, channel later:** build `settings.alerts{intensity,quietHours,channels}` and the beat structure in v1 so the tether is a fast-follow, not a rebuild (PRD §2.2).
- Plan reference: the Plan-4 implementation doc (Pillars + Settings + daily ritual) under `../../plans/`.

## 10. Open questions
- **Exact daily-exercise templates** — the v1 set (Intention / Gratitude / Free / one-line check-in / …) and their generation prompts. Shared with `settings.md` §10; lock as an ADR once chosen.
- **Is "today's move" purely reflective in v1, or does it already propose a concrete action?** Recommendation: reflective/intention-setting in v1; the concrete, graded, calendar-aware move arrives with the alignment engine + reflection loop post-v1 (glossary; `../concept-and-soul.md`).
- **Snooze semantics** — does a snoozed morning move re-surface later the same day, fold into the evening beat, or simply expire silently at day's end?
- **North star absent** — the exact morning copy when there's no north star yet (cold start), and how strongly onboarding should pre-seed a north-star candidate to give the first morning something to show.
- **Whisper placement** — does the earned Coach whisper render *inside* the beat card or as a separate gentle surface on Today? (Depends on Coach surface UX — `coach.md`.)
- **Reflection input modality** — typed-only in v1, or voice from day one (audio reuse exists for the Whiteboard; the evening reflection is a natural fit for spoken capture).
