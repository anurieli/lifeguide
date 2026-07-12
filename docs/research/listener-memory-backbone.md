# Research / spec draft: The Listener's memory backbone (conversational continuity)

> **Type:** parked feature spec — NOT finalized. Captured from a brainstorm on 2026-06-09, parked in Linear for design completion before any code.
> **Status:** needs finalization (open questions below are load-bearing).
> **Related code:** the Listener (`agents/listener/`, `components/voice/SpeakSurface.tsx`, `hooks/useRealtimeVoice.ts`), the Center (`agents/center/`, `convex/center.ts`), sessions (`convex/interview.ts`, `interviewSessions` in `convex/schema.ts`).

---

## 0. The problem, stated plainly

The Listener (the `/speak` voice orb) currently has **a face but no memory**. Each call is a cold start: it greets you as if it has never spoken to you before. The **Center** already files *who you are* into the Core (the file system on the human), but nothing gives the Listener **continuity of the conversation itself** — "what did we last talk about, and where did we leave off."

Ariel: *"What is this orb supposed to do? We need to give it a backbone."*

The backbone = **conversational continuity**, distinct from Core-filing:
- **Center** answers: *who is this person* (durable identity → `coreFiles`).
- **Backbone** answers: *what have this person and I been talking about lately* (conversation memory → guides the next call's opening).

## 1. The requirement (from Ariel, 2026-06-09)

1. **Every chat is logged.** Each Listener call is persisted as a durable conversation record (transcript already lives on `interviewSessions`; this is about treating it as a first-class, retrievable log, including tossed vs filed).
2. **Summary of the last chat at the start of a new one.** When a new Listener call begins, the orb is handed a summary of the previous conversation so it can pick up the thread immediately ("Last time you were wrestling with X — where did that land?") instead of cold-opening.
3. **Session tracking, including a session *per speaker*.** The orb keeps track of sessions, and within a conversation, a notion of a session **per speaker** (the human, the Listener — and, implied, possibly multiple human speakers in one room). Needs definition: what exactly is "a session per speaker" — speaker-segmented turns within one call, or separate per-person memory threads?

## 2. Where this likely lives (no duplication)

- **Sessions already exist:** `interviewSessions { userId, experienceId, status: active|completed|abandoned|tossed, transcript[{role, text, at}], startedAt, endedAt }`. The transcript is the raw log; "logging every chat" is mostly already true. What's missing is a **per-session summary** and a **retrieval/handoff path** into the next call's opening prompt.
- **A new field or table** for the conversation summary: likely a `summary` (+ maybe `topics[]`, `openThreads[]`) on `interviewSessions`, written by a post-call pass (sibling to the Center, or a step the Center runs). Distinct from `coreFiles` — this is conversation memory, not identity.
- **The opening handoff:** `mintRealtimeSession` (`convex/ai/voice/index.ts`) builds the Listener instructions. The last session's summary would be appended to `LISTENER_INSTRUCTIONS` for `listen` sessions so the orb opens already oriented.
- **"Session per speaker":** the realtime transcript already tags `role` (coach/user). True multi-human speaker diarization is a bigger lift (OpenAI Realtime gives one input stream); needs a decision on whether v1 means "the two roles we already have" or real per-person separation.

## 3. Open questions (must resolve before building)

- **What is "a session per speaker," concretely?** (a) speaker-labeled turns within one call (already have role tags), (b) a separate rolling memory thread per human person, or (c) multi-human diarization in a shared room? This single answer reshapes the schema.
- **Summary cadence + who writes it.** A dedicated `summarize-session` AI task on call-end? Does the Center produce it as a byproduct, or is it a separate pass (so tossed calls can still get a summary for continuity without filing to the Core)?
- **Tossed calls:** do they still contribute to conversational continuity (summary kept) even though nothing was filed to the Core? (Leaning yes — toss means "don't file to identity," not "forget we talked.")
- **How far back does the orb remember?** Just the last session, last N, or a rolling synthesized "where we are" memo that updates each call?
- **Relationship to the Coach's `threads`/`messages`** (reserved tables) and the Mirror — is this the same memory the text Coach should draw on, or Listener-specific?
- **Privacy/scope:** all per-user, `getAuthUserId`-gated, like everything else.

## 4. Definition of done (when finalized + built)

- Each Listener call produces a retrievable summary on session end (filed and tossed alike).
- A new call's opening is grounded in the previous summary (verifiable: start a 2nd call, confirm the orb references the 1st).
- A clear, documented model for "session per speaker."
- Docs: `docs/product/features/listener.md` (continuity behavior), `docs/architecture/data-model.md` (summary fields/table), and an ADR if it introduces a new memory layer.
- Tests: pure summary-assembly/handoff logic unit-tested; a manual two-call continuity smoke.
