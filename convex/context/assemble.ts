import { ContextFragment } from "./types";

// Char budget as a cheap proxy for tokens (~4 chars/token). Highest-priority fragments are kept
// whole; lower-priority ones are dropped once the budget is exhausted. Pure + deterministic.
export function assembleContext(fragments: ContextFragment[], charBudget: number): string {
  const sorted = [...fragments].sort((a, b) => b.priority - a.priority);
  const kept: string[] = [];
  let used = 0;
  for (const f of sorted) {
    const block = `## ${f.label}\n${f.text}`;
    if (used + block.length > charBudget) continue;
    kept.push(block);
    used += block.length;
  }
  return kept.join("\n\n");
}
