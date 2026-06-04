import { describe, it, expect } from "vitest";
import { planFileOps, type ExistingFile } from "../lib/center";
import { parsePillarSynthesis, type FileOp } from "../agents/center/synthesis";

const existing: ExistingFile[] = [
  { id: "f1", name: "What drives me" },
  { id: "f2", name: "Relationship with my father" },
];

describe("planFileOps", () => {
  it("creates a file when the name matches nothing on record", () => {
    const ops: FileOp[] = [{ op: "create", name: "Fear of being ordinary", kind: "fear", content: "I'm scared I'll waste my potential." }];
    const plan = planFileOps(existing, ops);
    expect(plan).toEqual([
      { type: "create", name: "Fear of being ordinary", kind: "fear", content: "I'm scared I'll waste my potential." },
    ]);
  });

  it("updates the matching file when there is no contradiction (name match is authoritative, case-insensitive)", () => {
    const ops: FileOp[] = [{ op: "create", name: "what drives me", kind: "value", content: "Building things that outlast me." }];
    const plan = planFileOps(existing, ops);
    expect(plan).toEqual([
      { type: "update", targetId: "f1", name: "what drives me", kind: "value", content: "Building things that outlast me." },
    ]);
  });

  it("holds a contradicting change as pending instead of overwriting", () => {
    const ops: FileOp[] = [
      { op: "update", name: "What drives me", kind: "value", content: "Honestly, money and freedom, nothing deeper.", contradiction: "Earlier this file said legacy; now it's money." },
    ];
    const plan = planFileOps(existing, ops);
    expect(plan).toEqual([
      {
        type: "pending",
        targetId: "f1",
        name: "What drives me",
        kind: "value",
        content: "Honestly, money and freedom, nothing deeper.",
        note: "Earlier this file said legacy; now it's money.",
      },
    ]);
  });

  it("treats an 'update' whose name matches nothing as a create", () => {
    const ops: FileOp[] = [{ op: "update", name: "A brand new thing", kind: "fact", content: "I moved to Lisbon." }];
    const plan = planFileOps(existing, ops);
    expect(plan[0].type).toBe("create");
  });

  it("collapses duplicate creates for the same new name (last wins)", () => {
    const ops: FileOp[] = [
      { op: "create", name: "My north", kind: "dream", content: "first" },
      { op: "create", name: "my north", kind: "dream", content: "second" },
    ];
    const plan = planFileOps(existing, ops);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ type: "create", content: "second" });
  });

  it("drops ops missing a name or content", () => {
    const ops: FileOp[] = [
      { op: "create", name: "", kind: "fact", content: "x" },
      { op: "create", name: "Y", kind: "fact", content: "   " },
    ];
    expect(planFileOps(existing, ops)).toEqual([]);
  });
});

describe("parsePillarSynthesis", () => {
  it("parses a clean files array", () => {
    const raw = '{"files":[{"op":"create","name":"A","kind":"value","content":"I value honesty.","contradiction":null}]}';
    expect(parsePillarSynthesis(raw)).toEqual([
      { op: "create", name: "A", kind: "value", content: "I value honesty.", contradiction: null },
    ]);
  });

  it("recovers JSON wrapped in prose / fences", () => {
    const raw = 'Sure!\n```json\n{"files":[{"op":"update","name":"B","kind":"fact","content":"c"}]}\n```';
    const ops = parsePillarSynthesis(raw);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ op: "update", name: "B", content: "c", contradiction: null });
  });

  it("defaults an empty result for an untouched pillar", () => {
    expect(parsePillarSynthesis('{"files":[]}')).toEqual([]);
    expect(parsePillarSynthesis("not json at all")).toEqual([]);
  });

  it("drops malformed entries and defaults kind to fact", () => {
    const raw = '{"files":[{"op":"create","name":"Ok","content":"yes"},{"name":"bad"}]}';
    const ops = parsePillarSynthesis(raw);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ name: "Ok", kind: "fact", content: "yes" });
  });
});
