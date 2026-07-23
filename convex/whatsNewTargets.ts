// ============================================================================
// WHAT'S NEW: component-spotlight target keys (the stable registry's backbone).
// ============================================================================
// A What's New entry may optionally point at a single component ON a page rather
// than the whole page. It does so through a `componentTarget` key from this small,
// closed set. Each key resolves, in the FRONTEND registry
// (components/whatsnew/targets.ts), to a stable existing `data-tour` anchor, the
// shell view it lives on, and a coachmark placement. The keys live here, in the
// Convex bundle, so both convex/schema.ts and convex/whatsNew.ts can validate the
// field against exactly this set while the DOM/geometry details stay client-side.
//
// These map onto anchors the guided tour already relies on, so they are as stable
// as the tour itself. Only COMPACT controls belong here: the spotlight measures the
// anchor and, if it fills most of the screen (a full-page container), degrades to a
// plain centered card instead of highlighting a component. So keep this to small,
// on-screen targets; whole-page entries use no target and just their `view`. Adding
// a key here is only half the change: the frontend registry must gain a matching
// entry (a test locks the two together).
// ============================================================================

import { v } from "convex/values";

export const WHATS_NEW_TARGET_KEYS = ["coach", "settings-restart"] as const;

export type WhatsNewTarget = (typeof WHATS_NEW_TARGET_KEYS)[number];

// The stored field validator: an optional key from the closed set above. Shared by
// the schema (the column) and the authoring mutations (their args), so a value the
// backend accepts is always one the frontend registry knows how to spotlight.
export const componentTargetValidator = v.union(
  ...WHATS_NEW_TARGET_KEYS.map((key) => v.literal(key)),
);

// A single-member union is invalid, and the loop above degenerates to one if the key
// list is ever trimmed to a single entry; this comment marks that constraint so a
// future edit keeps at least two keys (or switches to a bare v.literal).
