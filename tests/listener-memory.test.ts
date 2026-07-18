import { describe, it, expect } from "vitest";
import {
  assembleSummaryInput,
  parseSessionSummary,
  buildListenerOpeningAddendum,
} from "../lib/listenerMemory";
import { LISTENER_INSTRUCTIONS, buildListenerInstructions } from "../agents/listener/persona";

describe("assembleSummaryInput", () => {
  it("labels turns by speaker, chronological order as given", () => {
    const out = assembleSummaryInput([
      { role: "coach", text: "What's on your mind?" },
      { role: "user", text: "Work has been a lot." },
    ]);
    expect(out).toBe("Listener: What's on your mind?\nPerson: Work has been a lot.");
  });

  it("drops turns with empty/whitespace-only text", () => {
    const out = assembleSummaryInput([
      { role: "user", text: "  " },
      { role: "coach", text: "" },
      { role: "user", text: "real thing" },
    ]);
    expect(out).toBe("Person: real thing");
  });

  it("returns empty string for an empty transcript", () => {
    expect(assembleSummaryInput([])).toBe("");
  });

  it("caps output length", () => {
    const long = "x".repeat(20_000);
    const out = assembleSummaryInput([{ role: "user", text: long }], 100);
    expect(out.length).toBe(100);
  });
});

describe("parseSessionSummary", () => {
  it("parses a clean JSON response", () => {
    const raw = JSON.stringify({
      summary: "They talked about a career change and felt hopeful.",
      topics: ["career", "hope"],
      open_threads: ["whether to tell their manager"],
    });
    expect(parseSessionSummary(raw)).toEqual({
      text: "They talked about a career change and felt hopeful.",
      topics: ["career", "hope"],
      openThreads: ["whether to tell their manager"],
    });
  });

  it("tolerates fenced/lead-in prose around the JSON", () => {
    const raw = 'Here you go:\n```json\n{"summary":"Short call about sleep."}\n```';
    expect(parseSessionSummary(raw)).toEqual({
      text: "Short call about sleep.",
      topics: [],
      openThreads: [],
    });
  });

  it("returns null when there is no summary text", () => {
    expect(parseSessionSummary(JSON.stringify({ summary: "" }))).toBeNull();
    expect(parseSessionSummary(JSON.stringify({ topics: ["x"] }))).toBeNull();
  });

  it("returns null on unparsable input", () => {
    expect(parseSessionSummary("not json at all")).toBeNull();
    expect(parseSessionSummary("")).toBeNull();
  });

  it("filters non-string / empty entries out of topics and open_threads", () => {
    const raw = JSON.stringify({
      summary: "ok",
      topics: ["real", "", 42, "  ", "another"],
      open_threads: [null, "genuine thread"],
    });
    expect(parseSessionSummary(raw)).toEqual({
      text: "ok",
      topics: ["real", "another"],
      openThreads: ["genuine thread"],
    });
  });
});

describe("buildListenerOpeningAddendum", () => {
  it("returns empty string when there is no previous summary", () => {
    expect(buildListenerOpeningAddendum(null)).toBe("");
    expect(buildListenerOpeningAddendum({ text: "", topics: [], openThreads: [] })).toBe("");
  });

  it("includes the previous summary text", () => {
    const out = buildListenerOpeningAddendum({
      text: "They were wrestling with a career change.",
      topics: [],
      openThreads: [],
    });
    expect(out).toContain("They were wrestling with a career change.");
    expect(out).toContain("Open THIS call already oriented");
  });

  it("folds in open threads when present", () => {
    const out = buildListenerOpeningAddendum({
      text: "A call about work stress.",
      topics: ["work"],
      openThreads: ["whether to talk to their manager", "the gym habit"],
    });
    expect(out).toContain("whether to talk to their manager; the gym habit");
  });

  it("omits the open-threads line when there are none", () => {
    const out = buildListenerOpeningAddendum({ text: "A short call.", topics: [], openThreads: [] });
    expect(out).not.toContain("Left open");
  });
});

describe("buildListenerInstructions", () => {
  it("returns the base instructions unchanged with an empty addendum", () => {
    expect(buildListenerInstructions("")).toBe(LISTENER_INSTRUCTIONS);
  });

  it("appends a non-empty addendum after the base instructions", () => {
    const out = buildListenerInstructions("\n\nExtra context.");
    expect(out.startsWith(LISTENER_INSTRUCTIONS)).toBe(true);
    expect(out.endsWith("Extra context.")).toBe(true);
  });
});
