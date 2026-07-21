import { internalMutation, mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// The Blueprint for Life: the person's editable conduct doctrine — how a day is
// lived — one document per user. Seeded from the 8-pillar doctrine
// (docs/research/blueprint-for-living.md), then fully theirs: edits here are the
// single source of truth, and ritual "read" steps with source="blueprint" resolve
// their words from this document live. The Core is the person (character); the
// Blueprint is conduct. They interlink; they never merge.
//
// STRUCTURED, not free text (2026-07-20). The doctrine is `header` (kicker, title,
// intro, source/compiled/structure meta, how-to-read) + `pillars[]`, each pillar
// `{ id, name, subtitle, items[] }`, each item `{ id, practice, why }` — one item is
// one editable unit (a practice line + its "why it pays off" reason). `content`
// (markdown) is DERIVED from header+pillars by `renderMarkdown` below, regenerated on
// every structured mutation, so the morning-read path (ritual "read" steps,
// ImmersiveReader/DailyRead) keeps reading `content` unchanged — see
// docs/decisions (read-path choice) and docs/product/features/the-blueprint.md.
// ============================================================================

export const SEED_VERSION = 2;

export const BLUEPRINT_SEED_TITLE = "The Blueprint for Living";

type SeedItem = { id: string; practice: string; why: string };
type SeedPillar = { id: string; name: string; subtitle: string; items: SeedItem[] };
type Header = {
  kicker?: string;
  title: string;
  intro?: string;
  source?: string;
  compiled?: string;
  structure?: string;
  howToRead?: string;
};
type Pillar = { id: string; name: string; subtitle?: string; items: SeedItem[] };

// The v1 free-text seed, kept ONLY so the lazy upgrade (below) can recognize an
// untouched legacy document and safely replace it outright. Never shown, never
// written to a new document.
const LEGACY_SEED_V1 = `Discipline over motivation. Environment over willpower. Creation over consumption. Depth over scatter. Presence over performance. Self-trust through kept promises. Small actions compounding. Deliberate inputs.

## 1 · The Body

Train for strength and capacity most days. Walk daily. Whole foods, protein first, stop at 80 percent full. Sleep 7 to 9 hours. Schedule recovery before burnout forces it. Cut alcohol.

*Payoff: energy, stress tolerance, confidence — the engine that funds every other pillar.*

## 2 · The Inner Game

Get clear on the why behind the goals. Work on yourself before chasing a partner. Treat mistakes as golden repair. Start before ready. Break comfort on purpose. Borrow belief from someone who already did it.

*Payoff: discipline stops feeling like force and starts feeling like direction.*

## 3 · Systems and Discipline

One small win a day. Consistency over motivation. Keep promises to yourself. Protect mornings. Automate repeat decisions — meals, workout times, wardrobe. Shape the environment. Split the day into selfless hours and selfish hours. Say no to the unaligned.

*Payoff: willpower spent only where it matters; the day stops being reactive.*

## 4 · Focus and Creation

A pre-work focus ritual. Depth on few things over scatter on many. Create more than you consume. One day a week off social media.

*Payoff: consumption drains hunger; creation feeds it.*

## 5 · Direction

One huge goal that scares you, broken down to today. Plan tomorrow before bed. Weekly audit — what gets reviewed gets improved. Journal wins and lessons. Track progress, not perfection. Never compare timelines. Become the person your younger self would look up to.

*Payoff: drift only survives when nobody is looking at it.*

## 6 · Money and Craft

Invest now — the habit, not the amount. Track every dollar. Invest in yourself before consuming. Learn one skill that makes money. Start the thing, post before ready, build the craft.

*Payoff: freedom, options, time back later in life.*

## 7 · People

You are the average of the five around you — get proximity to people ahead of you. Cut energy drains. Real time with family; calls over texts. Be a good human; feedback over criticism.

*Payoff: ceilings and energy are contagious in both directions.*

## 8 · Presence

Slow, steady movement; open posture. Eye contact, full listening, speak slower. Phone away with people. No oversharing, no gossip, no dominating the room. Respond, don't react. Simple grooming, fewer better clothes. No validation seeking, no performed confidence.

*Payoff: calm reads as confidence without a word said.*`;

// The v2 structured seed doctrine — "The Blueprint for Living", assembled from 7
// saved reels into 8 pillars. Canonical source: the JSON Ariel handed off (7
// reels, compiled July 12, 2026); ids are fixed/deterministic (not random) so the
// seed itself is stable and diffable across deploys.
// Deliberately spare: a kicker, a title, and one line saying what this is. The
// provenance (which reels, when compiled, how many pillars) and the "how to read
// this" preamble were cut — they are facts ABOUT the document, not the doctrine,
// and they pushed the actual rules below the fold every time it was opened.
const SEED_HEADER: Header = {
  kicker: "Personal Operating System",
  title: BLUEPRINT_SEED_TITLE,
  intro: "The rules for living.",
};

function item(pillarN: number, itemN: number, practice: string, why: string): SeedItem {
  return { id: `pillar-${pillarN}-item-${itemN}`, practice, why };
}

const SEED_PILLARS: SeedPillar[] = [
  {
    id: "pillar-1",
    name: "The Body",
    subtitle: "Everything else runs on this. Protect the engine first.",
    items: [
      item(
        1,
        1,
        "Move every single day, non-negotiable. Train for strength and capacity 5 to 6 times a week, not for the mirror.",
        "A strong body buys you confidence, stamina for long days, and a higher tolerance for stress. It supports everything above it.",
      ),
      item(
        1,
        2,
        "Walk daily. Take the stairs, park further, get outside.",
        "The cheapest daily dose of energy and mental clarity there is, and it asks almost nothing of you.",
      ),
      item(
        1,
        3,
        "Eat mostly whole foods, protein first, and stop at about 80 percent full.",
        "Steady energy and sharper focus instead of the post-meal crash. You fuel the body rather than sedate it.",
      ),
      item(
        1,
        4,
        "Sleep 7 to 9 hours, and quit the late nights you keep promising to recover from.",
        "Recovery is where the training, the mood, and the thinking actually improve. Skip it and you undo the work.",
      ),
      item(
        1,
        5,
        "Schedule recovery on purpose: sleep, downtime, solitude. Build restoration in before burnout forces it.",
        "You recover on your terms instead of after a crash chooses the timing for you.",
      ),
      item(
        1,
        6,
        "Cut or remove alcohol.",
        "Clearer mind, better energy, better conversations. You show up better in every single area, which matters more than it looks.",
      ),
    ],
  },
  {
    id: "pillar-2",
    name: "The Inner Game",
    subtitle: "Fix the person and the life follows.",
    items: [
      item(
        2,
        1,
        "Get clear on your why, your reason for living. Reconnect to the feeling behind the goal, not just the goal.",
        "When the purpose is clear, discipline stops feeling like force and starts feeling like direction.",
      ),
      item(
        2,
        2,
        "Work on yourself before chasing a partner. Travel, sit alone, heal, learn how you love and how you communicate.",
        "You attract the right person by becoming the right person, not by searching harder.",
      ),
      item(
        2,
        3,
        "Become grounded and emotionally aware. Read the books that stretch you.",
        "Self-mastery is the one advantage that shows up in every room you walk into.",
      ),
      item(
        2,
        4,
        "Replace negative self-talk with action.",
        "Momentum silences the doubt that thinking in circles only feeds.",
      ),
      item(
        2,
        5,
        "Treat mistakes as golden repair. The cracks become part of your strength, not something to hide.",
        "Failure turns from a source of shame into raw material you can build with.",
      ),
      item(
        2,
        6,
        "Start before you feel ready, and make peace with imperfection.",
        "The perfect moment never arrives; progress belongs to whoever moves first.",
      ),
      item(
        2,
        7,
        "Break comfort on purpose. Do one thing that scares you on a regular basis.",
        "Comfort is the quiet killer of ambition. Growth only lives on the other side of it.",
      ),
      item(
        2,
        8,
        "Believe it is actually possible for you. Find someone who started where you are and did it, then study them.",
        "Living proof kills the fear that dresses itself up as logic.",
      ),
    ],
  },
  {
    id: "pillar-3",
    name: "Systems & Discipline",
    subtitle: "You do not rise to your goals; you fall to your systems.",
    items: [
      item(
        3,
        1,
        "Choose discipline over motivation. Show up consistently, especially when nobody is watching. One small win a day.",
        "Small actions repeated daily compound into results that later look like talent.",
      ),
      item(
        3,
        2,
        "Keep the promises you make to yourself.",
        "Every kept promise is a deposit into self-trust; every broken one is a withdrawal.",
      ),
      item(
        3,
        3,
        "Protect your mornings. Wake before the day gets loud.",
        "Own the first hour and you own the day before it can own you.",
      ),
      item(
        3,
        4,
        "Reduce and automate repeat decisions: standard meals, fixed workout times, a capsule wardrobe.",
        "You spend your limited willpower on the decisions that actually matter, not on breakfast.",
      ),
      item(
        3,
        5,
        "Shape your environment; it beats willpower every time. Keep your space clean and minimal.",
        "A good environment makes the right action the easy action, so you need less grit.",
      ),
      item(
        3,
        6,
        "Set boundaries on your time. Split the day into selfless hours (family, team, clients) and selfish hours (training, thinking, learning). Say no to whatever is not aligned.",
        "Without boundaries the whole day turns reactive and you slowly lose control of it.",
      ),
    ],
  },
  {
    id: "pillar-4",
    name: "Focus & Creation",
    subtitle: "Attention is the asset. Guard it, then aim it.",
    items: [
      item(
        4,
        1,
        "Build a deep-focus ritual: a breath, a song, a countdown before you start.",
        "It trains your brain to drop into real work on command instead of waiting to feel like it.",
      ),
      item(
        4,
        2,
        "Go deep on a few things instead of shallow on many.",
        "Depth is where mastery and real output live; scatter is where time quietly disappears.",
      ),
      item(
        4,
        3,
        "Create more than you consume. Put the phone down and make something.",
        "Consumption drains your hunger; creation feeds it. One builds your life, the other watches everyone else's.",
      ),
      item(
        4,
        4,
        "Take one day a week off social media.",
        "You get your attention, and your own thoughts, back.",
      ),
    ],
  },
  {
    id: "pillar-5",
    name: "Direction",
    subtitle: "A target creates the hunger. A review keeps you honest.",
    items: [
      item(
        5,
        1,
        "Set one huge goal that scares you, obsess over it, and break it down to what you can do today.",
        "No target means no hunger. A bold one gives every ordinary day something to pull toward.",
      ),
      item(5, 2, "Plan tomorrow before bed.", "You wake up executing instead of deciding, which is when most mornings leak away."),
      item(
        5,
        3,
        "Review weekly. Audit your life and your goals every Sunday.",
        "What gets reviewed gets improved. Drift only survives when nobody is looking at it.",
      ),
      item(
        5,
        4,
        "Journal your wins and lessons.",
        "You compound insight instead of relearning the same lesson at a higher cost.",
      ),
      item(
        5,
        5,
        "Track progress, not perfection.",
        "The trend line matters far more than any single day you fell short.",
      ),
      item(
        5,
        6,
        "Stop comparing your timeline to anyone else's.",
        "You cannot run your own race while your eyes are fixed on theirs.",
      ),
      item(
        5,
        7,
        "Aim to become the person your younger self would have looked up to.",
        "It is a north star you can never argue your way out of.",
      ),
    ],
  },
  {
    id: "pillar-6",
    name: "Money & Craft",
    subtitle: "Turn effort into assets that keep paying.",
    items: [
      item(
        6,
        1,
        "Start investing now. It is the habit, not the amount, even if it is $50 a week.",
        "Money invested early buys you freedom, options, and time back later in life.",
      ),
      item(
        6,
        2,
        "Track every dollar you earn and spend.",
        "Awareness is the whole game. You cannot manage what you refuse to look at.",
      ),
      item(
        6,
        3,
        "Invest in yourself before buying things you do not truly need.",
        "You are the highest-return asset you will ever put money into.",
      ),
      item(
        6,
        4,
        "Learn one skill that can make you money.",
        "A real skill is leverage nobody can lay off, tax away, or take from you.",
      ),
      item(
        6,
        5,
        "Start the business you keep putting off. Post before you feel ready. Build a personal brand.",
        "Doors open when you ship, not when you finally feel prepared. Prepared never comes.",
      ),
    ],
  },
  {
    id: "pillar-7",
    name: "People",
    subtitle: "You become your inputs. Choose them deliberately.",
    items: [
      item(
        7,
        1,
        "You are the average of the five people around you. Surround yourself with people more successful and evolved, and get around those already ahead of you.",
        "Energy and ceilings are contagious. Proximity to better quietly pulls you up to it.",
      ),
      item(
        7,
        2,
        "Cut off the people who drain your energy.",
        "You cannot fill your life while someone is quietly emptying it.",
      ),
      item(
        7,
        3,
        "Give real time to family, and call your friends instead of texting them.",
        "The relationships that matter most need presence, not notifications.",
      ),
      item(
        7,
        4,
        "Be a good human. Kind to strangers, assume the best of people, give feedback instead of criticism.",
        "Character quietly compounds into reputation, trust, and the doors both open.",
      ),
    ],
  },
  {
    id: "pillar-8",
    name: "Presence",
    subtitle: "How you carry yourself speaks before you do.",
    items: [
      item(
        8,
        1,
        "Move slowly and steadily. Relaxed posture, open shoulders.",
        "Calm reads as confidence without you having to say a word.",
      ),
      item(
        8,
        2,
        "Hold eye contact, listen fully before responding, and speak a little slower than the pack.",
        "Real presence makes people feel heard, and being heard is rare enough to be magnetic.",
      ),
      item(
        8,
        3,
        "Put the phone away when you are with someone.",
        "Undivided attention is the highest form of respect you can hand another person.",
      ),
      item(
        8,
        4,
        "Do not overshare, avoid gossip, and do not fight to dominate the room.",
        "Restraint keeps your presence heavier than your words. Less said, more felt.",
      ),
      item(
        8,
        5,
        "Respond instead of react.",
        "The power is in the pause between the trigger and your move.",
      ),
      item(
        8,
        6,
        "Keep grooming simple and clean, wear fewer but better pieces, and use one consistent fragrance.",
        "A strong, recognizable signal with almost no daily effort or thought.",
      ),
      item(
        8,
        7,
        "Stop seeking validation and stop performing confidence. Be comfortable not being fully figured out.",
        "Genuine security is quiet. The loud kind is usually fear wearing a costume.",
      ),
    ],
  },
];

// Render the structured doctrine to the markdown the read path (DailyRead's tiny
// renderer) already knows how to walk: `## ` pillar headings, plain paragraphs for
// each practice, `*italic*` for its why. This is the ONLY place `content` is
// derived — every structured mutation below calls it and patches the result.
function renderMarkdown(header: Header, pillars: Pillar[]): string {
  const parts: string[] = [];
  if (header.intro) parts.push(header.intro);
  if (header.howToRead) parts.push(`*${header.howToRead}*`);
  pillars.forEach((p, i) => {
    parts.push(`## ${i + 1} · ${p.name}`);
    if (p.subtitle) parts.push(p.subtitle);
    for (const it of p.items) {
      parts.push(it.practice);
      if (it.why) parts.push(`*${it.why}*`);
    }
  });
  return parts.join("\n\n");
}

function genId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function seedFields() {
  const header = SEED_HEADER;
  const pillars = SEED_PILLARS;
  return { header, pillars, content: renderMarkdown(header, pillars) };
}

// The person's Blueprint document, or null if they haven't adopted one yet.
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("blueprint")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// Lazy structured-seed upgrade (v1 → v2, 2026-07-20). Runs inline whenever a
// document is fetched for mutation (ensureBlueprint / any structured mutation
// below), so it applies exactly once, the moment it is next needed, with no
// separate migration script. Policy:
//   - A document that already has `pillars` (even an empty array — the person
//     deliberately emptied it) is already structured: NEVER touched again here.
//   - A document with NO `pillars` (the pre-2026-07-20 free-text-only shape) whose
//     `content` matches the v1 free-text seed EXACTLY is untouched doctrine:
//     replaced outright with the new structured seed. This is the common case
//     (nobody has hand-edited it) and is how Ariel's own account picks up the
//     new canonical content.
//   - A document with NO `pillars` whose `content` DIFFERS from the v1 seed is a
//     genuine edit: never discarded. It is wrapped into ONE pillar (`"Your
//     Blueprint"`, the edited text as its single item's practice, no `why`) so
//     the structured UI has something to render, while every word the person
//     wrote is preserved verbatim. `content` itself is left exactly as they left
//     it (regenerating from the wrapped pillar would reformat their text).
async function upgradeIfNeeded(ctx: MutationCtx, doc: Doc<"blueprint">): Promise<Doc<"blueprint">> {
  if (doc.pillars !== undefined) return doc; // already structured — never re-seeded
  const now = Date.now();
  if (doc.content.trim() === LEGACY_SEED_V1.trim()) {
    const { header, pillars, content } = seedFields();
    await ctx.db.patch(doc._id, { header, pillars, content, seedVersion: SEED_VERSION, updatedAt: now });
  } else {
    const header: Header = { ...SEED_HEADER, title: doc.title || SEED_HEADER.title };
    const pillars: Pillar[] = [
      {
        id: genId("pillar"),
        name: "Your Blueprint",
        subtitle: "Carried over from your previous, free-text Blueprint.",
        items: [{ id: genId("item"), practice: doc.content, why: "" }],
      },
    ];
    await ctx.db.patch(doc._id, { header, pillars, seedVersion: SEED_VERSION, updatedAt: now });
    // content is deliberately left as-is: it is the person's own words.
  }
  return (await ctx.db.get(doc._id))!;
}

// The v1 → v2 upgrade above is LAZY: it only runs from a mutation, because a
// Convex query cannot write. That made it unreachable for exactly the people who
// needed it — the UI only called `adopt` when a document was MISSING, so anyone
// who already had a v1 document never triggered it and kept reading old content
// in the new shell. The UI now calls `adopt` unconditionally on open, and this
// migration sweeps every existing row so nobody waits for a click.
// Idempotent: an already-structured document is skipped by upgradeIfNeeded.
// Run: `npx convex run blueprintDoc:migrateUpgradeAll --prod`
export const migrateUpgradeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("blueprint").collect();
    let upgraded = 0;
    for (const doc of docs) {
      if (doc.pillars !== undefined) continue;
      await upgradeIfNeeded(ctx, doc);
      upgraded++;
    }
    return { scanned: docs.length, upgraded, skipped: docs.length - upgraded };
  },
});

// The v2 header carried provenance (source/compiled/structure) and a "how to
// read this" preamble. Both were cut: they describe the document rather than
// state the doctrine, and they pushed the actual rules below the fold. The UI
// stopped rendering them, but a document seeded before that still stores the
// long intro, which DOES render — so trim it here.
// Only rewrites a header still carrying the seeded wording; a person's own
// intro is left alone. Idempotent.
// Run: `npx convex run blueprintDoc:migrateTrimHeader --prod`
const LEGACY_SEED_INTRO_V2 =
  "One field guide assembled from seven saved reels. Every habit, system, and principle worth keeping, deduplicated and organized into eight pillars, each line carrying its own reason to matter.";

export const migrateTrimHeader = internalMutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("blueprint").collect();
    let trimmed = 0;
    for (const doc of docs) {
      const h = doc.header;
      if (!h || !doc.pillars) continue;
      const hasStaleIntro = (h.intro ?? "").trim() === LEGACY_SEED_INTRO_V2;
      const hasStaleMeta = Boolean(h.source || h.compiled || h.structure || h.howToRead);
      if (!hasStaleIntro && !hasStaleMeta) continue;
      const header: Header = {
        kicker: h.kicker,
        title: h.title,
        intro: hasStaleIntro ? SEED_HEADER.intro : h.intro,
      };
      await patchDoc(ctx, doc, header, doc.pillars);
      trimmed++;
    }
    return { scanned: docs.length, trimmed, skipped: docs.length - trimmed };
  },
});

// Ensure the user has a Blueprint document, creating it from the seed if missing,
// and upgrading it to the structured seed if it predates it (see upgradeIfNeeded).
// An existing, already-structured document is NEVER re-seeded or clobbered. Shared
// by `adopt` and by rituals.adoptBlueprintRead.
export async function ensureBlueprint(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("blueprint")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (existing) {
    const upgraded = await upgradeIfNeeded(ctx, existing);
    return upgraded._id;
  }
  const now = Date.now();
  const { header, pillars, content } = seedFields();
  return await ctx.db.insert("blueprint", {
    userId,
    title: BLUEPRINT_SEED_TITLE,
    header,
    pillars,
    content,
    seedVersion: SEED_VERSION,
    createdAt: now,
    updatedAt: now,
  });
}

// Adopt the Blueprint: create the document from the seed if none exists (and
// upgrade it in place if it predates the structured seed). Idempotent.
export const adopt = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ensureBlueprint(ctx, userId);
  },
});

async function getOwnedDoc(ctx: MutationCtx, userId: Id<"users">) {
  const id = await ensureBlueprint(ctx, userId);
  return (await ctx.db.get(id))!;
}

// Legacy raw-content edit. Kept as an escape hatch (and because it is simpler to
// reason about for a straight title rename) — NOT what the structured UI calls
// for editing the doctrine itself. Setting `content` here overrides the derived
// markdown directly; it does NOT touch `header`/`pillars`, so a subsequent
// structured mutation will regenerate `content` from the structured data again,
// discarding a raw override. `title` here only patches the top-level document
// title, not `header.title` (which `updateHeader` keeps in sync) — a cosmetic
// drift, never a correctness issue since only the top-level `title` is shown on
// the Settings card and `header.title` is shown inside the immersive view.
// Prefer the structured mutations below.
export const update = mutation({
  args: { title: v.optional(v.string()), content: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await ctx.db
      .query("blueprint")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!doc) throw new Error("No Blueprint yet — adopt it first");
    await ctx.db.patch(doc._id, {
      ...(args.title !== undefined ? { title: args.title.trim() || doc.title } : {}),
      ...(args.content !== undefined ? { content: args.content } : {}),
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// THE COACH-EDITABLE SURFACE. This exact set of mutations — updateHeader,
// addPillar, removePillar, updatePillar, addItem, removeItem, updateItem — is the
// granularity a Coach agent should call to edit a person's Blueprint on their
// behalf later (not wired to the Coach yet; this is manual-only today, driven by
// BlueprintCard/BlueprintImmersive). Each call targets exactly ONE unit: the
// header block, one whole pillar, or one item inside a pillar — nothing coarser
// (no raw markdown patch) and nothing finer (no per-character text diffing). A
// Coach reasoning about "add a pillar for X" or "the why on item Y should say Z"
// can name the call directly. Every mutation here re-derives `content` via
// renderMarkdown so the morning read never falls out of sync with a structured
// edit.
// ============================================================================

function patchDoc(
  ctx: MutationCtx,
  doc: Doc<"blueprint">,
  header: Header,
  pillars: Pillar[],
  extra?: Partial<Doc<"blueprint">>,
) {
  return ctx.db.patch(doc._id, {
    ...extra,
    header,
    pillars,
    content: renderMarkdown(header, pillars),
    updatedAt: Date.now(),
  });
}

function requirePillars(doc: Doc<"blueprint">): Pillar[] {
  // upgradeIfNeeded (called by getOwnedDoc → ensureBlueprint) guarantees `pillars`
  // is set by the time any of these mutations run.
  return (doc.pillars as Pillar[] | undefined) ?? [];
}

function requireHeader(doc: Doc<"blueprint">): Header {
  return (doc.header as Header | undefined) ?? { ...SEED_HEADER };
}

export const updateHeader = mutation({
  args: {
    kicker: v.optional(v.string()),
    title: v.optional(v.string()),
    intro: v.optional(v.string()),
    source: v.optional(v.string()),
    compiled: v.optional(v.string()),
    structure: v.optional(v.string()),
    howToRead: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await getOwnedDoc(ctx, userId);
    const header = { ...requireHeader(doc), ...args };
    const extra = args.title !== undefined ? { title: args.title.trim() || doc.title } : undefined;
    await patchDoc(ctx, doc, header, requirePillars(doc), extra);
  },
});

export const addPillar = mutation({
  args: { name: v.string(), subtitle: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await getOwnedDoc(ctx, userId);
    const pillar: Pillar = {
      id: genId("pillar"),
      name: args.name.trim() || "New pillar",
      subtitle: args.subtitle?.trim(),
      items: [],
    };
    const pillars = [...requirePillars(doc), pillar];
    await patchDoc(ctx, doc, requireHeader(doc), pillars);
    return pillar.id;
  },
});

export const removePillar = mutation({
  args: { pillarId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await getOwnedDoc(ctx, userId);
    const pillars = requirePillars(doc).filter((p) => p.id !== args.pillarId);
    await patchDoc(ctx, doc, requireHeader(doc), pillars);
  },
});

export const updatePillar = mutation({
  args: {
    pillarId: v.string(),
    name: v.optional(v.string()),
    subtitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await getOwnedDoc(ctx, userId);
    const pillars = requirePillars(doc).map((p) =>
      p.id === args.pillarId
        ? {
            ...p,
            ...(args.name !== undefined ? { name: args.name.trim() || p.name } : {}),
            ...(args.subtitle !== undefined ? { subtitle: args.subtitle } : {}),
          }
        : p,
    );
    await patchDoc(ctx, doc, requireHeader(doc), pillars);
  },
});

// A rule is a practice AND the reason it pays off — the why is the doctrine's
// whole point, not an optional note. This is enforced here, not just in the UI,
// because this mutation is the contract an agent appends through: a human
// hovering a ghost slot and an agent calling `addItem` obey the same rule.
export const addItem = mutation({
  args: { pillarId: v.string(), practice: v.string(), why: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const practice = args.practice.trim();
    const why = args.why.trim();
    if (!practice) throw new Error("A rule needs a practice");
    if (!why) throw new Error("A rule needs its why — every practice carries the reason it pays off");
    const doc = await getOwnedDoc(ctx, userId);
    const newItem: SeedItem = { id: genId("item"), practice, why };
    const pillars = requirePillars(doc).map((p) =>
      p.id === args.pillarId ? { ...p, items: [...p.items, newItem] } : p,
    );
    if (!pillars.some((p) => p.id === args.pillarId)) throw new Error("Pillar not found");
    await patchDoc(ctx, doc, requireHeader(doc), pillars);
    return newItem.id;
  },
});

export const removeItem = mutation({
  args: { pillarId: v.string(), itemId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await getOwnedDoc(ctx, userId);
    const pillars = requirePillars(doc).map((p) =>
      p.id === args.pillarId ? { ...p, items: p.items.filter((it) => it.id !== args.itemId) } : p,
    );
    await patchDoc(ctx, doc, requireHeader(doc), pillars);
  },
});

export const updateItem = mutation({
  args: {
    pillarId: v.string(),
    itemId: v.string(),
    practice: v.optional(v.string()),
    why: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await getOwnedDoc(ctx, userId);
    const pillars = requirePillars(doc).map((p) =>
      p.id !== args.pillarId
        ? p
        : {
            ...p,
            items: p.items.map((it) =>
              it.id === args.itemId
                ? {
                    ...it,
                    ...(args.practice !== undefined ? { practice: args.practice } : {}),
                    ...(args.why !== undefined ? { why: args.why } : {}),
                  }
                : it,
            ),
          },
    );
    await patchDoc(ctx, doc, requireHeader(doc), pillars);
  },
});
