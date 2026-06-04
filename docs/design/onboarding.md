# Onboarding: Screens and Interaction

**Status:** built (2026-06-03). For behavior and data, see [`../product/features/onboarding.md`](../product/features/onboarding.md) and [`../product/features/interview.md`](../product/features/interview.md). For the interaction contract, see [`interaction-principles.md`](interaction-principles.md).

---

## Design posture

Onboarding is the first time the person has been asked what they want. The design posture is: calm, never bombarding, never pushy, warm without being cloying. One thing per screen. Always an off-ramp. The calm radial-gradient background (warm white to cream: `radial-gradient(1000px 500px at 50% -10%, #FFFDF7, #FAF8F2)`) runs through the entire flow and gives visual continuity. It is the same background as the Today screen and the Core surface, so onboarding and the app feel like one space.

---

## Screen 1: The Door

**Layout:** full-screen, centered column, max-width 560px.

**Elements:**
- Eyebrow in small caps: "Welcome" (`text-[12px] tracking-[0.18em] uppercase text-ink-mute`)
- H1: "What do you want out of life?" (`text-[34px] leading-tight tracking-tight text-ink`)
- Subtext: "There's no wrong answer. Just start anywhere." (`text-[17px] text-ink-soft`)
- Textarea (4 rows): placeholder "Start writing… anything." Rounded card border. Full-width up to 440px.
- Primary button: "Continue →" (ink background, white text, rounded-xl). Disabled until at least one character is typed.
- Secondary action: "I don't know" (muted text link, `text-[14px] text-ink-mute`). On first click: reveals a reassurance line "Most people don't. Let's sort it out, one question at a time." in muted text, and relabels the button to "Begin →". On second click: proceeds.

**Interaction notes:**
- The primary and secondary actions are vertically stacked below the textarea, centered.
- The reassurance copy appears inline (no modal, no toast, no animation beyond appearing).
- There is no validation error state. The "Continue" button is simply disabled; there is no red text.
- A header "skip →" link is in the top-right corner but intentionally muted. It is not the call to action.

---

## Screen 2: Choose experience

**Layout:** full-screen, centered column, max-width 560px.

**Elements:**
- Eyebrow: "How would you like to begin?"
- H1: "Pick your path."
- Subtext: "Both arrive at the same place. Choose whatever feels right."
- Two experience cards (max-width 420px, stacked vertically, left-aligned text):
  - Each card: card background, line border, rounded-[14px] corners, hover gold border. Title (`font-semibold text-[15px] text-ink`), description (`text-[13px] text-ink-mute`).

**Interaction notes:**
- Clicking a card immediately starts a session and transitions to the interview. There is no "confirm" step.
- The cards are the only interactive elements; no checkboxes, no radio buttons.
- The "skip →" header link is still visible here.

---

## Screen 3a: Text interview

**Layout:** full-screen, three-zone: orientation row (top), question area (center, scrollable), actions (bottom of the question area).

**Orientation row:**
- A thin row pinned to the top with a bottom border (`border-b border-line`). Three segments ("What was before / Persona", "What's next / Goals", "What's next / Mindset"). The current section is highlighted in ink with a gold-bordered pill. The other two are muted. A live N/18 counter sits at the far right.
- This row tells the person where they are in their own story without surfacing a question number.

**Question area (scrollable, flex-1):**
- Question title: `text-[28px] leading-tight tracking-tight text-ink`
- Description paragraph: `text-[15px] text-ink-soft`, up to 500px wide, `whitespace-pre-wrap`.
- Example block (muted): card background, line border, `text-[12.5px] text-ink-mute`, `whitespace-pre-wrap`. The example is shown below the description, not inside it.
- Textarea (5 rows, resizable): card background, line border, gold border on focus. Placeholder "Write yours…" Cmd/Ctrl+Enter submits.
- "Save and continue" button: ink background, white text, rounded-xl. Disabled when empty or while saving.
- "Skip for now" link: muted text, `text-[14px] text-ink-mute`. Never disabled (always an off-ramp).

**Interaction notes:**
- Only one question is on screen at a time. There is no list, no sidebar, no visible question count beyond N/18.
- The textarea clears when the question changes.
- Transitions are implicit (the question changes, no animated slide). Calm, not showy.
- The textarea accepts multi-line, free-form text. No max length enforced in the UI.

---

## Screen 3b: Voice interview

**Layout:** the screen has three distinct states, each a calm composition centered in the main content area (the outer Onboarding shell provides the background). The screen is intentionally minimal — one focal action at a time.

**Pre-start (`idle` / `connecting`):** a single vertically-centered column. The QR handoff is the hero: the QR image (100px square, rounded) with the caption "Continue on your phone." Beneath it, generously spaced, one calm action:
- `idle`: a minimalist pill button labelled **"Start"** (card background, subtle shadow, border that warms to gold on hover). No mic-state row, no empty transcript box — just QR + Start.
- `connecting`: the Start button is replaced by a gold pulsing dot + "Connecting…".

**Live (`live`, or once any transcript exists):** adopts the blueprint VoiceField's visual language so the interview feels like one calm conversation. A slim header — a single breathing `vf-pulse` dot + "Listening" on the left, a quiet **"End"** pill on the right (closes the WebRTC connection, calls `interview.end`, proceeds to synthesis; no confirmation dialog). The conversation fills the space (flex-1, scrollable, auto-scrolls to newest, max-width ~760px, centered) as chat bubbles — coach left `bg-coach`, user right ink/white. Words appear **in real time**: the turn being spoken streams in as a ghosted bubble with a blinking `vf-caret` (from the realtime delta events), then resolves to a solid bubble when the turn completes. A living `vf-wave` waveform sits at the foot. The QR is not shown here (the handoff choice was made pre-start). The whole view is container-filling, so it also drops cleanly into a modal.

**Error (`error`):** a centered, calm message showing the actual failure reason (`errorMsg`), with two actions side by side: **"Try again"** (ink pill — resets to `idle`) and **"Type it out instead"** (quiet underline link — calls `onFallback`, routing to the text interview).

**Interaction notes:**
- The browser mic permission prompt is triggered by clicking **"Start"**, not on page load. This is intentional: the user has already chosen the voice experience and is ready.
- The error reason is surfaced verbatim (e.g. an OpenAI HTTP status + body) rather than a generic message, so failures are diagnosable.
- The transcript auto-scrolls to the bottom as new turns arrive.

---

## Screen 3c: Phone route (`/interview/[sessionId]`)

A standalone page (no rail, no app shell). Plain `bg-surface` background.

**Elements:**
- Heading: "Your interview" (`text-[17px] font-medium text-ink`).
- Subtext: "Answering on your phone. Responses appear live on your desktop too." (`text-[12px] text-ink-mute`).
- Transcript panel: same chat-bubble layout as the voice interview screen. Auto-scrolling.
- Text input (2 rows, resizable): border focus-gold. Enter (without shift) sends.
- "Send" button: ink, right-aligned with the textarea.
- "End interview" button: full-width, card border, hover-gold.

**States:**
- No token in URL: "This link is missing a session token. Open the QR code from your desktop session."
- Loading (token validating): "Connecting to your session…" (pulsing).
- Invalid/expired token: "This session link has expired or is invalid. Please rescan the QR code from your desktop."
- Session complete or ended: "This session is complete. You can close this tab."

---

## Screen 4: Synthesis loading

**Layout:** full-screen, centered column, max-width 560px.

**Elements:**
- Eyebrow: "A moment"
- H1: "Weaving what you told me into your blueprint…" (`text-[32px]`)
- Subtext: "This takes just a second."
- Three gold pulsing dots (staggered `animationDelay: 0s, 0.2s, 0.4s`).

**Interaction notes:**
- No progress bar, no spinner, no percentage. The calm animation is enough.
- The screen is held until both the synthesis action resolves AND the reactive `settings` and `core.get` queries return non-`undefined` values.

---

## Screen 5: Synthesis reveal

**Layout:** full-screen, centered column, max-width 560px.

**Elements:**
- Eyebrow: "Your blueprint"
- H1 (if complete): "Your blueprint is locked. Welcome to Level 1." (`text-[34px]`)
- H1 (if incomplete): "Your blueprint is open" + secondary line N/18 so far. Finish it anytime." (`text-[28px] font-normal text-ink-soft`)
- Subtext paragraph (max 420px centered, `text-[16px] text-ink-soft`):
  - Complete: "Everything you shared has been woven in. Your space knows who you are."
  - Incomplete: "I've taken what you told me and started your blueprint. You can always go deeper later."
- "Enter your space" button: gold background (`bg-gold text-[#231a08]`), hover opacity 90.

**Interaction notes:**
- The gold CTA is visually distinct from all previous CTAs (which use ink/dark). The warmth signals arrival.
- Clicking it calls `completeOnboarding({})` which sets `onboardedAt`. The reactive gate in `app/page.tsx` swaps to the app shell. The onboarding screens unmount.

---

## Home banner (post-onboarding, incomplete blueprint)

A small inline nudge above the morning/evening tabs in the Today screen. Not a modal, not a toast, not a badge.

```
Your blueprint isn't finished — N/18.  [Continue →]
```

"Continue" navigates to the Core surface. Hidden entirely when `blueprintStatus === "complete"` or when `settings` has not loaded.

---

## Guide marker (post-onboarding)

A small pill near the top of the Guide page, always visible (when settings have loaded):

```
Blueprint: N/18  |  Level L
```

Informational only. Not a link.
