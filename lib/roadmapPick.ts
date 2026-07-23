// Pure state logic for the roadmap "Pull from your goals" picker (RoadmapStep in
// components/today/RitualSequence.tsx, ARI-144). Picking calls `roadmap.addFromTask`,
// which can REJECT when the task went stale between the list render and the tap: it
// was deleted, checked off, or moved to "waiting" on the Goals board in another tab or
// on another device. The picker used to fire-and-forget that mutation, so a failed pick
// vanished silently. The component owns the mutation call and the focus wiring; the
// decision about what the person SEES on a failure lives here, so it is unit-testable
// with no DOM (this repo's tests run in a node environment).

export interface PickFailure {
  // The task the person tapped, so the component can clear the notice once the reactive
  // `availableTasks` query drops that stale row on its own.
  goalTaskId: string;
  // A calm, specific line for the person. No error codes, no alarm.
  message: string;
}

// Map a rejected `addFromTask` to a calm, specific line. The mutation throws known
// messages ("already done", "waiting", "Task not found") plus a catch-all for anything
// else (a network blip, an unexpected server error). The reactive list already removes
// the stale row; this only explains why the tap did nothing.
export function pickFailureMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/already done/i.test(raw)) return "That one's already done, so it dropped off the list.";
  if (/waiting/i.test(raw)) return "That one moved to waiting, so it dropped off the list.";
  if (/not found/i.test(raw)) return "That task isn't on your goals anymore, so it dropped off the list.";
  return "That one couldn't be pulled in just now. Try again in a moment.";
}

// Record a failed pick as a notice the component can render. Kept separate from
// `pickFailureMessage` so the component sets a single object in one call. The notice
// stays up until the person's next successful pick or until they close the picker (the
// component clears it in those two places); the stale row itself vanishes from the list
// on its own as the reactive `availableTasks` query catches up.
export function recordPickFailure(goalTaskId: string, error: unknown): PickFailure {
  return { goalTaskId, message: pickFailureMessage(error) };
}
