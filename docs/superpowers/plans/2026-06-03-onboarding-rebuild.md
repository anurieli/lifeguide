# Onboarding Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-step welcome wizard with a Door ("What do you want out of life?") → guided one-question-at-a-time interview (typed or realtime voice, with QR phone handoff) → synthesis that fills the Life Blueprint (`coreResponses`) → levels/status, all driven by swappable experience + voice-provider abstractions.

**Architecture:** Build on existing `lib/blueprint.ts` (18-question skeleton) + `coreResponses` table. Add pure-logic libs (`lib/interview/policy.ts`, `lib/levels.ts`), three Convex modules (`convex/interview.ts`, `convex/ai/synthesizeInterview.ts`, `convex/ai/voice/`), and onboarding/interview React components. A typed experience registry (`lib/experiences/`) makes onboarding flows swappable; a `VoiceProvider` interface (OpenAI Realtime mini first) makes the voice stack swappable. QR handoff via a short-lived join token + `app/interview/[sessionId]/page.tsx`.

**Tech Stack:** Next.js App Router, Convex (`convex-test` + vitest), OpenAI Realtime API (WebRTC, ephemeral token), `qrcode`, existing `convex/ai/config.ts` + `convex/ai/openai.ts`.

**Spec:** `docs/superpowers/specs/2026-06-03-onboarding-rebuild-design.md`

**Note:** A stale worktree exists at `.claude/worktrees/voice-field/` — possible earlier voice spike. The voice agent should skim it for reusable code but treat this plan as authoritative.

**Conventions for every Convex test:** mirror `tests/convex/edges.test.ts` for pure helpers and use `convexTest(schema)` from `convex-test` for function tests:
```ts
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
const t = convexTest(schema);
const asUser = t.withIdentity({ subject: "user-1" });
```

---

## Track 0 — Spine (MUST land first; everything depends on it)

### Task 0.1: Blueprint completeness + level derivation (pure logic)

**Files:**
- Create: `lib/levels.ts`
- Test: `tests/levels.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { blueprintStatus, deriveLevel, ALL_KEYS } from "../lib/levels";

describe("levels", () => {
  it("ALL_KEYS has the 18 blueprint keys", () => {
    expect(ALL_KEYS.length).toBe(18);
    expect(ALL_KEYS).toContain("s1q0");
  });
  it("status is unstarted with no answers", () => {
    expect(blueprintStatus({})).toBe("unstarted");
  });
  it("status is in_progress with some answers", () => {
    expect(blueprintStatus({ s1q0: "hi" })).toBe("in_progress");
  });
  it("status is complete only when all 18 non-empty", () => {
    const full = Object.fromEntries(ALL_KEYS.map((k) => [k, "x"]));
    expect(blueprintStatus(full)).toBe("complete");
    const missingOne = { ...full, s1q0: "  " }; // whitespace = empty
    expect(blueprintStatus(missingOne)).toBe("in_progress");
  });
  it("level is 0 until complete, then 1", () => {
    expect(deriveLevel({})).toBe(0);
    const full = Object.fromEntries(ALL_KEYS.map((k) => [k, "x"]));
    expect(deriveLevel(full)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**
Run: `npx vitest run tests/levels.test.ts`
Expected: FAIL ("Cannot find module '../lib/levels'").

- [ ] **Step 3: Implement**
```ts
// lib/levels.ts
import { BLUEPRINT } from "./blueprint";

export const ALL_KEYS: string[] = BLUEPRINT.flatMap((s) => s.questions.map((q) => q.key));

export type BlueprintStatus = "unstarted" | "in_progress" | "complete";

const filled = (v?: string) => !!v && v.trim().length > 0;

export function filledCount(answers: Record<string, string>): number {
  return ALL_KEYS.filter((k) => filled(answers[k])).length;
}

export function blueprintStatus(answers: Record<string, string>): BlueprintStatus {
  const n = filledCount(answers);
  if (n === 0) return "unstarted";
  if (n === ALL_KEYS.length) return "complete";
  return "in_progress";
}

// L0 = blueprint unfinished; L1 = all 18 filled (app unlocked); L2+ deferred (engagement-driven).
export function deriveLevel(answers: Record<string, string>): number {
  return blueprintStatus(answers) === "complete" ? 1 : 0;
}
```

- [ ] **Step 4: Run test, verify it passes**
Run: `npx vitest run tests/levels.test.ts` → PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/levels.ts tests/levels.test.ts
git commit -m "feat(levels): blueprint completeness + level derivation"
```

### Task 0.2: Interview question-selection policy (pure logic)

**Files:**
- Create: `lib/interview/policy.ts`
- Test: `tests/interview-policy.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { nextQuestion, type InterviewState } from "../lib/interview/policy";

const base: InterviewState = { answered: {}, skipped: [], circledBack: [] };

describe("nextQuestion", () => {
  it("starts at the first unanswered key", () => {
    expect(nextQuestion(base)?.key).toBe("s1q0");
  });
  it("skips answered keys", () => {
    expect(nextQuestion({ ...base, answered: { s1q0: "x" } })?.key).toBe("s1q1");
  });
  it("defers a skipped key until all fresh keys are exhausted, then circles back once", () => {
    // everything answered except s1q0 which was skipped → circle back to it
    const answered = Object.fromEntries(
      ["s1q1","s1q2","s1q3","s1q4","s1q5","s1q6","s2q0","s2q1","s2q2","s2q3","s2q4","s2q5","s3q0","s3q1","s3q2","s3q3","s3q4"].map((k) => [k, "x"]),
    );
    const q = nextQuestion({ answered, skipped: ["s1q0"], circledBack: [] });
    expect(q?.key).toBe("s1q0");
  });
  it("returns null when answered or skipped-and-already-circled covers everything", () => {
    const answered = Object.fromEntries(
      ["s1q1","s1q2","s1q3","s1q4","s1q5","s1q6","s2q0","s2q1","s2q2","s2q3","s2q4","s2q5","s3q0","s3q1","s3q2","s3q3","s3q4"].map((k) => [k, "x"]),
    );
    expect(nextQuestion({ answered, skipped: ["s1q0"], circledBack: ["s1q0"] })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**
Run: `npx vitest run tests/interview-policy.test.ts` → FAIL.

- [ ] **Step 3: Implement**
```ts
// lib/interview/policy.ts
import { BLUEPRINT, type BlueprintQuestion } from "../blueprint";

export type InterviewState = {
  answered: Record<string, string>; // key -> content
  skipped: string[];                // keys skipped this run
  circledBack: string[];            // skipped keys we've already re-offered once
};

const ORDER: BlueprintQuestion[] = BLUEPRINT.flatMap((s) => s.questions);
const isFilled = (v?: string) => !!v && v.trim().length > 0;

export function nextQuestion(state: InterviewState): BlueprintQuestion | null {
  // 1. First fresh, never-skipped, unanswered question in canonical order.
  for (const q of ORDER) {
    if (isFilled(state.answered[q.key])) continue;
    if (state.skipped.includes(q.key)) continue;
    return q;
  }
  // 2. No fresh ones left — circle back to a skipped key we haven't re-offered yet.
  for (const q of ORDER) {
    if (isFilled(state.answered[q.key])) continue;
    if (state.skipped.includes(q.key) && !state.circledBack.includes(q.key)) return q;
  }
  // 3. Nothing left to ask.
  return null;
}
```

- [ ] **Step 4: Run test, verify it passes**
Run: `npx vitest run tests/interview-policy.test.ts` → PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/interview/policy.ts tests/interview-policy.test.ts
git commit -m "feat(interview): question-selection policy with skip + single circle-back"
```

### Task 0.3: Experience registry (typed, swappable)

**Files:**
- Create: `lib/experiences/index.ts`
- Test: `tests/experiences.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { EXPERIENCES, getExperience } from "../lib/experiences";

describe("experience registry", () => {
  it("includes text and voice interviews", () => {
    expect(getExperience("text-interview")?.transport).toBe("text");
    expect(getExperience("voice-interview")?.transport).toBe("voice");
  });
  it("every experience has a label and unique id", () => {
    const ids = EXPERIENCES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EXPERIENCES) expect(e.label.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test, verify it fails** → `npx vitest run tests/experiences.test.ts` → FAIL.

- [ ] **Step 3: Implement**
```ts
// lib/experiences/index.ts
export type ExperienceId = "text-interview" | "voice-interview";
export type Transport = "text" | "voice";

export type Experience = {
  id: ExperienceId;
  label: string;
  transport: Transport;
  description: string;
};

export const EXPERIENCES: Experience[] = [
  {
    id: "text-interview",
    label: "Type it out",
    transport: "text",
    description: "A calm, one-question-at-a-time written interview.",
  },
  {
    id: "voice-interview",
    label: "Talk it through",
    transport: "voice",
    description: "Speak with the Coach. Continue on your phone if you want to move around.",
  },
];

export const getExperience = (id: string): Experience | undefined =>
  EXPERIENCES.find((e) => e.id === id);
```

- [ ] **Step 4: Run test, verify it passes** → PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/experiences/index.ts tests/experiences.test.ts
git commit -m "feat(experiences): swappable onboarding experience registry"
```

### Task 0.4: Schema — interviewSessions, experienceEvents, settings fields

**Files:**
- Modify: `convex/schema.ts` (add two tables; extend `settings`)

- [ ] **Step 1: Add tables + settings fields**
In `convex/schema.ts`, add inside `defineSchema({ ... })`:
```ts
  // One run of an onboarding experience. Joinable by _id (QR encodes /interview/<_id>).
  interviewSessions: defineTable({
    userId: v.id("users"),
    experienceId: v.string(), // "text-interview" | "voice-interview"
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("abandoned")),
    device: v.union(v.literal("desktop"), v.literal("phone")),
    transcript: v.array(
      v.object({
        role: v.union(v.literal("coach"), v.literal("user")),
        questionKey: v.optional(v.string()),
        text: v.string(),
        at: v.number(),
      }),
    ),
    skipped: v.array(v.string()),
    joinTokenHash: v.optional(v.string()), // sha256 of the QR join token
    joinTokenExpiresAt: v.optional(v.number()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  }).index("by_user", ["userId", "startedAt"]),

  // Telemetry stream: what each experience is doing (for A/B + funnel later).
  experienceEvents: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("interviewSessions")),
    experienceId: v.string(),
    event: v.string(), // started|question_shown|answered|skipped|circled_back|synthesized|completed|abandoned|voice_connected|qr_scanned
    questionKey: v.optional(v.string()),
    meta: v.optional(v.string()), // JSON blob
    at: v.number(),
  })
    .index("by_user", ["userId", "at"])
    .index("by_session", ["sessionId", "at"]),
```
Extend the existing `settings` table definition by adding these two optional fields (keep all current fields):
```ts
    blueprintStatus: v.optional(
      v.union(v.literal("unstarted"), v.literal("in_progress"), v.literal("complete")),
    ),
    level: v.optional(v.number()),
```

- [ ] **Step 2: Typecheck + codegen**
Run: `npx convex codegen` then `npx tsc --noEmit`
Expected: no errors; `convex/_generated/api.d.ts` updates.

- [ ] **Step 3: Commit**
```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(schema): interviewSessions + experienceEvents + blueprint status/level"
```

### Task 0.5: Telemetry + session helpers (convex/interview.ts) — core CRUD

**Files:**
- Create: `convex/interview.ts`
- Test: `tests/convex/interview.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

describe("interview sessions", () => {
  it("creates a session and logs a started event", async () => {
    const t = convexTest(schema);
    const asUser = t.withIdentity({ subject: "u1" });
    const id = await asUser.mutation(api.interview.start, {
      experienceId: "text-interview",
      device: "desktop",
    });
    const session = await asUser.query(api.interview.get, { sessionId: id });
    expect(session?.status).toBe("active");
    expect(session?.transcript).toEqual([]);
  });

  it("appends turns and skips", async () => {
    const t = convexTest(schema);
    const asUser = t.withIdentity({ subject: "u1" });
    const id = await asUser.mutation(api.interview.start, {
      experienceId: "text-interview", device: "desktop",
    });
    await asUser.mutation(api.interview.appendTurn, {
      sessionId: id, role: "user", questionKey: "s1q0", text: "I want peace.",
    });
    await asUser.mutation(api.interview.skip, { sessionId: id, questionKey: "s1q1" });
    const s = await asUser.query(api.interview.get, { sessionId: id });
    expect(s?.transcript.length).toBe(1);
    expect(s?.skipped).toContain("s1q1");
  });
});
```

- [ ] **Step 2: Run test, verify it fails** → `npx vitest run tests/convex/interview.test.ts` → FAIL.

- [ ] **Step 3: Implement `convex/interview.ts`**
Implement (auth via `getAuthUserId`, throw "Not authenticated" if missing; mirror style of `convex/core.ts`):
- `logEvent` (internal mutation): inserts an `experienceEvents` row `{ userId, sessionId?, experienceId, event, questionKey?, meta?, at: Date.now() }`.
- `start` (mutation, args `{ experienceId: v.string(), device }`): inserts an `interviewSessions` row with `status:"active"`, empty `transcript`/`skipped`, `startedAt: Date.now()`; inserts a `started` event; returns the id.
- `get` (query, args `{ sessionId }`): returns the row if it belongs to the user, else null.
- `appendTurn` (mutation, args `{ sessionId, role, questionKey?, text }`): patches `transcript` with the new turn; logs `answered` (role==="user") with `questionKey`.
- `skip` (mutation, args `{ sessionId, questionKey }`): adds key to `skipped` (dedup); logs `skipped`.
- `end` (mutation, args `{ sessionId, status }` where status is `completed|abandoned`): patches `status` + `endedAt`; logs the matching event.
Ownership check helper: load the session, assert `session.userId === userId`.

- [ ] **Step 4: Run test, verify it passes** → PASS.

- [ ] **Step 5: Commit**
```bash
git add convex/interview.ts tests/convex/interview.test.ts convex/_generated
git commit -m "feat(interview): session CRUD + telemetry events"
```

### Task 0.6: Level/status recompute on settings

**Files:**
- Modify: `convex/settings.ts` (add `recomputeLevel` internal mutation + export a query field)
- Test: `tests/convex/levels-settings.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { ALL_KEYS } from "../../lib/levels";

describe("recompute level", () => {
  it("flips to level 1 when all 18 core answers are filled", async () => {
    const t = convexTest(schema);
    const asUser = t.withIdentity({ subject: "u1" });
    await asUser.mutation(api.settings.completeOnboarding, {}); // ensures a settings row + onboardedAt
    for (const k of ALL_KEYS) await asUser.mutation(api.core.save, { questionKey: k, content: "x" });
    await asUser.mutation(api.settings.recompute, {});
    const s = await asUser.query(api.settings.get, {});
    expect(s?.blueprintStatus).toBe("complete");
    expect(s?.level).toBe(1);
  });
});
```
(If `api.settings.get` does not exist, add a `get` query returning the user's settings row.)

- [ ] **Step 2: Run, verify fail** → FAIL.

- [ ] **Step 3: Implement**
In `convex/settings.ts` add:
- `get` (query) returning the user's settings row (or null) — if not already present.
- `recompute` (mutation, no args): loads all `coreResponses` for the user into a `{key:content}` map, imports `blueprintStatus` + `deriveLevel` from `../lib/levels`, patches `settings.blueprintStatus` + `settings.level` + `updatedAt`.

- [ ] **Step 4: Run, verify pass** → PASS.

- [ ] **Step 5: Commit**
```bash
git add convex/settings.ts tests/convex/levels-settings.test.ts convex/_generated
git commit -m "feat(settings): recompute blueprint status + level from core answers"
```

**Track 0 gate:** `npx vitest run` (all green) + `npx tsc --noEmit` before any parallel track starts.

---

## Track 1 — Door + text interview UI (depends on Track 0)

### Task 1.1: Door component

**Files:**
- Create: `components/onboarding/Door.tsx`

- [ ] **Step 1: Implement** a client component `Door({ onWrote, onDontKnow }: { onWrote: (text: string) => void; onDontKnow: () => void })`:
  - Centered, calm (reuse the radial-gradient bg + type scale from the existing `Onboarding.tsx`).
  - Eyebrow "Welcome", H1 "What do you want out of life?", a textarea, a primary "Continue →" (calls `onWrote(text)` when non-empty) and a quieter "I don't know" button that calls `onDontKnow()`.
  - "I don't know" reveals a reassuring line ("Most people don't. Let's sort it out, one question at a time.") then proceeds.
- [ ] **Step 2: Typecheck** → `npx tsc --noEmit` → no errors.
- [ ] **Step 3: Commit** → `git commit -m "feat(onboarding): the Door question"`

### Task 1.2: Interview engine (shared)

**Files:**
- Create: `components/onboarding/Interview.tsx`

- [ ] **Step 1: Implement** `Interview({ sessionId, experienceId, onComplete })`:
  - Reads the session via `useQuery(api.interview.get, { sessionId })`; builds `InterviewState` from `transcript` (answered map by latest user turn per questionKey) + `skipped`.
  - Uses `nextQuestion(state)` to pick the current `BlueprintQuestion`. Renders ONE question at a time: title, description, example (muted), a textarea, "Save & continue" (→ `api.interview.appendTurn`) and "Skip" (→ `api.interview.skip`).
  - Progress orientation row: "What was before" (Section 1 = Persona), "What's next" (Sections 2-3 = Goals/Mindset), and "How much you have left" (`filledCount`/18 from `lib/levels`).
  - When `nextQuestion` returns null, call `onComplete()`.
  - Calm transitions; never more than one question on screen (honor interaction principles).
- [ ] **Step 2: Typecheck** → no errors.
- [ ] **Step 3: Commit** → `git commit -m "feat(onboarding): one-question interview engine"`

### Task 1.3: Onboarding orchestrator + gate wiring

**Files:**
- Modify: `components/onboarding/Onboarding.tsx` (rewrite as orchestrator)
- Verify: `app/page.tsx` still routes `!onboarded → <Onboarding/>` (no change expected)

- [ ] **Step 1: Implement** orchestrator state machine: `door → choose-experience → interview → synthesis`.
  - Door `onWrote(text)`: save `settings.northStar` (add a `setNorthStar` mutation or extend `update`) + `api.captures.create({ source:"paste", rawType:"text", rawText:text })` (vision seed), then go to `choose-experience`.
  - Door `onDontKnow()`: go straight to `choose-experience`.
  - `choose-experience`: render `EXPERIENCES` (text/voice) → on pick, `api.interview.start({ experienceId, device:"desktop" })` → store sessionId → `interview` (text) or mount `VoiceInterview` (voice, Track 2).
  - `interview onComplete`: schedule synthesis (Track 3) then go to `synthesis` screen.
  - The existing rhythm/tone/coach steps are removed from onboarding (Settings still edits them); `completeOnboarding` is called at the end to set `onboardedAt`.
- [ ] **Step 2: Typecheck + manual smoke** — `npm run dev`, sign in as a fresh user, confirm Door → text interview → completes → lands in app.
- [ ] **Step 3: Commit** → `git commit -m "feat(onboarding): orchestrate door → interview → synthesis"`

---

## Track 2 — Voice + QR/phone handoff (depends on Track 0)

### Task 2.1: Voice provider abstraction + token mint

**Files:**
- Create: `convex/ai/voice/provider.ts` (interface + `getVoiceProvider()`)
- Create: `convex/ai/voice/openaiRealtime.ts` (adapter)
- Create: `convex/ai/voice/index.ts` (Convex `action` `mintRealtimeSession`)
- Modify: `convex/ai/config.ts` (add a `voice` + `synthesis` TASK entry)
- Test: `tests/voice-config.test.ts`

- [ ] **Step 1: Write the failing test** (config-level, no network):
```ts
import { describe, it, expect } from "vitest";
import { TASKS } from "../convex/ai/config";

describe("voice task config", () => {
  it("declares a realtime voice task with a model", () => {
    expect(TASKS["voice"]).toBeDefined();
    expect(TASKS["voice"].model).toMatch(/realtime/);
  });
});
```

- [ ] **Step 2: Run, verify fail** → `npx vitest run tests/voice-config.test.ts` → FAIL.

- [ ] **Step 3: Implement**
  - In `config.ts` TASKS add `voice: { label: "Voice interview (realtime)", provider: "openai", model: "gpt-4o-mini-realtime-preview", temperature: 0.7, wired: true }` and `synthesis: { label: "Interview synthesis", provider: "openrouter", model: <a capable text model>, temperature: 0.3, wired: true }`. (Pin the current realtime-mini id; swappable here.)
  - `provider.ts`: `export interface VoiceProvider { mint(opts): Promise<{ clientSecret: string; model: string; expiresAt: number }> }` and `getVoiceProvider()` returning the OpenAI adapter based on `TASKS.voice`.
  - `openaiRealtime.ts`: `mint()` calls OpenAI `POST /v1/realtime/sessions` with the model + interview `instructions` (conduct the blueprint interview, allow skips, circle back, never pushy) using the OpenAI key resolution already used in `convex/ai/openai.ts`; returns the ephemeral `client_secret.value`.
  - `index.ts`: a Convex `action` `mintRealtimeSession({ sessionId })` that authenticates, verifies session ownership, calls the provider, logs `voice_connected`, and returns `{ clientSecret, model, expiresAt }`.
- [ ] **Step 4: Run, verify pass** → `npx vitest run tests/voice-config.test.ts` → PASS.
- [ ] **Step 5: Commit** → `git commit -m "feat(voice): provider abstraction + realtime token mint"`

### Task 2.2: VoiceInterview component (WebRTC)

**Files:**
- Create: `components/onboarding/VoiceInterview.tsx`

- [ ] **Step 1: Implement** a client component that:
  - Calls `api.ai.voice.mintRealtimeSession` (via `useAction`) to get the ephemeral secret.
  - Establishes a WebRTC peer connection to `https://api.openai.com/v1/realtime?model=<model>` with the ephemeral secret as Bearer (standard OpenAI Realtime WebRTC handshake: create `RTCPeerConnection`, add mic track, create data channel `oai-events`, SDP offer/answer).
  - On transcript deltas (assistant + input audio transcription events on the data channel), append turns via `api.interview.appendTurn` with the best-effort `questionKey` from the model's tool/markers.
  - Shows mic state, a live transcript, an "End interview" button (`api.interview.end({ status:"completed" })` → onComplete), and mounts `QrHandoff` (Task 2.3).
  - Graceful fallback: if mint or mic fails, show a message and offer the text interview instead. (Do NOT trigger browser dialogs.)
- [ ] **Step 2: Typecheck** → no errors.
- [ ] **Step 3: Manual smoke** — voice connects, you can speak, transcript appears, turns land in the session (verify in Convex dashboard).
- [ ] **Step 4: Commit** → `git commit -m "feat(voice): realtime WebRTC interview UI"`

### Task 2.3: QR join token + phone route

**Files:**
- Modify: `convex/interview.ts` (add `issueJoinToken` mutation + `joinWithToken` mutation/query)
- Create: `components/onboarding/QrHandoff.tsx`
- Create: `app/interview/[sessionId]/page.tsx`
- Test: `tests/convex/join-token.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

describe("qr join token", () => {
  it("issues a token the phone can redeem for the session", async () => {
    const t = convexTest(schema);
    const asUser = t.withIdentity({ subject: "u1" });
    const id = await asUser.mutation(api.interview.start, { experienceId: "voice-interview", device: "desktop" });
    const { token } = await asUser.mutation(api.interview.issueJoinToken, { sessionId: id });
    // Unauthenticated phone redeems by token:
    const joined = await t.query(api.interview.joinWithToken, { sessionId: id, token });
    expect(joined?.experienceId).toBe("voice-interview");
  });
  it("rejects a bad token", async () => {
    const t = convexTest(schema);
    const asUser = t.withIdentity({ subject: "u1" });
    const id = await asUser.mutation(api.interview.start, { experienceId: "voice-interview", device: "desktop" });
    await asUser.mutation(api.interview.issueJoinToken, { sessionId: id });
    await expect(t.query(api.interview.joinWithToken, { sessionId: id, token: "wrong" })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run, verify fail** → FAIL.

- [ ] **Step 3: Implement**
  - `issueJoinToken({ sessionId })`: owner-only; generate a random token (use `crypto.getRandomValues`/`crypto.randomUUID` available in Convex runtime), store `joinTokenHash = sha256(token)` (use Web Crypto `crypto.subtle.digest`) + `joinTokenExpiresAt = Date.now() + 10*60_000`; return `{ token }` (raw token only returned here, never stored raw).
  - `joinWithToken({ sessionId, token })`: public (no auth); load session, verify `sha256(token) === joinTokenHash` and not expired; log `qr_scanned`; return a safe view of the session (experienceId, transcript, skipped). Throw on mismatch/expiry.
  - Phone-side mutations for voice on the joined session may use the token as a capability param (append/end accept `{ sessionId, token }` when unauthenticated — add a token-or-owner guard helper). Keep token-scoped writes limited to that session.
  - `QrHandoff.tsx`: calls `issueJoinToken`, renders a QR (add `qrcode` dep: `npm i qrcode @types/qrcode`) encoding `${window.location.origin}/interview/${sessionId}?t=${token}`, with copy "Continue on your phone."
  - `app/interview/[sessionId]/page.tsx`: reads `sessionId` + `?t=` token, calls `joinWithToken`, then renders the voice (or text) experience bound to that session via the token capability. Standalone layout (no rail).
- [ ] **Step 4: Run, verify pass** → `npx vitest run tests/convex/join-token.test.ts` → PASS.
- [ ] **Step 5: Manual smoke** — scan the QR on a phone, confirm the session opens and a turn from the phone appears on the desktop live.
- [ ] **Step 6: Commit** → `git commit -m "feat(voice): QR join token + phone interview route"`

---

## Track 3 — Synthesis + levels surfacing (depends on Track 0)

### Task 3.1: Synthesis action

**Files:**
- Create: `convex/ai/synthesizeInterview.ts`
- Test: `tests/convex/synthesis.test.ts` (logic-level: stub the model call)

- [ ] **Step 1: Write the failing test** — extract the pure mapping so it's testable without a network call:
```ts
import { describe, it, expect } from "vitest";
import { applySynthesis } from "../../convex/ai/synthesizeInterview";

describe("applySynthesis", () => {
  it("fills only empty boxes and flags conflicts, never overwriting authored text", () => {
    const existing = { s1q0: "my own words" };
    const drafted = { s1q0: "ai version", s1q1: "ai persona", s1q2: null };
    const { toWrite, conflicts, emptyKeys } = applySynthesis(existing, drafted);
    expect(toWrite).toEqual({ s1q1: "ai persona" });      // s1q0 not overwritten; s1q2 null skipped
    expect(conflicts).toEqual(["s1q0"]);
    expect(emptyKeys).toContain("s1q2");
  });
});
```

- [ ] **Step 2: Run, verify fail** → FAIL.

- [ ] **Step 3: Implement**
  - `applySynthesis(existing, drafted)` (pure, exported): for each blueprint key, if `drafted[key]` is a non-empty string and `existing[key]` is empty → add to `toWrite`; if both non-empty and differ → add key to `conflicts` (do not overwrite); if `drafted[key]` null/empty AND existing empty → add to `emptyKeys`. Returns `{ toWrite, conflicts, emptyKeys }`.
  - `synthesizeInterview` (Convex `action`, args `{ sessionId }`): loads the session transcript + current `core.get`, calls the `synthesis` task model (`convex/ai/openai.ts` + `config.ts`) with the `BLUEPRINT` and a structured-output instruction returning `{ [key]: string|null }`, runs `applySynthesis`, writes `toWrite` via `core.save` (or an internal batch upsert), logs `synthesized` (+ `meta` with conflicts), calls `settings.recompute`, logs `completed`. Conflicts are recorded for the Coach to raise later (no silent overwrite — honors the core-curator rule).
- [ ] **Step 4: Run, verify pass** → PASS.
- [ ] **Step 5: Commit** → `git commit -m "feat(synthesis): transcript → fill empty core boxes, flag conflicts"`

### Task 3.2: Synthesis screen + status surfacing

**Files:**
- Create: `components/onboarding/Synthesis.tsx`
- Modify: Home (identity dashboard / `components/today/Today.tsx` or the Home surface) + `components/guide/Guide.tsx` for the status marker

- [ ] **Step 1: Implement**
  - `Synthesis.tsx`: a calm "weaving what you told me…" state while the synthesis action runs, then reveals filled count (`filledCount`/18) and `blueprintStatus`. If complete → "Your blueprint is locked. Welcome to Level 1." If incomplete → "Your blueprint is still open — finish it anytime." CTA: "Enter your space →" (calls `completeOnboarding` to set `onboardedAt`).
  - Home banner: if `settings.blueprintStatus !== "complete"`, show a small calm banner "Blueprint not finished — N/18" linking back to the Core/interview. Hidden when complete.
  - Guide marker: show blueprint progress (N/18 + level) near the top of `Guide.tsx`.
- [ ] **Step 2: Typecheck + manual smoke** — finish an interview, see the synthesis reveal + the Home banner reflecting status.
- [ ] **Step 3: Commit** → `git commit -m "feat(onboarding): synthesis reveal + blueprint status surfacing"`

---

## Track 4 — Docs + CHANGELOG (alongside; consumes others' decisions)

### Task 4.1: Documentation (rule #1) + CHANGELOG (rule #2)

**Files (create/update):**
- `docs/architecture/data-model.md` — interviewSessions, experienceEvents, settings.blueprintStatus/level.
- `docs/product/features/onboarding.md` + `docs/product/features/interview.md` — complete feature docs (purpose, behavior, every function/action, states, edge cases, AI involvement, data touched, open questions) per the "COMPLETE" bar in CLAUDE.md.
- `docs/design/onboarding.md` — screens + interaction (Door, interview, voice, QR, synthesis).
- `docs/decisions/000X-voice-stack-and-levels.md` — ADR: provider-abstracted voice (OpenAI Realtime mini first), all-18 completion, Level model.
- `docs/product/prd.md` + `docs/roadmap.md` — recreate/extend with this scope + the deferred items (A/B harness, L2+ rankings, personal onboarding).
- `CHANGELOG.md` — entry via the `changelog` skill naming every doc touched + commit hashes.

- [ ] **Step 1:** Write the docs to match the shipped code (read the final source before writing; no placeholders).
- [ ] **Step 2: Commit** → `git commit -m "docs: onboarding rebuild — data model, features, design, ADR, changelog"`

---

## Final verification (before finishing the branch)
- [ ] `npx vitest run` — all suites green.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npx convex codegen` — no drift.
- [ ] Manual: fresh user, text path → Door → interview → synthesis → app, Core partially/fully filled, Home banner correct.
- [ ] Manual: voice path connects + transcribes; QR opens session on a second device and a turn syncs live.
- [ ] Levels: fill all 18 → status `complete`, level `1`, banner gone.
- [ ] Add manual QA items to `TO-CHECK.md` (use the `need-to-check` skill) for the things only a human can verify (real mic, real phone scan, realtime latency).
