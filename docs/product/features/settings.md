# Feature: Settings

**Summary:** How the man wants the space to treat him — his daily rhythm (morning/evening + exercise type), the Coach's tone and reach (gentle↔direct, proactive intensity, quiet hours), his pillars, and the proof that the data is his alone (privacy + full export).
**Status:** ✅ specified
**Phase:** v1 · Plan 4 (alerts/treatment model built now; off-platform channel ships v1.5)
**Surfaces:** Settings
**Related:** [`daily-ritual.md`](daily-ritual.md) · [`pillars.md`](pillars.md) · [`coach.md`](coach.md) · [`mirror.md`](mirror.md) · [`../prd.md`](../prd.md) (F5) · [`../concept-and-soul.md`](../concept-and-soul.md) · [`../../architecture/security-privacy.md`](../../architecture/security-privacy.md) · [`../../design/interaction-principles.md`](../../design/interaction-principles.md) · [`../../architecture/data-model.md`](../../architecture/data-model.md)

---

## 1. Purpose — why it exists
This is the most intimate software a person can use — it holds who he is, what he wants, and where he's drifting. Intimacy without control is surveillance. Settings is where the man tells the space **how to treat him**: when it speaks, how often, how directly, and what daily ceremony it asks of him. It is the **consent layer** that makes honest capture possible — a lost young man only puts his real self into a place he can govern.

Two jobs, both serving the soul (`../concept-and-soul.md`):

1. **Fit.** Calibrate the rhythm and the Coach's voice to *this* man, so the space feels like a calm room he chose, not an app pushing a default. The interaction principles (two beats a day, earned interruption, ambient-not-anxious) are the design contract; Settings is where the user dials them to his tolerance.
2. **Trust, made visible.** Data ownership isn't fine print here — it's a screen he can see and act on: his pillars, his preferences, his Mirror to correct, his data to export and walk away with. Trust is a designed, felt feature and the precondition for the whole product (`../../architecture/security-privacy.md`).

Settings is also where the **tether** is configured. The off-platform Coach (the ~75%-retention proactive presence from the references research) ships its channel in v1.5, but the *treatment model that governs it* — intensity, quiet hours, channels — is built in v1, so the tether plugs in without a migration and without re-asking the user how he wants to be reached.

## 2. User-facing behavior
A single calm, scrollable Settings surface. Not a dense preferences matrix — grouped, generous, one concern per block, in keeping with "one thing per screen." Four sections, top to bottom:

- **Daily rhythm.** Two toggles — *Morning check-in* and *Evening check-out* — and a single choice of **daily exercise** (the practice that runs inside the ritual: Intention · Gratitude · Free reflection · One-line check-in · …). A plain-language line under each toggle says what it does ("A two-minute start that points you at your direction"). This is the surfaced control for `daily-ritual.md`.
- **The Coach.** How the Coach shows up:
  - **Tone** — Gentle ↔ Balanced ↔ Direct (a three-stop control with a one-line preview of how the Coach sounds at each: *gentle* = soft, encouraging; *direct* = the sharp older friend who says the true thing).
  - **How often it reaches out** — Leave me · Earned · Often (proactive intensity).
  - **Quiet hours** — a start/end window the Coach never crosses, absolutely (defaults to overnight).
  - **Where it reaches you** — channels. v1 shows *In-app* (always on, not removable). SMS / Push appear here in v1.5 as the tether channels; in v1 they may show as a calm "coming soon" affordance or be hidden entirely (open question §10).
- **Your pillars.** The facets of his life as chips (`pillars.md`). The default **Lifestyle** chip is present from bootstrap. A subtle "+ add" opens the preset library (Health & Fitness, Family & Relationships, Financial & Professional, Growth & Mind, Money & Freedom, Spirit & Meaning) plus "create custom." Each chip can be renamed or removed. This is a window into the same pillar objects used everywhere; Settings is one place to manage them, not their only home.
- **Yours alone.** The trust block. A short, human statement of the privacy posture (private by default, no sharing in v1, AI runs server-side, your data is yours), a control to **edit the Mirror** (open what the app believes about you and correct it — handed off to `mirror.md`), and a **Full export** action (one clean JSON of board + Guide + Mirror — no lock-in).

**The happy path, narrated.** A man who's been using LifeGuide for a week feels the evening prompt lands too soft. He opens Settings, drags **Tone** one stop toward *Direct*, and reads the preview line change. He notices the Coach pinged him at 11pm last night, so he widens **Quiet hours** to start at 9pm. He adds a **Money & Freedom** pillar from the presets because that's been on his mind. On the way out he taps **Yours alone**, skims the privacy line, and feels — without reading a policy — that this is his. Every change took effect the moment he made it; there was no Save button to hunt for, no confirmation friction. He closes Settings and the next evening's check-out already sounds a little sharper and arrives a little earlier.

Everything here is **calm by default and reversible**. Sensible defaults mean a brand-new user never has to visit Settings to get a good experience (progressive disclosure — Settings depth is *earned*, not required on day one).

## 3. Functions & actions (exhaustive)
Every control on the surface. "Via Coach" means the same change can be made by *talking* to the Coach ("be more direct with me," "stop pinging me after 9," "add a fitness pillar") — talk-or-operate, both first-class — **except** where a setting is deliberately non-overridable by the Coach for safety (see the hand-off note below and §4).

| Action | Manual | Via Coach | What it does | Data effect |
|---|---|---|---|---|
| Toggle morning check-in | ✓ | ✓ | Turns the morning ritual on/off | patch `settings.dailyExercise.schedule.morning` (bool) |
| Toggle evening check-out | ✓ | ✓ | Turns the evening ritual on/off | patch `settings.dailyExercise.schedule.evening` (bool) |
| Choose daily exercise | ✓ (picker) | ✓ | Sets which practice runs in the ritual (Intention / Gratitude / Free / One-line / …) | patch `settings.dailyExercise.type` |
| Set exercise timing (optional) | ✓ | ✓ | Adjusts when each ritual is expected (defaults: morning ~on-wake, evening ~pre-sleep) | patch `settings.dailyExercise.schedule.{morningAt,eveningAt}` |
| Set Coach tone | ✓ (Gentle/Balanced/Direct) | ✓ | Calibrates directness of the Coach's voice | patch `settings.coachTone` |
| Set proactive intensity | ✓ (Leave me/Earned/Often) | ✓ | How willing the Coach is to reach out unprompted | patch `settings.alerts.intensity` |
| Set quiet hours | ✓ (start–end window) | ✓ | A window the Coach never crosses (respected absolutely) | patch `settings.alerts.quietHours` |
| Toggle a channel | ✓ | ✓ | Enables/disables a reach-out channel (In-app always on; SMS/Push v1.5) | patch `settings.alerts.channels[]` |
| Add pillar (from preset) | ✓ | ✓ | Adds a preset facet as a chip | insert `pillars` (source=preset) |
| Add pillar (custom) | ✓ | ✓ (confirmed) | Creates a user-named facet | insert `pillars` (source=custom) |
| Rename pillar | ✓ | ✓ | Edits a pillar's label | patch `pillars.name` |
| Remove pillar | ✓ | ✓ | Removes a facet (tagged content re-tagged/orphaned per `pillars.md`) | delete/deactivate `pillars` row |
| Edit the Mirror | ✓ (opens Mirror) | n/a (user-only correction) | Correct what the app believes about him | patch `mirror.structured` / `mirror.summary` (see `mirror.md`) |
| Review privacy | ✓ (read) | ✓ (explain) | Surfaces the privacy posture in plain language | none (read-only) |
| Full data export | ✓ (Export) | ✓ (initiate) | Generates one clean JSON of board + Guide + Mirror | async job → downloadable file; logs `interactions` (type=export) |
| Reset to defaults (per-section) | ✓ | ✓ | Restores a section's sensible defaults | patch the relevant `settings` fields |

**Non-overridable by anyone (including the Coach):** the **crisis hand-off rule** — when the conversation indicates crisis, the Coach refers the person to a human/helpline. This is *not* a setting. It does not appear as a toggle, it cannot be dialed down by "Leave me" or widened away by quiet hours, and the Coach cannot turn it off on request. It is a safety floor under every other preference (`../../architecture/security-privacy.md`). Quiet hours likewise constrain *proactive* outreach only; they never gag a safety hand-off the user themselves triggered by reaching out.

## 4. Dynamics & interactions
Settings doesn't *do* much on its own surface — it **governs** the behavior of other features. It is upstream of the rhythm and the Coach.

- **Drives the daily ritual (`daily-ritual.md`).** The morning/evening toggles decide whether each bookend appears on the Today surface; the chosen exercise type decides which prompt the ritual generates. Turn evening off and the evening check-out simply isn't asked — no scold, no "you disabled this" nag. The ritual reads these fields; Settings is their only editor.
- **Governs the Coach's behavior and cadence (`coach.md`).**
  - **Tone** feeds the Coach's behavioral contract: at *Gentle* the voice softens; at *Direct* it says the true thing plainly (the "sharp older friend"). Tone is assembled into the Coach prompt — it shapes *how* the model speaks, it is not a separate model.
  - **Intensity** sets the proactivity threshold. *Leave me* ≈ effectively silent unless asked (and even then bounded by the safety floor); *Earned* ≈ the default — the Coach speaks unprompted only when it has something specific and true, max ~1–2/day; *Often* ≈ a higher willingness to nudge, still gated by "earned" (never generic, never a schedule). Intensity raises or lowers the bar; it never turns the bar into a timer.
  - **Quiet hours** are an absolute envelope around all proactive outreach. Inside the window the Coach does not initiate, on any channel. (It will still *respond* in-app if the user opens it.)
- **The off-platform tether — built now, channel ships v1.5.** The `alerts{intensity, quietHours, channels}` model is the scaffold for the off-platform Coach (`../concept-and-soul.md` — the tether is core to "two beats a day," not a nicety). In v1 the only live channel is **In-app**. In v1.5, SMS/Push become selectable channels and the *same* intensity + quiet-hours preferences immediately govern them — the user is never re-asked how he wants to be reached. This is why the treatment model is deliberately built ahead of the channel.
- **Hand-off rules remain non-overridable.** Across all of the above, the crisis hand-off is a fixed floor (see §3). No combination of tone/intensity/quiet-hours/channel settings can disable or weaken it. This is the one place where user preference yields to safety, by design (`../../architecture/security-privacy.md`).
- **Pillars (`pillars.md`).** The "Your pillars" block reads and writes the same `pillars` objects the Mirror reasons over and the whole app tags against. Managing them here is one entry point, not a separate store; changes are reactive everywhere (a pillar added in Settings is immediately taggable on the board).
- **The Mirror (`mirror.md`).** "Yours alone" links to the editable Mirror — the user correcting what the app believes about him. Settings doesn't own that data; it's the doorway to it. (Settings changes themselves are preferences, not Mirror content — adjusting tone does not write a Mirror delta about who the person is.)
- **Context Bus.** Settings is a configuration surface, not a context-publishing one — it contributes preference *governance*, not a `selection`/`viewport`/`surface` snapshot of life-content. The Coach reads the effective settings when shaping its tone and deciding whether to reach out; it does not need a board-style context fragment from this surface. (See `../../architecture/context-bus.md`.)
- **Reactivity.** Every change applies immediately and reactively (Convex). No Save button; no apply step. The next ritual, the next Coach turn, the next chip render all reflect the new state instantly across devices.

## 5. States
- **Defaults (first use).** Sensible, calm, opinionated: morning + evening **on**; a gentle default exercise; tone **Balanced**; intensity **Earned**; quiet hours set to a reasonable overnight window; channels = In-app only; one **Lifestyle** pillar. A new user is fully served without ever opening Settings (progressive disclosure).
- **Customized.** Any field the user has changed; the surface reflects current values, each with its plain-language helper line.
- **Saving / applying.** Effectively invisible — there is no explicit save. A change writes optimistically and confirms reactively. The control reflects the new value immediately.
- **Syncing.** Multi-device: a change on the phone appears on the web instantly via Convex reactive updates.
- **Loading.** On open, settings hydrate from the user's row; defaults render instantly if the row is mid-bootstrap (the bootstrap seeds defaults so there is never an empty Settings).
- **Exporting.** While a full export is being assembled, the Export control shows progress (preparing → ready), then offers the download. The rest of Settings stays usable.
- **Error.** A failed write surfaces inline and reverts the control to its prior value (the setting never silently lies about its state). A failed export reports and offers retry without losing other state.

## 6. Edge cases & failure modes
- **Conflicting preferences — quiet hours win.** "Often" intensity + a wide quiet-hours window is *not* a contradiction to resolve by negotiation: **quiet hours always win.** Inside the quiet window the Coach stays silent regardless of intensity; "Often" only governs willingness to reach out during *allowed* hours. The UI may gently note the effect ("Often, except during your quiet hours") so the user isn't surprised by silence he asked for.
- **Disabling all rituals.** Turning off both morning and evening is **allowed** — the app stays useful (the board, the Coach, capture all still work). No streak breaks, no guilt, no "are you sure you want to lose your progress." The Today surface simply has no scheduled bookend; the man can still open the space whenever he likes. (Honors "no streaks, no guilt" and "the app stays useful.")
- **Quiet hours covering ~24h.** A near-total quiet window effectively silences proactive outreach — treated as a valid, respected choice (close to "Leave me"), not an error. The user can still use everything; the Coach just won't initiate.
- **Large data export.** Export of a heavy account (a big board, long Mirror history, many threads) runs **async** so it never blocks the UI; the user is notified when the file is ready rather than waiting on a spinner. Bounded/streamed assembly so a large account can't OOM the request (the server boundary is where runaway cost/size dies, per `../../architecture/ai-layer.md`).
- **Removing a pillar that has tagged content.** Allowed; tagged nodes/captures/goals are re-tagged or orphaned per `pillars.md`'s handling — Settings defers to the pillar feature's rules rather than blocking the removal.
- **Removing the last/default pillar.** Guarded: the **Lifestyle** default is the baseline facet; removing the last pillar is prevented or auto-restores Lifestyle so the Mirror always has at least one facet to reason over.
- **Coach asked to disable the safety hand-off.** Refused — the Coach explains it can't turn off crisis referral, and no setting exists to do so (§3). This is the deliberate exception to "talk-or-operate."
- **Channel selected with no delivery path (v1.5).** If SMS/Push is enabled without a verified destination, the setting holds the *intent* but outreach silently falls back to In-app until the destination is verified — never a hard failure, never a lost message.
- **Timezone / travel.** Quiet hours and ritual timing follow the user's local time; crossing timezones shifts the windows with him (shared concern with `daily-ritual.md`).
- **Multi-device race on the same setting.** Last-write-wins on the field; Convex reconciles. Two devices toggling the same control converge to the latest write.

## 7. AI involvement
**None runs *on* this surface.** Settings has no distillation, no embeddings, no agent loop of its own. Its entire role is to **govern** AI behavior elsewhere:

- **Tone** is compiled into the Coach's behavioral-contract prompt (how directly it speaks).
- **Intensity** sets the proactivity threshold the Coach checks before any unprompted reach-out.
- **Quiet hours** are an absolute gate on proactive outreach, enforced regardless of model output.
- **Channels** route where the (v1.5) off-platform Coach is allowed to speak.
- The **crisis hand-off** is a non-overridable safety rule that sits above all of these and cannot be configured off.

So the AI dependency runs one way: AI reads Settings; Settings never calls AI. The one adjacent AI action — **export initiated via the Coach** — is just the Coach invoking the same async export tool a manual tap would; the export itself is a data operation, not a model call. Model/config details live in `../../architecture/ai-layer.md`; the Coach's contract in `coach.md`.

## 8. Data touched
Primary table: **`settings`** (per-user; one row, joined from `users.settingsId`). Fields, per PRD §6 / F5:

```ts
settings {
  userId,
  dailyExercise { type, schedule{ morning, evening, morningAt?, eveningAt? } },
  alerts        { intensity: "leave_me"|"earned"|"often",
                  quietHours{ start, end },
                  channels[]   // v1: ["in_app"]; v1.5 adds "sms"|"push" },
  coachTone     // "gentle"|"balanced"|"direct"
  privacy       // posture flags (private-by-default; export/erase affordances)
}
```

Also touched:
- **`pillars`** — read/insert/patch/deactivate from the "Your pillars" block (typed: name, weight, source default|preset|custom). See `pillars.md`.
- **`mirror`** — *linked, not owned here*: "Yours alone" opens the editable Mirror; corrections write `mirror.structured`/`mirror.summary` via `mirror.md`.
- **`interactions`** — an `export` (and optionally `settings_changed`) event is logged for the activity trail.
- **Export reads (read-only):** `nodes`, `edges`, `captures`, `threads`, `messages`, `mirror`, `pillars`, `goals` — assembled into the single export JSON (board + Guide + Mirror). No writes to these during export.

> Schema note: PRD §6 specifies a dedicated `settings` table; the current `../../architecture/data-model.md` sketch folds bootstrap state into `profiles` and forward-defines the rest. When Plan 4 lands Settings, the `settings` shape above must be added to `data-model.md` in the *same* change (the two-non-negotiable-rules contract). Authoritative schema: [`../../architecture/data-model.md`](../../architecture/data-model.md).

## 9. Reuse & build notes
- **New; lightweight.** Nothing to port wholesale from `braindump` or `PillarOS` — neither had a consent/treatment layer. This is built clean.
- **The alerts/treatment model is the strategic piece.** It is deliberately built in v1 *ahead of* the channel it serves, so the v1.5 off-platform Coach (SMS/push tether) plugs in with no migration and no re-prompting the user. Design `alerts{intensity, quietHours, channels}` for that future from the start.
- **Pillar management UX** reuses the preset-picker pattern from `pillars.md` (echoes PillarOS's template chooser) — Settings is just one entry point to it, not a second implementation.
- **Privacy/export** implements the `../../architecture/security-privacy.md` posture concretely: full clean-JSON export (no lock-in), editable Mirror, private-by-default. Keep the export **async and bounded** (server-side, streamed) so large accounts are safe.
- **No Save button.** Reactive writes (Convex) — every control applies on change. Don't introduce a staged/apply pattern; it fights the calm-and-immediate model.
- **Safety floor is code, not config.** Implement the crisis hand-off as a non-overridable rule in the Coach layer; never expose it as a setting, and ignore any Coach request to disable it.
- Plan: `../prd.md` §10 step 7 (Pillars + Settings + daily ritual). Schema must co-update `../../architecture/data-model.md`.

## 10. Open questions
- **Tone control: slider vs presets.** Three labeled stops (Gentle/Balanced/Direct) or a continuous slider? (Leaning presets for legibility; promote to an ADR when decided.)
- **Quiet-hours defaults.** Exact default window (e.g., 9pm–7am?) and whether it's inferred from first-week behavior vs a fixed default.
- **Exercise templates.** The final small set of daily-exercise types and their prompts (shared open question with `daily-ritual.md`).
- **v1 channel display.** In v1, do SMS/Push show as a disabled "coming in your tether" affordance (sets expectation for v1.5) or stay hidden until the channel ships?
- **Export format/scope.** Confirm the export JSON shape and whether it includes raw capture media/`_storage` blobs or just references; whether a one-click **account erase** ships in v1 or with the broader privacy work in `security-privacy.md`.
- **"Settings changed" auditing.** Whether to log preference changes to `interactions` for the user's own activity trail, or keep Settings writes silent.
