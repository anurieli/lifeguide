import { describe, it, expect } from "vitest";
import { cancelMantra, commitMantra, reopenAfterFailedSave } from "../lib/mantraEdit";

// The in-place mantra editor's decision logic (MantraStep, ARI-144), tested
// without a DOM. The Morning-Scroll mantra line is editable in place; these cover
// the three commit paths the component wires to: save, cancel, and a failed save.
const RESOLVED = "You set your standard. Others fit in with you.";

describe("commitMantra (save vs cancel)", () => {
  it("saves a real new line and closes the editor optimistically", () => {
    const { state, persist } = commitMantra({ editing: true, draft: "My own line" }, RESOLVED);
    expect(persist).toBe("My own line");
    expect(state).toEqual({ editing: false, draft: "My own line" });
  });

  it("trims the saved line", () => {
    const { persist } = commitMantra({ editing: true, draft: "   Trim me   " }, RESOLVED);
    expect(persist).toBe("Trim me");
  });

  it("treats an empty (or whitespace-only) draft as a cancel: nothing persists", () => {
    const { state, persist } = commitMantra({ editing: true, draft: "   " }, RESOLVED);
    expect(persist).toBeNull();
    expect(state).toEqual({ editing: false, draft: RESOLVED });
  });

  it("treats an unchanged draft as a cancel, even with surrounding whitespace", () => {
    const { persist } = commitMantra({ editing: true, draft: `  ${RESOLVED}  ` }, RESOLVED);
    expect(persist).toBeNull();
  });
});

describe("mantra failure behavior", () => {
  it("reopens the editor with the person's words kept, so a failed save is not lost", () => {
    // Model the flow: commit asks to persist, the persist rejects, the component
    // recovers via reopenAfterFailedSave, so the edit survives for a retry.
    const { persist } = commitMantra({ editing: true, draft: "Keep me" }, RESOLVED);
    expect(persist).toBe("Keep me");
    const recovered = reopenAfterFailedSave(persist as string);
    expect(recovered).toEqual({ editing: true, draft: "Keep me" });
  });
});

describe("cancelMantra (Escape)", () => {
  it("drops the draft back to the resolved line and closes", () => {
    expect(cancelMantra(RESOLVED)).toEqual({ editing: false, draft: RESOLVED });
  });
});
