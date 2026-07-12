# Home / Dashboard (Today)

**Status:** partial · **Element of:** view-only surface (no stream of its own) · **Owns:** nothing (the "Today" beat it hosts writes to `interactions`; the one north-star edit writes `settings`; the hosted [Daily Ritual](daily-ritual.md) card writes through that element's own functions)

> The door **and** the front room. An identity-aware, time-aware calm home that greets you by who you are, points you at your north star (the compass), walks you into the day's beat, and — below the fold — renders the synthesized you back (the former [Guide](guide.md), merged in 2026-06-03).

## 1. Purpose

The Dashboard is the first thing a person sees when they check in. Its one job is to make the space feel like a calm room he returns to, then route him into the day's beat. It answers lostness by reflecting identity back at the threshold: before the day pulls him anywhere, it names where he is headed (his north star, drawn from the [Core](core.md)) and who he is becoming (drawn from the [Vision Board](vision-board.md)). It is the welcoming home the soul describes (see [`../concept-and-soul.md`](../concept-and-soul.md)), the surfaced "two calm bookends" of the daily ritual. It is deliberately **not** a metrics dashboard: per the interaction principle "one thing per screen, never a dashboard," the rule forbids dumping data, not a welcoming home. The Dashboard greets and routes; it never reports.

## 2. User-facing behavior

A person opens LifeGuide. The Dashboard greets him by name and by identity, aware of the time and day. In the morning it shows his direction (the north star) and offers one small move that points at it; in the evening it offers one reflective prompt. It does not present tabs of charts, lists, or stats. The single dominant action is to begin the session that fits the moment, the morning beat when he wakes, the night beat before he sleeps. Stepping into a session hands him to the [Journal](journal.md), which owns the session itself.

This surface is the current "Today" screen ([`../../../components/today/Today.tsx`](../../../components/today/Today.tsx)), restructured 2026-07-12 around the ordered ritual: **a main column and a right-hand rail**. The main column: a time-aware greeting, a Core progress chip, the **north star compass** (editable inline — the one write this surface issues), a time-based morning/evening toggle with sun/moon icons (the default tab follows `activeRitual` in `lib/ritual.ts`), the hosted **[Daily Ritual](daily-ritual.md) sequence card** (the ordered primer spine: read → roadmap → question, with its seal moment; the old inline one-move/tonight prompt cards are gone — they became question components inside the ritual), the **Today's log** card, a Coach line, and the folded-in [Guide](guide.md) content (the Mirror + the pillars) under "Who you're becoming". The right rail (desktop ≥lg, sticky) holds **the day's to-dos** — the ritual's plain `do` steps, out of the page's structure per Ariel's direction; on the phone the same panel renders as a card under the sequence. The short-lived "Daily mantras" card was retired the same day it shipped: the readout now lives in the sequence's read step and its immersive reader.

**The Today's log** (2026-07-12, `components/today/DayLog.tsx`) is the day's journal entry, assembled from what actually happened rather than typed fresh. Three quiet stacked parts: **(1) the parts of the day** — Morning ritual, Today's roadmap, Night ritual, Tomorrow's roadmap — each a row with its sun (morning) or moon (night) icon and an **open circle when not yet done, a filled check circle when done**, plus a muted detail (a `2/3` count, the sealed time, or "not set"); tapping a row jumps the beat toggle to that half of the day. **(2) Everything set down today** — every event the person submitted during the current ritual day (4am→4am), oldest first with timestamps: every ritual question's answer (typed or spoken), legacy check-in texts, and the ritual seals. **(3) Keeping up** — a last-7-days strip answering "am I keeping up with the mornings and nights": one column per day, a gold dot when that morning was sealed and a dark dot when that night was closed, open rings otherwise. It shows the record, never a score or a streak count. The proposed evolution makes the greeting identity-aware (greet by who you are, not just the clock) and makes the prompt-and-capture body proper Journal sessions rather than inline textareas that log directly.

Manual and Coach paths are both first-class. Manually, he reads the greeting and clicks into the session. Via the Coach, the docked presence can greet him in context, summarize where he left off, and offer to start the beat, all without him operating anything.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Greet by identity | Surface load | Renders a time-aware greeting plus who-you-are-becoming, drawn from Core + Vision Board | Both | draws `mirror`, `nodes` (read) |
| Show direction (compass) | Surface load | Displays the north star in a gold compass card; if unset, shows a calm "not named yet" invitation right here | Manual | draws `settings.northStar` (read) |
| Edit north star | tap "edit" / "write it", Save | The one write this surface issues — `settings.update({ northStar })`. Folded in from the former Guide | manual (Coach may also set it from far away) | writes `settings.northStar` |
| Render Mirror + pillars | Surface load | Below the day's beat, renders the Mirror (summary + value/theme tags) and each pillar with its tagged-thing count — the folded-in [Guide](guide.md) | Both | draws `mirror`, `pillars`, `nodes` (read) |
| Pick the beat | Surface load | Chooses morning vs night session based on time of day; offers the matching entry | Both | draws current `sessions` state (read) |
| Enter session | User clicks the primary action | Routes into the [Journal](journal.md), opening or resuming the right session | Both | hands off to Journal (which writes `sessions`, `prompts`) |
| Resume in progress | Surface load, open session exists | Surfaces "pick up where you left off" instead of starting fresh | Both | draws open `sessions` (read) |
| Coach greeting | Surface load / Coach proactive | The docked Coach offers a context-aware hello and an offer to start the beat | Coach | draws all streams; may write `messages` |
| Host the Daily Ritual sequence | Surface load, per beat | Renders the [Daily Ritual](daily-ritual.md) sequence card for the toggled beat (walk, answer, read, roadmap, edit, seal); all actions belong to that element | Manual | that element's `ritualItems`, `ritualDays`, `roadmapEntries` (via its own functions) |
| Host the day's to-do rail | Surface load | Renders the [Daily Ritual](daily-ritual.md)'s `do` steps on the right rail (desktop) or a card below (phone); checking is that element's own check state | Manual | that element's `ritualItems`, `ritualDays` |
| Show the day's log | Surface load | Renders Today's log: the four parts of the day with done/not-done circles, everything submitted during the current ritual day, the keeping-up strip | Manual | draws `interactions` (`interactions.forRange` over the 4am→4am span), `ritualItems`, `ritualDays` (today + `rituals.history` for 7 days), `roadmapEntries` (today + tomorrow) — all read |
| Jump to a part | Tap a log part row | Flips the Morning/Evening toggle to the half of the day that part belongs to | Manual | none |

## 4. Dynamics and interactions with other elements

The Dashboard **owns nothing** and is **draw-only** (per [`../../architecture/context-bus.md`](../../architecture/context-bus.md)). It has no table; it assembles a thin read-only slice and routes.

- **Draws from the [Core](core.md) (`mirror`)** to greet by identity and show the north star, the heart of "greet you by who you are."
- **Draws from the [Vision Board](vision-board.md)** for the becoming-self framing (the life you are pointed at).
- **Draws current [Journal](journal.md) session state** to decide which beat to open and whether to resume.
- **Routes into the [Journal](journal.md):** the Dashboard is the door, the Journal is the room. The Journal owns `sessions` and `prompts`; the Dashboard only opens it.
- **Hosts the former [Guide](guide.md):** the north star (compass), the Mirror, and the pillars render in the lower half of this surface. The Guide's draw-only contract is unchanged; only its host moved. The single north-star write lands on `settings`, not on a table of this surface's own.
- **The Dashboard no longer writes check-ins itself** (2026-07-12): the old inline one-move/tonight textareas became `question` components inside the [Daily Ritual](daily-ritual.md), whose answers publish `ritual_question` to `interactions` from that element. Historic `checkin_morning` / `checkin_evening` events still render in the Today log.
- **Hosts the [Daily Ritual](daily-ritual.md)** (2026-07-12, restructured same day): the ordered sequence card renders inside each beat, and the element's `do` steps render on the day's to-do rail. The Dashboard stays draw-only; every read and write goes through that element's own functions and tables, and its events (`ritual_completed`, `ritual_question`) publish to the Bus from there.

It publishes nothing of its own to the streams. What flows into shared context comes from the session the Dashboard hands off to, not from the Dashboard.

## 5. States

- **First load / not onboarded:** greeting with no north star; the compass card invites naming it inline ("write it"). Calm, not empty-feeling.
- **Morning, no session yet:** shows direction + the one-move entry; primary action begins the morning beat.
- **Evening:** shows the single reflective entry; primary action begins the night beat.
- **Session in progress:** offers "resume" rather than "begin."
- **Session complete for this beat:** acknowledges quietly (no streak, no score); the "Who you're becoming" half below remains a calm place to read yourself back without pressure.
- **Identity thin (sparse Core/Board):** greeting falls back to time-of-day only; still warm, never error-shaped.

## 6. Edge cases

- **Ambiguous time (late night / pre-dawn):** the beat picker leans on the last completed session and `settings` rhythm rather than the raw clock, so a 1am check-in is not misread as morning.
- **Both beats already done today:** the Dashboard stops asking; it becomes a quiet home with a soft "you're set for today."
- **Offline / Core not yet synthesized:** degrade to the time-only greeting and a generic entry; never block the door.
- **No north star and no Core yet:** the direction card becomes an invitation, not a blank.
- **Timezone / device clock skew:** beat selection uses the user's settings rhythm where available, not solely device time.
- **Temptation to grow into a dashboard:** any pressure to add stats, streaks, or lists is resolved against the principle, depth is opened (by entering a session or surface), never dumped here. The Today's log walks this line deliberately (per Ariel's 2026-07-12 ask): it is a **journal record** — what you set down, whether the day's parts are done, whether the bookends got sealed this week — with no scores, no counters, no streak numbers. If a change would turn it into metrics, it loses.
- **Day rollover while the page is open:** the log's day span and keys are computed once per mount; a tab left open across 4am shows the old day until the next visit/refresh. Accepted for now.

## 7. AI involvement

The Dashboard does no distillation or generation of its own. The model touches it only through the **Coach**, which may compose a context-aware greeting and a proactive offer to start the beat by drawing both streams (Core + Sessions) through the assembler (see [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) and [`coach.md`](coach.md)). The Coach's greeting is read-time only; it writes back nothing on behalf of the Dashboard. The actual prompt adaptation and curation happen inside the [Journal](journal.md) session the Dashboard opens, not here.

## 8. Data touched

Per [`../../architecture/data-model.md`](../../architecture/data-model.md). All **drawn (read-only)**; **owns none**.

- **Draws:** `mirror` (greeting, identity, Mirror card), `settings.northStar` and rhythm fields, `pillars` (the pillar blocks), `nodes` (per-pillar counts + Vision Board becoming-self), `sessions` (which beat / resume state), and — for the Today's log — `interactions` in the current ritual day's span (`interactions.forRange`) plus the Daily Ritual's `ritualItems` / `ritualDays` (today's check state and `rituals.history` for the 7-day strip; the mantras card reads the `read` items). The hosted [Daily Ritual](daily-ritual.md) card reads and writes its own `ritualItems` / `ritualDays` through `convex/rituals.ts`; that data belongs to the Daily Ritual element, not to this surface.
- **Writes:** `settings.northStar` via `settings.update` (the one north-star edit, folded in from the Guide) — now the surface's ONLY write. The former check-in writes moved into the [Daily Ritual](daily-ritual.md)'s question components (2026-07-12).

## 9. Open questions

- Exactly where the greeting's becoming-self phrasing is drawn from, the synthesized Core summary vs a Vision Board highlight vs both, and how it is kept fresh.
- Whether the Coach greeting is on by default or earned (per "earned interruption only"), and how it reconciles with the calm-home intent.
- How aggressively the beat picker overrides device time using `settings` rhythm, and whether the user can pin "I'm a night person."
- The handoff moment when the [Journal](journal.md) element ships: does the Dashboard keep a thin inline first prompt, or route fully into the Journal surface for every beat?
