import { describe, it, expect } from "vitest";
import { acceptImageFiles } from "../lib/attachments";

// Minimal File-like stand-ins — the function only reads `.type`, so plain objects avoid
// depending on a DOM/File global in the node test environment.
const img = (type = "image/png") => ({ type });
const notImg = (type = "text/plain") => ({ type });

describe("acceptImageFiles", () => {
  it("accepts image files and drops non-images", () => {
    const result = acceptImageFiles(0, [img(), notImg(), img("image/jpeg")], 4);
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.type.startsWith("image/"))).toBe(true);
  });

  it("caps the total at max, counting what's already attached", () => {
    // 3 already attached, cap is 4 — only 1 more should be accepted even though 3 are offered.
    const result = acceptImageFiles(3, [img(), img(), img()], 4);
    expect(result).toHaveLength(1);
  });

  it("accepts nothing once already at the cap", () => {
    const result = acceptImageFiles(4, [img(), img()], 4);
    expect(result).toHaveLength(0);
  });

  it("skips non-images without consuming a slot", () => {
    // A non-image in the middle of the batch shouldn't count against the cap.
    const result = acceptImageFiles(0, [notImg(), img(), notImg(), img()], 1);
    expect(result).toHaveLength(1);
  });

  it("returns an empty array for an empty batch", () => {
    expect(acceptImageFiles(0, [], 4)).toEqual([]);
  });
});
