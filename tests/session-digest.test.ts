import { describe, it, expect } from "vitest";
import { assembleDigestInput, fallbackTitle, captureText } from "../lib/sessionDigest";
import type { DigestCapture } from "../lib/sessionDigest";

const cap = (over: Partial<DigestCapture>): DigestCapture => ({
  rawType: "text",
  createdAt: 0,
  ...over,
});

describe("captureText", () => {
  it("prefers extractedText over rawText", () => {
    expect(captureText(cap({ rawText: "typed", extractedText: "transcript" }))).toBe("transcript");
  });
  it("falls back to rawText, trimmed", () => {
    expect(captureText(cap({ rawText: "  hi  " }))).toBe("hi");
  });
  it("returns empty string when nothing exists", () => {
    expect(captureText(cap({}))).toBe("");
  });
});

describe("assembleDigestInput", () => {
  it("orders chronologically and labels by kind", () => {
    const input = assembleDigestInput([
      cap({ rawType: "text", rawText: "second", createdAt: 2 }),
      cap({ rawType: "audio", extractedText: "first", createdAt: 1 }),
      cap({ rawType: "image", extractedText: "a photo of a dog", createdAt: 3 }),
    ]);
    expect(input).toBe("[spoken] first\n\n[written] second\n\n[photo] a photo of a dog");
  });
  it("skips captures with no text yet", () => {
    const input = assembleDigestInput([
      cap({ rawType: "audio", createdAt: 1 }), // untranscribed
      cap({ rawType: "text", rawText: "only me", createdAt: 2 }),
    ]);
    expect(input).toBe("[written] only me");
  });
  it("caps the assembled input", () => {
    const input = assembleDigestInput([cap({ rawText: "x".repeat(9000), createdAt: 1 })], 100);
    expect(input.length).toBe(100);
  });
});

describe("fallbackTitle", () => {
  it("takes the first words of the earliest text", () => {
    expect(
      fallbackTitle([
        cap({ rawText: "later thought", createdAt: 5 }),
        cap({ rawText: "one two three four five six seven eight nine", createdAt: 1 }),
      ]),
    ).toBe("one two three four five six seven…");
  });
  it("returns short text whole, no ellipsis", () => {
    expect(fallbackTitle([cap({ rawText: "short thought", createdAt: 1 })])).toBe("short thought");
  });
  it("returns Recording when no capture has text", () => {
    expect(fallbackTitle([cap({ rawType: "audio", createdAt: 1 })])).toBe("Recording");
  });
});
