# Onboarding

**Status:** built (2026-06-03, branch `onboarding-rebuild`) · **Element of:** spine · **Owns:** `interviewSessions`, `experienceEvents` (via the interview engine); reads/writes `settings`, `coreResponses`, `captures`

> Onboarding is the first pass at the Core. It draws a person's Life Blueprint out of them in one calm session, instead of collecting settings.

---

## 1. Purpose

The old five-step wizard collected a name and a pasted vision statement. The rebuilt onboarding does the real work: it opens on the one question that matters ("What do you want out of life?"), gives the person an honest off-ramp if they don't know, and guides them through a one-question-at-a-time **interview** (typed or spoken) that fills the Life Blueprint for them. By the time the person enters the app, their Core already knows something true about them.

This serves the soul directly: LifeGuide builds and steers one thing, a person's true self and the plan for their life. Onboarding is the first pass at the Core, not a settings collector.

---

## 2. User-facing behavior

The gate is `settings.onboardedAt`. Until that timestamp is set, the user sees the onboarding flow instead of the app shell. `onboardedAt` is set by `settings.completeOnboarding` at the very end of the flow, so the person is never trapped in the wizard.

### Phase 0: The Door

The first screen the user sees. A centered, calm layout on a warm radial-gradient background.

- Eyebrow: "Welcome". Heading: "What do you want out of life?" Subtext: "There's no wrong answer. Just start anywhere."
- A free-form textarea. A primary "Continue" button (disabled until there is at least one character).
- A quieter "I don't know" button. On first click it reveals reassurance copy ("Most people don't. Let's sort it out, one question at a time.") and relabels to "Begin." A second click proceeds.

**On "Continue":** the text is saved as `settings.northStar` (via `settings.update`) AND a `paste/text` capture is created (the existing vision-seed path: it distills async and lands as a board node). The user moves to the choose-experience screen.

**On "I don't know" (two clicks):** the user moves to the choose-experience screen with `northStar` left empty (synthesis may derive it later).

A header skip link ("skip →") is visible on the Door and choose-experience screens. Clicking it calls `completeOnboarding` immediately and drops the person into the app shell with `onboardedAt` set but the blueprint empty.

### Phase 1: Choose experience

Two cards, one per experience in the registry (`EXPERIENCES` from `lib/experiences/index.ts`):

- **"Type it out"** (text-interview): a calm, one-question-at-a-time written interview.
- **"Talk it through"** (voice-interview): speak with the Coach; continue on your phone if you want to move around.

Picking a card calls `interview.start({ experienceId, device:"desktop" })` to create an `interviewSessions` row, stores the session id, and navigates to the interview phase.

### Phase 2a: Text interview

A single-question layout. One question is displayed at a time (driven by the question-selection policy in `lib/interview/policy.ts`). No question list, no sidebar, no progress bar beyond the N/18 counter and the orientation row.

At the top, an orientation row labels the three conceptual phases: "What was before / Persona", "What's next / Goals", "What's next / Mindset", with the current section highlighted and a live N/18 counter. This tells the person where they are in their own story without naming a question number.

Each question shows: the question title (large), the description text, and a muted example block. Below that: a textarea, a "Save and continue" button (Cmd/Ctrl+Enter also saves), and a quieter "Skip for now" link.

**Save:** appends a user turn to the transcript (`interview.appendTurn`) and moves to the next question.

**Skip:** marks the key in `session.skipped` via `interview.skip` and moves to the next question. The policy will circle back to skipped keys once after all fresh keys are exhausted. If the user skips a second time on the circle-back, the key is added to `doubleSkipped` client state, which the policy sees as `circledBack`, and the interview ends naturally.

When the policy returns `null` (all questions answered or skipped past the single circle-back), the interview transitions to synthesis.

### Phase 2b: Voice interview

A voice-transport UI on the same session. See [`interview.md`](interview.md) for the full voice stack. In summary: an ephemeral token is minted server-side (`ai/voice/index.ts: mintRealtimeSession`), the browser establishes a WebRTC connection to the OpenAI Realtime API, the model conducts the interview, and transcripts stream back into the session via `interview.appendTurn`. The screen shows a mic-state indicator, a live transcript panel, and the QR handoff widget. An "End interview" button calls `interview.end({ status:"completed" })` and transitions to synthesis. On mic/connection error, a fallback link offers the text interview instead.

### Phase 3: Synthesis

A calm "Weaving what you told me into your blueprint..." loading screen (three pulsing dots) while `ai/synthesizeInterview.ts: synthesizeInterview` runs. Once the action resolves and the reactive queries settle, the screen reveals the result:

- If `blueprintStatus === "complete"`: "Your blueprint is locked. Welcome to Level 1." with the copy "Everything you shared has been woven in."
- Otherwise: "Your blueprint is open — N/18 so far. Finish it anytime." with the copy "I've taken what you told me and started your blueprint."

A gold "Enter your space" button calls `completeOnboarding({})` which sets `onboardedAt`, and the reactive gate in `app/page.tsx` swaps to the app shell.

---

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Write north star | Door "Continue" | Saves `settings.northStar`, creates a `paste/text` capture (vision seed) | Manual | `settings`, `captures` |
| Skip Door | Door "I don't know" | Bypasses north star; proceeds to choose-experience | Manual | none |
| Skip all (header skip) | "skip →" button | Calls `completeOnboarding`; enters app shell with empty blueprint | Manual | `settings.onboardedAt` |
| Choose experience | Pick a card | Creates `interviewSessions` row; starts chosen transport | Manual | `interviewSessions`, `experienceEvents` |
| Save answer | "Save and continue" / Cmd+Enter | Appends user turn; advances question | Manual | `interviewSessions.transcript`, `experienceEvents` |
| Skip question | "Skip for now" | Defers question; policy circles back once | Manual | `interviewSessions.skipped`, `experienceEvents` |
| End voice session | "End interview" button | Ends the session; triggers synthesis | Manual | `interviewSessions.status/endedAt`, `experienceEvents` |
| Synthesis | Auto on interview complete | LLM fills empty `coreResponses` boxes from transcript; recomputes level | AI | `coreResponses`, `settings.blueprintStatus`, `settings.level`, `experienceEvents` |
| Complete onboarding | "Enter your space" | Sets `settings.onboardedAt`; gate swaps to app shell | Manual | `settings` |

---

## 4. Dynamics and interactions with other elements

**Owns:** `interviewSessions` and `experienceEvents` (written by onboarding, read by synthesis and telemetry).

**Writes into:**
- `settings.northStar` (Door answer)
- `captures` (Door answer as a vision-seed capture, which distills and lands on the board)
- `coreResponses` (via synthesis: fills empty Blueprint boxes)
- `settings.blueprintStatus` and `settings.level` (via `settings.recompute` called at synthesis end)
- `settings.onboardedAt` (the gate that ends onboarding)

**Reads:**
- `settings` (to know blueprint status on the Synthesis screen)
- `core.get` (to know fill count on the Synthesis screen)
- `interviewSessions` (live query in Interview and VoiceInterview)

**After onboarding:**
- The Home banner (`components/today/Today.tsx`) reads `settings.blueprintStatus` and `coreMap` to display a "Blueprint not finished — N/18" nudge if incomplete.
- The Guide marker (`components/guide/Guide.tsx`) shows "Blueprint: N/18 | Level L" from the same fields.
- The Core surface (`components/core/Core.tsx`) shows the filled `coreResponses` boxes.

---

## 5. States

| State | When | Visual |
|---|---|---|
| Door | Fresh user, not yet answered | Centered textarea + two buttons |
| Choose experience | Door answered or skipped | Two experience cards |
| Text interview | text-interview chosen, session active | Single-question layout, orientation row |
| Voice interview | voice-interview chosen, session active | Mic state, transcript, QR handoff |
| Synthesis loading | Interview complete | "Weaving..." with pulsing dots |
| Synthesis reveal | Synthesis resolved | Blueprint count + Level reveal + CTA |
| App shell | `onboardedAt` set | Normal app (never returns to onboarding) |

**Blueprint status (post-onboarding, persistent):**
- `unstarted`: zero boxes filled.
- `in_progress`: some boxes filled. Home banner visible. Level 0.
- `complete`: all 18 boxes filled. Home banner hidden. Level 1.

---

## 6. Edge cases

- **Synthesis action fails** (no API key, network error): the Synthesis component catches the error silently and still lets the user enter the app. `blueprintStatus` stays at whatever `recompute` last set (or `unstarted`). The user can fill boxes manually via the Core surface.
- **Voice mic permission denied**: `VoiceInterview` catches the `getUserMedia` error, sets `micState = "error"`, and shows a "Type it out instead" fallback link. No browser alert is triggered.
- **Voice WebRTC handshake fails**: same error path. The ephemeral token is minted but the SDP exchange fails. The user sees the error message and the fallback link.
- **QR token expires** (10-minute window): the phone route shows "This session link has expired or is invalid. Please rescan the QR code from your desktop." The desktop can issue a new token by re-rendering `QrHandoff` (currently requires a page refresh).
- **User skips to the app without interviewing**: `onboardedAt` is set, `blueprintStatus` stays `unstarted` or `in_progress`. The Home banner appears on every load until they fill the Core.
- **All 18 boxes already filled before onboarding runs**: synthesis runs `applySynthesis` which will find zero empty boxes to write (no-ops). `recompute` will flip status to `complete` and level to `1`.
- **Session abandoned mid-interview**: if the browser tab is closed, the session row stays `active` but no new questions are asked. On the next load, the user will be back at the Door (since `onboardedAt` is still unset). A new session is started; the old row is left orphaned.

---

## 7. AI involvement

- **Vision seed distillation (Door):** the Door answer is submitted as a `paste/text` capture. The existing `ai/distill.ts` action runs async to produce `{title, essence, pillars}` and place a board node. Model: `distill` task in `config.ts` (OpenRouter, `openai/gpt-4o-mini`). The onboarding flow does not wait for this.
- **Voice interview (OpenAI Realtime):** the voice transport connects to `gpt-4o-mini-realtime-preview` via WebRTC with an ephemeral token. The model is given INTERVIEW_INSTRUCTIONS (conduct a calm blueprint interview, allow skips, circle back, never pushy). Transcripts stream back in real time.
- **Synthesis (OpenRouter):** `synthesizeInterview` sends the full transcript and the blueprint skeleton to the `synthesis` task model (`openrouter`, `openai/gpt-4o-mini`, temperature 0.3) with a structured-output instruction. The model returns a `{ [questionKey]: string|null }` JSON object. `applySynthesis` fills only empty boxes; conflicts are logged in `experienceEvents.meta`.

---

## 8. Data touched

**Owned (primary writes during onboarding):**
- `interviewSessions` (all fields)
- `experienceEvents` (all fields)

**Written by onboarding into other elements:**
- `settings.northStar`, `settings.onboardedAt`, `settings.blueprintStatus`, `settings.level`
- `captures` (Door vision seed)
- `coreResponses` (synthesis output)

**Read during onboarding:**
- `settings` (blueprintStatus, level for Synthesis reveal)
- `coreResponses` via `core.get` (fill count for Synthesis reveal)
- `interviewSessions` (live session state in Interview/VoiceInterview)

---

## 9. Open questions

- **Session resume:** if a user closes the tab mid-interview, the in-progress session is abandoned. A future improvement could detect the orphaned session on next load and offer to resume.
- **Synthesis conflict surfacing:** conflicts are logged in `experienceEvents.meta` but the Coach does not yet raise them. The mechanism is ready; the Coach curation pass will pick this up.
- **Level 2+ rules:** level derivation currently returns `1` for all-18-filled and `0` otherwise. Higher levels are deferred pending the engagement-driven ranking design.
- **Personal onboarding variant:** a custom branded flow for specific user cohorts. Not built; architecture supports it via the experience registry.
