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

## Home (Today)
**Purpose:** the single home surface. The identity-aware home **and** the synthesized-you read-back, merged into one scroll. Greets you by who you are, points you at your north star (the compass), walks you into the right beat (rule 1), then lets you read yourself back as deep as you've filled in. The Guide is no longer a separate surface; it lives here.
**On it, top to bottom:** a time-aware greeting; a Core progress chip (`x/18 · Level n`, with a "continue" link while incomplete); the **north star compass** (gold card with a compass mark, editable inline — tap "edit"/"write it", type, Save); a Morning/Evening toggle (lands on the half of the day you're in; cutoffs in `lib/ritual.ts`) with, per beat: the **ritual card** (Morning ritual / Night ritual: the editable checklist with inline mantra readings, a muted `x/y` count, the gold all-done state with its single Seal-the-morning / Close-the-day confirm, and the sealed banner with the time; see [daily-ritual.md](../product/features/daily-ritual.md)) and the day's one prompt (**Morning:** "Today's one move" + Save; **Evening:** "Tonight" reflection + "Save & rest"; saves log `checkin_morning` / `checkin_evening` to `interactions`); a Coach whisper; then a "Who you're becoming" section — the **Mirror** (dark Coach card: value/theme tag chips + a noticed-summary) and each **pillar** with its tagged-thing count.
**One thing:** the compass and the day up top; the deeper self is depth scrolled to, never dumped (rules 2, 5). Still a warm home, never a metrics dashboard.
**Status:** built. [`components/today/Today.tsx`](../../components/today/Today.tsx). Greeting-by-identity and richer time-awareness are partial (greeting is time-of-day). The north star, Mirror, and pillars folded in from the former Guide surface.

## Journal (sessions)
**Purpose:** the Sessions stream: a chronological feed of morning and night self-sessions, adaptive prompts (typed or spoken), scrollable back through history, each feeding the Mirror. See [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md).
**On it:** a dated feed of past sessions; today's prompts at the top; a way to scroll history.
**One thing:** today's prompt up top; history is depth opened, not dumped.
**Status:** proposed. Today's beats currently live on the Today surface; the standalone Journal surface and its `sessions` data model are not yet built. (Not yet in the rail; rail today is Today / Board / Guide / Settings; [`components/shell/Rail.tsx`](../../components/shell/Rail.tsx).)

## Board (vision)
**Purpose:** the Vision Board: the life and world you want, the Core's identity context. Capture, connect, and co-build with the Coach.
**On it:** a pannable, zoomable dotted-grid canvas of nodes (text, quote, image, star) connected by labeled edges; a floating toolbar (Text / Quote / Image / Talk); an Inbox of captures to place, docked top-right as a collapsed dropdown pill ("Inbox · N ideas to place") — hover peeks the contents, click expands to place.
**One thing:** the canvas. The Inbox and toolbar are quiet helpers at the edges. The board stays mounted across nav so in-flight state survives.
**Status:** built. [`components/whiteboard/`](../../components/whiteboard/).

## Future Self
**Purpose:** you as aspiration. The visual you: how you dress, how you want to be perceived, scenes of the life you want. Draws the Board + Core to generate you living that life; its own data model, separate from the Board.
**On it:** an aspiration gallery of images/scenes; upload-your-own and generate; the text behind the visuals flows to the Core.
**One thing:** the gallery of who you're becoming.
**Status:** proposed. Element and `futureSelf` schema defined in [`../architecture/elements-and-context.md`](../architecture/elements-and-context.md); not yet built or in the rail.

## Guide → merged into Home (Today)
**Status:** merged. The Guide is no longer its own surface or rail tab. Its three parts (the editable north star, the Mirror, the pillars) now live in the lower half of [Home (Today)](#home-today) under "Who you're becoming." The component `components/guide/Guide.tsx` was removed; see [`../product/features/guide.md`](../product/features/guide.md) for the merge record.

## The rail (navigation)
**Purpose:** the always-present left rail that switches surfaces. One quiet column of icons; the work fills the rest.
**On it:** an icon per primary surface (Today / Core / Board), the current one highlighted, with an **account avatar pinned at the bottom**. Clicking the avatar no longer signs you out; it opens a small popup menu — **Settings · Account · Sign out**. Settings and Account both open the Settings surface for now (Account is not yet its own page); Sign out ends the session. The Board stays mounted across nav so its canvas state survives. The active tab is **remembered across refreshes** (persisted per-device in `localStorage` under `lifeguide.activeView`), so a reload returns you to where you were instead of snapping back to Today.
**One thing:** move between surfaces without losing your place; account actions tucked into one bottom menu, not the main column.
**Mobile (< `md`, 768px):** the rail folds down into a **fixed bottom tab bar** of five even slots: **Today · Board · ➕ · Sessions · account**. The ➕ (dead center, raised above the bar) is the only dark element; active tabs get a light accent tint, never a solid block, so the bar always reads as one calm row. The ➕ starts a fresh session already recording (see [sessions.md](../product/features/sessions.md)); Core and Thoughts are desktop-only, and the Talk/Listener tab and Atmosphere (the audio engine itself, not just the orb) are gone from the phone (2026-07-12): the phone is capture-first. The "L" wordmark is hidden, the account popup opens upward, and the main surface gives up the bottom 64px so content is never trapped under the bar. Desktop (≥ `md`) is unchanged: the vertical left rail. The Feedback tab remains desktop-only.
**Status:** built. [`components/shell/Rail.tsx`](../../components/shell/Rail.tsx), [`components/shell/AppShell.tsx`](../../components/shell/AppShell.tsx).

## The docked Coach
**Purpose:** talk-first interaction on every surface (rules 3, 4). One presence, context-aware, acts from far away.
**On it:** a round gold-ringed FAB that opens a dark panel: header with the per-surface context line ("sees your board · knows you"), a message thread (gold user bubbles, dark coach bubbles), and an input. Present on every app surface, scoped to the current one.
**One thing:** the conversation. It sits beside the work, never over it.
**Mobile (< `md`):** there is no FAB — the Coach is **embedded in the bottom bar** as its own tab. Tapping it slides up a full-width dark sheet that fills the screen above the bar; tapping again dismisses it. Open state is shared (lifted to `AppShell`) so the desktop FAB and the mobile tab drive the same panel.
**Status:** built. [`components/coach/CoachDock.tsx`](../../components/coach/CoachDock.tsx). Acting "from far away" (Coach editing the board/goals directly) is partial-to-proposed.

## Settings
**Purpose:** how the Coach treats you. The tuning for the calm contract.
**Reached via:** the account menu at the bottom of the rail (Settings / Account), not a primary rail tab.
**On it:** Daily rhythm (morning/evening toggles, daily-exercise segmented control), The Coach (tone, reaching-out frequency; quiet hours in the mockup), Your pillars (chips + add-pillar modal with presets and custom), and Yours alone (data is yours / sign out).
**One thing:** quiet preference rows, grouped. No analytics here.
**Status:** built. [`components/settings/Settings.tsx`](../../components/settings/Settings.tsx). Quiet hours is in the mockup, proposed in the live build.

---

## At a glance

| Screen | In rail | Status |
|---|---|---|
| Splash | no | partial |
| Onboarding | no | built |
| Home (Today) | yes | built |
| Journal | proposed | proposed |
| Board | yes | built |
| Future Self | proposed | proposed |
| Guide | merged into Home | merged |
| Coach (docked) | always-on | built |
| Settings | via account menu | built |
