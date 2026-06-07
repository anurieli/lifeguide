# Habits, Stabilization, and Consistency

## Summary

Consistency is the root behavior LifeGuide is trying to create. Research points away from brittle streaks and toward context repetition, behavior diagnosis, small stabilizing actions, and recovery when a ritual is missed.

## Core Ideas

- COM-B says behavior requires capability, opportunity, and motivation.
- Habit formation depends on repeated behavior in a consistent context; automaticity grows unevenly and missed days do not reset everything.
- Behavioral Activation stabilizes people by reintroducing meaningful, reinforcing activities.
- The ritual layer should be flexible enough to support morning orientation, midday reset, evening reflection, and crisis-adjacent stabilization.

## Evidence

- [`comb-behaviour-change-wheel.md`](../raw/sources/comb-behaviour-change-wheel.md)
- [`lally-habit-formation.md`](../raw/sources/lally-habit-formation.md)
- [`behavioral-activation.md`](../raw/sources/behavioral-activation.md)
- Internal ritual note: [`self-map-and-ritual-backbone.md`](../raw/internal-notes/self-map-and-ritual-backbone.md)

## Product Translation

LifeGuide should model the ritual itself as a habit-like behavior, but without punitive streak mechanics.

```ts
Ritual = {
  cadence: "morning" | "midday" | "evening" | "anytime",
  purpose: "orient" | "reset" | "reflect" | "decide" | "dump" | "stabilize",
  cue: string,
  minimumVersion: string,
  lastCompletedAt?: number,
}
```

Behavior advice should start with diagnosis:

```ts
COMBDiagnosis = {
  physicalCapability: string[],
  psychologicalCapability: string[],
  physicalOpportunity: string[],
  socialOpportunity: string[],
  reflectiveMotivation: string[],
  automaticMotivation: string[],
}
```

When the user is low or drifting, the app should propose a stabilizing action:

```ts
StabilizingAction = {
  title: string,
  category: "pleasure" | "mastery" | "connection" | "values" | "maintenance",
  effortLevel: number,
  minimumStep: string,
  expectedReward?: number,
  actualReward?: number,
}
```

## Open Questions

- Should LifeGuide show automaticity estimates or keep habit maturity invisible?
- What is the smallest ritual that still counts?
- How explicit should mood/energy tracking be before it feels clinical?

## Related

- [Motivation, Values, and Coaching](motivation-values-and-coaching.md)
- [Relationships, Meaning, and Support](relationships-meaning-and-support.md)

