/**
 * The "listening…" bridge predicate for a dynamic (Conversation) session.
 *
 * Context: the moment a take is saved or a text capture commits, SessionDoc shows a
 * client-side-only "listening…" line in the interviewer's own slot, bridging the gap
 * before the real pending reply row ("thinking…") arrives. That kept the person from
 * staring at dead air.
 *
 * Reply coverage is decided per-capture, not by timing: every reply row carries an
 * optional `afterCaptureId` (the capture that triggered that turn). The bridge steps
 * aside only once some reply actually targets the *latest* capture — SessionDoc finds
 * the newest capture row and asks whether any reply's `afterCaptureId` equals its id
 * (`hasReplyForLatestCapture`). Status is irrelevant: a pending, done, or error row all
 * count, because each renders the turn itself. An opener or a prior-turn reply points
 * at an earlier capture (or at none), so it can never suppress a fresh current-turn
 * capture — even one inserted later or in the same millisecond.
 *
 * The bug (ARI-135): the original signal was "the newest capture is newer than the
 * newest reply", which stayed true forever for an orphaned capture the backend never
 * answered, so reopening the session showed "listening…" indefinitely. The fix keeps
 * the no-dead-air bridge but (a) matches coverage by `afterCaptureId` rather than
 * timestamp and (b) bounds the still-unanswered case to a short window: a fresh latest
 * capture with no reply targeting it bridges only while it is under LISTENING_WINDOW_MS
 * old. An in-flight take still saving/uploading (pendingTakeCount) always bridges, since
 * that is a brand-new turn with no capture row yet.
 *
 * Pure and time-injected (`now`) so it is unit-testable; SessionDoc passes a fresh
 * Date.now() on every render (so the predicate is never read off a stale clock) and
 * arms a one-shot client timer that re-renders at the capture's deadline, so the bridge
 * clears itself even when Convex sends no further update.
 */

// How long a fresh, unanswered latest capture may hold the "listening…" bridge before
// it is treated as orphaned and the bridge hides. 30 seconds: long enough to cover the
// real reply's turnaround (a voice take's ~2s and a typed capture's ~8s debounce, plus
// the model call), short enough that a stalled turn never lingers on reopen.
export const LISTENING_WINDOW_MS = 30_000;

export type ListeningInput = {
  /** The stored session mode; the bridge is a Conversation-mode affordance only. */
  mode: "quiet" | "dynamic";
  /** True while a take is actively recording in this session (its own live row shows). */
  isRecording: boolean;
  /** Takes stopped and saving/uploading here, not yet real capture rows. */
  pendingTakeCount: number;
  /** Newest capture's createdAt (ms), or 0 if this session has no captures. */
  latestCaptureAt: number;
  /**
   * Whether some reply row already targets the newest capture, i.e. its
   * `afterCaptureId` equals that capture's id. Reply status is irrelevant. A
   * prior-turn or opener reply that points at an earlier capture (or none) is
   * false here, so it never suppresses a fresh current-turn capture.
   */
  hasReplyForLatestCapture: boolean;
  /** Current wall-clock (ms). Injected so the predicate stays pure. */
  now: number;
};

/**
 * Whether the client-side "listening…" bridge line should render right now.
 * See the module comment for the full rationale.
 */
export function shouldShowListening({
  mode,
  isRecording,
  pendingTakeCount,
  latestCaptureAt,
  hasReplyForLatestCapture,
  now,
}: ListeningInput): boolean {
  // Conversation mode only; a quiet brain-dump never bridges.
  if (mode !== "dynamic") return false;
  // Actively speaking has its own live pulsing row; never double up.
  if (isRecording) return false;
  // A take just stopped and is still saving: bridge unconditionally. This is a new
  // turn that has no capture row (and so no reply) yet, and preserves the prior
  // in-flight behavior exactly.
  if (pendingTakeCount > 0) return true;
  // A reply row already targets the latest capture (matched by afterCaptureId, not
  // timing): that row renders the turn, whatever its status (pending/done/error). A
  // prior-turn or opener reply pointing at an earlier capture does not count, so it
  // cannot suppress a fresh current-turn capture. Also the no-capture case is false
  // here and hides below.
  if (hasReplyForLatestCapture) return false;
  // A fresh, still-unanswered latest capture: bridge only within the window. At and
  // after the deadline it is treated as orphaned and hides (strict <), which also
  // covers a days-old unanswered capture on reopen. With no captures latestCaptureAt
  // is 0, so `now` (a real clock) is far past the window and this hides too.
  return now - latestCaptureAt < LISTENING_WINDOW_MS;
}
