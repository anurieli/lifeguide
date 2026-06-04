# Screens

**Status:** the surface map (2026-06-03). What each screen is, what it shows, and how built it is. The surface set follows the evolved system in [`../product/concept-and-soul.md`](../product/concept-and-soul.md) and [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md). Visual language: [`design-system.md`](design-system.md). The contract every screen honors: [`interaction-principles.md`](interaction-principles.md).

> Status key: **built** (live in `components/`), **partial** (live but thin or static), **proposed** (specced, not built).

---

## Splash
**Purpose:** the threshold. One breath before entering.
**On it:** the wordmark "LifeGuide" with a gold dot, the tagline "Your space. / for when you feel lost.", and one Enter button.
**One thing:** the entry. Nothing to read or do but step in.
**Status:** partial. The mockup has it; the live entry is [`components/auth/StartButton.tsx`](../../components/auth/StartButton.tsx) (auth-gated).

## Onboarding (5 steps)
**Purpose:** the dead-simple start. No setup, no homework (rule 5).
**On it:** progress dots and a skip, then five fading steps: (1) Welcome, "You're not lost." (2) First thing: "Show me something that pulls at you," a textarea plus three example chips. (3) Rhythm: morning+evening / mornings / evenings, plus a Coach-tone slider. (4) Meet your Coach (the dark Coach intro card). (5) Ready: "Your space is ready."
**One thing:** one prompt per step. Finishing writes settings and seeds a capture from the first input.
**Status:** built. [`components/onboarding/Onboarding.tsx`](../../components/onboarding/Onboarding.tsx).

## Home / Dashboard (Today)
**Purpose:** the two daily beats and the identity-aware home. Greets you by who you are, knows the time, walks you into the right beat (rule 1).
**On it:** a Morning/Evening toggle. **Morning:** "Good morning," your direction (north star, gold highlight card), "Today's one move" prompt with a save, and a Coach whisper. **Evening:** "Before bed. No score. No streak," one reflective prompt, a "Save & rest," and a Coach whisper. Saves log to interactions (`checkin_morning` / `checkin_evening`).
**One thing:** one beat, one focus. A warm home, never a metrics dashboard (rule 2).
**Status:** built. [`components/today/Today.tsx`](../../components/today/Today.tsx). Greeting-by-identity and richer time-awareness are partial (greeting is time-of-day; deeper identity framing is proposed).

## Journal (sessions)
**Purpose:** the Sessions stream: a chronological feed of morning and night self-sessions, adaptive prompts (typed or spoken), scrollable back through history, each feeding the Mirror. See [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md).
**On it:** a dated feed of past sessions; today's prompts at the top; a way to scroll history.
**One thing:** today's prompt up top; history is depth opened, not dumped.
**Status:** proposed. Today's beats currently live on the Today surface; the standalone Journal surface and its `sessions` data model are not yet built. (Not yet in the rail; rail today is Today / Board / Guide / Settings; [`components/shell/Rail.tsx`](../../components/shell/Rail.tsx).)

## Board (vision)
**Purpose:** the Vision Board: the life and world you want, the Core's identity context. Capture, connect, and co-build with the Coach.
**On it:** a pannable, zoomable dotted-grid canvas of nodes (text, quote, image, star) connected by labeled edges; a floating toolbar (Text / Quote / Image / Talk); an Inbox of captures to place, docked top-right.
**One thing:** the canvas. The Inbox and toolbar are quiet helpers at the edges. The board stays mounted across nav so in-flight state survives.
**Status:** built. [`components/whiteboard/`](../../components/whiteboard/).

## Future Self
**Purpose:** you as aspiration. The visual you: how you dress, how you want to be perceived, scenes of the life you want. Draws the Board + Core to generate you living that life; its own data model, separate from the Board.
**On it:** an aspiration gallery of images/scenes; upload-your-own and generate; the text behind the visuals flows to the Core.
**One thing:** the gallery of who you're becoming.
**Status:** proposed. Element and `futureSelf` schema defined in [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md); not yet built or in the rail.

## Guide
**Purpose:** the synthesized you, read back. A read-only render of the Core: north star, the Mirror, the pillars. Not a data owner.
**On it:** "Who you're becoming · a draft," an editable north star (gold highlight card), the Mirror (dark Coach card: value/theme tag chips plus a noticed-summary), then each pillar with its tagged-thing count and goals.
**One thing:** read yourself back, top to bottom, only as deep as you've filled in (rule 5). The north star is the single editable focus.
**Status:** built. [`components/guide/Guide.tsx`](../../components/guide/Guide.tsx). Pillar truths and goals are partial (counts live; truths/goals lists are thin vs. the mockup).

## The rail (navigation)
**Purpose:** the always-present left rail that switches surfaces. One quiet column of icons; the work fills the rest.
**On it:** an icon per surface (Today / Core / Board / Guide / Settings), the current one highlighted. The Board stays mounted across nav so its canvas state survives. The active tab is **remembered across refreshes** (persisted per-device in `localStorage` under `lifeguide.activeView`), so a reload returns you to where you were instead of snapping back to Today.
**One thing:** move between surfaces without losing your place.
**Status:** built. [`components/shell/Rail.tsx`](../../components/shell/Rail.tsx), [`components/shell/AppShell.tsx`](../../components/shell/AppShell.tsx).

## The docked Coach
**Purpose:** talk-first interaction on every surface (rules 3, 4). One presence, context-aware, acts from far away.
**On it:** a round gold-ringed FAB that opens a dark panel: header with the per-surface context line ("sees your board · knows you"), a message thread (gold user bubbles, dark coach bubbles), and an input. Present on every app surface, scoped to the current one.
**One thing:** the conversation. It sits beside the work, never over it.
**Status:** built. [`components/coach/CoachDock.tsx`](../../components/coach/CoachDock.tsx). Acting "from far away" (Coach editing the board/goals directly) is partial-to-proposed.

## Settings
**Purpose:** how the Coach treats you. The tuning for the calm contract.
**On it:** Daily rhythm (morning/evening toggles, daily-exercise segmented control), The Coach (tone, reaching-out frequency; quiet hours in the mockup), Your pillars (chips + add-pillar modal with presets and custom), and Yours alone (data is yours / sign out).
**One thing:** quiet preference rows, grouped. No analytics here.
**Status:** built. [`components/settings/Settings.tsx`](../../components/settings/Settings.tsx). Quiet hours is in the mockup, proposed in the live build.

---

## At a glance

| Screen | In rail | Status |
|---|---|---|
| Splash | no | partial |
| Onboarding | no | built |
| Today (Home) | yes | built |
| Journal | proposed | proposed |
| Board | yes | built |
| Future Self | proposed | proposed |
| Guide | yes | built |
| Coach (docked) | always-on | built |
| Settings | yes | built |
