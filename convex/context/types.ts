// The Context Bus vocabulary. Every surface publishes ContextFragments; a pure assembler
// stitches them under a budget for any AI call. Scopes nest: selection ⊂ viewport ⊂ surface,
// plus the cross-surface "summary" and the global "mirror".
export type ContextScope = "selection" | "viewport" | "surface";

export type ContextFragment = {
  surfaceId: string;
  scope: ContextScope | "summary" | "mirror";
  label: string;
  text: string; // serialized, model-ready
  priority: number; // higher = keep first under budget
};
