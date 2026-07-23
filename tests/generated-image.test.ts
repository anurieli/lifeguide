import { describe, it, expect } from "vitest";
import { generatedImageState, redoPromptFor } from "../lib/generatedImage";

describe("generatedImageState", () => {
  it("shows the spinner while generating even with a lingering image (redo)", () => {
    // A redo re-generates the same node; the old fileId stays until the new
    // image lands. The card must show the spinner, not the stale picture.
    expect(generatedImageState("generating", true)).toBe("generating");
    expect(generatedImageState("generating", false)).toBe("generating");
  });

  it("shows the error state when generation failed", () => {
    expect(generatedImageState("error", false)).toBe("error");
    expect(generatedImageState("error", true)).toBe("error");
  });

  it("shows the finished image once it is present and no flag remains", () => {
    expect(generatedImageState(undefined, true)).toBe("ready");
  });

  it("falls back to pending when nothing has landed yet", () => {
    expect(generatedImageState(undefined, false)).toBe("pending");
  });
});

describe("redoPromptFor", () => {
  it("seeds the editor from the node's prompt text", () => {
    expect(redoPromptFor("a lighthouse at dawn")).toBe("a lighthouse at dawn");
  });

  it("never returns undefined so it can seed a controlled input", () => {
    expect(redoPromptFor(undefined)).toBe("");
  });
});
