# Onboarding Rebuild — Design Spec

**Date:** 2026-06-03
**Branch:** `onboarding-rebuild`
**Status:** Draft for approval
**Scope decision:** Scope B (working voice interview in v1), dynamic/swappable voice stack.

---

## 1. Purpose

Replace the current 5-step welcome wizard (`components/onboarding/Onboarding.tsx`) with an onboarding that does the real work: it draws a person's **Core** out of them and fills the Life Blueprint, instead of asking for a name + a paste. It opens on the question that hurts — *"What do you want out of life?"* — and gives the lost person an honest off-ramp ("I don't know") into a guided, calm, one-question-at-a-time **interview** (typed or spoken) that fills the blueprint for them.

This serves the soul directly: "LifeGuide builds and steers one thing — a person's true self and the plan for their life." Onboarding becomes the first pass at the Core, not a settings collector.

## 2. What already exists (build on, do not duplicate)

- **Blueprint skeleton:** `lib/blueprint.ts` — `BLUEPRINT` = 3 sections, 18 questions, each `{ key: "s1q0", title, malleability, description, example }`.
- **Answers store:** `coreResponses` table (`userId`, `questionKey`, `content`, `updatedAt`) + `convex/core.ts` (`get` returns a `{ key: content }` map, `save` upserts one). The Core surface `components/core/Core.tsx` already reads/writes these.
- **Gate:** `app/page.tsx` routes `Unauthenticated → StartButton`, then `Gate` → `bootstrap` → `if (!onboarded) <Onboarding/>` else `<AppShell/>`. `onboarded = !!settings.onboardedAt`.
- **Settings:** `settings` has `onboardedAt`, `northStar`, `morningCheckin`, `eveningCheckin`, `coachTone`, `reachingOut`.
- **Vision seed:** `convex/captures.create` inserts a capture and schedules `ai.distill.distillCapture` → becomes a board node.
- **AI config:** `convex/ai/config.ts` (per-task model selection), `openai.ts` (client, OpenRouter-preferred + OpenAI fallback), `distill.ts`, `parse.ts`. Per-profile keys in `apiKeys`.
- **Mirror / pillars / interactions / threads+messages (Coach)** all exist.

## 3. Non-goals (v1)

- No change to the Board, Today ritual, Guide, Coach internals beyond reading the new Core data.
- No A/B testing harness yet (telemetry is captured so A/B can be added later; the framework is not built now).
- The blueprint skeleton stays in `lib/blueprint.ts` (typed code), NOT migrated to a DB table. "Dynamic" is achieved through swappable *experiences* and a swappable *voice provider*, not by datafying the question set.

## 4. The flow

```
sign in → bootstrap → settings.onboardedAt set?
                         │ yes → AppShell
                         │ no  → ONBOARDING
                                  └─ Step 0  The Door:  "What do you want out of life?"
                                       ├─ writes answer → saved as northStar + capture (vision seed) → offer interview / enter app
                                       └─ "I don't know" → reassurance → interview
                                  └─ Step 1  The Interview (experience: text | voice)
                                       • one question at a time, calm, skippable, circles back to skipped
                                       • orientation: "What was before" (persona/past) · "What's next" (goals) · "How much you have left" (progress)
                                       • voice: in-page realtime OR scan QR → continue on phone (/interview/[sessionId])
                                  └─ Step 2  Synthesis: transcript/answers → fill coreResponses boxes; flag empties
                                  └─ Step 3  Status & levels (see §7); onboardedAt set → AppShell
```

### Door semantics
- **Writes an answer** → store as `settings.northStar` AND create a `paste` capture (existing vision-seed path → board node). Then offer "go deeper with the interview" or "enter your space."
- **"I don't know"** → calm reassurance copy → straight into the interview. northStar stays empty (will be derived by synthesis if possible).

### Interview behavior
- Drives over `BLUEPRINT` questions via a **question-selection policy** (not a fixed for-loop): pick next unfilled/most-relevant box, allow skip, re-surface skipped boxes before completion, stop when the user ends or all boxes are addressed.
- "Without being too pushy": soft limits — never block on a question, always offer skip, cap re-asks per box (e.g. 1 circle-back).
- Input is typed or spoken; the *signal* is what matters (per the evolved-vision doc).

## 5. Architecture — experiences, sessions, telemetry, voice

### 5.1 Experience registry (swappable, not hard-coded)
A small typed registry in code: `lib/experiences/` exports an array of experience descriptors `{ id: "text-interview" | "voice-interview", label, transport, copy, selectionPolicy }`. Each experience is a thin runner over the shared interview engine + `BLUEPRINT`. Adding an experience later = add a descriptor + (if needed) a transport adapter. This is the "dynamic, easy to change" requirement.

### 5.2 New Convex tables (schema.ts)
```ts
interviewSessions: defineTable({
  userId: v.id("users"),
  experienceId: v.string(),                 // "text-interview" | "voice-interview"
  status: v.union(v.literal("active"), v.literal("completed"), v.literal("abandoned")),
  device: v.union(v.literal("desktop"), v.literal("phone")),
  transcript: v.array(v.object({            // ordered turns; both text + voice normalize to this
    role: v.union(v.literal("coach"), v.literal("user")),
    questionKey: v.optional(v.string()),    // which blueprint box this turn targets
    text: v.string(),
    at: v.number(),
  })),
  skipped: v.array(v.string()),             // questionKeys skipped (for circle-back)
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
}).index("by_user", ["userId", "startedAt"]),
// joinable by _id — the QR encodes /interview/<sessionId>. A phone joins the SAME row.

experienceEvents: defineTable({             // telemetry: "track what each experience is doing"
  userId: v.id("users"),
  sessionId: v.optional(v.id("interviewSessions")),
  experienceId: v.string(),
  event: v.string(),                        // started | question_shown | answered | skipped | circled_back | synthesized | completed | abandoned | voice_connected | qr_scanned
  questionKey: v.optional(v.string()),
  meta: v.optional(v.string()),             // JSON blob for extra fields
  at: v.number(),
}).index("by_user", ["userId", "at"]).index("by_session", ["sessionId", "at"]),
```
Levels/status: add to `settings`:
```ts
blueprintStatus: v.optional(v.union(v.literal("unstarted"), v.literal("in_progress"), v.literal("complete"))),
level: v.optional(v.number()),              // 0 = blueprint unfinished, 1 = blueprint complete (app unlocked), 2+ = ongoing
```

### 5.3 Voice stack (dynamic / provider-abstracted)
- A `convex/ai/voice/` module exporting a `VoiceProvider` interface: `mintSession()` (returns ephemeral client token + config), `model`, `voice`. First adapter: **OpenAI Realtime "mini"** (`gpt-4o-mini-realtime-preview` or current realtime-mini id), keyed off the existing OpenAI key. Selected via `convex/ai/config.ts` like other tasks, so it can be swapped without touching UI.
- Browser connects directly to the realtime provider via WebRTC using the ephemeral token (token minted server-side in a Convex action — the long-lived key never reaches the client). Transcripts (user speech + assistant turns) stream back into `interviewSessions.transcript` via a Convex mutation.
- The realtime model is given the blueprint as context and instructed to conduct the interview, mark which `questionKey` each exchange addresses, allow skips, and circle back. Synthesis still runs as a final pass (§6) so text and voice converge on the same filling logic.

### 5.4 QR / phone handoff
- Desktop creates an `interviewSession`, renders a QR for `${origin}/interview/<sessionId>` (use a small QR lib, e.g. `qrcode`).
- New route `app/interview/[sessionId]/page.tsx`: opens the same session on the phone, runs the voice (or text) experience there, writes to the same row. Desktop shows live progress (Convex reactivity). Either device can complete it. Auth: the phone is the same anonymous identity only if same browser; for cross-device we mint a short-lived **session join token** tied to the sessionId (prepped; if cross-device auth proves heavy, v1 can require the phone to be signed in to the same account and we note the limitation).

## 6. Synthesis

A Convex action `convex/ai/synthesizeInterview.ts`:
1. Input: an `interviewSessions._id`.
2. Reads the transcript, sends it + the `BLUEPRINT` skeleton to the LLM (via `ai/config.ts` task model) with a structured-output instruction: for each `questionKey`, return a drafted `content` or `null` if there isn't enough signal.
3. Writes drafted answers to `coreResponses` (upsert via existing core logic), marking source in `experienceEvents` (`synthesized`). Does NOT silently overwrite a non-empty user-authored box without flagging (honor the core-curator rule: surface conflicts) — for v1, only fill empty boxes; conflicts are logged for the Coach to raise later.
4. Recomputes `blueprintStatus` + `level` (§7). Emits `experienceEvents: completed`.
5. Optionally derive `northStar` if the door was skipped.

## 7. Levels & status (confirmed interpretation)

> Your wording ("unlocked if not done… once locked unlocks Level 2") was tangled. Confirmed model below — **flag if wrong.**

- A blueprint is **open/in-progress** while boxes remain empty. `blueprintStatus = in_progress`, `level = 0`. Account carries a visible status: **"blueprint not finished."** The app is usable (board, etc.) but flagged to finish.
- **Completing** the blueprint (all 18 boxes filled, or user explicitly marks done with N filled — threshold TBD, default: all 18) **locks it in** → `blueprintStatus = complete`, `level = 1`. This is the promotion: **Level 1 = app fully unlocked.**
- **Level 2+** = ongoing rankings as the person keeps progressing (kept simple in v1: level derivation function exists, higher levels are a stub driven by continued engagement; full ranking rules deferred).
- `onboardedAt` is set once the user leaves onboarding (whether or not the blueprint is complete) so they aren't trapped in the wizard; the *blueprint status* is the separate, persistent "are you done" signal that gates levels.

## 8. Components & files

New:
- `components/onboarding/Door.tsx` — Step 0.
- `components/onboarding/Interview.tsx` — shared interview engine (renders one question; handles skip/circle-back/progress; consumes an experience descriptor).
- `components/onboarding/VoiceInterview.tsx` — voice transport UI (connect, mic, live transcript, QR).
- `components/onboarding/QrHandoff.tsx` — QR + "continue on phone".
- `components/onboarding/Synthesis.tsx` — synthesis + status reveal.
- `app/interview/[sessionId]/page.tsx` — phone/standalone session route.
- `lib/experiences/index.ts` (+ descriptors), `lib/interview/policy.ts` (question-selection).
- `convex/interview.ts` (session CRUD + transcript append + telemetry), `convex/ai/synthesizeInterview.ts`, `convex/ai/voice/` (provider interface + openai-realtime adapter + token-mint action).

Modified:
- `convex/schema.ts` (new tables + settings fields).
- `convex/settings.ts` (`completeOnboarding` keeps setting `onboardedAt`; add level/status recompute helper).
- `convex/ai/config.ts` (voice task + synthesis task entries).
- `app/page.tsx` (route to the new onboarding; unchanged gate logic).
- `components/onboarding/Onboarding.tsx` → replaced/rewired as the orchestrator of Door → Interview → Synthesis.

Docs (rule #1 — same change):
- `docs/architecture/data-model.md` (new tables/fields).
- `docs/product/features/onboarding.md` + `docs/product/features/interview.md` (complete feature docs).
- `docs/design/onboarding.md` (screens/interaction).
- `docs/decisions/` ADR: voice stack (provider-abstracted, OpenAI Realtime mini first) + levels model.
- `docs/product/prd.md` + `docs/roadmap.md` scope (recreate as needed).
- `CHANGELOG.md` entry naming docs touched.

## 9. Build tracks (subagents)

Spine first (sequential), then parallel:
0. **Spine:** schema tables + settings fields + `lib/experiences` + `lib/interview/policy.ts` + `convex/interview.ts` skeleton + telemetry mutation. (Everything else depends on this — one agent, lands first.)
1. **Door + text interview UI** (depends on spine).
2. **Voice + QR/phone session** (depends on spine): voice provider module, token-mint action, `VoiceInterview`, `/interview/[sessionId]`.
3. **Synthesis + levels** (depends on spine): `synthesizeInterview` action, level/status recompute, Synthesis screen.
4. **Docs + CHANGELOG** (runs alongside; consumes the others' decisions).

## 10. Definition of done

- Schema compiles + Convex deploys; new tables present.
- Text interview: fills `coreResponses`; skip + circle-back work; telemetry rows written.
- Voice interview: connects via ephemeral token; transcript streams into the session; synthesis fills boxes.
- QR: scanning opens the session route (two-device join smoke; document any cross-device-auth limitation).
- Levels: level-derivation unit test (0 vs 1; threshold honored).
- Synthesis action test: transcript → expected filled keys, empties flagged, no overwrite of authored boxes.
- Full manual smoke: text path and voice path each take a fresh user from Door → AppShell with a partially/fully filled Core.
- Docs + CHANGELOG updated.

## 11. Open questions

1. **Completion threshold for Level 1** — all 18 boxes, or a "good enough" subset (e.g. all reds + N)? Default assumed: all 18.
2. **Cross-device auth for QR** — full anonymous-session join token in v1, or require same-account sign-in on phone with a noted limitation? Default assumed: implement join token if light; else fall back + document.
3. **Where the blueprint-status badge surfaces** in the app (Home/Guide/Rail?). Default: a small banner on Home + a marker in the Guide.
4. **Voice model id** — exact current OpenAI realtime-mini id to pin in `config.ts`.
