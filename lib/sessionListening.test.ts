import { describe, it, expect } from "vitest";
import {
  shouldShowListening,
  LISTENING_WINDOW_MS,
  type ListeningInput,
} from "./sessionListening";

// A dynamic session with no in-flight take, at a fixed wall-clock. Individual tests
// override just the fields they exercise.
const NOW = 1_000_000_000_000;
const base: ListeningInput = {
  mode: "dynamic",
  isRecording: false,
  pendingTakeCount: 0,
  latestCaptureAt: NOW - 5_000, // 5s-old capture, unanswered
  hasReplyForLatestCapture: false,
  now: NOW,
};

describe("shouldShowListening", () => {
  it("shows for a fresh unanswered capture within the window", () => {
    expect(shouldShowListening(base)).toBe(true);
  });

  it("hides once a reply row targets the latest capture (any status)", () => {
    // Coverage is by afterCaptureId, not timing: the moment a pending, done, or
    // error reply row points at the latest capture, that row renders the turn and
    // the bridge steps aside. Status is not an input here precisely because it is
    // irrelevant — all three collapse to hasReplyForLatestCapture === true.
    expect(
      shouldShowListening({ ...base, hasReplyForLatestCapture: true }),
    ).toBe(false);
  });

  it("does not let a prior-turn reply suppress the fresh current-turn capture", () => {
    // A reply exists in the session, but it targets an earlier capture (its
    // afterCaptureId does not match the newest one), so hasReplyForLatestCapture is
    // false. The fresh latest capture — inserted later, even in the same millisecond
    // as that prior reply — must still bridge. This is the ARI-135 regression: the old
    // timestamp rule (newest reply at/after newest capture) wrongly hid it.
    expect(
      shouldShowListening({
        ...base,
        hasReplyForLatestCapture: false,
        latestCaptureAt: NOW, // brand-new, same instant a prior reply landed
      }),
    ).toBe(true);
  });

  it("hides at the exact expiry boundary", () => {
    // now - latestCaptureAt === LISTENING_WINDOW_MS: strict <, so the deadline hides.
    expect(
      shouldShowListening({
        ...base,
        latestCaptureAt: NOW - LISTENING_WINDOW_MS,
      }),
    ).toBe(false);
  });

  it("hides an expired (just past the window) unanswered capture", () => {
    expect(
      shouldShowListening({
        ...base,
        latestCaptureAt: NOW - LISTENING_WINDOW_MS - 1,
      }),
    ).toBe(false);
  });

  it("hides a five-day-old unanswered capture on reopen", () => {
    const fiveDays = 5 * 24 * 60 * 60 * 1000;
    expect(
      shouldShowListening({
        ...base,
        latestCaptureAt: NOW - fiveDays,
      }),
    ).toBe(false);
  });

  it("hides in quiet mode even for a fresh unanswered capture", () => {
    expect(shouldShowListening({ ...base, mode: "quiet" })).toBe(false);
  });

  it("hides while actively recording (the live row owns that state)", () => {
    expect(shouldShowListening({ ...base, isRecording: true })).toBe(false);
  });

  it("shows for an in-flight pending take regardless of capture/reply coverage", () => {
    // A take just stopped and is saving: a brand-new turn with no capture row yet.
    // Bridge even though a prior reply already covers the newest capture, and even
    // past the window, preserving the original in-flight behavior.
    expect(
      shouldShowListening({
        ...base,
        pendingTakeCount: 1,
        latestCaptureAt: NOW - 10 * LISTENING_WINDOW_MS,
        hasReplyForLatestCapture: true,
      }),
    ).toBe(true);
  });

  it("does not bridge a pending take while actively recording", () => {
    // Recording takes precedence: the live pulsing row is showing, not the bridge.
    expect(
      shouldShowListening({ ...base, pendingTakeCount: 1, isRecording: true }),
    ).toBe(false);
  });
});
