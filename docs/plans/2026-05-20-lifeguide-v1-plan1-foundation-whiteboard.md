# LifeGuide v1 — Plan 1: Foundation + Whiteboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the LifeGuide platform (Next.js + Convex + OpenAI, multi-tenant) and ship a working Whiteboard surface — capture, distill, nodes, labeled multi-target edges, manual manipulation — with the shared Context architecture scaffolded so the Coach (Plan 2) plugs straight in.

**Architecture:** Next.js App Router shell renders surfaces; Convex is the real-time backend (reactive DB + file storage + vector index + server-side OpenAI actions). Every surface implements a `SurfaceContextProvider` (snapshot + tools); a pure `assembleContext()` function stitches in-view + global context for AI calls. The Whiteboard is the first surface and the first provider. The Coach that consumes the assembled context arrives in Plan 2.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · TailwindCSS · Convex · `@convex-dev/auth` (Anonymous) · `openai` SDK → **OpenRouter** (`openai/gpt-4o-mini`; embeddings deferred — ADR 0006) · Vitest + convex-test · Lucide React · custom DOM/CSS/SVG canvas (not Konva).

> **AI note (ADR 0006):** Task 7 uses an OpenRouter client (`new OpenAI({ apiKey: OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" })`) and the `openai/gpt-4o-mini` model for distillation. The embedding action + the `nodes`/`captures` vector index are **deferred** (OpenRouter has no embeddings endpoint; nothing reads vectors in v1) — when Task 7 is built live, skip embed generation and the vector index, leaving the `embedding` field optional.

**Plan series (v1):**
- **Plan 1 (this doc): Foundation + Whiteboard** — platform, schema, node/edge model, canvas, capture+distillation, context scaffolding.
- Plan 2: The Coach — agent multi-turn loop, tool registry, context assembler consumer, AI manipulation of the board.
- Plan 3: Audio → nodes (Whisper record-then-process → segment → place).
- Plan 4: Conversational Guide surface + Pillars/Settings/daily ritual.

**Spec:** `LifeGuide/docs/product/prd.md` · **Concept:** `LifeGuide/docs/product/concept-and-soul.md`

> **Progress (2026-06-03): Tasks 0–8 BUILT, deployed, and live-verified.** Convex dev deployment `lifeguide-dev` (team `ariel-nurieli`) is provisioned; anonymous multi-tenant auth, full schema, node/edge CRUD, the canvas (pan/zoom/drag, click-to-connect, dot grid), capture intake (paste/upload/url), spiral placement, and the context scaffolding (pure assembler, provider query, Mirror + interactions) are all working against the live backend. Verified in-browser: sign-in seeds the board; create/drag node, connect edge, paste-to-capture, and place-to-node all persist (confirmed via `convex data`). Tests: 18/18 pass (geometry, edges-cycle, distill-parse, assembler).
>
> **One piece pending a secret:** the distillation **LLM call** (Task 7) is code-complete but needs `OPENROUTER_API_KEY` set on the deployment (`npx convex env set OPENROUTER_API_KEY sk-or-...`). Until then, captures still land and can be placed; they just show "distilling…" instead of a generated title/essence/pillars.
>
> **Deviations from the literal plan** (all to honor ADR 0006 + installed library versions): vector index omitted (embeddings deferred) and `embedding` kept optional; AI gateway is OpenRouter via the `openai` SDK `baseURL` with model `openai/gpt-4o-mini` (no `"use node"` needed; no `embed.ts`); `Anonymous` is a named import; distill action + capture internals are `internal*` (server-only) for tighter security; node drag uses pointer-capture with optimistic-then-commit; `users.current` returns the surface id to remove a load flash. `OPENAI_API_KEY` → `OPENROUTER_API_KEY` throughout.

---

## File Structure (Plan 1)

```
LifeGuide/
├── package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs
├── .env.local                              # NEXT_PUBLIC_CONVEX_URL, etc.
├── middleware.ts                           # Convex Auth route protection
├── CHANGELOG.md
├── vitest.config.ts
├── app/
│   ├── layout.tsx                          # Root + ConvexAuthNextjsServerProvider
│   ├── providers.tsx                       # Client Convex+Auth provider
│   ├── globals.css                         # Tailwind + tokens
│   └── page.tsx                            # Auth gate → Whiteboard
├── convex/
│   ├── schema.ts                           # All tables (full v1 schema)
│   ├── auth.ts                             # Convex Auth (Anonymous)
│   ├── auth.config.ts
│   ├── http.ts                             # Auth routes
│   ├── users.ts                            # current user + bootstrap (seed Lifestyle pillar)
│   ├── surfaces.ts                         # surface CRUD
│   ├── nodes.ts                            # node CRUD + queries
│   ├── edges.ts                            # edge CRUD + cycle check
│   ├── captures.ts                         # capture CRUD + inbox
│   ├── placement.ts                        # capture → node (spiral placement)
│   ├── pillars.ts                          # pillar CRUD + presets
│   ├── mirror.ts                           # Mirror skeleton (assemble + delta)
│   ├── interactions.ts                     # event log
│   ├── files.ts                            # storage upload/url
│   ├── context/
│   │   ├── types.ts                        # SurfaceContextProvider, ContextFragment
│   │   └── assemble.ts                     # pure assembleContext()
│   └── ai/
│       ├── config.ts                       # AI_PROCESSES hub (models/prompts/params)
│       ├── openai.ts                       # OpenAI client wrapper
│       ├── distill.ts                      # capture distillation action
│       └── embed.ts                        # embedding action
├── lib/
│   ├── geometry.ts                         # screenToCanvas, collision, spiral
│   └── types.ts                            # shared FE types
├── components/
│   ├── auth/StartButton.tsx                # anonymous sign-in entry
│   └── whiteboard/
│       ├── Whiteboard.tsx                  # canvas shell (pan/zoom/select)
│       ├── NodeCard.tsx                    # one node
│       ├── EdgeLayer.tsx                   # SVG edges
│       ├── QuickInput.tsx                  # type-anywhere capture
│       ├── Toolbar.tsx                     # add text/quote/upload/url
│       └── Inbox.tsx                       # "to place" tray
├── hooks/
│   ├── useViewport.ts
│   ├── useNodes.ts
│   ├── useEdges.ts
│   └── useCaptures.ts
└── tests/
    ├── geometry.test.ts
    ├── assemble.test.ts
    ├── distill-parse.test.ts
    └── convex/edges.test.ts
```

---

## Task 0: Project scaffold + Convex + Auth

**Files:** Create all root config, `app/*`, `convex/auth.ts`, `convex/schema.ts` (minimal), `convex/http.ts`, `middleware.ts`, `components/auth/StartButton.tsx`.

- [ ] **Step 1: Create Next.js app**

```bash
cd "/Users/arielnurieli/Desktop/Life Board"
npx create-next-app@latest LifeGuide --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint
cd LifeGuide
git init && git add -A && git commit -m "chore: create-next-app scaffold"
```

- [ ] **Step 2: Install deps**

```bash
npm install convex @convex-dev/auth openai lucide-react
npm install -D vitest convex-test @edge-runtime/vm
```

- [ ] **Step 3: Initialize Convex**

```bash
npx convex dev --once --configure=new
# project name: lifeguide-dev. This writes NEXT_PUBLIC_CONVEX_URL into .env.local.
```

- [ ] **Step 4: Initialize Convex Auth**

```bash
npx @convex-dev/auth
# Accept defaults. This creates convex/auth.ts, convex/auth.config.ts, convex/http.ts and sets env vars.
```

- [ ] **Step 5: Set the Anonymous provider**

Replace `convex/auth.ts`:

```ts
import { convexAuth } from "@convex-dev/auth/server";
import Anonymous from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Anonymous],
});
```

- [ ] **Step 6: Schema with auth tables (minimal for now)**

Write `convex/schema.ts`:

```ts
import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.id("users"),
    bootstrappedAt: v.number(),
  }).index("by_user", ["userId"]),
});
```

- [ ] **Step 7: Push schema**

```bash
npx convex dev --once
```
Expected: deploys with `users`, `authSessions`, etc., plus `profiles`. No errors.

- [ ] **Step 8: Client providers**

Create `app/providers.tsx`:

```tsx
"use client";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
```

- [ ] **Step 9: Root layout with server auth provider**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = { title: "LifeGuide", description: "Your space." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en"><body><Providers>{children}</Providers></body></html>
    </ConvexAuthNextjsServerProvider>
  );
}
```

- [ ] **Step 10: Middleware**

Create `middleware.ts`:

```ts
import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
export default convexAuthNextjsMiddleware();
export const config = { matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"] };
```

- [ ] **Step 11: Start button + auth gate page**

Create `components/auth/StartButton.tsx`:

```tsx
"use client";
import { useAuthActions } from "@convex-dev/auth/react";

export function StartButton() {
  const { signIn } = useAuthActions();
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">LifeGuide</h1>
        <p className="text-neutral-500 mb-6">Your space.</p>
        <button onClick={() => signIn("anonymous")} className="bg-neutral-900 text-white px-5 py-2.5 rounded-lg">
          Enter
        </button>
      </div>
    </div>
  );
}
```

Replace `app/page.tsx`:

```tsx
"use client";
import { Authenticated, Unauthenticated } from "convex/react";
import { StartButton } from "@/components/auth/StartButton";

export default function Home() {
  return (
    <>
      <Unauthenticated><StartButton /></Unauthenticated>
      <Authenticated>
        <div className="h-screen flex items-center justify-center text-neutral-600">Signed in. Whiteboard next.</div>
      </Authenticated>
    </>
  );
}
```

- [ ] **Step 12: Run and verify auth**

```bash
npx convex dev   # terminal 1
npm run dev      # terminal 2
```
Visit `http://localhost:3000`. Click "Enter". Expected: "Signed in. Whiteboard next." Refresh → stays signed in.

- [ ] **Step 13: Commit**

```bash
git add -A && git commit -m "feat(plan1-t0): Next.js + Convex + anonymous auth scaffold"
```

---

## Task 1: Full v1 schema + user bootstrap

**Files:** Modify `convex/schema.ts`; Create `convex/users.ts`, `convex/pillars.ts`.

- [ ] **Step 1: Write the full schema**

Replace `convex/schema.ts`:

```ts
import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const node_type = v.union(v.literal("text"), v.literal("quote"), v.literal("image"), v.literal("link"), v.literal("generated_image"));

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.id("users"),
    bootstrappedAt: v.number(),
  }).index("by_user", ["userId"]),

  surfaces: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("whiteboard"), v.literal("guide")),
    title: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  nodes: defineTable({
    userId: v.id("users"),
    surfaceId: v.id("surfaces"),
    captureId: v.optional(v.id("captures")),
    type: node_type,
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    attribution: v.optional(v.string()),
    position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
    dimensions: v.object({ width: v.number(), height: v.number() }),
    pillars: v.array(v.string()),
    embedding: v.optional(v.array(v.float64())),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_surface", ["surfaceId", "isActive"])
    .index("by_user", ["userId", "isActive"])
    .vectorIndex("by_embedding", { vectorField: "embedding", dimensions: 1536, filterFields: ["userId"] }),

  edges: defineTable({
    userId: v.id("users"),
    surfaceId: v.id("surfaces"),
    fromNode: v.id("nodes"),
    toNode: v.id("nodes"),
    label: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_surface", ["surfaceId"])
    .index("by_from", ["fromNode"]),

  captures: defineTable({
    userId: v.id("users"),
    source: v.union(v.literal("paste"), v.literal("upload"), v.literal("url"), v.literal("audio"), v.literal("agent")),
    rawType: v.union(v.literal("text"), v.literal("image"), v.literal("link"), v.literal("video_link"), v.literal("quote")),
    rawText: v.optional(v.string()),
    rawUrl: v.optional(v.string()),
    rawFileId: v.optional(v.id("_storage")),
    distilled: v.optional(v.object({
      title: v.string(),
      essence: v.string(),
      pillars: v.array(v.string()),
    })),
    embedding: v.optional(v.array(v.float64())),
    placedAt: v.optional(v.number()),
    nodeId: v.optional(v.id("nodes")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_unplaced", ["userId", "placedAt"]),

  pillars: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    weight: v.number(),
    source: v.union(v.literal("default"), v.literal("preset"), v.literal("custom")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  mirror: defineTable({
    userId: v.id("users"),
    summary: v.string(),
    structured: v.object({
      values: v.array(v.string()),
      themes: v.array(v.string()),
    }),
    version: v.number(),
    takenAt: v.number(),
  }).index("by_user", ["userId", "takenAt"]),

  interactions: defineTable({
    userId: v.id("users"),
    type: v.string(),
    payload: v.string(),
    at: v.number(),
  }).index("by_user", ["userId", "at"]),

  // Reserved for Plan 2 (Coach) — defined now to avoid migration churn.
  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  messages: defineTable({
    userId: v.id("users"),
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("coach")),
    content: v.string(),
    toolCalls: v.optional(v.array(v.object({ tool: v.string(), args: v.string(), result: v.optional(v.string()) }))),
    createdAt: v.number(),
  }).index("by_thread", ["threadId", "createdAt"]),
});
```

- [ ] **Step 2: Push schema**

```bash
npx convex dev --once
```
Expected: deploys cleanly.

- [ ] **Step 3: Pillar presets module**

Create `convex/pillars.ts`:

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const PRESETS = [
  "Health & Fitness", "Family & Relationships", "Financial & Professional",
  "Growth & Mind", "Money & Freedom", "Spirit & Meaning",
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("pillars").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

export const add = mutation({
  args: { name: v.string(), source: v.union(v.literal("preset"), v.literal("custom")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("pillars", {
      userId, name: args.name, weight: 0, source: args.source, createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 4: User bootstrap (seed default surface + Lifestyle pillar + mirror)**

Create `convex/users.ts`:

```ts
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const profile = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    return { user, bootstrapped: !!profile };
  },
});

export const bootstrap = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (existing) {
      const s = await ctx.db.query("surfaces").withIndex("by_user", (q) => q.eq("userId", userId)).first();
      return s!._id;
    }
    const now = Date.now();
    await ctx.db.insert("profiles", { userId, bootstrappedAt: now });
    await ctx.db.insert("pillars", { userId, name: "Lifestyle", weight: 1, source: "default", createdAt: now });
    await ctx.db.insert("mirror", { userId, summary: "", structured: { values: [], themes: [] }, version: 1, takenAt: now });
    return await ctx.db.insert("surfaces", { userId, type: "whiteboard", title: "My Board", createdAt: now });
  },
});
```

- [ ] **Step 5: Push + verify bootstrap from dashboard**

```bash
npx convex dev --once
```
In the running app, after signing in we will call `bootstrap` (wired in Task 3). For now verify it compiles. Run `npx convex run users:current` → expect `null` (no auth in CLI context) without error.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(plan1-t1): full v1 schema, pillars presets, user bootstrap (seed Lifestyle + surface + mirror)"
```

---

## Task 2: Geometry helpers (pure, tested)

**Files:** Create `lib/geometry.ts`, `tests/geometry.test.ts`, `vitest.config.ts`.

- [ ] **Step 1: Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Write failing tests**

Create `tests/geometry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { screenToCanvas, rectsOverlap, spiralOffsets } from "../lib/geometry";

describe("screenToCanvas", () => {
  it("inverts viewport translate + scale", () => {
    const p = screenToCanvas({ x: 200, y: 100 }, { x: 50, y: 20, scale: 2 });
    expect(p).toEqual({ x: 75, y: 40 });
  });
});

describe("rectsOverlap", () => {
  it("true when overlapping", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 50, y: 50, w: 100, h: 100 })).toBe(true);
  });
  it("false when apart", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 100, y: 100, w: 10, h: 10 })).toBe(false);
  });
});

describe("spiralOffsets", () => {
  it("starts at origin and grows", () => {
    const offs = spiralOffsets();
    expect(offs[0]).toEqual({ x: 0, y: 0 });
    expect(offs.length).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 3: Run, expect fail**

Run: `npm test`
Expected: FAIL — cannot find module `../lib/geometry`.

- [ ] **Step 4: Implement**

Create `lib/geometry.ts`:

```ts
export type Point = { x: number; y: number };
export type Viewport = { x: number; y: number; scale: number };
export type Rect = { x: number; y: number; w: number; h: number };

export function screenToCanvas(p: Point, vp: Viewport): Point {
  return { x: (p.x - vp.x) / vp.scale, y: (p.y - vp.y) / vp.scale };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

export function spiralOffsets(): Point[] {
  const out: Point[] = [{ x: 0, y: 0 }];
  for (let r = 1; r < 24; r++) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      out.push({ x: Math.cos(a) * r * 240, y: Math.sin(a) * r * 190 });
    }
  }
  return out;
}
```

- [ ] **Step 5: Run, expect pass**

Run: `npm test`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(plan1-t2): geometry helpers (screenToCanvas, rectsOverlap, spiralOffsets) + tests"
```

---

## Task 3: Node CRUD + surface bootstrap wiring

**Files:** Create `convex/surfaces.ts`, `convex/nodes.ts`, `hooks/useNodes.ts`; Modify `app/page.tsx`.

- [ ] **Step 1: Surfaces query**

Create `convex/surfaces.ts`:

```ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: { surfaceId: v.id("surfaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const s = await ctx.db.get(args.surfaceId);
    return s && s.userId === userId ? s : null;
  },
});
```

- [ ] **Step 2: Node CRUD**

Create `convex/nodes.ts`:

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const NODE_TYPE = v.union(v.literal("text"), v.literal("quote"), v.literal("image"), v.literal("link"), v.literal("generated_image"));

export const list = query({
  args: { surfaceId: v.id("surfaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("nodes")
      .withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId).eq("isActive", true))
      .collect();
  },
});

export const create = mutation({
  args: {
    surfaceId: v.id("surfaces"),
    type: NODE_TYPE,
    text: v.optional(v.string()),
    title: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    attribution: v.optional(v.string()),
    position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
    dimensions: v.object({ width: v.number(), height: v.number() }),
    pillars: v.optional(v.array(v.string())),
    captureId: v.optional(v.id("captures")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("nodes", {
      userId, surfaceId: args.surfaceId, captureId: args.captureId,
      type: args.type, title: args.title, text: args.text, imageUrl: args.imageUrl,
      fileId: args.fileId, attribution: args.attribution,
      position: args.position, dimensions: args.dimensions,
      pillars: args.pillars ?? [], isActive: true, createdAt: now, updatedAt: now,
    });
  },
});

export const move = mutation({
  args: { nodeId: v.id("nodes"), position: v.object({ x: v.number(), y: v.number(), z: v.number() }) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const n = await ctx.db.get(args.nodeId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.nodeId, { position: args.position, updatedAt: Date.now() });
  },
});

export const setText = mutation({
  args: { nodeId: v.id("nodes"), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const n = await ctx.db.get(args.nodeId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.nodeId, { text: args.text, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const n = await ctx.db.get(args.nodeId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.nodeId, { isActive: false, updatedAt: Date.now() });
  },
});
```

- [ ] **Step 3: useNodes hook**

Create `hooks/useNodes.ts`:

```ts
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useNodes(surfaceId: Id<"surfaces"> | null) {
  const nodes = useQuery(api.nodes.list, surfaceId ? { surfaceId } : "skip");
  return {
    nodes: nodes ?? [],
    create: useMutation(api.nodes.create),
    move: useMutation(api.nodes.move),
    setText: useMutation(api.nodes.setText),
    remove: useMutation(api.nodes.remove),
  };
}
```

- [ ] **Step 4: Wire bootstrap into page**

Replace the `Authenticated` block in `app/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { StartButton } from "@/components/auth/StartButton";

function Board() {
  const me = useQuery(api.users.current);
  const bootstrap = useMutation(api.users.bootstrap);
  const [surfaceId, setSurfaceId] = useState<Id<"surfaces"> | null>(null);

  useEffect(() => {
    if (me && !me.bootstrapped) bootstrap().then(setSurfaceId);
  }, [me, bootstrap]);
  // If already bootstrapped, fetch the surface id once.
  const first = useQuery(api.surfaces.firstForUser, me?.bootstrapped ? {} : "skip");
  useEffect(() => { if (first) setSurfaceId(first); }, [first]);

  if (!surfaceId) return <div className="h-screen flex items-center justify-center text-neutral-500">Preparing your space…</div>;
  return <div className="h-screen flex items-center justify-center text-neutral-600">Surface ready: {surfaceId}. Canvas next.</div>;
}

export default function Home() {
  return (
    <>
      <Unauthenticated><StartButton /></Unauthenticated>
      <Authenticated><Board /></Authenticated>
    </>
  );
}
```

- [ ] **Step 5: Add `firstForUser` query**

Append to `convex/surfaces.ts`:

```ts
export const firstForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const s = await ctx.db.query("surfaces").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    return s?._id ?? null;
  },
});
```

- [ ] **Step 6: Push + verify**

```bash
npx convex dev --once
```
Reload the app (signed in). Expected: "Surface ready: <id>. Canvas next." Check Convex dashboard: `profiles`, `pillars` (Lifestyle), `mirror`, `surfaces` each have one row for your user.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(plan1-t3): surfaces + node CRUD + bootstrap wiring (auto-seed on first sign-in)"
```

---

## Task 4: Whiteboard canvas (pan/zoom/drag, render text/quote nodes)

**Files:** Create `hooks/useViewport.ts`, `lib/types.ts`, `components/whiteboard/Whiteboard.tsx`, `components/whiteboard/NodeCard.tsx`, `components/whiteboard/Toolbar.tsx`; Modify `app/page.tsx`, `app/globals.css`.

- [ ] **Step 1: Shared FE types**

Create `lib/types.ts`:

```ts
import { Doc, Id } from "@/convex/_generated/dataModel";
export type NodeDoc = Doc<"nodes">;
export type EdgeDoc = Doc<"edges">;
export type CaptureDoc = Doc<"captures">;
export type Viewport = { x: number; y: number; scale: number };
export type SurfaceId = Id<"surfaces">;
```

- [ ] **Step 2: Viewport hook**

Create `hooks/useViewport.ts`:

```ts
import { useState, useCallback } from "react";
import { Viewport } from "@/lib/types";

export function useViewport() {
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const pan = useCallback((dx: number, dy: number) => setVp((v) => ({ ...v, x: v.x + dx, y: v.y + dy })), []);
  const zoomAt = useCallback((factor: number, cx: number, cy: number) => setVp((v) => {
    const scale = Math.max(0.25, Math.min(2.5, v.scale * factor));
    const k = scale / v.scale;
    return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
  }), []);
  return { vp, pan, zoomAt };
}
```

- [ ] **Step 3: NodeCard**

Create `components/whiteboard/NodeCard.tsx`:

```tsx
"use client";
import { useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NodeDoc } from "@/lib/types";

type Props = {
  node: NodeDoc; scale: number;
  onMove: (x: number, y: number) => void;
  onText: (t: string) => void;
  onDelete: () => void;
};

export function NodeCard({ node, scale, onMove, onText, onDelete }: Props) {
  const drag = useRef<{ mx: number; my: number; ix: number; iy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileUrl = useQuery(api.files.getUrl, node.fileId && !node.imageUrl ? { fileId: node.fileId } : "skip");
  const img = node.imageUrl ?? fileUrl ?? undefined;

  const down = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    setDragging(true);
    drag.current = { mx: e.clientX, my: e.clientY, ix: node.position.x, iy: node.position.y };
    e.stopPropagation();
  };
  const move = (e: React.MouseEvent) => {
    if (!dragging || !drag.current) return;
    onMove(drag.current.ix + (e.clientX - drag.current.mx) / scale, drag.current.iy + (e.clientY - drag.current.my) / scale);
  };
  const up = () => { setDragging(false); drag.current = null; };

  return (
    <div
      className="absolute group rounded-lg border border-neutral-200 bg-white shadow-sm"
      style={{ left: node.position.x, top: node.position.y, width: node.dimensions.width, height: node.dimensions.height, cursor: dragging ? "grabbing" : "grab" }}
      onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
    >
      <button onClick={onDelete} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-neutral-800 text-white text-xs opacity-0 group-hover:opacity-100">×</button>
      {node.type === "image" && img && <img src={img} alt="" className="w-full h-full object-cover rounded-lg" draggable={false} />}
      {(node.type === "text" || node.type === "quote") && (
        <textarea defaultValue={node.text ?? ""} onBlur={(e) => e.target.value !== node.text && onText(e.target.value)}
          placeholder={node.type === "quote" ? "Quote…" : "Idea…"}
          className="w-full h-full p-3 bg-transparent resize-none outline-none text-sm" />
      )}
      {(node.type === "link" || node.type === "generated_image") && <div className="p-3 text-sm">{node.text ?? node.title}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Toolbar (text/quote for now)**

Create `components/whiteboard/Toolbar.tsx`:

```tsx
"use client";
import { Type, Quote } from "lucide-react";

export function Toolbar({ onAdd }: { onAdd: (t: "text" | "quote") => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-neutral-200 rounded-full px-2 py-2 flex gap-1 shadow-md z-10">
      <button onClick={() => onAdd("text")} className="px-3 py-1.5 rounded-full hover:bg-neutral-100 text-sm flex items-center gap-1.5"><Type className="w-4 h-4" /> Text</button>
      <button onClick={() => onAdd("quote")} className="px-3 py-1.5 rounded-full hover:bg-neutral-100 text-sm flex items-center gap-1.5"><Quote className="w-4 h-4" /> Quote</button>
    </div>
  );
}
```

- [ ] **Step 5: Whiteboard shell**

Create `components/whiteboard/Whiteboard.tsx`:

```tsx
"use client";
import { useRef, useState } from "react";
import { SurfaceId } from "@/lib/types";
import { useViewport } from "@/hooks/useViewport";
import { useNodes } from "@/hooks/useNodes";
import { NodeCard } from "./NodeCard";
import { Toolbar } from "./Toolbar";

export function Whiteboard({ surfaceId }: { surfaceId: SurfaceId }) {
  const { vp, pan, zoomAt } = useViewport();
  const { nodes, create, move, setText, remove } = useNodes(surfaceId);
  const panning = useRef<{ mx: number; my: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const onDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    setIsPanning(true); panning.current = { mx: e.clientX, my: e.clientY };
  };
  const onMove = (e: React.MouseEvent) => {
    if (!panning.current) return;
    pan(e.clientX - panning.current.mx, e.clientY - panning.current.my);
    panning.current = { mx: e.clientX, my: e.clientY };
  };
  const onUp = () => { setIsPanning(false); panning.current = null; };
  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.05 : 0.95, e.clientX, e.clientY); };

  const add = (type: "text" | "quote") => {
    const cx = (window.innerWidth / 2 - vp.x) / vp.scale - 110;
    const cy = (window.innerHeight / 2 - vp.y) / vp.scale - 60;
    create({ surfaceId, type, text: "", position: { x: cx, y: cy, z: 0 }, dimensions: { width: 220, height: 130 } });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#FAF8F2]"
      style={{ cursor: isPanning ? "grabbing" : "grab" }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onWheel={onWheel}>
      <div className="absolute" style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.scale})`, transformOrigin: "0 0" }}>
        {nodes.map((n) => (
          <NodeCard key={n._id} node={n} scale={vp.scale}
            onMove={(x, y) => move({ nodeId: n._id, position: { x, y, z: n.position.z } })}
            onText={(t) => setText({ nodeId: n._id, text: t })}
            onDelete={() => remove({ nodeId: n._id })} />
        ))}
      </div>
      <Toolbar onAdd={add} />
    </div>
  );
}
```

- [ ] **Step 6: Render the Whiteboard from the page**

In `app/page.tsx`, replace the `Board` return-when-ready line:

```tsx
  if (!surfaceId) return <div className="h-screen flex items-center justify-center text-neutral-500">Preparing your space…</div>;
  return <Whiteboard surfaceId={surfaceId} />;
```
Add the import at top: `import { Whiteboard } from "@/components/whiteboard/Whiteboard";`

- [ ] **Step 7: Verify**

With both servers running, reload. Expected: a calm canvas. Click Text → a card appears center; type, click away → persists. Drag it → moves and persists on refresh. Scroll → zooms toward cursor. Drag empty space → pans. Hover a card → × deletes it.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(plan1-t4): whiteboard canvas (pan/zoom-to-cursor, drag, text/quote nodes, delete)"
```

---

## Task 5: Edges — labeled, multi-target, cycle-checked

**Files:** Create `convex/edges.ts`, `hooks/useEdges.ts`, `components/whiteboard/EdgeLayer.tsx`, `tests/convex/edges.test.ts`; Modify `Whiteboard.tsx`, `NodeCard.tsx`.

- [ ] **Step 1: Cycle-check failing test**

Create `tests/convex/edges.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { wouldCreateCycle } from "../../convex/edges";

describe("wouldCreateCycle", () => {
  const edges = [{ fromNode: "a", toNode: "b" }, { fromNode: "b", toNode: "c" }];
  it("detects a→...→a", () => {
    expect(wouldCreateCycle(edges as any, "c", "a")).toBe(true); // c→a closes a→b→c→a
  });
  it("allows a safe edge", () => {
    expect(wouldCreateCycle(edges as any, "a", "c")).toBe(false);
  });
  it("blocks self-edge", () => {
    expect(wouldCreateCycle(edges as any, "a", "a")).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test`
Expected: FAIL — `wouldCreateCycle` not exported.

- [ ] **Step 3: Implement edges module with exported pure helper**

Create `convex/edges.ts`:

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

type EdgeLike = { fromNode: string; toNode: string };

export function wouldCreateCycle(edges: EdgeLike[], from: string, to: string): boolean {
  if (from === to) return true;
  // Does a path already exist from `to` back to `from`? If so, from→to closes a cycle.
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.fromNode)) adj.set(e.fromNode, []);
    adj.get(e.fromNode)!.push(e.toNode);
  }
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === from) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const nxt of adj.get(cur) ?? []) stack.push(nxt);
  }
  return false;
}

export const list = query({
  args: { surfaceId: v.id("surfaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("edges").withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId)).collect();
  },
});

export const connect = mutation({
  args: { surfaceId: v.id("surfaces"), fromNode: v.id("nodes"), toNode: v.id("nodes"), label: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.query("edges").withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId)).collect();
    if (wouldCreateCycle(existing.map((e) => ({ fromNode: e.fromNode, toNode: e.toNode })), args.fromNode, args.toNode)) {
      throw new Error("That connection would create a cycle.");
    }
    const dup = existing.find((e) => e.fromNode === args.fromNode && e.toNode === args.toNode);
    if (dup) return dup._id;
    return await ctx.db.insert("edges", {
      userId, surfaceId: args.surfaceId, fromNode: args.fromNode, toNode: args.toNode,
      label: args.label, createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { edgeId: v.id("edges") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const e = await ctx.db.get(args.edgeId);
    if (!e || e.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.edgeId);
  },
});
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test`
Expected: PASS (geometry + edges).

- [ ] **Step 5: useEdges hook**

Create `hooks/useEdges.ts`:

```ts
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useEdges(surfaceId: Id<"surfaces"> | null) {
  const edges = useQuery(api.edges.list, surfaceId ? { surfaceId } : "skip");
  return { edges: edges ?? [], connect: useMutation(api.edges.connect), remove: useMutation(api.edges.remove) };
}
```

- [ ] **Step 6: EdgeLayer (SVG)**

Create `components/whiteboard/EdgeLayer.tsx`:

```tsx
"use client";
import { EdgeDoc, NodeDoc } from "@/lib/types";

export function EdgeLayer({ edges, nodes }: { edges: EdgeDoc[]; nodes: NodeDoc[] }) {
  const byId = new Map(nodes.map((n) => [n._id, n]));
  const center = (n: NodeDoc) => ({ x: n.position.x + n.dimensions.width / 2, y: n.position.y + n.dimensions.height / 2 });
  return (
    <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
      {edges.map((e) => {
        const a = byId.get(e.fromNode), b = byId.get(e.toNode);
        if (!a || !b) return null;
        const p = center(a), q = center(b);
        return <line key={e._id} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#9C958650" strokeWidth={1.5} />;
      })}
    </svg>
  );
}
```

- [ ] **Step 7: Connect-mode in NodeCard + Whiteboard**

In `Whiteboard.tsx`, add connect state and render edges. Add near the top of the component body:

```tsx
  const { edges, connect } = useEdges(surfaceId);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
```
(import `useEdges` and `EdgeLayer`.) Inside the transformed `<div>`, render edges BEFORE nodes:

```tsx
        <EdgeLayer edges={edges} nodes={nodes} />
```
Pass two handlers to each `NodeCard`:

```tsx
            onStartLink={() => setLinkFrom(n._id)}
            onCompleteLink={() => {
              if (linkFrom && linkFrom !== n._id) connect({ surfaceId, fromNode: linkFrom as any, toNode: n._id }).catch((err) => alert(err.message));
              setLinkFrom(null);
            }}
            linking={linkFrom !== null}
```

In `NodeCard.tsx`, extend `Props` with `onStartLink: () => void; onCompleteLink: () => void; linking: boolean;` and add a small link handle + drop target:

```tsx
      {/* link handle */}
      <button onMouseDown={(e) => { e.stopPropagation(); onStartLink(); }}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100" title="Drag to connect" />
      {/* drop target when linking */}
      {linking && <div onMouseUp={onCompleteLink} className="absolute inset-0 rounded-lg ring-2 ring-blue-400/60" />}
```

- [ ] **Step 8: Verify**

Reload. Create two text nodes. Hover the first → a blue handle appears at the bottom; click it, then click the second node (now ringed) → a line connects them. Refresh → edge persists. Try connecting in a way that loops back → alert "would create a cycle."

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(plan1-t5): labeled multi-target edges with cycle detection + SVG edge layer"
```

---

## Task 6: Capture intake (paste/upload/URL) + files

**Files:** Create `convex/files.ts`, `convex/captures.ts`, `hooks/useCaptures.ts`, `components/whiteboard/QuickInput.tsx`; Modify `Toolbar.tsx`, `Whiteboard.tsx`.

- [ ] **Step 1: Files helpers**

Create `convex/files.ts`:

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const getUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => await ctx.storage.getUrl(args.fileId),
});
```

- [ ] **Step 2: Captures module (create + inbox + getById + markPlaced)**

Create `convex/captures.ts`:

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

const SOURCE = v.union(v.literal("paste"), v.literal("upload"), v.literal("url"), v.literal("audio"), v.literal("agent"));
const RAWTYPE = v.union(v.literal("text"), v.literal("image"), v.literal("link"), v.literal("video_link"), v.literal("quote"));

export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("captures")
      .withIndex("by_user_unplaced", (q) => q.eq("userId", userId).eq("placedAt", undefined))
      .filter((q) => q.eq(q.field("isActive"), true)).order("desc").collect();
  },
});

export const getById = query({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args) => await ctx.db.get(args.captureId),
});

export const create = mutation({
  args: { source: SOURCE, rawType: RAWTYPE, rawText: v.optional(v.string()), rawUrl: v.optional(v.string()), rawFileId: v.optional(v.id("_storage")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const id = await ctx.db.insert("captures", { userId, ...args, isActive: true, createdAt: Date.now() });
    await ctx.scheduler.runAfter(0, api.ai.distill.distillCapture, { captureId: id });
    return id;
  },
});

export const updateDistilled = mutation({
  args: {
    captureId: v.id("captures"),
    distilled: v.object({ title: v.string(), essence: v.string(), pillars: v.array(v.string()) }),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.captureId, { distilled: args.distilled, embedding: args.embedding });
  },
});

export const softDelete = mutation({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const c = await ctx.db.get(args.captureId);
    if (!c || c.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.captureId, { isActive: false });
  },
});
```

> Note: `create` schedules `ai.distill.distillCapture`, built in Task 7. Until then it will error on the scheduled run only (the capture still inserts). Task 7 completes the loop.

- [ ] **Step 3: useCaptures hook**

Create `hooks/useCaptures.ts`:

```ts
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useCaptures() {
  const inbox = useQuery(api.captures.inbox, {});
  return {
    inbox: inbox ?? [],
    create: useMutation(api.captures.create),
    softDelete: useMutation(api.captures.softDelete),
    generateUploadUrl: useMutation(api.files.generateUploadUrl),
  };
}
```

- [ ] **Step 4: Paste handler + upload + URL on the board**

Add to `Whiteboard.tsx` a global paste listener and pass upload/url to the toolbar. Inside the component:

```tsx
  const { create: createCapture, generateUploadUrl } = useCaptures();

  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      if (!e.clipboardData) return;
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile(); if (!file) continue;
          const url = await generateUploadUrl();
          const r = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
          const { storageId } = await r.json();
          await createCapture({ source: "paste", rawType: "image", rawFileId: storageId });
          return;
        }
      }
      const text = e.clipboardData.getData("text").trim();
      if (!text) return;
      const isUrl = /^https?:\/\//.test(text);
      await createCapture({ source: isUrl ? "url" : "paste", rawType: isUrl ? "link" : "text", rawText: isUrl ? undefined : text, rawUrl: isUrl ? text : undefined });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [createCapture, generateUploadUrl]);
```
(import `useEffect` and `useCaptures`.)

- [ ] **Step 5: Verify capture insert**

Reload. Copy an image, paste on the board (not in a textarea). In the Convex dashboard, `captures` gets a row with `rawFileId`. Paste a URL → row with `rawUrl`. Paste plain text → row with `rawText`. (Distillation is wired in Task 7; rows may have no `distilled` yet, and the scheduled distill call will error until Task 7 — that's expected.)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(plan1-t6): capture intake (paste image/text/url + upload) + files + inbox query"
```

---

## Task 7: Distillation pipeline (OpenAI) + inbox + placement

**Files:** Create `convex/ai/config.ts`, `convex/ai/openai.ts`, `convex/ai/embed.ts`, `convex/ai/distill.ts`, `convex/placement.ts`, `components/whiteboard/Inbox.tsx`, `tests/distill-parse.test.ts`; Modify `Whiteboard.tsx`.

- [ ] **Step 1: Set OpenAI key**

```bash
npx convex env set OPENAI_API_KEY sk-...your-key...
```

- [ ] **Step 2: AI config hub**

Create `convex/ai/config.ts`:

```ts
export const AI = {
  distill: {
    model: "gpt-4o-mini",
    temperature: 0.4,
    system: `You distill a captured artifact for a personal life-mapping app.
Return ONLY JSON: {"title":"3-6 word noun phrase","essence":"1-2 plain sentences on what the person likely found meaningful","pillars":["0-3 lowercase tags from: lifestyle, health, relationships, financial, growth, money, spirit"]}
Avoid generic words like "inspiration" or "motivation". Be specific.`,
  },
  embed: { model: "text-embedding-3-small", dimensions: 1536 },
} as const;
```

- [ ] **Step 3: OpenAI client**

Create `convex/ai/openai.ts`:

```ts
import OpenAI from "openai";
let client: OpenAI | null = null;
export function openai(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  client = new OpenAI({ apiKey });
  return client;
}
```

- [ ] **Step 4: Distill parse — failing test**

Create `tests/distill-parse.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseDistill } from "../convex/ai/distill";

describe("parseDistill", () => {
  it("parses valid JSON", () => {
    const out = parseDistill(JSON.stringify({ title: "Quiet Mornings", essence: "Wants slower starts.", pillars: ["lifestyle"] }));
    expect(out).toEqual({ title: "Quiet Mornings", essence: "Wants slower starts.", pillars: ["lifestyle"] });
  });
  it("caps lengths and pillar count", () => {
    const out = parseDistill(JSON.stringify({ title: "x".repeat(200), essence: "y".repeat(800), pillars: ["a","b","c","d","e"] }))!;
    expect(out.title.length).toBe(100);
    expect(out.essence.length).toBe(400);
    expect(out.pillars.length).toBe(3);
  });
  it("returns null on bad json", () => { expect(parseDistill("nope")).toBeNull(); });
});
```

- [ ] **Step 5: Run, expect fail**

Run: `npm test`
Expected: FAIL — `parseDistill` not found.

- [ ] **Step 6: Embed action**

Create `convex/ai/embed.ts`:

```ts
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { openai } from "./openai";
import { AI } from "./config";

export const embed = action({
  args: { text: v.string() },
  handler: async (_ctx, args): Promise<number[]> => {
    const res = await openai().embeddings.create({ model: AI.embed.model, input: args.text.slice(0, 8000) });
    return res.data[0]?.embedding ?? [];
  },
});
```

- [ ] **Step 7: Distill action + exported parser**

Create `convex/ai/distill.ts`:

```ts
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { openai } from "./openai";
import { AI } from "./config";

export type Distilled = { title: string; essence: string; pillars: string[] };

export function parseDistill(text: string): Distilled | null {
  try {
    const j = JSON.parse(text);
    return {
      title: String(j.title ?? "Untitled").slice(0, 100),
      essence: String(j.essence ?? "").slice(0, 400),
      pillars: Array.isArray(j.pillars) ? j.pillars.map((p: any) => String(p).toLowerCase()).slice(0, 3) : [],
    };
  } catch { return null; }
}

export const distillCapture = action({
  args: { captureId: v.id("captures") },
  handler: async (ctx, args): Promise<void> => {
    const cap = await ctx.runQuery(api.captures.getById, { captureId: args.captureId });
    if (!cap) return;
    let content = cap.rawText ?? cap.rawUrl ?? "";
    if (!content && cap.rawFileId) {
      const url = await ctx.runQuery(api.files.getUrl, { fileId: cap.rawFileId });
      content = `[Image: ${url}]`;
    }
    if (!content) return;

    const res = await openai().chat.completions.create({
      model: AI.distill.model, temperature: AI.distill.temperature,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: AI.distill.system }, { role: "user", content }],
    });
    const parsed = parseDistill(res.choices[0]?.message?.content ?? "");
    if (!parsed) return;

    const embedding: number[] = await ctx.runAction(api.ai.embed.embed, { text: `${parsed.title}. ${parsed.essence}` });
    await ctx.runMutation(api.captures.updateDistilled, { captureId: args.captureId, distilled: parsed, embedding: embedding.length ? embedding : undefined });
  },
});
```

- [ ] **Step 8: Run, expect pass**

Run: `npm test`
Expected: PASS (geometry + edges + distill-parse).

- [ ] **Step 9: Placement (capture → node, spiral)**

Create `convex/placement.ts`:

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { spiralOffsets, rectsOverlap } from "../lib/geometry";

export const place = mutation({
  args: { captureId: v.id("captures"), surfaceId: v.id("surfaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const cap = await ctx.db.get(args.captureId);
    if (!cap || cap.userId !== userId) throw new Error("Not found");

    let type: "text" | "quote" | "image" | "link" = "text";
    let text: string | undefined; let imageUrl: string | undefined; let fileId = cap.rawFileId;
    if (cap.rawType === "image") { type = "image"; if (cap.rawFileId) imageUrl = (await ctx.storage.getUrl(cap.rawFileId)) ?? undefined; }
    else if (cap.rawType === "quote") { type = "quote"; text = cap.rawText ?? cap.distilled?.essence; }
    else if (cap.rawType === "link" || cap.rawType === "video_link") { type = "link"; text = cap.distilled?.essence ?? cap.rawUrl; }
    else { type = "text"; text = cap.rawText ?? cap.distilled?.essence; }

    const dims = type === "image" ? { width: 280, height: 200 } : { width: 240, height: 140 };
    const nodes = await ctx.db.query("nodes").withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId).eq("isActive", true)).collect();
    let pos = { x: 0, y: 0 };
    for (const o of spiralOffsets()) {
      const r = { x: o.x, y: o.y, w: dims.width, h: dims.height };
      if (!nodes.some((n) => rectsOverlap(r, { x: n.position.x, y: n.position.y, w: n.dimensions.width, h: n.dimensions.height }))) { pos = { x: o.x, y: o.y }; break; }
    }

    const nodeId = await ctx.db.insert("nodes", {
      userId, surfaceId: args.surfaceId, captureId: args.captureId, type,
      title: cap.distilled?.title, text, imageUrl, fileId,
      position: { x: pos.x, y: pos.y, z: 0 }, dimensions: dims,
      pillars: cap.distilled?.pillars ?? [], isActive: true, createdAt: Date.now(), updatedAt: Date.now(),
    });
    await ctx.db.patch(args.captureId, { placedAt: Date.now(), nodeId });
    return nodeId;
  },
});
```

- [ ] **Step 10: Inbox UI**

Create `components/whiteboard/Inbox.tsx`:

```tsx
"use client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCaptures } from "@/hooks/useCaptures";
import { SurfaceId } from "@/lib/types";

export function Inbox({ surfaceId }: { surfaceId: SurfaceId }) {
  const { inbox, softDelete } = useCaptures();
  const place = useMutation(api.placement.place);
  if (inbox.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-10 w-80 bg-white border border-neutral-200 rounded-lg shadow-sm">
      <div className="p-3 border-b border-neutral-100 text-sm font-medium">{inbox.length} to place</div>
      <div className="p-3 max-h-[60vh] overflow-y-auto space-y-2">
        {inbox.map((c) => (
          <div key={c._id} className="border border-neutral-200 rounded p-2 text-sm">
            <div className="text-xs text-neutral-400 mb-1">{c.rawType}</div>
            {c.distilled ? (
              <>
                <div className="font-medium">{c.distilled.title}</div>
                <div className="text-xs text-neutral-500 mt-1">{c.distilled.essence}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => place({ captureId: c._id, surfaceId })} className="text-xs underline">Place</button>
                  <button onClick={() => softDelete({ captureId: c._id })} className="text-xs text-neutral-400">Dismiss</button>
                </div>
              </>
            ) : <div className="italic text-neutral-400">distilling…</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Render Inbox**

In `Whiteboard.tsx`, add `<Inbox surfaceId={surfaceId} />` just before `<Toolbar ... />`. Import it.

- [ ] **Step 12: Verify the full intake loop**

Reload. Paste a quote of text → within a couple seconds the Inbox card flips from "distilling…" to a title + essence. Click Place → it appears on the board, spiral-positioned. Paste an image → Place → image node. Refresh → placed nodes persist; inbox empties.

- [ ] **Step 13: Commit**

```bash
git add -A && git commit -m "feat(plan1-t7): OpenAI distillation + embeddings + inbox + spiral placement (capture→node)"
```

---

## Task 8: Context scaffolding (provider interface + assembler + Mirror skeleton)

**Files:** Create `convex/context/types.ts`, `convex/context/assemble.ts`, `convex/mirror.ts`, `convex/interactions.ts`, `tests/assemble.test.ts`; this readies Plan 2's Coach.

- [ ] **Step 1: Context types**

Create `convex/context/types.ts`:

```ts
export type ContextScope = "selection" | "viewport" | "surface";

export type ContextFragment = {
  surfaceId: string;
  scope: ContextScope | "summary" | "mirror";
  label: string;
  text: string;        // serialized, model-ready
  priority: number;    // higher = keep first under budget
};
```

- [ ] **Step 2: Assembler — failing test**

Create `tests/assemble.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { assembleContext } from "../convex/context/assemble";

const frag = (label: string, priority: number, text: string) => ({ surfaceId: "s", scope: "surface" as const, label, text, priority });

describe("assembleContext", () => {
  it("orders by priority and concatenates", () => {
    const out = assembleContext([frag("low", 1, "B"), frag("high", 10, "A")], 1000);
    expect(out.indexOf("A")).toBeLessThan(out.indexOf("B"));
  });
  it("drops lowest-priority fragments past the char budget", () => {
    const out = assembleContext([frag("keep", 10, "X".repeat(50)), frag("drop", 1, "Y".repeat(50))], 60);
    expect(out).toContain("X");
    expect(out).not.toContain("Y");
  });
});
```

- [ ] **Step 3: Run, expect fail**

Run: `npm test`
Expected: FAIL — `assembleContext` not found.

- [ ] **Step 4: Implement assembler (pure)**

Create `convex/context/assemble.ts`:

```ts
import { ContextFragment } from "./types";

// Char budget as a cheap proxy for tokens (~4 chars/token). Keeps highest-priority fragments whole.
export function assembleContext(fragments: ContextFragment[], charBudget: number): string {
  const sorted = [...fragments].sort((a, b) => b.priority - a.priority);
  const kept: string[] = [];
  let used = 0;
  for (const f of sorted) {
    const block = `## ${f.label}\n${f.text}`;
    if (used + block.length > charBudget) continue;
    kept.push(block);
    used += block.length;
  }
  return kept.join("\n\n");
}
```

- [ ] **Step 5: Run, expect pass**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 6: Whiteboard context provider query**

Append to `convex/nodes.ts`:

```ts
// Surface context for the assembler (consumed by the Coach in Plan 2).
export const surfaceContext = query({
  args: { surfaceId: v.id("surfaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const nodes = await ctx.db.query("nodes").withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId).eq("isActive", true)).collect();
    const edges = await ctx.db.query("edges").withIndex("by_surface", (q) => q.eq("surfaceId", args.surfaceId)).collect();
    const nodeLines = nodes.map((n) => `- (${n._id}) [${n.type}] ${n.title ?? ""} ${n.text ?? ""}`.trim()).join("\n");
    const edgeLines = edges.map((e) => `- ${e.fromNode} -> ${e.toNode}${e.label ? ` (${e.label})` : ""}`).join("\n");
    return {
      surfaceId: args.surfaceId,
      scope: "surface" as const,
      label: "Whiteboard",
      text: `Nodes:\n${nodeLines || "(empty)"}\n\nConnections:\n${edgeLines || "(none)"}`,
      priority: 8,
    };
  },
});
```

- [ ] **Step 7: Mirror skeleton + interactions**

Create `convex/mirror.ts`:

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const assemble = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const m = await ctx.db.query("mirror").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").first();
    const themeText = m?.structured.themes.join(", ") || "(none yet)";
    return {
      surfaceId: "mirror", scope: "mirror" as const, label: "About this person (Mirror)",
      text: `Summary: ${m?.summary || "(still learning)"}\nThemes: ${themeText}`, priority: 6,
    };
  },
});

export const recordDelta = mutation({
  args: { theme: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const m = await ctx.db.query("mirror").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").first();
    if (!m) return;
    if (!m.structured.themes.includes(args.theme)) {
      await ctx.db.patch(m._id, { structured: { ...m.structured, themes: [...m.structured.themes, args.theme] }, takenAt: Date.now() });
    }
  },
});
```

Create `convex/interactions.ts`:

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const log = mutation({
  args: { type: v.string(), payload: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.insert("interactions", { userId, type: args.type, payload: args.payload, at: Date.now() });
  },
});
```

- [ ] **Step 8: Push + verify queries compile**

```bash
npx convex dev --once
```
Expected: deploys. In the app, nothing visibly changes (these power Plan 2). Confirm no console/runtime errors.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(plan1-t8): context scaffolding (provider query, pure assembler, Mirror skeleton, interactions)"
```

- [ ] **Step 10: Changelog**

Create `CHANGELOG.md`:

```markdown
# Changelog

## 2026-05-20 · Plan 1 — Foundation + Whiteboard
- Next.js + Convex + anonymous auth, multi-tenant from day one.
- Full v1 schema; user bootstrap seeds a default "Lifestyle" pillar, a whiteboard surface, and a Mirror.
- Whiteboard: pan/zoom-to-cursor, drag, text/quote nodes, delete.
- Labeled multi-target edges with cycle detection + SVG edge layer.
- Capture intake (paste image/text/url, upload) → OpenAI distillation + embeddings → inbox → spiral placement.
- Context scaffolding: SurfaceContextProvider query, pure assembleContext(), Mirror skeleton, interactions log — ready for the Coach (Plan 2).
```

```bash
git add -A && git commit -m "docs(plan1): changelog"
```

---

## Self-Review

**Spec coverage (PRD §5 features vs this plan):**
- F1 Whiteboard — Tasks 4 (canvas + text/quote), 5 (edges), 6 (capture), 7 (placement). Manual manipulation ✓. AI manipulation → Plan 2 (Coach). Audio → Plan 3. ✓ for Plan 1 scope.
- F3 Mirror — skeleton in Task 8 (structured + summary + delta). Full compaction → later. ✓ scaffolded.
- F4 Intake & Distillation — Tasks 6–7 (paste/upload/url → distill → embed → place). ✓.
- F5b Pillars — default "Lifestyle" seeded (Task 1), presets module present. Full UI → Plan 4. ✓ for foundation.
- Context system (PRD §4) — provider query + pure assembler + Mirror assemble (Task 8). The four scopes: `surface` + `mirror` implemented; `selection`/`viewport` fragments are added in Plan 2 when the Coach needs them (the assembler already accepts them). ✓ foundation.
- Reuse map — geometry/spiral/capture/edges from BrainDump patterns; AI config hub + context-provider pattern from PillarOS. ✓.
- Multi-tenant auth — `getAuthUserId` gate on every function; userId on every row. Fixes BrainDump's flaw. ✓.

**Deferred (correctly, to later plans):** Coach agent loop + tool registry + AI board manipulation (Plan 2); audio (Plan 3); Guide surface + Settings + daily ritual + pillar-picker UI (Plan 4); calendar/todo (post-v1).

**Placeholder scan:** No TBD/TODO. Every code step has complete code. The one forward-reference (captures.create schedules ai.distill in Task 6, built in Task 7) is called out explicitly with the consequence.

**Type consistency:** `surfaceId: Id<"surfaces">`, `position {x,y,z}`, `dimensions {width,height}`, node `type` union, `distilled {title,essence,pillars}`, and `ContextFragment {surfaceId,scope,label,text,priority}` are used identically across tasks. `assembleContext(fragments, charBudget)` signature matches its test and the provider/mirror fragments' shape. `getAuthUserId` import path `@convex-dev/auth/server` is consistent.

---

## Execution Handoff

Plan complete and saved to `LifeGuide/docs/plans/2026-05-20-lifeguide-v1-plan1-foundation-whiteboard.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session via executing-plans, batch with checkpoints.

Which approach?
