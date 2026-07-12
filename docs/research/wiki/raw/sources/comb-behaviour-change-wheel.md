# Source · COM-B / Behaviour Change Wheel

**Source:** Susan Michie, Maartje van Stralen, and Robert West, "The Behaviour Change Wheel," *Implementation Science*, 2011.

**URL:** https://link.springer.com/article/10.1186/1748-5908-6-42

## Thesis / Core Constructs

Behavior change should start from a diagnosis of why a target behavior is or is not happening. COM-B says behavior depends on:

- capability: physical and psychological capacity
- opportunity: physical and social context
- motivation: reflective goals/plans plus automatic emotion, impulses, habits, reward learning

The Behaviour Change Wheel maps COM-B deficits to intervention functions such as education, persuasion, incentivisation, training, restriction, environmental restructuring, modelling, and enablement.

## Key Mechanisms

Many interventions fail because they skip behavior diagnosis. COM-B treats behavior as context-dependent, not only motivation-dependent, and explicitly includes automatic processing and habit.

## LifeGuide Implications

- Ask "what blocks the next behavior?" not only "what goal do you want?"
- Diagnose capability, opportunity, and motivation before advice.
- Pick interventions based on the barrier.
- Re-diagnose when adherence drops.

## Suggested Objects

```ts
COMBDiagnosis = {
  targetBehaviorId: string,
  physicalCapability: string[],
  psychologicalCapability: string[],
  physicalOpportunity: string[],
  socialOpportunity: string[],
  reflectiveMotivation: string[],
  automaticMotivation: string[],
  confidence: number,
}
```

```ts
InterventionPlan = {
  function: "education" | "persuasion" | "training" | "restriction" | "environmental_restructuring" | "modelling" | "enablement",
  technique: string,
  userFacingPrompt: string,
  expectedMechanism: string,
}
```

## Caveats

COM-B is a design framework, not a finished intervention. It still needs evidence-backed techniques and careful measurement.

