# Home / Dashboard (Today)

**Status:** partial · **Element of:** view-only surface (no stream of its own) · **Owns:** nothing (the "Today" beat it hosts writes to `interactions`; the one north-star edit writes `settings`; the hosted [Daily Ritual](daily-ritual.md) card writes through that element's own functions)

> The door **and** the front room. An identity-aware, time-aware calm home that greets you by who you are, points you at your north star (the compass), walks you into the day's beat, and — below the fold — renders the synthesized you back (the former [Guide](guide.md), merged in 2026-06-03).

## 1. Purpose

The Dashboard is the first thing a person sees when they check in. Its one job is to make the space feel like a calm room he returns to, then route him into the day's beat. It answers lostness by reflecting identity back at the threshold: before the day pulls him anywhere, it names where he is headed (his north star, drawn from the [Core](core.md)) and who he is becoming (drawn from the [Vision Board](vision-board.md)). It is the welcoming home the soul describes (see [`../concept-and-soul.md`](../concept-and-soul.md)), the surfaced "two calm bookends" of the daily ritual. It is deliberately **not** a metrics dashboard: per the interaction principle "one thing per screen, never a dashboard," the rule forbids dumping data, not a welcoming home. The Dashboard greets and routes; it never reports.

## 2. User-facing behavior

A person opens LifeGuide. The Dashboard greets him by name and by identity, aware of the time and day. In the morning it shows his direction (the north star) and offers one small move that points at it; in the evening it offers one reflective prompt. It does not present tabs of charts, lists, or stats. The single dominant action is to begin the session that fits the moment, the morning beat when he wakes, the night beat before he sleeps. Stepping into a session hands him to the [Journal](journal.md), which owns the session itself.

This surface is the current "Today" ritual screen ([`../../../components/today/Today.tsx`](../../../components/today/Today.tsx)): a time-aware greeting, a Core progress chip, the **north star compass** (now editable inline — the one write this surface issues), a time-based morning/evening toggle (the default tab follows `activeRitual` in `lib/ritual.ts`) with, per beat, the hosted **[Daily Ritual](daily-ritual.md) card** (the editable morning/night checklist with its seal-the-day completion moment) and the day's one prompt, a Coach line, and then the folded-in [Guide](guide.md) content (the Mirror + the pillars) under a "Who you're becoming" divider. The proposed evolution makes the greeting identity-aware (greet by who you are, not just the clock) and makes the prompt-and-capture body proper Journal sessions rather than inline textareas that log directly.

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
| Log the ritual (seed) | Save in the inline Today screen | Current seed writes a `checkin_morning` / `checkin_evening` event | Manual | writes `interactions` (until Journal owns sessions) |
| Host the Daily Ritual | Surface load, per beat | Renders the [Daily Ritual](daily-ritual.md) card for the toggled beat (check, edit, seal); all actions belong to that element | Manual | that element's `ritualItems`, `ritualDays` (via `convex/rituals.ts`) |

## 4. Dynamics and interactions with other elements

The Dashboard **owns nothing** and is **draw-only** (per [`../../architecture/context-bus.md`](../../architecture/context-bus.md)). It has no table; it assembles a thin read-only slice and routes.

- **Draws from the [Core](core.md) (`mirror`)** to greet by identity and show the north star, the heart of "greet you by who you are."
- **Draws from the [Vision Board](vision-board.md)** for the becoming-self framing (the life you are pointed at).
- **Draws current [Journal](journal.md) session state** to decide which beat to open and whether to resume.
- **Routes into the [Journal](journal.md):** the Dashboard is the door, the Journal is the room. The Journal owns `sessions` and `prompts`; the Dashboard only opens it.
- **Hosts the former [Guide](guide.md):** the north star (compass), the Mirror, and the pillars render in the lower half of this surface. The Guide's draw-only contract is unchanged; only its host moved. The single north-star write lands on `settings`, not on a table of this surface's own.
- **The seed's inline ritual** publishes `checkin_morning` / `checkin_evening` to `interactions`; once the Journal element ships, those writes move to `sessions` and the Dashboard stops writing entirely.
- **Hosts the [Daily Ritual](daily-ritual.md)** (2026-07-12): the ritual card renders inside each beat, above the prompt. The Dashboard stays draw-only; the checklist's reads and writes go through that element's own functions and tables, and its completion publishes `ritual_completed` to the Bus from there.

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
- **Temptation to grow into a dashboard:** any pressure to add stats, streaks, or lists is resolved against the principle, depth is opened (by entering a session or surface), never dumped here.

## 7. AI involvement

The Dashboard does no distillation or generation of its own. The model touches it only through the **Coach**, which may compose a context-aware greeting and a proactive offer to start the beat by drawing both streams (Core + Sessions) through the assembler (see [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) and [`coach.md`](coach.md)). The Coach's greeting is read-time only; it writes back nothing on behalf of the Dashboard. The actual prompt adaptation and curation happen inside the [Journal](journal.md) session the Dashboard opens, not here.

## 8. Data touched

Per [`../../architecture/data-model.md`](../../architecture/data-model.md). All **drawn (read-only)**; **owns none**.

- **Draws:** `mirror` (greeting, identity, Mirror card), `settings.northStar` and rhythm fields, `pillars` (the pillar blocks), `nodes` (per-pillar counts + Vision Board becoming-self), `sessions` (which beat / resume state). The hosted [Daily Ritual](daily-ritual.md) card reads and writes its own `ritualItems` / `ritualDays` through `convex/rituals.ts`; that data belongs to the Daily Ritual element, not to this surface.
- **Writes:** `settings.northStar` via `settings.update` (the one north-star edit, folded in from the Guide); and `interactions` (`checkin_morning`, `checkin_evening`) from the ritual. The `interactions` write moves to `sessions` once the [Journal](journal.md) element owns the ritual; the north-star write is a Settings/Core write, not a table of this surface's own.

## 9. Open questions

- Exactly where the greeting's becoming-self phrasing is drawn from, the synthesized Core summary vs a Vision Board highlight vs both, and how it is kept fresh.
- Whether the Coach greeting is on by default or earned (per "earned interruption only"), and how it reconciles with the calm-home intent.
- How aggressively the beat picker overrides device time using `settings` rhythm, and whether the user can pin "I'm a night person."
- The handoff moment when the [Journal](journal.md) element ships: does the Dashboard keep a thin inline first prompt, or route fully into the Journal surface for every beat?
