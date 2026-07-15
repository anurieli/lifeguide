# The Flowing Scroll — exploration

**Status:** exploration, unbuilt (2026-07-13, from Ariel's ask: "a more intuitive way to read through and interact — more beautiful and seamless and modern, but flowing and frictionless"). Any build must clear the commitment gate first. The scrolls' current behavior is spec'd in [`../product/features/daily-ritual.md`](../product/features/daily-ritual.md); everything here honors [`interaction-principles.md`](interaction-principles.md) — calm, never bombarding.

## The problem with the stacked card

Today both scrolls render as one card with every step stacked and visible at once. That is honest and scannable, but it reads as a *form*: the eye sees a to-do list to clear, not a ritual to move through. The "current step" gold wash helps, but the person still scrolls, scans, and decides where to look — three small frictions at exactly the two moments of the day (just woke / about to sleep) when deciding should cost nothing.

## North star

**The scroll should feel like being walked, not like filling a form.** One thing before you at a time; the next arrives on its own; done things settle behind you. Reading and answering happen where the eye already is. Zero navigation decisions inside the flow. The card view stays as the at-a-glance fallback — the flow is how you *do* the scroll, the card is how you *see* it.

## Directions (composable, roughly ordered by value/effort)

1. **The walk — one step, full attention.** A "Begin" affordance on the scroll card opens a full-screen flow (the [immersive reader](../decisions/0013-immersive-reader-overlay.md) already proves the pattern and the overlay plumbing): the note from last night fades in first, then each component takes the screen alone — the read, the roadmap, the question — with completed steps compressing into a quiet trail at the top. Finishing the last step presents the seal as the natural final page, then releases back to the card, now gold. Enter/tap advances; nothing else is on screen.
2. **Ink-in and glide (the scroll metaphor, literally).** Whether in the flow or the card, completing a step "inks it in" — the text settles to muted, the checkmark draws itself — and the view glides to the next step on its own. Progress is how far the scroll has unrolled, not an `x/y` counter. Motion budget: one 300–400ms ease per transition, no springs, no confetti; the gold moment stays the only celebration.
3. **A rhythm you can keep with your thumbs.** The whole flow drivable by one gesture: Enter commits an answer and advances, Enter on an empty roadmap line closes the builder, a bare tap advances a read page. On the phone, each step is a full-height snap-scroll pane (CSS scroll-snap — the platform's own physics, no custom scroller).
4. **Time-of-day atmosphere.** The morning flow opens on the existing warm dawn radial; the night flow deepens toward the ink/coach palette — same components, different air. Ties into [Atmosphere](../product/features/atmosphere.md) (a soft mood default per scroll) without new settings.
5. **Voice-walked.** The question step already speaks (VoiceField); in the flow, the mic can stay armed so the person answers the question and dictates roadmap lines hands-free. Later, the Coach could *read the scroll to you* — but that is a Coach feature and must earn its interruption.

## Recommended slice (when committed)

Direction 1 + 2 for the **morning** only: "Begin the morning" → note → read → roadmap walk → question → seal, reusing the ImmersiveReader overlay pattern and existing mutations end to end (no schema work). The night scroll keeps the card (building a list wants the overview), gaining only the glide/ink-in polish. Estimate: one focused session; tests are interaction-level, so browser verification per the `verify` skill.

## Explicitly rejected

- **Streak/energy meters, progress rings, gamified sunrise animations** — violates "no score, no streak." (The gentle keeping-up run of [ADR 0018](../decisions/0018-gentle-keeping-up-run.md) is a quiet text count on the rituals rail, not a meter, ring, or animation — this line still rules those out.)
- **Auto-playing the flow on page load** — the person begins the scroll; the app never pounces.
- **Hiding the card view entirely** — the at-a-glance state must survive; the flow is a mode, not a replacement.
