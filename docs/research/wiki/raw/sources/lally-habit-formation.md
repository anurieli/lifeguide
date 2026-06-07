# Source · Habit Formation

**Source:** Phillippa Lally et al., "How are habits formed: Modelling habit formation in the real world," *European Journal of Social Psychology*, 2010.

**URL:** https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674

## Thesis / Core Constructs

Habits form through repeated behavior in a consistent context until the behavior becomes increasingly automatic.

## Key Mechanisms

The study tracked 96 people over 12 weeks. Automaticity followed an asymptotic curve: early repetitions matter a lot, then gains slow. Time to reach 95% of maximum automaticity ranged widely, from 18 to 254 days. Missing one opportunity did not materially derail habit formation.

## LifeGuide Implications

- Do not build habit UX around brittle streak worship.
- Track same cue plus same behavior, not just completion count.
- Show habit maturity as automaticity estimate.
- Treat missed days as data: what blocked the context?
- Encourage tiny stable behaviors before scaling intensity.

## Suggested Objects

```ts
Habit = {
  behavior: string,
  cueType: "time" | "location" | "preceding_event" | "social_context",
  cueValue: string,
  contextLabel: string,
  frequency: string,
  startDate: number,
}
```

```ts
HabitCheckin = {
  habitId: string,
  completed: boolean,
  sameContext: boolean,
  effortRating: number,
  automaticityRating: number,
  missReason?: string,
}
```

## Caveats

The popular 66-day simplification is misleading. Duration varies by person, behavior, and context.

