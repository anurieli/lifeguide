# Source · Self-Determination Theory

**Source:** Richard Ryan and Edward Deci, "Intrinsic and Extrinsic Motivations: Classic Definitions and New Directions," 2000.

**URL:** https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_IntExtDefs.pdf

**Theory overview:** https://selfdeterminationtheory.org/theory/

## Thesis / Core Constructs

Self-Determination Theory is about the quality of motivation, not just motivation amount. Durable motivation and well-being are supported by:

- autonomy: I choose this / endorse this
- competence: I can get better at this
- relatedness: I am connected to others

Extrinsic motivation ranges from controlled to autonomous: external regulation, introjected regulation, identified regulation, integrated regulation.

## Key Mechanisms

Intrinsic motivation is doing an activity because it is interesting or satisfying. Extrinsic motivation can still be high quality when the person identifies with the value of the behavior or integrates it into identity.

Guilt, shame, ego pressure, and external rewards can create effort but often produce anxiety, poorer coping, and fragile persistence.

## LifeGuide Implications

- Avoid streak guilt as the main engine.
- Help users convert "I should" into personally endorsed reasons.
- Progress UX should reinforce autonomy and competence, not compliance.
- Coaching prompts should ask what makes something worth doing for the user.

## Suggested Objects

```ts
MotivationProfile = {
  autonomyNeedScore: number,
  competenceNeedScore: number,
  relatednessNeedScore: number,
  regulationType: "external" | "introjected" | "identified" | "integrated" | "intrinsic",
  userReason: string,
  pressureSignals: string[],
  valueAlignmentScore: number,
  confidenceScore: number,
  supportPeopleIds: string[],
}
```

## Caveats

SDT does not say rewards are always bad or that everything must be fun. The design move is internalization.

