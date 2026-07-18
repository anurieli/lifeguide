// The Core mode machine (ADR 0024). Three surfaces over the same `coreResponses`
// data: grid (all 18 at once), zen (one question at a time), conversational (talk it
// through). Every mode reads/writes the same store, so any transition is safe by
// construction — there is nothing mode-local to lose. This file is the single
// source of truth for what transitions exist; `components/core/Core.tsx` is a thin
// dispatcher over it. Pure and framework-free so it is unit-testable without React.

export type CoreMode = "grid" | "zen" | "conversational";

export type CoreModeAction =
  | { type: "toZen" }
  | { type: "toConversational" }
  | { type: "toGrid" };

const TARGET: Record<CoreModeAction["type"], CoreMode> = {
  toZen: "zen",
  toConversational: "conversational",
  toGrid: "grid",
};

/**
 * The Core's mode reducer. Every mode can reach every other mode directly (grid ↔
 * zen ↔ conversational, including zen → conversational and back) — there is no
 * gating, no "must exit through grid" rule. The action name IS the destination;
 * the reducer's only job is to name that transition space in one place so the
 * three surfaces and their affordances (ZenButton, Zen's rail "Talk"/"Exit Zen",
 * Conversational's "Zen"/"Grid") stay in sync with what's actually reachable.
 */
export function coreModeReducer(_state: CoreMode, action: CoreModeAction): CoreMode {
  return TARGET[action.type];
}
