import { describe, it, expect } from "vitest";
import {
  LONG_AUDIO_READABLE_THRESHOLD,
  isLongAudioTranscript,
  selectAudioDisplay,
} from "../lib/audioReadable";

const long = "x".repeat(LONG_AUDIO_READABLE_THRESHOLD);
const short = "x".repeat(LONG_AUDIO_READABLE_THRESHOLD - 1);

describe("isLongAudioTranscript (the threshold gate)", () => {
  it("is true for an audio transcript at or past the threshold", () => {
    expect(isLongAudioTranscript("audio", long)).toBe(true);
    expect(isLongAudioTranscript("audio", long + "yyy")).toBe(true);
  });

  it("is false for a short audio transcript (kept as a direct transcript)", () => {
    expect(isLongAudioTranscript("audio", short)).toBe(false);
  });

  it("counts the trimmed length, not surrounding whitespace", () => {
    expect(isLongAudioTranscript("audio", `   ${short}   `)).toBe(false);
    expect(isLongAudioTranscript("audio", `\n\n${long}\n\n`)).toBe(true);
  });

  it("is false for any non-audio type, however long", () => {
    expect(isLongAudioTranscript("text", long)).toBe(false);
    expect(isLongAudioTranscript("link", long)).toBe(false);
    expect(isLongAudioTranscript("image", long)).toBe(false);
  });

  it("is false for a missing or empty transcript", () => {
    expect(isLongAudioTranscript("audio", undefined)).toBe(false);
    expect(isLongAudioTranscript("audio", null)).toBe(false);
    expect(isLongAudioTranscript("audio", "")).toBe(false);
    expect(isLongAudioTranscript("audio", "   ")).toBe(false);
  });
});

describe("selectAudioDisplay (what the card shows)", () => {
  it("shows the summary collapsed and the cleaned thought expanded when both exist", () => {
    const d = selectAudioDisplay({
      transcript: "um so like i went for a walk and uh it was good you know",
      readable: {
        summary: "A short reflection on a good morning walk.",
        cleaned: "I went for a walk and it was good.",
      },
    });
    expect(d.preview).toBe("A short reflection on a good morning walk.");
    expect(d.expanded).toBe("I went for a walk and it was good.");
    expect(d.hasCleaned).toBe(true);
  });

  it("falls back to the raw transcript (both preview and expanded) with no readable pair", () => {
    const d = selectAudioDisplay({ transcript: "the raw transcript", readable: undefined });
    expect(d.preview).toBe("the raw transcript");
    expect(d.expanded).toBe("the raw transcript");
    expect(d.hasCleaned).toBe(false);
  });

  it("falls back when only one of the two derived fields is present (partial/failed AI)", () => {
    const onlySummary = selectAudioDisplay({
      transcript: "raw words",
      readable: { summary: "a gist", cleaned: "   " },
    });
    expect(onlySummary.preview).toBe("raw words");
    expect(onlySummary.hasCleaned).toBe(false);

    const onlyCleaned = selectAudioDisplay({
      transcript: "raw words",
      readable: { summary: "", cleaned: "cleaned words" },
    });
    expect(onlyCleaned.expanded).toBe("raw words");
    expect(onlyCleaned.hasCleaned).toBe(false);
  });

  it("trims the values it returns", () => {
    const d = selectAudioDisplay({
      transcript: "  raw  ",
      readable: { summary: "  s  ", cleaned: "  c  " },
    });
    expect(d.preview).toBe("s");
    expect(d.expanded).toBe("c");
  });

  it("is empty-safe when there is no transcript and no readable pair", () => {
    const d = selectAudioDisplay({ transcript: null, readable: null });
    expect(d.preview).toBe("");
    expect(d.expanded).toBe("");
    expect(d.hasCleaned).toBe(false);
  });
});
