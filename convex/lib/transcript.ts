/**
 * Pure transcript helpers for the interview session. No DB, no auth — kept
 * separate so the merge logic is unit-testable in isolation and shared by both
 * the in-app (`appendTurn`) and phone (`appendTurnByToken`) mutations.
 */

export type Turn = {
  role: "coach" | "user";
  questionKey?: string;
  text: string;
  at: number;
};

/**
 * Two consecutive Coach turns this close together (no user turn between them)
 * are a barge-in restart, not two real turns — the Coach asks one question and
 * then waits, so it never legitimately speaks twice in a row.
 */
export const COACH_RESTART_WINDOW_MS = 15_000;

/**
 * Append `next` to `transcript`, except: if `next` is a Coach turn and the last
 * turn is also a Coach turn within {@link COACH_RESTART_WINDOW_MS}, treat it as
 * a barge-in restart and REPLACE the last turn with `next` (the fuller, later
 * text) instead of appending. Never mutates the input array.
 */
export function appendTranscriptTurn(transcript: Turn[], next: Turn): Turn[] {
  const last = transcript[transcript.length - 1];
  const isCoachRestart =
    next.role === "coach" &&
    last?.role === "coach" &&
    next.at - last.at <= COACH_RESTART_WINDOW_MS;
  if (isCoachRestart) {
    return [...transcript.slice(0, -1), next];
  }
  return [...transcript, next];
}
