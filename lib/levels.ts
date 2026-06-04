import { BLUEPRINT } from "./blueprint";

export const ALL_KEYS: string[] = BLUEPRINT.flatMap((s) => s.questions.map((q) => q.key));

export type BlueprintStatus = "unstarted" | "in_progress" | "complete";

const filled = (v?: string) => !!v && v.trim().length > 0;

export function filledCount(answers: Record<string, string>): number {
  return ALL_KEYS.filter((k) => filled(answers[k])).length;
}

export function blueprintStatus(answers: Record<string, string>): BlueprintStatus {
  const n = filledCount(answers);
  if (n === 0) return "unstarted";
  if (n === ALL_KEYS.length) return "complete";
  return "in_progress";
}

// L0 = blueprint unfinished; L1 = all 18 filled (app unlocked); L2+ deferred (engagement-driven).
export function deriveLevel(answers: Record<string, string>): number {
  return blueprintStatus(answers) === "complete" ? 1 : 0;
}
