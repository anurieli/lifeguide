# Source · Emerging Adulthood

**Source:** Jeffrey Jensen Arnett, "Emerging Adulthood: A Theory of Development From the Late Teens Through the Twenties," *American Psychologist*, 2000.

**URL:** https://www.researchgate.net/publication/12476725_Emerging_Adulthood_A_Theory_of_Development_From_the_Late_Teens_Through_the_Twenties

## Thesis / Core Constructs

Emerging adulthood is a distinct developmental period, roughly late teens through twenties, especially ages 18-25, marked by delayed entry into stable adult roles. It is not just late adolescence or settled young adulthood.

Core constructs:

- identity exploration: trying out love, work, values, beliefs, lifestyles
- instability: frequent shifts in residence, relationships, jobs, school, plans
- self-focus: increased personal agency before long-term obligations solidify
- feeling in-between: neither adolescent nor fully adult
- possibilities: unusually open future orientation and optimism

## Key Mechanisms

Instability is not always dysfunction; it is often a byproduct of exploration. The person is building an adult identity through repeated experiments. The "in-between" feeling matters because users may resist adult labels while still wanting adult agency.

The model is culturally bounded. It applies most clearly where social and economic conditions allow prolonged role exploration.

## LifeGuide Implications

- Represent life as active identity exploration, not a fixed personality profile.
- Track domains where the user is experimenting: work, relationships, location, values, health, creative identity.
- Show instability load separately from failure.
- Add weekly identity-experiment reviews: what did I try, what did I learn, what repeats?
- Coach stance: "What role are you testing?" before "What is your final goal?"

## Suggested Objects

```ts
IdentityExperiment = {
  domain: string,
  hypothesis: string,
  startDate: number,
  plannedDuration?: string,
  signalsToWatch: string[],
  result?: string,
  identityLearning?: string,
  decision?: "continue" | "pause" | "stop",
}
```

```ts
InstabilityEvent = {
  eventType: string,
  chosenOrImposed: "chosen" | "imposed" | "mixed",
  domain: string,
  stressLevel: number,
  opportunityLevel: number,
  supportNeeded?: string,
  lesson?: string,
}
```

## Caveats

Do not make "emerging adulthood" a diagnosis or assume the same timeline for every person. The product should treat it as context.

