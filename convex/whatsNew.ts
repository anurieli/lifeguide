// ============================================================================
// WHAT'S NEW — owner-authored feed of shipped features, dismissed by click-through.
// ============================================================================
// Every entry is `{ title, body, view, publishedAt, componentTarget? }`, authored by
// the owner through the /admin surface (owner-gated per convex/owner.ts, ADR 0006).
// `feed` is what the bottom-of-shell component reads: every published entry the
// CALLING user hasn't clicked yet. `history` returns EVERY published entry with a
// per-user `seen` flag (the "See All" list, incl. already-removed items). Clicking an
// entry navigates to its `view` and, if it carries a `componentTarget`, spotlights
// that one component after it mounts (see convex/whatsNewTargets.ts), then calls
// `markSeen`, which writes a `whatsNewSeen` row for that (user, entry) pair: the
// click-through itself is the acknowledgment. `clearAll` marks every currently
// published entry seen for the caller in one go. Both `markSeen` and `clearAll` are
// idempotent and never write a duplicate row. See docs/product/features/whats-new.md,
// ADR 0026.
// ============================================================================

import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isOwner, OWNER_EMAIL } from "./owner";
import { componentTargetValidator, type WhatsNewTarget } from "./whatsNewTargets";

const VIEW = v.union(
  v.literal("today"),
  v.literal("core"),
  v.literal("board"),
  v.literal("goals"),
  v.literal("sessions"),
  v.literal("settings"),
);

// Every published entry the caller has not yet clicked through, oldest-unseen last
// (newest first) so the freshest ships lead the feed. Unauthenticated → empty.
export const feed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const entries = await ctx.db
      .query("whatsNew")
      .withIndex("by_publishedAt")
      .order("desc")
      .collect();
    if (entries.length === 0) return [];
    const seenRows = await ctx.db
      .query("whatsNewSeen")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const seenIds = new Set(seenRows.map((r) => r.whatsNewId));
    return entries.filter((e) => !seenIds.has(e._id));
  },
});

// Every published entry, newest first, each tagged with a per-caller `seen` flag.
// This is what "See All" reads: the full history including entries the caller has
// already clicked through (which `feed` omits). The pill stays reachable whenever
// this is non-empty, so past items are never stranded. Unauthenticated → empty.
export const history = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const entries = await ctx.db
      .query("whatsNew")
      .withIndex("by_publishedAt")
      .order("desc")
      .collect();
    if (entries.length === 0) return [];
    const seenRows = await ctx.db
      .query("whatsNewSeen")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const seenIds = new Set(seenRows.map((r) => r.whatsNewId));
    return entries.map((e) => ({ ...e, seen: seenIds.has(e._id) }));
  },
});

// Record the click-through: the person clicked this specific entry and was
// navigated to its linked surface. Idempotent — clicking twice is a no-op.
export const markSeen = mutation({
  args: { id: v.id("whatsNew") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("whatsNewSeen")
      .withIndex("by_user_entry", (q) => q.eq("userId", userId).eq("whatsNewId", args.id))
      .first();
    if (existing) return;
    await ctx.db.insert("whatsNewSeen", { userId, whatsNewId: args.id, seenAt: Date.now() });
  },
});

// "Clear All": mark every currently published entry seen for the caller at once, so
// the feed empties without visiting each one. Idempotent and duplicate-safe: it
// reads the caller's existing `whatsNewSeen` rows first and only inserts for entries
// not already recorded, so re-running it (or clearing after some were clicked) never
// writes a second row for the same (user, entry). Per-user, like markSeen; other
// people's feeds are untouched. Returns how many rows it actually wrote.
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entries = await ctx.db.query("whatsNew").collect();
    const seenRows = await ctx.db
      .query("whatsNewSeen")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const seenIds = new Set(seenRows.map((r) => r.whatsNewId));
    const now = Date.now();
    let marked = 0;
    for (const entry of entries) {
      if (seenIds.has(entry._id)) continue;
      await ctx.db.insert("whatsNewSeen", { userId, whatsNewId: entry._id, seenAt: now });
      marked++;
    }
    return { marked };
  },
});

// ── Owner-gated authoring (the /admin surface) ──────────────────────────────
// Cross-user write access to content every user will see, so — like feedback's
// cross-user reads (convex/feedback.ts) — these gate purely on `isOwner`, with no
// isDev bypass: the /admin PAGE is dev-open per ADR 0006, but the page is UX, not
// the security boundary, and this is not self-scoped data the way the dev tools are.

// Every entry (published or not — there is no draft state today, but this is the
// admin list, not the user feed), newest first. Non-owners get an empty list.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx))) return [];
    return await ctx.db.query("whatsNew").withIndex("by_publishedAt").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    view: VIEW,
    // Absent → page-level navigation only; a key → spotlight that component.
    componentTarget: v.optional(componentTargetValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!(await isOwner(ctx))) throw new Error("Not authorized");
    return await ctx.db.insert("whatsNew", { ...args, publishedAt: Date.now(), createdBy: userId });
  },
});

export const update = mutation({
  args: {
    id: v.id("whatsNew"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    view: v.optional(VIEW),
    // Tri-state: omit to leave the target unchanged, a key to set/replace it, or
    // `null` to clear it back to page-level (undefined can't cross the wire, so
    // clearing needs an explicit sentinel).
    componentTarget: v.optional(v.union(componentTargetValidator, v.null())),
  },
  handler: async (ctx, args) => {
    if (!(await isOwner(ctx))) throw new Error("Not authorized");
    const { id, componentTarget, ...rest } = args;
    const patch: {
      title?: string;
      body?: string;
      view?: typeof rest.view;
      componentTarget?: WhatsNewTarget | undefined;
    } = { ...rest };
    if (componentTarget !== undefined) {
      // null → remove the field (patching a field to undefined deletes it in Convex).
      patch.componentTarget = componentTarget === null ? undefined : componentTarget;
    }
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("whatsNew") },
  handler: async (ctx, args) => {
    if (!(await isOwner(ctx))) throw new Error("Not authorized");
    await ctx.db.delete(args.id);
  },
});

// ── Launch seed (ARI-107) ───────────────────────────────────────────────────
// The feed was invisible in production because it renders only *published* entries
// and none had ever been authored (manual authorship, ADR 0026). This seeds the
// first hand-written, user-facing entries for the features already shipped, so the
// pill actually appears. It is still manual authorship — the copy is written by
// hand here, not generated from CHANGELOG.md — just delivered as a one-shot seed
// instead of four passes through the /admin form.
//
// Run once against the deployment: `npx convex run whatsNew:seedLaunchEntries`.
// Idempotent: an entry whose title already exists is skipped, so re-running is safe.
// `createdBy` is stamped to the owner account (resolved by OWNER_EMAIL); the owner
// must have signed in at least once so their `users` row exists.
// Exported for the seed test, which asserts against the real list instead of a
// hardcoded count (a stale count broke the suite when the fifth entry landed).
export const LAUNCH_ENTRIES: {
  title: string;
  body: string;
  view: "today" | "core" | "board" | "sessions" | "goals" | "settings";
  componentTarget?: WhatsNewTarget;
}[] = [
  {
    title: "Your Life Wheel",
    body: "Your Core now opens with a Life Wheel — a radar of the domains that make you, with a slider to rate how strong each part of your life feels right now.",
    view: "core",
  },
  {
    title: "Fill your Core by talking",
    body: 'Prefer speaking to typing? Open your Core and tap "Talk it through" for a calm voice conversation that fills your Blueprint as you go.',
    view: "core",
  },
  {
    title: "A quick guided tour",
    body: "New here? A five-stop tour walks you through Today, your Core, the vision board, your Coach, and Settings. Restart it anytime from Settings.",
    view: "today",
  },
  {
    title: "Thought maps for your sessions",
    body: "Your brain-dumps can now be mapped into a visual thought map — see how your ideas connect, and teach it how you think.",
    view: "sessions",
  },
  {
    title: "Talk to your Coach, right where you are",
    body: "The Talk to Coach button now holds the whole conversation. Tap it and a living orb opens the line in place — no new screen — moving with your voice while you talk, then filing what mattered when you're done.",
    view: "today",
  },
  {
    title: "Goals that start as aspirations",
    body: "The Goals page is now about the things you're actually chasing. Anything without a deadline is a someday aspiration; give it a date and it becomes a real Goal. The AI drafts what it actually takes — a roadmap of steps with real dependencies — and your Coach can now create or update goals for you when you just say so.",
    view: "goals",
  },
  {
    title: "Your brain-dump, itemized",
    body: "Each thing you add to a session — a note, a recording, a photo — now shows as its own card in the entry. Tap one to expand it, press play to hear a recording again.",
    view: "sessions",
  },
  {
    title: "Your Blueprint, rebuilt",
    body: "The Blueprint is now 8 pillars of structured, editable lines instead of one wall of text — open it from Settings for the full immersive read, practice by practice, each with its own reason why.",
    view: "settings",
  },
  {
    title: "Today, back in order",
    body: "Today now opens with your morning scroll. Your Horizons ladder and ritual seal moved down to the very end, right as you close out the day. Today's quote also loads more reliably now, so you won't get stuck staring at a spinner.",
    view: "today",
  },
  {
    title: "The scroll count now matches what you see",
    body: "The Morning and Night Scroll header counts only the cards actually in the scroll, so the number lines up with the steps in front of you. Your rail practices still count toward sealing the day.",
    view: "today",
  },
  {
    title: "What's New now points you right to it",
    body: "When an update is about one thing on a page, tapping it walks you straight there and spotlights it, like a tiny tour. Clicking an item removes it; the rest stay. New at the bottom: See All to revisit anything you've cleared, and Clear All to catch up in one tap.",
    view: "today",
  },
  {
    title: "The board's add menu gets out of the way",
    body: "Right-click your vision board, pick Add text, Generate image with AI, or Upload image, and the little menu now closes the moment you choose, so it no longer sits over the card it just made. Your new card still lands exactly where you clicked.",
    view: "board",
  },
  {
    title: "No more stuck 'listening…' in a session",
    body: "In a Conversation session, the coach's brief \"listening…\" line now clears itself if a turn goes unanswered, instead of hanging there when you reopen an old entry. The instant bridge after you speak or type is unchanged.",
    view: "sessions",
  },
  {
    title: "Redo an AI image on your board",
    body: "Not quite right? Use Redo on any AI-generated image on your vision board. The prompt reopens with your original words to tweak, and the same card regenerates in place. It works on your phone too, and a failed image now lets you edit the prompt before trying again.",
    view: "board",
  },
  {
    title: "Highlight, delete, and undo on your vision board",
    body: "Your vision board now feels like a real editor. Click a card once to select it, then click again inside to place your cursor and highlight text like normal. Select cards and press Command+Delete to remove them, and Command+Z brings back whatever you just deleted.",
    view: "board",
  },
];

export const seedLaunchEntries = internalMutation({
  args: {},
  handler: async (ctx) => {
    const owner = (await ctx.db.query("users").collect()).find((u) => u.email === OWNER_EMAIL);
    if (!owner) {
      throw new Error(
        `No owner user found for ${OWNER_EMAIL}. Sign in once as the owner, then re-run this seed.`,
      );
    }
    const existing = await ctx.db.query("whatsNew").collect();
    const existingTitles = new Set(existing.map((e) => e.title));
    let inserted = 0;
    // Stagger publishedAt by a millisecond each so the feed's newest-first ordering is
    // stable and matches the array order (Date.now() alone would tie them).
    const base = Date.now();
    for (const [i, entry] of LAUNCH_ENTRIES.entries()) {
      if (existingTitles.has(entry.title)) continue;
      await ctx.db.insert("whatsNew", { ...entry, publishedAt: base + i, createdBy: owner._id });
      inserted++;
    }
    return { inserted, skipped: LAUNCH_ENTRIES.length - inserted };
  },
});
