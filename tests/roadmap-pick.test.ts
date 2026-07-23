import { describe, it, expect } from "vitest";
import { pickFailureMessage, recordPickFailure } from "../lib/roadmapPick";

// The roadmap picker's stale-task failure logic (RoadmapStep, ARI-144), tested
// without a DOM. `roadmap.addFromTask` can reject when a task went stale between the
// list render and the tap; these cover the calm line the picker shows for each case.

describe("pickFailureMessage", () => {
  it("explains a task that was already checked off", () => {
    const msg = pickFailureMessage(new Error("That task is already done"));
    expect(msg).toMatch(/already done/i);
    expect(msg).toMatch(/dropped off the list/i);
  });

  it("explains a task that moved to waiting", () => {
    const msg = pickFailureMessage(new Error("That task is waiting, not actionable yet"));
    expect(msg).toMatch(/waiting/i);
    expect(msg).toMatch(/dropped off the list/i);
  });

  it("explains a task that was deleted (not found)", () => {
    const msg = pickFailureMessage(new Error("Task not found"));
    expect(msg).toMatch(/isn't on your goals anymore/i);
  });

  it("falls back to a calm retry line for any other error", () => {
    expect(pickFailureMessage(new Error("Network request failed"))).toMatch(/try again/i);
  });

  it("handles a non-Error rejection value", () => {
    expect(pickFailureMessage("boom")).toMatch(/try again/i);
  });

  it("never leaks an error code or stack: every message is plain prose", () => {
    for (const raw of ["already done", "waiting", "not found", "weird 500"]) {
      const msg = pickFailureMessage(new Error(raw));
      expect(msg).not.toMatch(/error|stack|500|undefined/i);
    }
  });
});

describe("recordPickFailure", () => {
  it("tags the notice with the tapped task id so the component can render and clear it", () => {
    const failure = recordPickFailure("task-123", new Error("That task is already done"));
    expect(failure.goalTaskId).toBe("task-123");
    expect(failure.message).toMatch(/already done/i);
  });
});
