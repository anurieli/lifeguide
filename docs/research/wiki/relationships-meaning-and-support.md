# Relationships, Meaning, and Support

## Summary

The self-map cannot only contain internal traits. People are shaped by relationships, groups, support, social media, inherited scripts, and sources of meaning. LifeGuide should treat social connection and meaning as load-bearing domains.

## Core Ideas

- Social relationships are strongly associated with health and survival; connection is not a side quest.
- Relationship quality, network diversity, and perceived support matter more than crude proxies like living alone.
- Help-seeking for men often improves when framed as agency, control, responsibility, backup, or practical problem-solving.
- Meaning can be actively constructed through narrative, values, contribution, purpose, and meaning repair.

## Evidence

- [`holt-lunstad-social-relationships.md`](../raw/sources/holt-lunstad-social-relationships.md)
- [`mens-help-seeking.md`](../raw/sources/mens-help-seeking.md)
- [`meaning-in-life-interventions.md`](../raw/sources/meaning-in-life-interventions.md)
- Internal pillar note: [`pillars-data-model.md`](../raw/internal-notes/pillars-data-model.md)

## Product Translation

Social environment should be a first-class layer of the self-map:

```ts
RelationshipInfluence = {
  personOrGroup: string,
  closeness: number,
  influence: "pulls_forward" | "neutral" | "pulls_backward" | "mixed",
  modeledTraits: string[],
  supportAvailable: boolean,
  negativeLoad: number,
}
```

Meaning should connect life story to action:

```ts
MeaningProfile = {
  presenceOfMeaningScore?: number,
  searchForMeaningScore?: number,
  purposeClarityScore?: number,
  values: string[],
  lifeRoles: string[],
  contributionSources: string[],
  currentSourcesOfMeaning: string[],
}
```

The Coach should support help-seeking without infantilizing the user:

```ts
SupportRoute = {
  routeType: "informal" | "clinical" | "anonymous" | "peer" | "self_guided",
  barrierAddressed: "stigma" | "cost" | "uncertainty" | "trust" | "time" | "identity_threat",
  nextStepScript: string,
  urgencyLevel: "routine" | "soon" | "urgent" | "crisis",
}
```

## Open Questions

- How much social mapping should LifeGuide ask for before it feels invasive?
- Should social media/influence be a separate object or part of `RelationshipInfluence` / `InfluenceSource`?
- What safety-routing threshold is required for hopelessness, crisis language, or severe distress?

## Related

- [Identity and Vision](identity-and-vision.md)
- [Habits, Stabilization, and Consistency](habits-stabilization-and-consistency.md)

