// Pure, dependency-free parsing of the distillation model's JSON output.
// Tolerant: handles clean JSON, prose-wrapped JSON, and garbage. Kept pure so it is unit-tested
// without a model or the Convex runtime.

export type Distilled = { title: string; essence: string; pillars: string[] };

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

export function parseDistilled(raw: string): Distilled {
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        obj = JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        obj = {};
      }
    }
  }

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
