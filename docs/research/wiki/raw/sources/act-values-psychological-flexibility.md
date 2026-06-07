# Source · ACT Values and Psychological Flexibility

**Source:** Association for Contextual Behavioral Science, "The Six Core Processes of ACT."

**URL:** https://contextualscience.org/six_core_processes_act

**Related ACT behavior-change review:** https://pmc.ncbi.nlm.nih.gov/articles/PMC5769281/

## Thesis / Core Constructs

Acceptance and Commitment Therapy targets psychological flexibility: contacting the present moment and persisting or changing behavior in service of chosen values.

Six processes:

- acceptance
- cognitive defusion
- present-moment contact
- self-as-context
- values
- committed action

## Key Mechanisms

Values are directions, not completed goals. Goals can be achieved; values are expressed repeatedly. ACT does not remove discomfort first; it changes the person's relationship to thoughts, urges, and feelings so values-based behavior can continue.

## LifeGuide Implications

- Separate values from goals.
- Connect values to tolerated discomfort and concrete action.
- Model barriers as expected internal events, not exceptions.
- Recovery from missed goals should move from self-judgment to workable next action.

## Suggested Objects

```ts
Value = {
  name: string,
  domain: string,
  chosenByUser: boolean,
  description: string,
  antiPatterns: string[],
  exampleActions: string[],
}
```

```ts
CommittedAction = {
  valueId: string,
  goalId?: string,
  actionText: string,
  timeHorizon: "today" | "week" | "month" | "quarter",
  barrierThoughts: string[],
  defusionPrompt?: string,
  acceptancePrompt?: string,
  nextTinyStep: string,
}
```

## Caveats

Values work can become abstract. The product should force translation into observable behavior.

