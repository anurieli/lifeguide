# Sessions + Mobile Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Session (a living journal entry over captures), the one-tap mobile record flow, the reduced mobile shell (Today · Record · Sessions · Talk), the session document view + chronological list, and the AI session digest. Spec: `docs/superpowers/specs/2026-07-12-mobile-capture-sessions-design.md`. Issue: ARI-24.

**Architecture:** A `sessions` table is a container; every piece of content stays a `captures` row (optional `sessionId`). The existing ingest pipeline is untouched except for one hook: when a session-member capture finishes ingest, a debounced digest action writes an AI title + summary onto the session. UI: a full-screen RecordTake overlay (mobile ● button), a Sessions view (list ↔ document), and a Rail rework that hides Core/Board/Thoughts on mobile.

**Tech Stack:** Next.js App Router + Convex (schema, mutations, scheduler, convex-test) + OpenRouter via `aiForTask` + vitest.

## Global Constraints

- Raw is sacred: captures rows and stored blobs are never mutated or deleted by this work; sessions only reference them.
- `captures` semantics unchanged for rows without `sessionId`; board Inbox, distill, `voice.brainDump` untouched.
- Device vocabulary: `"phone" | "desktop"` (matches `interviewSessions.device`).
- All user-facing copy calm, no exclamation marks; no em dashes in copy or comments (use commas/colons/·).
- Every mutation/query is `getAuthUserId`-gated exactly like existing code.
- Digest debounce: 30s (`DIGEST_DEBOUNCE_MS = 30_000`); digest input cap 6000 chars; recordings under 1000ms discarded (matches Composer's `MIN_RECORDING_MS`).
- Mobile breakpoint: the existing `md` Tailwind split. No user-agent sniffing.

**Spec deviations locked in this plan** (patch the spec in Task 9): Sessions is its own rail view on desktop too (not a sub-tab inside Thoughts); sessions are created with their first capture (or on "Type instead"), and the document view deletes an empty session on exit, so the empty-session cleanup is `deleteIfEmpty` called from the UI.

---

### Task 1: Branch + schema

**Files:**
- Modify: `convex/schema.ts` (captures block ~line 72; new table after `captures`)

**Interfaces:**
- Produces: `sessions` table; `captures.sessionId?: Id<"sessions">`; `captures.by_session` index.

- [ ] **Step 1: Create the branch**

```bash
git checkout dev && git pull && git checkout -b ariel/ari-24-sessions-mobile-capture
```

- [ ] **Step 2: Add `sessionId` to captures + the index**

In `convex/schema.ts`, inside `captures: defineTable({...})`, after `rawFileId`:

```ts
    // The session (living journal entry) this capture belongs to, if any.
    // Loose captures (board intake, stream composer, voice.brainDump) have none.
    sessionId: v.optional(v.id("sessions")),
```

and add to the captures index chain:

```ts
    .index("by_session", ["sessionId", "createdAt"])
```

- [ ] **Step 3: Add the sessions table** (directly after the `captures` table definition)

```ts
  // A session is one living journal entry: an ordered container of captures the
  // person keeps adding to over time (voice takes, typed passages, photos). Raw
  // truth stays on the captures rows; this row holds only container-level state:
  // the AI digest for the list view and light context. Created with its first
  // capture. See docs/superpowers/specs/2026-07-12-mobile-capture-sessions-design.md.
  sessions: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()), // AI digest; UI falls back to first words
    summary: v.optional(v.string()), // AI one-liner for the list view
    doing: v.optional(v.string()), // optional "what I was doing", person-entered
    device: v.union(v.literal("phone"), v.literal("desktop")), // where it was opened
    digest: v.optional(
      v.object({
        status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
        at: v.optional(v.number()),
      }),
    ),
    startedAt: v.number(),
    updatedAt: v.number(), // bumped on every appended capture
  }).index("by_user_updated", ["userId", "updatedAt"]),
```

- [ ] **Step 4: Verify schema compiles**

Run: `npx convex codegen && npx tsc --noEmit`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(sessions): schema, sessions table + captures.sessionId (ARI-24)"
```

---

### Task 2: Pure digest helpers (TDD)

**Files:**
- Create: `lib/sessionDigest.ts`
- Test: `tests/session-digest.test.ts`

**Interfaces:**
- Produces: `captureText(c: DigestCapture): string`, `assembleDigestInput(captures: DigestCapture[], cap?: number): string`, `fallbackTitle(captures: DigestCapture[]): string`, `type DigestCapture`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/session-digest.test.ts
import { describe, it, expect } from "vitest";
import { assembleDigestInput, fallbackTitle, captureText } from "../lib/sessionDigest";

const cap = (over: Partial<Parameters<typeof captureText>[0]>) => ({
  rawType: "text",
  createdAt: 0,
  ...over,
});

describe("captureText", () => {
  it("prefers extractedText over rawText", () => {
    expect(captureText(cap({ rawText: "typed", extractedText: "transcript" }))).toBe("transcript");
  });
  it("falls back to rawText, trimmed", () => {
    expect(captureText(cap({ rawText: "  hi  " }))).toBe("hi");
  });
  it("returns empty string when nothing exists", () => {
    expect(captureText(cap({}))).toBe("");
  });
});

describe("assembleDigestInput", () => {
  it("orders chronologically and labels by kind", () => {
    const input = assembleDigestInput([
      cap({ rawType: "text", rawText: "second", createdAt: 2 }),
      cap({ rawType: "audio", extractedText: "first", createdAt: 1 }),
      cap({ rawType: "image", extractedText: "a photo of a dog", createdAt: 3 }),
    ]);
    expect(input).toBe("[spoken] first\n\n[written] second\n\n[photo] a photo of a dog");
  });
  it("skips captures with no text yet", () => {
    const input = assembleDigestInput([
      cap({ rawType: "audio", createdAt: 1 }), // untranscribed
      cap({ rawType: "text", rawText: "only me", createdAt: 2 }),
    ]);
    expect(input).toBe("[written] only me");
  });
  it("caps the assembled input", () => {
    const input = assembleDigestInput([cap({ rawText: "x".repeat(9000), createdAt: 1 })], 100);
    expect(input.length).toBe(100);
  });
});

describe("fallbackTitle", () => {
  it("takes the first words of the earliest text", () => {
    expect(
      fallbackTitle([
        cap({ rawText: "later thought", createdAt: 5 }),
        cap({ rawText: "one two three four five six seven eight nine", createdAt: 1 }),
      ]),
    ).toBe("one two three four five six seven…");
  });
  it("returns short text whole, no ellipsis", () => {
    expect(fallbackTitle([cap({ rawText: "short thought", createdAt: 1 })])).toBe("short thought");
  });
  it("returns Recording when no capture has text", () => {
    expect(fallbackTitle([cap({ rawType: "audio", createdAt: 1 })])).toBe("Recording");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/session-digest.test.ts`
Expected: FAIL, cannot resolve `../lib/sessionDigest`.

- [ ] **Step 3: Implement**

```ts
// lib/sessionDigest.ts
// Pure helpers for the session digest: assemble the model input from a session's
// captures, and the list-view fallback title when no digest exists yet. Pure so
// they run in unit tests and in Convex functions alike.

export type DigestCapture = {
  rawType: string;
  rawText?: string;
  extractedText?: string;
  createdAt: number;
};

const INPUT_CAP = 6000;
const TITLE_WORDS = 7;

/** The best text a capture currently has: what ingest derived, else what was typed. */
export function captureText(c: DigestCapture): string {
  return (c.extractedText ?? c.rawText ?? "").trim();
}

function chronological(captures: DigestCapture[]): DigestCapture[] {
  return [...captures].sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * The digest model input: every capture's text in chronological order, labeled by
 * kind, capped head-first (the opening of a session carries its theme).
 */
export function assembleDigestInput(captures: DigestCapture[], cap = INPUT_CAP): string {
  const parts: string[] = [];
  for (const c of chronological(captures)) {
    const text = captureText(c);
    if (!text) continue;
    const label = c.rawType === "audio" ? "spoken" : c.rawType === "image" ? "photo" : "written";
    parts.push(`[${label}] ${text}`);
  }
  return parts.join("\n\n").slice(0, cap);
}

/** List-view fallback when the digest hasn't run or failed: the entry's first words. */
export function fallbackTitle(captures: DigestCapture[]): string {
  const first = chronological(captures)
    .map(captureText)
    .find((t) => t.length > 0);
  if (!first) return "Recording";
  const words = first.split(/\s+/);
  return words.slice(0, TITLE_WORDS).join(" ") + (words.length > TITLE_WORDS ? "…" : "");
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/session-digest.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/sessionDigest.ts tests/session-digest.test.ts
git commit -m "feat(sessions): pure digest helpers, input assembly + fallback title"
```

---

### Task 3: Convex sessions functions + captures.sessionId (TDD)

**Files:**
- Create: `convex/sessions.ts`
- Modify: `convex/captures.ts` (the `create` mutation, lines 62-89)
- Test: `tests/convex/sessions.test.ts`

**Interfaces:**
- Consumes: `fallbackTitle`, `captureText` from `lib/sessionDigest` (Task 2).
- Produces: `api.sessions.create({device}) -> Id<"sessions">`, `api.sessions.list() -> Array<{_id, title, summary, doing, startedAt, updatedAt, device, digestStatus, preview, counts:{voice,text,photo}}>`, `api.sessions.get({sessionId}) -> {session, captures: Array<Doc<"captures"> & {fileUrl: string|null}>} | null`, `api.sessions.setDoing({sessionId, doing})`, `api.sessions.deleteIfEmpty({sessionId})`, `internal.sessions.getForDigestInternal({sessionId})`, `internal.sessions.writeDigestInternal({sessionId, title?, summary?, status})`. `api.captures.create` accepts optional `sessionId`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/convex/sessions.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Auth test-identity pattern: insert a real users row, use its _id as the subject.
async function setup() {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  return { t, asUser: t.withIdentity({ subject: userId }), userId };
}

describe("sessions", () => {
  it("create + append captures -> get returns them in order", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "audio", rawType: "audio", sessionId,
    });
    await asUser.mutation(api.captures.create, {
      source: "paste", rawType: "text", rawText: "and then I typed this", sessionId,
    });
    const doc = await asUser.query(api.sessions.get, { sessionId });
    expect(doc).not.toBeNull();
    expect(doc!.captures.map((c) => c.rawType)).toEqual(["audio", "text"]);
  });

  it("appending bumps session.updatedAt", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "desktop" });
    const before = (await asUser.query(api.sessions.get, { sessionId }))!.session.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await asUser.mutation(api.captures.create, {
      source: "paste", rawType: "text", rawText: "more", sessionId,
    });
    const after = (await asUser.query(api.sessions.get, { sessionId }))!.session.updatedAt;
    expect(after).toBeGreaterThan(before);
  });

  it("list derives a preview fallback and kind counts", async () => {
    const { asUser } = await setup();
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "paste", rawType: "text", rawText: "walking and thinking about work", sessionId,
    });
    const rows = await asUser.query(api.sessions.list, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].preview).toBe("walking and thinking about work");
    expect(rows[0].counts).toEqual({ voice: 0, text: 1, photo: 0 });
  });

  it("cannot append to another user's session", async () => {
    const { t, asUser } = await setup();
    const otherId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherId });
    const sessionId = await asUser.mutation(api.sessions.create, { device: "phone" });
    await expect(
      asOther.mutation(api.captures.create, {
        source: "paste", rawType: "text", rawText: "intruder", sessionId,
      }),
    ).rejects.toThrow();
  });

  it("deleteIfEmpty deletes a session with no active captures, keeps one with content", async () => {
    const { asUser } = await setup();
    const empty = await asUser.mutation(api.sessions.create, { device: "phone" });
    const full = await asUser.mutation(api.sessions.create, { device: "phone" });
    await asUser.mutation(api.captures.create, {
      source: "paste", rawType: "text", rawText: "keep me", sessionId: full,
    });
    await asUser.mutation(api.sessions.deleteIfEmpty, { sessionId: empty });
    await asUser.mutation(api.sessions.deleteIfEmpty, { sessionId: full });
    expect(await asUser.query(api.sessions.get, { sessionId: empty })).toBeNull();
    expect(await asUser.query(api.sessions.get, { sessionId: full })).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/convex/sessions.test.ts`
Expected: FAIL, `api.sessions` undefined / sessionId arg rejected.

- [ ] **Step 3: Implement `convex/sessions.ts`**

```ts
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { fallbackTitle } from "../lib/sessionDigest";

// ============================================================================
// Sessions: the living journal entry. A session is a container over captures
// (optional captures.sessionId); the raw truth stays on the captures rows and
// their stored blobs. This module owns container CRUD + the digest read/write
// used by convex/ai/sessionDigest.ts. See features/sessions.md.
// ============================================================================

export const create = mutation({
  args: { device: v.union(v.literal("phone"), v.literal("desktop")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("sessions", {
      userId,
      device: args.device,
      startedAt: now,
      updatedAt: now,
    });
  },
});

// Newest-first list rows with derived display fields. Personal volumes are small;
// reading each session's captures here is fine and keeps storage clean of derived data.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    return await Promise.all(
      rows.map(async (s) => {
        const caps = await ctx.db
          .query("captures")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();
        const counts = { voice: 0, text: 0, photo: 0 };
        for (const c of caps) {
          if (c.rawType === "audio") counts.voice++;
          else if (c.rawType === "image") counts.photo++;
          else counts.text++;
        }
        return {
          _id: s._id,
          title: s.title,
          summary: s.summary,
          doing: s.doing,
          device: s.device,
          digestStatus: s.digest?.status,
          startedAt: s.startedAt,
          updatedAt: s.updatedAt,
          preview: fallbackTitle(caps),
          counts,
        };
      }),
    );
  },
});

// The document view: the session plus its captures in capture order, files resolved.
export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;
    const rows = await ctx.db
      .query("captures")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const captures = await Promise.all(
      rows.map(async (c) => ({
        ...c,
        fileUrl: c.rawFileId ? await ctx.storage.getUrl(c.rawFileId) : null,
      })),
    );
    return { session, captures };
  },
});

export const setDoing = mutation({
  args: { sessionId: v.id("sessions"), doing: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.sessionId, {
      doing: args.doing.trim().slice(0, 200) || undefined,
      updatedAt: Date.now(),
    });
  },
});

// Called when leaving the document view: a session that never got content
// (e.g. "Type instead" then bail) leaves no husk in the list.
export const deleteIfEmpty = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(args.sessionId);
    if (!s || s.userId !== userId) return;
    const first = await ctx.db
      .query("captures")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!first) await ctx.db.delete(args.sessionId);
  },
});

// ---- digest plumbing (server-only) ------------------------------------------

export const getForDigestInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    const captures = await ctx.db
      .query("captures")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return { session, captures };
  },
});

export const writeDigestInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    const s = await ctx.db.get(args.sessionId);
    if (!s) return; // session deleted while digest was in flight
    await ctx.db.patch(args.sessionId, {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.summary !== undefined ? { summary: args.summary } : {}),
      digest: { status: args.status, at: Date.now() },
    });
  },
});
```

- [ ] **Step 4: Extend `captures.create`**

In `convex/captures.ts`, add to the `create` mutation args:

```ts
    sessionId: v.optional(v.id("sessions")),
```

and replace the handler body's opening (before `ctx.db.insert`) with ownership validation + bump after insert:

```ts
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId);
      if (!session || session.userId !== userId) throw new Error("Session not found");
    }
    const id = await ctx.db.insert("captures", {
      userId,
      ...args,
      extraction: {
        status: NEEDS_EXTRACTION.has(args.rawType) ? ("pending" as const) : ("skipped" as const),
        at: Date.now(),
      },
      isActive: true,
      createdAt: Date.now(),
    });
    // A session is a living entry: every appended capture bumps it to the top.
    if (args.sessionId) await ctx.db.patch(args.sessionId, { updatedAt: Date.now() });
    // Ingest in the background: extract text from the raw artifact (transcribe audio,
    // fetch a link, read an image), then distill. No-op degrades gracefully without keys.
    await ctx.scheduler.runAfter(0, internal.ai.ingest.ingestCapture, { captureId: id });
    return id;
  },
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `npx vitest run tests/convex/sessions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add convex/sessions.ts convex/captures.ts tests/convex/sessions.test.ts convex/_generated
git commit -m "feat(sessions): sessions functions + captures.sessionId with ownership guard"
```

---

### Task 4: Session digest AI task + ingest hook

**Files:**
- Modify: `convex/ai/config.ts` (add task to `TASKS`)
- Create: `convex/ai/sessionDigest.ts`
- Modify: `convex/ai/ingest.ts` (end of `ingestCapture` handler, after the distill schedule)

**Interfaces:**
- Consumes: `internal.sessions.getForDigestInternal`, `internal.sessions.writeDigestInternal` (Task 3), `assembleDigestInput` (Task 2), `aiForTask` from `convex/ai/openai.ts`.
- Produces: `internal.ai.sessionDigest.digestSession({sessionId})`.

- [ ] **Step 1: Add the task to `convex/ai/config.ts`** (after `brainDumpGraph`)

```ts
  // Session digest: title + one-line summary for a living journal entry, from its
  // captures' text in order. Debounced ~30s after each member capture's ingest. Live.
  sessionDigest: {
    label: "Session · digest",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.4,
    wired: true,
    system: `You title one journal entry from a personal life-mapping app. The entry is a person's raw session: spoken passages, typed notes, photo descriptions, in the order they happened.

Return ONLY a JSON object, no prose, in this exact shape:
{"title":"a 3-7 word noun phrase naming what the entry is about","summary":"one plain, warm sentence (max ~22 words) saying what was on their mind"}

Ground both strictly in the text. Never invent facts, never address the person, never praise. If the entry is thin, keep it short and honest.`,
  },
```

- [ ] **Step 2: Create `convex/ai/sessionDigest.ts`**

```ts
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { aiForTask } from "./openai";
import { assembleDigestInput } from "../../lib/sessionDigest";

// The session digest: an AI title + one-line summary for the sessions list.
// Scheduled (debounced) by ingest whenever a session-member capture finishes.
// The run reads current state, so the last append always wins; overlapping runs
// are harmless idempotent overwrites. Failure marks digest.status = "error" and
// the list falls back to first words; the next append retries naturally.
export const digestSession = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.sessions.getForDigestInternal, {
      sessionId: args.sessionId,
    });
    if (!data) return; // deleted (e.g. empty-session cleanup) while scheduled

    // If any member capture is still ingesting, skip: its completion reschedules us,
    // so the digest that finally runs sees the full entry.
    if (data.captures.some((c) => c.extraction?.status === "pending")) return;

    const input = assembleDigestInput(data.captures);
    if (!input) return; // nothing textual yet (e.g. failed transcription, no note)

    try {
      const { client, model, temperature, system } = await aiForTask(
        ctx,
        "sessionDigest",
        data.session.userId,
      );
      const res = await client.chat.completions.create({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system! },
          { role: "user", content: input },
        ],
      });
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
      const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, 80) : "";
      const summary =
        typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 200) : "";
      if (!title && !summary) throw new Error("empty digest");
      await ctx.runMutation(internal.sessions.writeDigestInternal, {
        sessionId: args.sessionId,
        ...(title ? { title } : {}),
        ...(summary ? { summary } : {}),
        status: "done",
      });
    } catch {
      await ctx.runMutation(internal.sessions.writeDigestInternal, {
        sessionId: args.sessionId,
        status: "error",
      });
    }
  },
});
```

- [ ] **Step 3: Hook into ingest**

In `convex/ai/ingest.ts`, at the end of the `ingestCapture` handler (after the `distillCapture` schedule), add:

```ts
    // A session-member capture refreshes its session's digest, debounced: the run
    // 30s out reads current state, so a burst of appends costs one model call.
    if (capture.sessionId) {
      await ctx.scheduler.runAfter(30_000, internal.ai.sessionDigest.digestSession, {
        sessionId: capture.sessionId,
      });
    }
```

- [ ] **Step 4: Verify types + existing tests**

Run: `npx convex codegen && npx tsc --noEmit && npx vitest run`
Expected: all exit 0 / all tests pass (config has an `ai-config.test.ts` that iterates TASKS; the new entry must satisfy it).

- [ ] **Step 5: Commit**

```bash
git add convex/ai/config.ts convex/ai/sessionDigest.ts convex/ai/ingest.ts convex/_generated
git commit -m "feat(sessions): AI session digest, debounced off ingest completion"
```

---

### Task 5: Shared blob upload hook (DRY prep)

**Files:**
- Create: `hooks/useBlobUpload.ts`
- Modify: `components/thoughts/Composer.tsx` (remove local `uploadBlob`, lines 38-50)
- Modify: `components/thoughts/utils.ts` (add `currentDevice`)

**Interfaces:**
- Produces: `useBlobUpload(): (blob: Blob, contentType: string) => Promise<Id<"_storage">>`; `currentDevice(): "phone" | "desktop"`.

- [ ] **Step 1: Create the hook**

```ts
// hooks/useBlobUpload.ts
"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/** Upload one blob to Convex storage via a signed URL; returns the storage id. */
export function useBlobUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  return useCallback(
    async (blob: Blob, contentType: string): Promise<Id<"_storage">> => {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: blob,
      });
      const { storageId } = await res.json();
      return storageId as Id<"_storage">;
    },
    [generateUploadUrl],
  );
}
```

- [ ] **Step 2: Refactor Composer to use it**

In `components/thoughts/Composer.tsx`: delete the `generateUploadUrl` mutation and the local `uploadBlob` `useCallback`; add `const uploadBlob = useBlobUpload();` (import from `@/hooks/useBlobUpload`). Call sites are unchanged.

- [ ] **Step 3: Add `currentDevice` to `components/thoughts/utils.ts`** and use it in `deviceMeta`:

```ts
export function currentDevice(): "phone" | "desktop" {
  return window.innerWidth < 768 ? "phone" : "desktop";
}

export function deviceMeta(): string {
  return JSON.stringify({ device: currentDevice() });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add hooks/useBlobUpload.ts components/thoughts/Composer.tsx components/thoughts/utils.ts
git commit -m "refactor(thoughts): shared useBlobUpload hook + currentDevice helper"
```

---

### Task 6: Record overlay (RecordTake)

**Files:**
- Create: `components/sessions/RecordTake.tsx`

**Interfaces:**
- Consumes: `useAudioRecorder` (existing), `useBlobUpload` (Task 5), `api.sessions.create`, `api.captures.create` (Task 3), `currentDevice`, `formatElapsed` from `components/thoughts/utils`.
- Produces: `<RecordTake onDone={(sessionId: Id<"sessions">) => void} onClose={() => void} />`.

- [ ] **Step 1: Create the component**

```tsx
// components/sessions/RecordTake.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, Square, X } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import { currentDevice, formatElapsed } from "@/components/thoughts/utils";

// Anything shorter than this is almost certainly an accidental tap, not a thought.
const MIN_RECORDING_MS = 1000;

/**
 * The one-tap take: opens recording immediately (no form, no chrome), stop creates
 * a session holding the take as its first capture and hands off to the document
 * view so the entry can be continued right away. Cancel (or a too-short take)
 * creates nothing.
 */
export function RecordTake({
  onDone,
  onClose,
}: {
  onDone: (sessionId: Id<"sessions">) => void;
  onClose: () => void;
}) {
  const recorder = useAudioRecorder();
  const uploadBlob = useBlobUpload();
  const createSession = useMutation(api.sessions.create);
  const createCapture = useMutation(api.captures.create);
  const [saving, setSaving] = useState(false);
  const startedRef = useRef(false);

  // Start listening the moment the surface opens; that is the whole point.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void recorder.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async () => {
    if (saving) return;
    const result = await recorder.stop();
    if (!result || result.durationMs < MIN_RECORDING_MS) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const device = currentDevice();
      const sessionId = await createSession({ device });
      const rawFileId = await uploadBlob(result.blob, result.mimeType);
      await createCapture({
        source: "audio",
        rawType: "audio",
        rawFileId,
        sessionId,
        sourceMeta: JSON.stringify({ device, durationMs: result.durationMs }),
      });
      onDone(sessionId);
    } catch {
      // The take could not be saved; say so instead of silently closing.
      setSaving(false);
      setFailed(true);
    }
  };

  const [failed, setFailed] = useState(false);

  const cancel = () => {
    void recorder.stop(); // releases the mic; result discarded
    onClose();
  };

  const typeInstead = async () => {
    void recorder.stop();
    const sessionId = await createSession({ device: currentDevice() });
    onDone(sessionId); // empty doc view, composer focused; deleteIfEmpty guards a bail
  };

  return (
    <div className="fixed inset-0 z-[80] bg-paper flex flex-col items-center justify-center gap-8">
      <button
        type="button"
        onClick={cancel}
        aria-label="Cancel"
        className="absolute top-5 right-5 w-10 h-10 rounded-full border border-line text-ink-mute hover:text-ink flex items-center justify-center"
      >
        <X className="w-5 h-5" />
      </button>

      {recorder.error ? (
        <div className="text-center px-8">
          <p className="text-[15px] text-ink-soft mb-4">
            I can't hear the mic. Check the browser's mic permission.
          </p>
          <button
            type="button"
            onClick={() => void typeInstead()}
            className="px-5 py-2.5 rounded-xl bg-accent text-white text-[14px]"
          >
            Type instead
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 text-ink-soft">
            <span className="w-3 h-3 rounded-full bg-gold animate-pulse" />
            <span className="text-[28px] tabular-nums font-light">
              {formatElapsed(recorder.elapsedMs)}
            </span>
          </div>
          <p className="text-[13px] text-ink-mute">Say what's on your mind. It all lands here.</p>
          <button
            type="button"
            onClick={() => void finish()}
            disabled={saving}
            aria-label="Stop and save"
            className="w-24 h-24 rounded-full bg-gold/15 border-2 border-gold text-gold flex items-center justify-center disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Square className="w-7 h-7" fill="currentColor" strokeWidth={0} />
            )}
          </button>
          {failed && (
            <p className="text-[13px] text-ink-mute px-8 text-center">
              Saving failed, the network may be down. Tap stop to retry.
            </p>
          )}
        </>
      )}
    </div>
  );
}
```

(Note: move the `const [failed, setFailed] = useState(false);` declaration up with the other state hooks when writing the file; shown near `finish` above only for reading flow.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/sessions/RecordTake.tsx
git commit -m "feat(sessions): RecordTake, the one-tap full-screen voice take"
```

---

### Task 7: Sessions list + document view

**Files:**
- Create: `components/sessions/SessionsList.tsx`
- Create: `components/sessions/SessionDoc.tsx`
- Create: `components/sessions/Sessions.tsx` (the view: list ↔ doc)

**Interfaces:**
- Consumes: `api.sessions.list/get/setDoing/deleteIfEmpty`, `api.captures.create/reprocess`, `useAudioRecorder`, `useBlobUpload`, `formatRelativeTime`, `formatElapsed`, `currentDevice` from thoughts/utils.
- Produces: `<Sessions activeSessionId onOpenSession={(id|null)=>void} />` used by AppShell (Task 8).

- [ ] **Step 1: Create `SessionsList.tsx`**

```tsx
// components/sessions/SessionsList.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Camera, Mic } from "lucide-react";
import { formatRelativeTime } from "@/components/thoughts/utils";

/** Chronological entries, newest first: date/time, AI title + subtext (or fallback). */
export function SessionsList({ onOpen }: { onOpen: (id: Id<"sessions">) => void }) {
  const rows = useQuery(api.sessions.list, {});

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[680px] mx-auto px-5 py-6 md:px-8">
        <h1 className="text-[19px] font-semibold text-ink mb-4">Sessions</h1>
        {rows === undefined ? (
          <p className="text-center text-[13px] text-ink-mute py-10">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] text-ink-soft mb-1">No entries yet.</p>
            <p className="text-[13px] text-ink-mute">
              Tap record and talk. Every session lands here, kept forever.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {rows.map((s) => (
              <button
                key={s._id}
                type="button"
                onClick={() => onOpen(s._id)}
                className="text-left bg-card border border-line rounded-2xl px-4 py-3.5 hover:border-gold transition"
              >
                <div className="flex items-center gap-2 text-[11.5px] text-ink-mute mb-1">
                  <span>{formatRelativeTime(s.startedAt)}</span>
                  {s.counts.voice > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Mic className="w-3 h-3" /> {s.counts.voice}
                    </span>
                  )}
                  {s.counts.photo > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Camera className="w-3 h-3" /> {s.counts.photo}
                    </span>
                  )}
                  {s.doing && <span>· {s.doing}</span>}
                </div>
                <div className="text-[15px] text-ink font-medium leading-snug">
                  {s.title ?? s.preview}
                </div>
                {s.summary && (
                  <div className="text-[13px] text-ink-soft leading-relaxed mt-0.5">{s.summary}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `SessionDoc.tsx`**

```tsx
// components/sessions/SessionDoc.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, ImagePlus, Loader2, Mic, Send, Square } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import { currentDevice, formatElapsed } from "@/components/thoughts/utils";

const MIN_RECORDING_MS = 1000;

/**
 * The living entry: the session's captures rendered as one flowing document
 * (spoken passages, typed text, photos, in order), with a pinned strip at the
 * bottom to keep adding to it. Leaving an entry that has no content deletes it.
 */
export function SessionDoc({
  sessionId,
  onBack,
}: {
  sessionId: Id<"sessions">;
  onBack: () => void;
}) {
  const doc = useQuery(api.sessions.get, { sessionId });
  const createCapture = useMutation(api.captures.create);
  const reprocess = useMutation(api.captures.reprocess);
  const setDoing = useMutation(api.sessions.setDoing);
  const deleteIfEmpty = useMutation(api.sessions.deleteIfEmpty);
  const uploadBlob = useBlobUpload();
  const recorder = useAudioRecorder();

  const [text, setText] = useState("");
  const [doingDraft, setDoingDraft] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No husks: leaving an entry that never got content removes it.
  useEffect(() => {
    return () => void deleteIfEmpty({ sessionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const append = useCallback(
    async (args: Parameters<typeof createCapture>[0]) => {
      await createCapture({ ...args, sessionId, sourceMeta: JSON.stringify({ device: currentDevice() }) });
    },
    [createCapture, sessionId],
  );

  const sendText = () => {
    const trimmed = text.trim();
    if (!trimmed || uploading) return;
    setText("");
    void append({ source: "paste", rawType: "text", rawText: trimmed }).catch(() => setText(trimmed));
  };

  const micTap = async () => {
    if (recorder.recording) {
      const result = await recorder.stop();
      if (!result || result.durationMs < MIN_RECORDING_MS) return;
      setUploading(true);
      try {
        const rawFileId = await uploadBlob(result.blob, result.mimeType);
        await append({ source: "audio", rawType: "audio", rawFileId });
      } finally {
        setUploading(false);
      }
    } else {
      void recorder.start();
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const rawFileId = await uploadBlob(file, file.type);
      await append({
        source: "upload",
        rawType: file.type.startsWith("image/") ? "image" : "file",
        rawFileId,
      });
    } finally {
      setUploading(false);
    }
  };

  if (doc === undefined) {
    return <p className="text-center text-[13px] text-ink-mute py-10">Loading…</p>;
  }
  if (doc === null) {
    return (
      <div className="text-center py-16">
        <p className="text-[14px] text-ink-mute">This entry is gone.</p>
        <button type="button" onClick={onBack} className="mt-3 text-[13px] text-gold">
          Back to sessions
        </button>
      </div>
    );
  }

  const { session, captures } = doc;
  const started = new Date(session.startedAt);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line md:px-8">
        <button type="button" onClick={onBack} aria-label="Back" className="text-ink-mute hover:text-ink">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-ink font-medium truncate">
            {session.title ?? started.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
          </div>
          <div className="text-[11.5px] text-ink-mute">
            {started.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </div>
        </div>
        <input
          value={doingDraft ?? session.doing ?? ""}
          onChange={(e) => setDoingDraft(e.target.value)}
          onBlur={() => {
            if (doingDraft !== null) void setDoing({ sessionId, doing: doingDraft });
          }}
          placeholder="What were you doing?"
          className="w-40 bg-transparent text-right text-[12px] text-ink-soft placeholder:text-ink-mute outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 md:px-8">
        <div className="max-w-[680px] mx-auto flex flex-col gap-5">
          {captures.length === 0 && (
            <p className="text-[13.5px] text-ink-mute text-center py-8">
              An empty page. Speak or write below.
            </p>
          )}
          {captures.map((c) => (
            <div key={c._id}>
              {c.rawType === "audio" && (
                <div>
                  {c.extractedText ? (
                    <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
                      {c.extractedText}
                    </p>
                  ) : c.extraction?.status === "error" ? (
                    <p className="text-[13px] text-ink-mute">
                      Transcription failed, the recording is safe.{" "}
                      <button
                        type="button"
                        onClick={() => void reprocess({ captureId: c._id })}
                        className="text-gold"
                      >
                        Try again
                      </button>
                    </p>
                  ) : (
                    <p className="text-[13px] text-ink-mute animate-pulse">Listening back…</p>
                  )}
                  {c.fileUrl && (
                    <audio controls preload="none" src={c.fileUrl} className="mt-2 h-9 w-full max-w-[320px]" />
                  )}
                </div>
              )}
              {(c.rawType === "text" || c.rawType === "quote") && (
                <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">{c.rawText}</p>
              )}
              {c.rawType === "image" && c.fileUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.fileUrl} alt="" className="rounded-xl max-h-80 object-contain" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line px-5 py-3.5 md:px-8 bg-paper">
        <div className="max-w-[680px] mx-auto flex items-end gap-2">
          {recorder.recording ? (
            <div className="flex-1 flex items-center justify-center gap-4 py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
              <span className="text-[14px] tabular-nums text-ink-soft">{formatElapsed(recorder.elapsedMs)}</span>
              <button
                type="button"
                onClick={() => void micTap()}
                disabled={uploading}
                aria-label="Stop recording"
                className="w-12 h-12 rounded-full bg-gold/15 border-[1.5px] border-gold text-gold flex items-center justify-center disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-4 h-4" fill="currentColor" strokeWidth={0} />}
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    sendText();
                  }
                }}
                rows={1}
                placeholder="Write here…"
                className="flex-1 resize-none bg-card border border-line-2 rounded-xl px-3.5 py-2.5 text-[14.5px] text-ink placeholder:text-ink-mute outline-none focus:border-gold max-h-40"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Add a photo"
                className="w-10 h-10 rounded-full bg-card border border-line-2 text-ink-mute hover:text-gold flex items-center justify-center disabled:opacity-40"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => void micTap()}
                disabled={uploading || !recorder.supported}
                aria-label="Continue with voice"
                className="w-12 h-12 rounded-full bg-card border border-line-2 text-ink-mute hover:text-gold flex items-center justify-center disabled:opacity-40"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={sendText}
                disabled={!text.trim() || uploading}
                aria-label="Send"
                className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-30"
              >
                <Send className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `Sessions.tsx`** (the view switcher)

```tsx
// components/sessions/Sessions.tsx
"use client";

import { Id } from "@/convex/_generated/dataModel";
import { SessionsList } from "./SessionsList";
import { SessionDoc } from "./SessionDoc";

/** The Sessions surface: the chronological list, or one open entry. */
export function Sessions({
  activeSessionId,
  onOpenSession,
}: {
  activeSessionId: Id<"sessions"> | null;
  onOpenSession: (id: Id<"sessions"> | null) => void;
}) {
  return activeSessionId ? (
    <SessionDoc sessionId={activeSessionId} onBack={() => onOpenSession(null)} />
  ) : (
    <SessionsList onOpen={onOpenSession} />
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/sessions/SessionsList.tsx components/sessions/SessionDoc.tsx components/sessions/Sessions.tsx
git commit -m "feat(sessions): sessions list + living-entry document view"
```

---

### Task 8: Shell wiring, the mobile bar becomes Today · ● · Sessions · Talk

**Files:**
- Modify: `components/shell/Rail.tsx`
- Modify: `components/shell/AppShell.tsx`

**Interfaces:**
- Consumes: `Sessions` (Task 7), `RecordTake` (Task 6).
- Produces: `View` type gains `"sessions"`; `Rail` gains `onRecord: () => void` prop.

- [ ] **Step 1: Rework `Rail.tsx`**

Replace the `View` type, `ITEMS`, and the nav render. Each item gains `mobile: boolean` (shown on the phone bar or desktop-only). Add the center record button (mobile only) between Today and Sessions. Imports: add `NotebookPen`, keep `Mic`, `AudioLines`, drop nothing else.

```tsx
export type View = "today" | "core" | "board" | "dump" | "sessions" | "settings";

const ITEMS: { key: View; label: string; Icon: typeof Sun; mobile: boolean }[] = [
  { key: "today", label: "Today", Icon: Sun, mobile: true },
  { key: "core", label: "Core", Icon: Gem, mobile: false },
  { key: "board", label: "Board", Icon: LayoutGrid, mobile: false },
  { key: "dump", label: "Thoughts", Icon: AudioLines, mobile: false },
  { key: "sessions", label: "Sessions", Icon: NotebookPen, mobile: true },
];
```

`NavButton` gains a `mobile` prop and applies visibility: `className={\`${mobile ? "flex" : "hidden md:flex"} flex-1 md:flex-none flex-col ...\`}` (rest of the classes unchanged).

`Rail` signature becomes `{ view, onNav, onSpeak, onRecord }`. In the nav list, render: Today first, then the mobile-only record button, then the remaining items, then the mobile-only Talk tab (existing):

```tsx
      <div className="flex flex-1 flex-row md:flex-col gap-1 md:gap-1.5 items-center justify-around md:justify-start">
        {ITEMS.map(({ key, label, Icon, mobile }) => (
          <NavButton key={key} Icon={Icon} label={label} active={view === key} mobile={mobile} onClick={() => onNav(key)} />
        ))}
        {/* One tap, recording: the phone's main action. Desktop records via the composer. */}
        <button
          type="button"
          onClick={onRecord}
          aria-label="Record a session"
          className="md:hidden order-first sm:order-none relative -top-3 w-16 h-16 rounded-full bg-accent text-white shadow-lg flex items-center justify-center flex-shrink-0 mx-1"
        >
          <Mic className="w-7 h-7" />
        </button>
        {/* Talk lives in the bottom bar on mobile — the Listener is one tap from anywhere. */}
        <div className="md:hidden flex-1 flex">
          <NavButton Icon={AudioLines} label="Talk" active={false} mobile onClick={onSpeak} />
        </div>
      </div>
```

Ordering note: place the record `<button>` element between the `today` and `sessions` NavButtons in the JSX by rendering ITEMS in two slices instead of relying on CSS order: `ITEMS.slice(0, 1)`, the record button, then `ITEMS.slice(1)` (remove the `order-first sm:order-none` classes). Talk's icon changes to `AudioLines`? No: keep `Mic` for Talk is now wrong (Record uses Mic). Use `AudioLines` for Talk and keep `AudioLines` for Thoughts too (desktop-only, no mobile collision); if that reads confusingly at review time, swap Talk to `Waves`.

- [ ] **Step 2: Wire `AppShell.tsx`**

Add to imports: `Sessions` from `@/components/sessions/Sessions`, `RecordTake` from `@/components/sessions/RecordTake`, `Id` already imported.

```tsx
const VIEWS: View[] = ["today", "core", "board", "dump", "sessions", "settings"];
```

Inside the component:

```tsx
  const [recordOpen, setRecordOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(null);
```

In the JSX: pass `onRecord={() => setRecordOpen(true)}` to `Rail`; render the view:

```tsx
          {view === "sessions" && (
            <Sessions activeSessionId={activeSessionId} onOpenSession={setActiveSessionId} />
          )}
```

and the overlay (next to SpeakSurface):

```tsx
        {recordOpen && (
          <RecordTake
            onClose={() => setRecordOpen(false)}
            onDone={(sessionId) => {
              setRecordOpen(false);
              setActiveSessionId(sessionId);
              setView("sessions");
            }}
          />
        )}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/shell/Rail.tsx components/shell/AppShell.tsx
git commit -m "feat(shell): mobile bar becomes Today · Record · Sessions · Talk (ARI-24)"
```

---

### Task 9: Docs, spec deviations, changelog, TO-CHECK

**Files:**
- Create: `docs/product/features/sessions.md` (from `docs/product/features/_TEMPLATE.md`)
- Create: `docs/decisions/0008-sessions-as-container-over-captures.md`
- Modify: `docs/product/features/thought-stream.md` (Dynamics section: sessions relation)
- Modify: `docs/architecture/data-model.md` (sessions table + captures.sessionId)
- Modify: `docs/roadmap.md` (MVP capture-spine bullet: Session entity + mobile front door in build)
- Modify: `docs/product/features/README.md` (index row)
- Modify: `docs/superpowers/specs/2026-07-12-mobile-capture-sessions-design.md` (deviations: Sessions is a rail view on desktop; create-at-first-capture + deleteIfEmpty-on-exit replaces empty-session cleanup; session chip on ThoughtCard deferred)
- Modify: `TO-CHECK.md` (manual smokes below)
- Modify: `CHANGELOG.md` (entry via the changelog skill after the final commit)

- [ ] **Step 1: Write `sessions.md`** covering, per the template: purpose (the living entry; the observation contract's session layer), behavior (one-tap record, document view, continue later, doing field, digest in list), all actions (create/append/setDoing/deleteIfEmpty/digest), dynamics (captures/Thought Stream/board Inbox/future decomposition per roadmap), states (pending/error transcription, no-AI-keys, empty), AI involvement (sessionDigest node), data touched, open questions (Listener unification, morning/night front doors, stream chip).
- [ ] **Step 2: Write ADR 0008**: context (Thought Stream shipped captures-as-raw; the entry needs a container), decision (container table + optional FK on captures, no parallel segments table, digest as derived state), consequences (retroactive pipelines read one table; loose captures unaffected).
- [ ] **Step 3: Make the listed edits to the existing docs.**
- [ ] **Step 4: Add TO-CHECK section**:

```markdown
### Sessions + mobile capture (ARI-24)
- [ ] **One-tap take (real iPhone):** tap ● in the bottom bar, speak 2+ minutes, stop. Entry opens; transcript fills in ("Listening back…" then text); audio plays inline from desktop too; transcript matches speech.
- [ ] **Living entry:** in the open entry, type a line, add a photo, record a second take. All land in order. Next day, reopen and append; the list row's AI title/subtext refresh (~30s after ingest).
- [ ] **Digest fallback:** with no AI keys, the list shows first-words fallback instead of a title; no errors surface.
- [ ] **Failure never loses audio:** kill the network after stopping a take (before upload completes): the failure notice shows and stop retries. Break transcription (no OPENAI key): entry shows "Transcription failed, the recording is safe" + Try again works once the key is back.
- [ ] **No husks:** open record, tap X immediately (and: mic denied → Type instead → leave without typing). Sessions list gains nothing.
- [ ] **Mobile bar:** at ~390px only Today · ● · Sessions · Talk (+ avatar). Core/Board/Thoughts absent on phone, present on desktop. Desktop rail gains Sessions.
- [ ] **Inspiration from phone:** from Thoughts (desktop) or an entry (phone), add a photo; confirm it appears distilled in the board Inbox.
```

- [ ] **Step 5: Commit docs, then run the changelog skill and commit its entry**

```bash
git add docs TO-CHECK.md
git commit -m "docs(sessions): feature doc, ADR 0008, data model, roadmap, spec deviations (ARI-24)"
```

---

### Task 10: Full verification

- [ ] **Step 1:** `npx vitest run` → all green.
- [ ] **Step 2:** `npx tsc --noEmit` → clean. `npm run lint` if the script exists → clean.
- [ ] **Step 3:** `npm run dev` + Convex dev; in a browser at mobile width: record a short take end-to-end (take → session → transcript → digest), type + photo append, list rendering. Fix anything found before handing to Ariel for on-phone QA.
- [ ] **Step 4:** Update ARI-24 (checklist progress + branch link), leave In Progress pending Ariel's phone QA.
