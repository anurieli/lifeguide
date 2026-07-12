# Source · Social Relationships and Mortality Risk

**Source:** Julianne Holt-Lunstad, Timothy Smith, and J. Bradley Layton, "Social Relationships and Mortality Risk: A Meta-analytic Review," *PLOS Medicine*, 2010.

**URL:** https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1000316

## Thesis / Core Constructs

Social connection is a major health determinant. The paper distinguishes:

- structural connection: degree of social network integration
- functional received support: supportive interactions actually received
- functional perceived support: belief that support is available
- combined measures: multidimensional relationship indicators

## Key Mechanisms

Across 148 prospective studies, stronger social relationships were associated with about a 50% increased odds of survival. Multidimensional social integration was stronger than simple indicators. Mechanisms likely include health behavior regulation, stress buffering, treatment adherence, physiological effects, and emotional support.

## LifeGuide Implications

- Treat social connection as a core life domain.
- Avoid shallow loneliness detection.
- Track network diversity, reciprocity, frequency, quality, and support availability.
- Build nudges around maintenance, not crisis-only outreach.

## Suggested Objects

```ts
SocialConnectionProfile = {
  networkSize: number,
  closeTiesCount: number,
  groupMemberships: string[],
  perceivedSupportScore: number,
  receivedSupportRecent: boolean,
  negativeRelationshipLoad: number,
  socialIntegrationScore: number,
  lonelinessScore?: number,
  recentSocialLossEvents: string[],
}
```

```ts
ConnectionAction = {
  actionType: "check_in" | "invite" | "repair" | "join_group" | "ask_for_help" | "offer_help",
  targetPersonOrGroup: string,
  effortLevel: "low" | "medium" | "high",
  emotionalRisk: "low" | "medium" | "high",
  scheduledAt?: number,
  completed?: boolean,
}
```

## Caveats

This is observational evidence. More relationships are not automatically better if conflict or obligation dominates.

