# Motivation, Values, and Coaching

## Summary

LifeGuide's Coach should not be a generic advice machine. The best-supported coaching backbone is: protect autonomy, build competence, connect goals to values, map ambivalence, and only move to plans when the user is ready.

## Core Ideas

- Self-Determination Theory says motivation quality matters. Autonomy, competence, and relatedness are central.
- ACT says values are directions, not goals. Committed action means acting toward values even when discomfort is present.
- Motivational Interviewing says ambivalence is normal and advice should not outrun readiness.
- Coach lenses can interpret the same self-map differently, but they should not invent new facts.

## Evidence

- [`ryan-deci-self-determination-theory.md`](../raw/sources/ryan-deci-self-determination-theory.md)
- [`act-values-psychological-flexibility.md`](../raw/sources/act-values-psychological-flexibility.md)
- [`motivational-interviewing.md`](../raw/sources/motivational-interviewing.md)
- Internal Core treatment note: [`core-backbone-ai-treatment.md`](../raw/internal-notes/core-backbone-ai-treatment.md)

## Product Translation

The Coach should know whether it is clarifying, reflecting, challenging, diagnosing, or planning. It should not always default to advice.

```ts
CoachLens =
  | "socratic"
  | "values_based"
  | "behavioral"
  | "strategic"
  | "hard_truth"
  | "meaning"
  | "creative"
  | "athlete";
```

Useful objects:

```ts
MotivationProfile = {
  autonomyNeedScore: number,
  competenceNeedScore: number,
  relatednessNeedScore: number,
  regulationType: "external" | "introjected" | "identified" | "integrated" | "intrinsic",
  userReason: string,
  pressureSignals: string[],
}
```

```ts
AmbivalenceMap = {
  targetBehavior: string,
  changeTalk: string[],
  sustainTalk: string[],
  importanceScore: number,
  confidenceScore: number,
  readinessScore: number,
}
```

## Open Questions

- Are Coach lenses user-selected, system-selected, or both?
- Should per-Core-item AI treatment notes override global Coach tone?
- How does the app prevent "hard truth" from becoming shame or coercion?

## Related

- [Self-Map Backbone](self-map-backbone.md)
- [Habits, Stabilization, and Consistency](habits-stabilization-and-consistency.md)

