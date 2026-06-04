import { BLUEPRINT, type BlueprintQuestion } from "../blueprint";

export type InterviewState = {
  answered: Record<string, string>; // key -> content
  skipped: string[];                // keys skipped this run
  circledBack: string[];            // skipped keys we've already re-offered once
};

const ORDER: BlueprintQuestion[] = BLUEPRINT.flatMap((s) => s.questions);
const isFilled = (v?: string) => !!v && v.trim().length > 0;

export function nextQuestion(state: InterviewState): BlueprintQuestion | null {
  // 1. First fresh, never-skipped, unanswered question in canonical order.
  for (const q of ORDER) {
    if (isFilled(state.answered[q.key])) continue;
    if (state.skipped.includes(q.key)) continue;
    return q;
  }
  // 2. No fresh ones left — circle back to a skipped key we haven't re-offered yet.
  for (const q of ORDER) {
    if (isFilled(state.answered[q.key])) continue;
    if (state.skipped.includes(q.key) && !state.circledBack.includes(q.key)) return q;
  }
  // 3. Nothing left to ask.
  return null;
}
