// Pure, dependency-free parsing of the distillation model's JSON output.
// Tolerant: handles clean JSON, prose-wrapped JSON, and garbage. Kept pure so it is unit-tested
// without a model or the Convex runtime.

export type Distilled = { title: string; essence: string; pillars: string[] };
export type BoardWorthy = { verdict: boolean; reason: string };

// The canonical pillar tag vocabulary the distiller may assign (lowercase).
export const PILLAR_TAGS = [
  "lifestyle",
  "health",
  "relationships",
  "financial",
  "growth",
  "money",
  "spirit",
];

function tolerantJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
  }
  return {};
}

export function parseDistilled(raw: string): Distilled {
  const obj = tolerantJson(raw);

  const title = typeof obj.title === "string" && obj.title.trim() ? obj.title.trim().slice(0, 80) : "Untitled";
  const essence = typeof obj.essence === "string" ? obj.essence.trim().slice(0, 400) : "";
  const pillars = Array.isArray(obj.pillars)
    ? Array.from(
        new Set(
          obj.pillars
            .filter((p): p is string => typeof p === "string")
            .map((p) => p.toLowerCase().trim())
            .filter((p) => PILLAR_TAGS.includes(p)),
        ),
      ).slice(0, 3)
    : [];

  return { title, essence, pillars };
}

// The vision sieve's verdict, read from the same distill response. Defaults to NOT
// board-worthy: on garbage or a missing field, an ambient capture stays out of the
// board Inbox rather than leaking in (explicit target="board" captures never need this).
export function parseBoardWorthy(raw: string): BoardWorthy {
  const obj = tolerantJson(raw);
  const verdict = obj.board_worthy === true;
  const reason =
    typeof obj.board_reason === "string" ? obj.board_reason.trim().slice(0, 200) : "";
  return { verdict, reason };
}
