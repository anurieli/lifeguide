import { describe, it, expect } from "vitest";
import { parseBoardWorthy, parseDistilled, parseReadable } from "../convex/ai/parse";
import { LONG_AUDIO_DISTILL_INPUT_CAP } from "../lib/audioReadable";

describe("parseDistilled", () => {
  it("parses clean JSON", () => {
    const d = parseDistilled(
      '{"title":"Morning Discipline","essence":"He values consistency.","pillars":["health","growth"]}',
    );
    expect(d.title).toBe("Morning Discipline");
    expect(d.essence).toBe("He values consistency.");
    expect(d.pillars).toEqual(["health", "growth"]);
  });

  it("extracts JSON from prose-wrapped output", () => {
    const d = parseDistilled(
      'Sure! {"title":"X","essence":"Y","pillars":["spirit","banana"]} Hope that helps.',
    );
    expect(d.title).toBe("X");
    expect(d.pillars).toEqual(["spirit"]); // invalid tag dropped
  });

  it("falls back on non-JSON garbage", () => {
    const d = parseDistilled("not json at all");
    expect(d.title).toBe("Untitled");
    expect(d.essence).toBe("");
    expect(d.pillars).toEqual([]);
  });

  it("caps pillars at 3 and de-dupes", () => {
    const d = parseDistilled(
      '{"title":"t","essence":"e","pillars":["health","health","growth","money","spirit"]}',
    );
    expect(d.pillars).toEqual(["health", "growth", "money"]);
  });

  it("defaults a blank title to Untitled", () => {
    const d = parseDistilled('{"title":"   ","essence":"e","pillars":[]}');
    expect(d.title).toBe("Untitled");
  });
});

describe("parseBoardWorthy (the vision sieve)", () => {
  it("reads a positive verdict with its reason", () => {
    const w = parseBoardWorthy(
      '{"title":"t","essence":"e","pillars":[],"board_worthy":true,"board_reason":"a life he wants"}',
    );
    expect(w).toEqual({ verdict: true, reason: "a life he wants" });
  });

  it("reads a negative verdict", () => {
    const w = parseBoardWorthy('{"board_worthy":false,"board_reason":"a work note"}');
    expect(w.verdict).toBe(false);
  });

  it("defaults to NOT board-worthy when the field is missing", () => {
    const w = parseBoardWorthy('{"title":"t","essence":"e","pillars":[]}');
    expect(w.verdict).toBe(false);
    expect(w.reason).toBe("");
  });

  it("defaults to NOT board-worthy on garbage", () => {
    expect(parseBoardWorthy("not json").verdict).toBe(false);
  });

  it('ignores a stringy "true" — only the boolean counts', () => {
    expect(parseBoardWorthy('{"board_worthy":"true"}').verdict).toBe(false);
  });

  it("extracts from prose-wrapped output", () => {
    const w = parseBoardWorthy('Sure! {"board_worthy":true,"board_reason":"an aspiration"} Done.');
    expect(w.verdict).toBe(true);
  });
});

describe("parseReadable (long-audio summary + cleaned transcript)", () => {
  it("reads both fields when present", () => {
    const r = parseReadable(
      '{"title":"t","essence":"e","pillars":[],"summary":"He walked and thought about saying no.","cleaned":"I went for a walk and thought about saying no more often."}',
    );
    expect(r).toEqual({
      summary: "He walked and thought about saying no.",
      cleaned: "I went for a walk and thought about saying no more often.",
    });
  });

  it("extracts from prose-wrapped output", () => {
    const r = parseReadable('Here you go: {"summary":"a gist","cleaned":"the tidied thought"} done');
    expect(r).toEqual({ summary: "a gist", cleaned: "the tidied thought" });
  });

  it("returns null when either field is missing (the UI falls back to the raw transcript)", () => {
    expect(parseReadable('{"summary":"only a summary"}')).toBeNull();
    expect(parseReadable('{"cleaned":"only cleaned"}')).toBeNull();
    expect(parseReadable('{"title":"t","essence":"e","pillars":[]}')).toBeNull();
  });

  it("returns null when either field is blank", () => {
    expect(parseReadable('{"summary":"   ","cleaned":"x"}')).toBeNull();
    expect(parseReadable('{"summary":"x","cleaned":""}')).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseReadable("not json at all")).toBeNull();
  });

  it("trims both fields", () => {
    const r = parseReadable('{"summary":"  s  ","cleaned":"  c  "}');
    expect(r).toEqual({ summary: "s", cleaned: "c" });
  });

  it("caps a runaway cleaned transcript at the long-audio input ceiling", () => {
    const huge = "word ".repeat(6000); // ~30k chars, well past the cap
    const r = parseReadable(JSON.stringify({ summary: "s", cleaned: huge }));
    expect(r).not.toBeNull();
    expect(r!.cleaned.length).toBe(LONG_AUDIO_DISTILL_INPUT_CAP);
  });
});
