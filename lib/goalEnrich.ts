// Pure helper: assemble the model input for drafting a goal/aspiration's
// roadmap ("what this actually takes" + a starter step list). Kept pure so
// it's unit-testable without Convex or a model.

export type GoalEnrichInput = {
  name: string;
  why?: string;
  deadline?: string;
  pillarName?: string;
  laddersTo?: "five_year" | "one_year" | "one_month";
};

const LADDER_LABEL: Record<string, string> = {
  five_year: "a 5-year vision",
  one_year: "a 1-year goal",
  one_month: "this month's goal",
};

export function assembleGoalEnrichInput(goal: GoalEnrichInput): string {
  const lines = [`Name: ${goal.name}`];
  if (goal.why) lines.push(`Why it matters: ${goal.why}`);
  lines.push(
    goal.deadline
      ? `Deadline: ${goal.deadline}`
      : "Deadline: none yet — this is a someday aspiration.",
  );
  if (goal.pillarName) lines.push(`Life area: ${goal.pillarName}`);
  if (goal.laddersTo) lines.push(`Ladders up to: ${LADDER_LABEL[goal.laddersTo]}`);
  return lines.join("\n");
}
