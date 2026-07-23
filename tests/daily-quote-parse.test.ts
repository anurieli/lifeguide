import { describe, it, expect } from "vitest";
import { parseDailyQuote } from "../convex/ai/parse";

// ARI-134: the Morning Scroll daily quote failed whenever the model wrapped its
// JSON in a Markdown fence or a sentence of prose. parseDailyQuote is tolerant of
// the WRAPPER (bare JSON, fenced JSON, JSON inside prose) but strict on the
// CONTENT (both a non-empty quote and a non-empty attribution, or it rejects).

describe("parseDailyQuote (accepted wrappers)", () => {
  it("parses bare JSON", () => {
    const q = parseDailyQuote('{"quote":"The obstacle is the way.","author":"Marcus Aurelius"}');
    expect(q).toEqual({ text: "The obstacle is the way.", attribution: "Marcus Aurelius" });
  });

  it("parses Markdown-fenced JSON", () => {
    const q = parseDailyQuote(
      '```json\n{"quote":"Well done is better than well said.","author":"Benjamin Franklin"}\n```',
    );
    expect(q).toEqual({
      text: "Well done is better than well said.",
      attribution: "Benjamin Franklin",
    });
  });

  it("parses a bare ``` fence with no language tag", () => {
    const q = parseDailyQuote('```\n{"quote":"Stay hungry.","author":"Steve Jobs"}\n```');
    expect(q).toEqual({ text: "Stay hungry.", attribution: "Steve Jobs" });
  });

  it("extracts JSON surrounded by short prose", () => {
    const q = parseDailyQuote(
      'Here is one that fits: {"quote":"The best way out is always through.","author":"Robert Frost"} Enjoy.',
    );
    expect(q).toEqual({
      text: "The best way out is always through.",
      attribution: "Robert Frost",
    });
  });

  it("trims whitespace and caps overly long values", () => {
    const longQuote = "a".repeat(500);
    const longAuthor = "b".repeat(200);
    const q = parseDailyQuote(`{"quote":"  ${longQuote}  ","author":"  ${longAuthor}  "}`);
    expect(q!.text).toHaveLength(400);
    expect(q!.attribution).toHaveLength(120);
  });

  it("accepts a model-chosen \"Unknown\" attribution (a real value, not a default)", () => {
    const q = parseDailyQuote('{"quote":"Fall down seven times, stand up eight.","author":"Unknown"}');
    expect(q).toEqual({
      text: "Fall down seven times, stand up eight.",
      attribution: "Unknown",
    });
  });
});

describe("parseDailyQuote (rejected payloads, returns null)", () => {
  it("rejects non-JSON garbage", () => {
    expect(parseDailyQuote("not json at all")).toBeNull();
  });

  it("rejects malformed JSON that never closes", () => {
    expect(parseDailyQuote('{"quote":"broken","author":')).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parseDailyQuote("")).toBeNull();
  });

  it("rejects a missing quote", () => {
    expect(parseDailyQuote('{"author":"Seneca"}')).toBeNull();
  });

  it("rejects a missing author (never defaults to Unknown)", () => {
    expect(parseDailyQuote('{"quote":"Luck is preparation meeting opportunity."}')).toBeNull();
  });

  it("rejects an empty / whitespace-only quote", () => {
    expect(parseDailyQuote('{"quote":"   ","author":"Seneca"}')).toBeNull();
  });

  it("rejects an empty / whitespace-only author", () => {
    expect(parseDailyQuote('{"quote":"A real line.","author":"  "}')).toBeNull();
  });

  it("rejects a non-string quote", () => {
    expect(parseDailyQuote('{"quote":42,"author":"Seneca"}')).toBeNull();
  });

  it("rejects a non-string author", () => {
    expect(parseDailyQuote('{"quote":"A real line.","author":null}')).toBeNull();
  });

  it("rejects the literal JSON null (no crash on null property access)", () => {
    expect(parseDailyQuote("null")).toBeNull();
  });

  it("rejects a JSON array payload", () => {
    expect(parseDailyQuote('[{"quote":"A real line.","author":"Seneca"}]')).toBeNull();
  });
});
