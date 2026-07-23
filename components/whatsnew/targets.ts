// ============================================================================
// WHAT'S NEW: component-spotlight target registry (the client side).
// ============================================================================
// The closed set of keys lives in convex/whatsNewTargets.ts (so the backend can
// validate the stored field). This module attaches the DOM/geometry details to
// each key: the STABLE existing `data-tour` anchor to spotlight, the shell view it
// lives on, a coachmark placement, and a human label for the /admin dropdown.
//
// Every `selector` here is an anchor the guided product tour already depends on
// (components/tour/steps.ts); reusing those keeps this registry as stable as the
// tour and avoids sprinkling new `data-tour` attributes. Only COMPACT controls
// belong here: a full-page anchor is rejected by the spotlight's `isSpotlightable`
// check and would degrade to a centered card, which is not a component highlight.
// When a What's New entry carries one of these keys, clicking it navigates to `view`
// and then the shell's WhatsNewSpotlight measures `[data-tour="<selector>"]` and
// draws a one-step coachmark around it. See docs/product/features/whats-new.md.
// ============================================================================

import type { View } from "@/components/shell/Rail";
// Relative (not `@/`) so this registry stays importable from a plain Vitest unit
// test, which does not alias `@/` at runtime. The keys are a runtime value here.
import { WHATS_NEW_TARGET_KEYS, type WhatsNewTarget } from "../../convex/whatsNewTargets";

export type Placement = "top" | "bottom" | "left" | "right";

export type WhatsNewTargetSpec = {
  /** The shell tab the anchor lives on, where a click navigates before measuring. */
  view: View;
  /** The `data-tour` value to measure and spotlight. */
  selector: string;
  /** Where the coachmark card sits relative to the target. */
  placement: Placement;
  /** Human-readable label for the authoring dropdown. */
  label: string;
};

export const WHATS_NEW_TARGETS: Record<WhatsNewTarget, WhatsNewTargetSpec> = {
  coach: { view: "today", selector: "tour-coach", placement: "left", label: "Talk to Coach button" },
  "settings-restart": {
    view: "settings",
    selector: "tour-settings-restart",
    placement: "top",
    label: "Settings: restart tour",
  },
};

// The authoring dropdown's options, in the registry's declared key order.
export const WHATS_NEW_TARGET_OPTIONS: { key: WhatsNewTarget; label: string }[] =
  WHATS_NEW_TARGET_KEYS.map((key) => ({ key, label: WHATS_NEW_TARGETS[key].label }));

// Resolve a stored `componentTarget` (which may be undefined, or, defensively, an
// unknown string from an older entry) to its spec, or null for "no target."
export function resolveTarget(key: string | null | undefined): WhatsNewTargetSpec | null {
  if (!key) return null;
  return (WHATS_NEW_TARGETS as Record<string, WhatsNewTargetSpec>)[key] ?? null;
}
