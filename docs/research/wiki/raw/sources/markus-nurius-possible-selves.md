# Source · Possible Selves

**Source:** Hazel Markus and Paula Nurius, "Possible Selves," *American Psychologist*, 1986.

**URL:** https://web.stanford.edu/~hazelm/publications/1986_Markus%20%26%20Nurius_PossibleSelves.pdf

## Thesis / Core Constructs

Possible selves are future-oriented self-representations: what a person might become, wants to become, or fears becoming. They connect self-concept to motivation.

Core types:

- hoped-for selves
- feared selves
- expected selves
- avoided selves
- socially modeled selves

## Key Mechanisms

Possible selves work as motivational objects. They give goals and fears a concrete self-relevant form. "Be healthier" is weaker than a vivid possible self: a person who wakes rested, trains regularly, and feels strong.

Possible selves also interpret the present. A setback can be read as evidence of growth or as drift toward a feared future, depending on which possible self is active.

## LifeGuide Implications

- Future Self should include hoped-for, expected, and feared selves.
- Link possible selves to domains, values, fears, rituals, and evidence.
- Track vividness, believability, and behavioral path.
- Coach prompt: "Which possible self is this choice feeding?"

## Suggested Objects

```ts
PossibleSelf = {
  type: "hoped_for" | "feared" | "expected" | "avoided",
  name: string,
  domain: string,
  narrative: string,
  vividness: number,
  desirability?: number,
  fearedIntensity?: number,
  perceivedLikelihood: number,
  perceivedControl: number,
  sourceModels: string[],
  identityFit: number,
  nextBehavior?: string,
}
```

```ts
FutureSelfScene = {
  possibleSelfId: string,
  timeHorizon: string,
  ordinaryDayDescription: string,
  visibleBehaviors: string[],
  relationships: string[],
  environment: string[],
  ritualsPresent: string[],
}
```

## Caveats

Possible selves are not affirmations. If vague, unrealistic, or disconnected from constraints, they may not regulate behavior.

