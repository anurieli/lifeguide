# Onboarding Strategy

**Status:** written 2026-07-18 (ARI-20) · **Seeded from:** [`concept-and-soul.md`](concept-and-soul.md) (the "evolved system" and "the promise, the system thesis, and the observation contract" sections) · **Describes the built flow in:** [`features/onboarding.md`](features/onboarding.md), [`features/interview.md`](features/interview.md), [`../design/onboarding.md`](../design/onboarding.md)

> This is the planning artifact for the in-app onboarding **tour** (a separate, parallel build — not built here). It answers: what is onboarding *for*, who is it *for*, what does it ask of the person, and what does the journey actually look like today. It does not change any code or the shipped onboarding flow; where the soul's ask is ahead of what's built, that gap is called out explicitly rather than glossed over.

---

## 1. The outcome — what "onboarded" means here

Onboarding is not "the user filled in a profile." Per the soul's build-order (Foundation first, then surfaces), onboarding is **the first pass at the Core** — the person's first deposit into "the text layer behind the human." A person is *onboarded* when three things are true:

1. **The Core has a first pass.** At least a partial Life Blueprint exists (`coreResponses` has some boxes filled, `settings.blueprintStatus` is `in_progress` or `complete`) — not zero, because zero means the interview was skipped entirely and the Coach has nothing yet to reason from. Ideally `complete` (all 18 boxes), which unlocks Level 1 and a materially better Coach/Guide from day one.
2. **They understand the deal.** Per the "observation contract" (concept-and-soul.md §"The observation contract"): LifeGuide's first move is always observation, not advice. A person who has been onboarded understands, even if only implicitly from the flow's own framing, that the system needs to watch them live for a while — two check-ins a day, a handful of brain dumps — before it can hand anything useful back. They are not expecting a finished answer on day one.
3. **They're inside the ritual, not just inside the app.** They've been routed to Today (the morning/night ritual home) with `settings.onboardedAt` set, so the *next* thing they do is a real beat of the daily loop, not a dead-end "welcome" screen. Onboarding's job is to hand off cleanly into the two-beats-a-day rhythm that is the actual retention engine.

**What "onboarded" is explicitly not:** a filled-out settings form, a tour of every button, or a locked gate that traps the person until they finish. The header "skip →" is intentional — the soul's "earned interruption only" and "no long intake" principles mean the person is never coerced. A person who skips everything is still onboarded (empty Core, but `onboardedAt` set); they just start from further behind, and the Home banner ("Your blueprint isn't finished — N/18") is the mechanism that invites them back in without nagging.

---

## 2. The ICP — who this is really for, made concrete

The soul's ICP line: **"young men who feel lost — drifting, capable, aware something's off, no framework for direction."** Made concrete for onboarding design:

- **Capable, not broken.** This is not a mental-health crisis product and onboarding should never read as one. The person can hold a job, has friends, functions — but privately suspects they're walking a path set for them (school → job → money → marriage) rather than one they chose. Onboarding's opening question ("What do you want out of life?") is aimed exactly at that private suspicion.
- **Aware, but inarticulate.** They know *something* is off before they can say *what*. This is why the Door offers an explicit, dignified off-ramp ("I don't know" → "Most people don't. Let's sort it out, one question at a time.") instead of demanding a polished answer. Onboarding's job is to draw the vision out of them via one-question-at-a-time interview, not to make them arrive with one pre-formed.
- **Has no framework, and won't build one from a form.** A traditional settings wizard (name, goals, preferences) fails this person twice: it assumes they already know their goals, and it feels like paperwork, not reflection. This is exactly why the rebuilt onboarding is an **interview**, not a wizard — see `features/onboarding.md` §1 ("The old five-step wizard collected a name and a pasted vision statement. The rebuilt onboarding does the real work").
- **Skeptical of being sold to, receptive to being understood.** Young men in this drifting state are often allergic to hype and "life coach" energy. The calm, undramatic design posture (`design/onboarding.md` — "calm, never bombarding, never pushy, warm without being cloying") is not a generic aesthetic choice; it is ICP-load-bearing. A pushy or gamified onboarding (streaks, progress bars, confetti) would read as exactly the kind of shallow productivity-app noise this person has already learned to distrust.
- **What onboarding is surfacing about them, specifically:** not demographic facts, but the three-section Life Blueprint shape — **who they are and who they want to become** (Crafting Your Persona), **what they're actually driving toward** (Setting Your Goals), and **the internal operating rules they either have or need** (Forging Your Mindset). Onboarding's real product is the first honest draft of those 18 answers, however partial.

**A note on scope:** "young men" is the emotional center of gravity, not a hard gate — nothing in the flow checks gender or age, and the Door's question ("What do you want out of life?") is universal. Onboarding language should stay in that universal register (it already does) rather than narrowing further; the ICP sharpens *who the product is built and marketed for*, not who is allowed to answer the Door.

---

## 3. Readiness — what a person needs to bring

For onboarding (and the two weeks that follow it) to produce anything real, the person needs to show up with:

- **A few honest minutes, more than once.** The Door/interview itself takes roughly 5-15 minutes depending on how many of the 18 questions they answer before skipping or finishing. But the *real* readiness bar is set by the observation contract, not the interview: "Give me two weeks. A morning and a night check-in, two minutes each... at least seven or eight brain dumps." Onboarding should set this expectation honestly up front rather than let the person believe one interview is "done."
- **Willingness to be asked, not just to answer.** The interview is one question at a time with no visible list — the person has to trust the process enough to stay in it rather than needing to see the whole shape before committing. The orientation row (three unlabeled-by-number phase segments) is designed to give just enough "where am I" without turning it into a form to be optimized.
- **Tolerance for "I don't know."** Several Life Blueprint questions (persona, values, goals, mindset) are genuinely hard to answer cold. Readiness includes being okay giving a rough, unfinished, or skipped answer — the flow is built for this (skip, single circle-back, then move on) — rather than stalling because the answer isn't polished.
- **A device and five minutes of quiet**, twice a day, going forward. Nothing exotic: phone or computer, per the observation contract's own framing. The voice-interview option (talk it through, continue on your phone via QR handoff) exists specifically to lower this bar for someone who thinks better out loud than typed.
- **Basic comfort with an AI reading their words.** Synthesis (an LLM filling empty Blueprint boxes from the transcript) and the Coach's ongoing curation of the Core are core to the product, not an opt-in feature. A person who is fundamentally unwilling to have an AI process personal reflection is not this product's fit — this is a readiness *filter*, not a settings toggle to route around.
- **NOT required:** a pre-formed vision, a finished goal list, comfort with productivity/habit-tracking apps (this deliberately isn't one), or continuous daily engagement from day one — the two-week ask is explicit precisely because the product doesn't need constant use, just the two calm bookends.

---

## 4. The journey — what's actually built, step by step

This section describes the **shipped** flow (verified 2026-07-18 against `components/onboarding/*`, `lib/interview/policy.ts`, `lib/experiences/index.ts`, `convex/settings.ts`). Full behavioral and visual detail lives in `features/onboarding.md` and `design/onboarding.md`; this is the journey read, moment by moment, through the ICP/readiness lens above. **Gaps against the soul are flagged explicitly** where the current build is narrower than what concept-and-soul.md asks for.

**Gate:** `settings.onboardedAt` unset → onboarding shown instead of the app shell (`app/page.tsx`). This is the only gate; there is no separate auth-first screen — auth (Anonymous, "just look around") happens transparently before this, so the very first thing a new visitor sees is the Door itself, not a signup form.

1. **The Door.** Full-screen, centered, warm radial-gradient background. One question: *"What do you want out of life?"* Subtext: *"There's no wrong answer. Just start anywhere."* A textarea, a "Continue →" button (disabled until non-empty), and a quieter "I don't know" link that on first click reveals *"Most people don't. Let's sort it out, one question at a time."* and relabels to "Begin →." A muted "skip →" sits in the header the whole time.
   - **Readiness match:** this is the honesty-first, no-forced-answer design the ICP needs. Writing something saves it as `settings.northStar` *and* seeds a vision-board capture — the person's very first words become the first board node, even before they've seen the board.
   - **Gap vs. the soul:** the observation contract's explicit ask ("Give me two weeks... at least seven or eight brain dumps... By day seven I'll start showing you what I see") is **not stated anywhere in the current Door copy or flow.** The person is not told, in onboarding, what the system needs from them going forward or when it starts giving something back. This is the single clearest opportunity for the in-app tour build: state the contract out loud, once, calmly, either as a beat on the Door or as a closing line on the Synthesis reveal (see step 5).

2. **Choose experience.** *"Pick your path."* Two cards: **"Type it out"** (calm, one-question-at-a-time written interview) and **"Talk it through"** (speak with the Coach, continue on your phone). Picking either immediately starts an `interviewSessions` row — no confirm step.
   - **Readiness match:** offering voice lowers the bar for someone who thinks out loud rather than in writing; the QR handoff (talk it through → continue on phone) meets the "phone or computer" readiness bar from the observation contract directly.

3. **The interview** (text or voice, same underlying policy). One question at a time, chosen by `lib/interview/policy.ts` walking the 18-question Life Blueprint in canonical order (Crafting Your Persona → Setting Your Goals → Forging Your Mindset), skipping and circling back once per key, never twice. An orientation row names the three phases without numbering questions, plus a live N/18 counter. Each question shows title, description, a muted example, a textarea, "Save and continue," and an always-available "Skip for now."
   - **Text:** single-question layout, Cmd/Ctrl+Enter to save.
   - **Voice:** WebRTC to OpenAI Realtime via an ephemeral server-minted token; a persona conducts the interview per `INTERVIEW_INSTRUCTIONS` (calm, allows skips, circles back, never pushy); live streaming chat-bubble transcript; QR lets the same session continue on a phone.
   - **Readiness match:** this *is* the "guides them through a one-question-at-a-time interview" promise from `features/onboarding.md` §1 — the interview does the work of drawing the vision out rather than asking the person to arrive with one.

4. **Synthesis.** A calm "Weaving what you told me into your blueprint…" loading screen while `synthesizeInterview` (LLM, OpenRouter) fills the empty Blueprint boxes from the transcript and `settings.recompute` sets `blueprintStatus`/`level`.
   - This is the first moment the person sees the system reflect something back — the "visible learning... insight that feels truer than what they could articulate themselves" the soul names as the retention engine (§"The observation contract"). Currently this reflection is thin: just a fill-count and a status line (see step 5), not yet a synthesized insight about *them*.

5. **Synthesis reveal.** If complete: *"Your blueprint is locked. Welcome to Level 1."* If partial: *"Your blueprint is open — N/18 so far. Finish it anytime."* A gold "Enter your space" button calls `completeOnboarding`, which sets `onboardedAt` and swaps the reactive gate to the app shell (Today).
   - **Gap vs. the soul:** this is the natural home for the observation-contract framing (step 1's flag) — the moment the person finishes their first deposit is exactly when they should hear "give me two weeks, two check-ins a day, a handful of brain dumps, and by day seven I'll start showing you what I see." Today it's silent on that; it only reports blueprint fill count, not what happens next or why.

6. **Handoff into the ritual.** The reactive gate swaps to the app shell; the person lands on Today (the AM/PM ritual home). If the blueprint is incomplete, a standing (non-modal, non-nagging) Home banner — *"Your blueprint isn't finished — N/18. [Continue →]"* — invites them back to the Core surface on future visits, and the Guide page carries the same "Blueprint: N/18 | Level L" marker.
   - This is the actual "outcome" moment from §1: the person is inside the two-beats-a-day rhythm, not stuck in a wizard.

**What the in-app onboarding tour build should therefore aim at, per this journey:** (a) state the observation contract explicitly somewhere in this flow — Door or Synthesis reveal are the two natural seams; (b) make the Synthesis reveal feel like the start of "it's learning me" rather than a fill-count, since that visible-learning loop is named as the retention engine itself; (c) everything else in the shipped journey already matches the calm/off-ramp/one-thing-per-screen contract and should not be disrupted by the tour.

---

## 5. See also

- [`features/onboarding.md`](features/onboarding.md) — full behavioral spec (functions, states, edge cases, AI involvement, data touched).
- [`features/interview.md`](features/interview.md) — the interview engine (question-selection policy, experience registry) underneath onboarding.
- [`../design/onboarding.md`](../design/onboarding.md) — screen-by-screen visual and interaction spec.
- [`beta-checklist.md`](beta-checklist.md) — the concrete checklist for getting real beta testers into this flow.
- [`concept-and-soul.md`](concept-and-soul.md) — the seed this document draws from (§"The evolved system", §"The promise, the system thesis, and the observation contract").
