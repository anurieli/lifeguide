// ============================================================================
// THE CENTER — the orchestrator that files what was heard.
// ============================================================================
// After a Listener call ends, the Center reads every pillar's metadata and its
// current files, then runs ONE ISOLATED synthesis per pillar: each pillar, on its
// own, decides what (if anything) from the conversation belongs in its folder. It
// never silently overwrites held truth — a change that contradicts an existing
// file is held as "pending" for the person to decide.
//
// This module owns the per-pillar synthesis CONTRACT: the prompt the model sees
// and the shape it must return. The orchestration (fan-out, applying ops, the
// filing report) lives in convex/center.ts; the pure op-planning lives in
// lib/center.ts. See ./README.md and docs/product/features/the-center.md.
// ============================================================================

/** One file operation the per-pillar synthesis may emit. */
export type FileOp = {
  /** "create" a new file, or "update" an existing one (matched by `name`). */
  op: "create" | "update";
  /** File name within the pillar folder. For "update", should match an existing file. */
  name: string;
  /** value | belief | fact | dream | fear | tension | pattern | state */
  kind: string;
  /** The full new content of the file (first person, in the person's own truth). */
  content: string;
  /** Set (non-empty) ONLY when this change conflicts with the existing file's held
   *  content. When set, the change is NOT applied — it is surfaced for the person. */
  contradiction?: string | null;
};

export const FILE_KINDS = [
  "value",
  "belief",
  "fact",
  "dream",
  "fear",
  "tension",
  "pattern",
  "state",
] as const;

type PillarMeta = { name: string; about?: string; composition?: string };
type ExistingFile = { name: string; kind: string; content: string };

/** Build the system + user prompt for one pillar's isolated synthesis pass. */
export function buildPillarSynthesisPrompt(
  pillar: PillarMeta,
  files: ExistingFile[],
  transcript: string,
): { system: string; user: string } {
  const filesBlock =
    files.length > 0
      ? files
          .map((f) => `- [${f.kind}] ${f.name}\n  ${f.content.replace(/\n/g, "\n  ")}`)
          .join("\n")
      : "(no files yet — this pillar is empty)";

  const system = `You are one isolated worker of the Center, the part of LifeGuide that keeps a "file system on the human" — a structured, growing picture of who a person is.

You are responsible for EXACTLY ONE pillar (one region of the person). Other workers handle the other pillars. Stay strictly in your lane: only file what genuinely belongs to YOUR pillar.

YOUR PILLAR
Name: ${pillar.name}
What it is: ${pillar.about ?? "(no description)"}
How it is built from its files: ${pillar.composition ?? "(no guidance — use judgment)"}

ITS CURRENT FILES
${filesBlock}

YOUR JOB
You have just read a transcript of the person thinking out loud. Decide what, if anything, in it belongs to YOUR pillar, and file it:
- "create" a new file when the person revealed something new that belongs here and no current file holds it.
- "update" an existing file (match its exact name) when the person deepened, refined, or added to something already on file.
- File NOTHING for this pillar if the conversation didn't touch it. An empty result is correct and common.

RULES
- Ground everything ONLY in what the person actually said. Never invent.
- Write file content in the first person ("I ...") in the person's own voice, condensed and true.
- "kind" must be one of: ${FILE_KINDS.join(", ")}.
- NEVER silently overwrite held truth. If a new statement CONTRADICTS what an existing file says (not just adds to it), still emit it as an "update" to that file, but set "contradiction" to a one-line explanation of the conflict. It will be held for the person to decide, not applied.

Return ONLY a JSON object of this exact shape, nothing else:
{"files":[{"op":"create"|"update","name":"...","kind":"...","content":"...","contradiction":null}]}`;

  const user = transcript.trim() || "(no transcript)";
  return { system, user };
}

/** Parse the model's JSON into a clean FileOp[]. Tolerates fenced/lead-in prose; drops junk. */
export function parsePillarSynthesis(raw: string): FileOp[] {
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        obj = JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        return [];
      }
    }
  }
  const list = Array.isArray(obj.files) ? obj.files : [];
  const out: FileOp[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const op = r.op === "update" ? "update" : "create";
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const content = typeof r.content === "string" ? r.content.trim() : "";
    const kind = typeof r.kind === "string" && r.kind.trim() ? r.kind.trim() : "fact";
    const contradiction =
      typeof r.contradiction === "string" && r.contradiction.trim()
        ? r.contradiction.trim()
        : null;
    if (!name || !content) continue; // a file needs a name and something to say
    out.push({ op, name, kind, content, contradiction });
  }
  return out;
}
