# 0027. One Coach: voice and text as I/O modes on a single agent and a single memory

**Status:** proposed (design memo for Ariel, 2026-07-20; no code)

## Context

The app currently ships **four separate conversational personas**, three of them voice:

| Persona | Surface | Engine | Prompt source | Memory |
|---|---|---|---|---|
| The Coach (text) | `CoachDock` on every view | `chatComplete` (`convex/coach.ts`) | Assembled context: Mirror + pillars + surface + tone | `messages` (one persistent thread) |
| The Listener | `/speak` orb, full-screen | OpenAI Realtime (`mintRealtimeSession`) | `buildListenerInstructions` + last-call summary (ADR 0023) | `interviewSessions` + per-call summaries |
| Conversational Core | Core → "Talk it through" | OpenAI Realtime | `buildCoreInstructions` from `coreResponses` (ADR 0024) | `interviewSessions`, synthesized into `coreResponses` |
| Onboarding interviewer | The Door / first run | OpenAI Realtime | Fixed `INTERVIEW_INSTRUCTIONS` | `interviewSessions`, synthesized into `coreResponses` |

Each has its own hand-written system prompt, its own idea of who it is, and its own memory. The costs are real and growing:

- **Split memory.** Say something meaningful to the Listener and the text Coach has never heard it (it only sees what the Center eventually files into the Mirror). Type something to the Coach and the next voice call opens cold on it. The person experiences this as the app forgetting.
- **Split context.** The text Coach reads Mirror + pillars + the surface you are on; the voice personas each read only their one slice (last-call summary, or Core answers, or nothing). None of the voice modes know what surface framing the person came from beyond their single hard-coded purpose.
- **Persona drift.** Four prompts means four tones to keep aligned with the concept's voice by hand. The Coach's `coachTone` setting (gentle/balanced/direct) applies to text only.
- **Duplicated build effort.** ARI-23 gave the Listener memory. The Conversational Core got its own personalization. The text Coach will get tools. Every capability lands in one silo and has to be re-plumbed into the others.

Ariel's prompt (2026-07-19): "maybe the coach should just be the audio interface." This memo takes that seriously as the architecture.

## Proposal

**There is one Coach.** Voice and text are input/output modes on the same agent: same assembled context, same tone setting, same personality, one memory spine. The Listener, Conversational Core, and onboarding stop being separate characters and become **framings**: a short purpose-preamble prepended to the one Coach persona depending on where the call was opened.

- Open the mic on **Core** → the Coach, framed "you're here to talk through their Blueprint; here's what's filled and open."
- Open the mic on **/speak** → the Coach, framed "just listen; reflect, don't steer."
- Open the mic on the **board / Today / Goals** → the Coach, framed by that surface's context fragment (which `coach.ts` already assembles for text).
- **Onboarding** → the Coach, framed "first meeting; draw out the Blueprint gently."

The person talks to one entity that remembers them across mouths: a voice call last night is context for a typed question this morning, and vice versa.

## How it works (concretely)

1. **One prompt builder.** Extract a `buildCoachSystemPrompt(context, tone, framing)` shared by both engines. `coach.ts` already builds the context block (Mirror + `pillars.assembleContext` + surface fragment + `coachTone`); `mintRealtimeSession` runs server-side and can call the exact same queries today. The four personas in `convex/ai/voice/index.ts` collapse into framing strings.
2. **Two engines remain, deliberately.** Text rides `chatComplete`; live turn-taking rides OpenAI Realtime. "One Coach" means one persona + one context + one memory, not one API. This is the same provider-abstraction posture as ADR 0004.
3. **One memory spine.** Voice calls keep writing `interviewSessions` transcripts and post-call summaries (ADR 0023's machinery, unchanged), but the summary is additionally appended to the Coach's `messages` thread as a coach-visible recap turn (e.g. role `system-note`: "Voice call, Tuesday night: ..."). Symmetrically, the last N text turns join the voice mint's context. The summary, not the raw transcript, crosses the boundary; that keeps the thread readable and the token cost sane.
4. **Synthesis stays.** Core-framed and onboarding-framed calls still run `synthesizeInterview` on end and fill `coreResponses` exactly as ADR 0024 decided. The framing changes who the person is talking to, not what happens to the data.
5. **Tools carry once.** When the text Coach gains board tools, the same tool schema is registered on the Realtime session (it supports function-calling). One tool surface, two mouths.

## Decisions this forces (with leans)

1. **Does the Listener survive as a named character?** Lean: the *orb surface* survives (a full-screen, listening-first space is a distinct product experience) but the character merges; the orb is the Coach in listen-framing. The word "Listener" becomes a mode name, not an agent name.
2. **Memory granularity across mouths.** Lean: summaries cross (per #3 above); raw transcripts stay in `interviewSessions`. Revisit only if recaps feel too lossy in practice.
3. **Does onboarding merge too?** Lean: yes, last. It is the most self-contained and the least hurt by being a separate persona; migrate it after the other two prove the pattern.
4. **Tone setting governs voice.** Lean: yes; `coachTone` flows into the voice persona verbatim. This is the cheapest visible win of unification.
5. **The one call only Ariel can make: is the Coach's voice presence *the* product center, or one feature among peers?** This memo assumes the former (matches "the Coach is a power tool, not a gate" plus the capture-first phone posture). If instead the Listener is meant to stay a deliberately *different* character from the Coach (softer, non-directive, never advises), the merge stops at shared memory + shared context, and personas stay split on top of it. Both are coherent; pick one.

## Migration path (each step shippable alone)

1. **Shared context into voice mints** (no user-visible persona change yet): `mintRealtimeSession` assembles Mirror + pillars + tone and appends to the existing personas. Low risk, immediate quality bump.
2. **Cross-mouth memory**: voice summaries into the `messages` thread; recent text turns into voice mints. (Schema: one new message role or a `kind` field.)
3. **Persona unification**: one `buildCoachSystemPrompt` + framings; delete the four hand-written prompts; `coachTone` governs both mouths.
4. **Onboarding folds in**; then tools, when the text Coach grows them.

## Supersedes / touches

- **ARI-21** (coachy text Listener): superseded; this is that idea, completed in the opposite direction.
- **ARI-108** (Listener recap panel): unaffected; recaps become more visible, not less.
- ADR 0023 and 0024 machinery is reused, not replaced. ADR 0004's provider abstraction is honored.

## Risks

- **Realtime prompt budget.** The assembled 6000-char context + framing + memory recaps must fit the Realtime session's instruction budget comfortably; may need a tighter `charBudget` for voice mints.
- **Tone bleed.** A single persona framed four ways can drift toward the same voice everywhere; the framings must be written strongly enough that listen-mode does not start coaching. Mitigated by keeping framings as the *first* block of the prompt and testing them as pure functions.
- **Cost.** Context-rich mints make every voice call slightly more expensive to open. Logged per ADR 0017; measurable before and after.

## Consequences (if accepted)

One personality to maintain instead of four. Memory becomes a property of the person's relationship with the Coach, not of the surface they happened to use. Every future capability (tools, knowledge, tone work) lands once. The cost is a migration across three subsystems and a real dependency on the framing prompts being well-written.
