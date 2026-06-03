# Home / Dashboard

**Status:** partial · **Element of:** view-only surface (no stream of its own) · **Owns:** nothing (the "Today" ritual it hosts writes to `interactions`)

> The door, not the room. An identity-aware, time-aware calm home that greets you by who you are and walks you into the right self-session.

## 1. Purpose

The Dashboard is the first thing a person sees when they check in. Its one job is to make the space feel like a calm room he returns to, then route him into the day's beat. It answers lostness by reflecting identity back at the threshold: before the day pulls him anywhere, it names where he is headed (his north star, drawn from the [Core](core.md)) and who he is becoming (drawn from the [Vision Board](vision-board.md)). It is the welcoming home the soul describes (see [`../concept-and-soul.md`](../concept-and-soul.md)), the surfaced "two calm bookends" of the daily ritual. It is deliberately **not** a metrics dashboard: per the interaction principle "one thing per screen, never a dashboard," the rule forbids dumping data, not a welcoming home. The Dashboard greets and routes; it never reports.

## 2. User-facing behavior

A person opens LifeGuide. The Dashboard greets him by name and by identity, aware of the time and day. In the morning it shows his direction (the north star) and offers one small move that points at it; in the evening it offers one reflective prompt. It does not present tabs of charts, lists, or stats. The single dominant action is to begin the session that fits the moment, the morning beat when he wakes, the night beat before he sleeps. Stepping into a session hands him to the [Journal](journal.md), which owns the session itself.

The seed of this surface is the current "Today" ritual screen ([`../../../components/today/Today.tsx`](../../../components/today/Today.tsx)): a time-based morning/evening toggle, a greeting, the north star card, a one-move or reflection prompt, and a Coach line. The proposed evolution makes it identity-aware (greet by who you are, not just the clock) and makes the prompt-and-capture body proper Journal sessions rather than inline textareas that log directly.

Manual and Coach paths are both first-class. Manually, he reads the greeting and clicks into the session. Via the Coach, the docked presence can greet him in context, summarize where he left off, and offer to start the beat, all without him operating anything.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Greet by identity | Surface load | Renders a time-aware greeting plus who-you-are-becoming, drawn from Core + Vision Board | Both | draws `mirror`, `nodes` (read) |
| Show direction | Surface load (morning) | Displays the north star; if unset, routes to the [Guide](guide.md) to name it | Manual | draws `settings.northStar`, `mirror` (read) |
| Pick the beat | Surface load | Chooses morning vs night session based on time of day; offers the matching entry | Both | draws current `sessions` state (read) |
| Enter session | User clicks the primary action | Routes into the [Journal](journal.md), opening or resuming the right session | Both | hands off to Journal (which writes `sessions`, `prompts`) |
| Resume in progress | Surface load, open session exists | Surfaces "pick up where you left off" instead of starting fresh | Both | draws open `sessions` (read) |
| Coach greeting | Surface load / Coach proactive | The docked Coach offers a context-aware hello and an offer to start the beat | Coach | draws all streams; may write `messages` |
| Log the ritual (seed) | Save in the inline Today screen | Current seed writes a `checkin_morning` / `checkin_evening` event | Manual | writes `interactions` (until Journal owns sessions) |

## 4. Dynamics and interactions with other elements

The Dashboard **owns nothing** and is **draw-only** (per [`../../architecture/context-bus.md`](../../architecture/context-bus.md)). It has no table; it assembles a thin read-only slice and routes.

- **Draws from the [Core](core.md) (`mirror`)** to greet by identity and show the north star, the heart of "greet you by who you are."
- **Draws from the [Vision Board](vision-board.md)** for the becoming-self framing (the life you are pointed at).
- **Draws current [Journal](journal.md) session state** to decide which beat to open and whether to resume.
- **Routes into the [Journal](journal.md):** the Dashboard is the door, the Journal is the room. The Journal owns `sessions` and `prompts`; the Dashboard only opens it.
- **Routes into the [Guide](guide.md)** when the north star is unnamed.
- **The seed's inline ritual** publishes `checkin_morning` / `checkin_evening` to `interactions`; once the Journal element ships, those writes move to `sessions` and the Dashboard stops writing entirely.

It publishes nothing of its own to the streams. What flows into shared context comes from the session the Dashboard hands off to, not from the Dashboard.

## 5. States

- **First load / not onboarded:** greeting with no north star; the direction card invites naming it in the [Guide](guide.md). Calm, not empty-feeling.
- **Morning, no session yet:** shows direction + the one-move entry; primary action begins the morning beat.
- **Evening:** shows the single reflective entry; primary action begins the night beat.
- **Session in progress:** offers "resume" rather than "begin."
- **Session complete for this beat:** acknowledges quietly (no streak, no score) and offers the next surface (board, Guide) without pressure.
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

- **Draws:** `mirror` (greeting, north star, identity), `settings.northStar` and rhythm fields, `nodes` (Vision Board becoming-self), `sessions` (which beat / resume state).
- **Writes (seed only, transitional):** `interactions` (`checkin_morning`, `checkin_evening`) from the current "Today" screen. This write moves to `sessions` once the [Journal](journal.md) element owns the ritual; the proposed Dashboard writes nothing.

## 9. Open questions

- Exactly where the greeting's becoming-self phrasing is drawn from, the synthesized Core summary vs a Vision Board highlight vs both, and how it is kept fresh.
- Whether the Coach greeting is on by default or earned (per "earned interruption only"), and how it reconciles with the calm-home intent.
- How aggressively the beat picker overrides device time using `settings` rhythm, and whether the user can pin "I'm a night person."
- The handoff moment when the [Journal](journal.md) element ships: does the Dashboard keep a thin inline first prompt, or route fully into the Journal surface for every beat?
