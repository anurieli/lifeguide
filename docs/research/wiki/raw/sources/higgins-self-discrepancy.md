# Source · Self-Discrepancy

**Source:** E. Tory Higgins, "Self-Discrepancy: A Theory Relating Self and Affect," *Psychological Review*, 1987.

**URL:** https://www.columbia.edu/cu/psychology/higgins/papers/HIGGINS%3DPSYCH%20REVIEW%201987.pdf

**Related:** https://pmc.ncbi.nlm.nih.gov/articles/PMC4023076/

## Thesis / Core Constructs

People compare their actual self with internalized self-guides. Different gaps produce different emotional vulnerabilities.

Core self-states:

- actual self: who I believe I am
- ideal self: who I want or hope to be
- ought self: who I believe I should be, based on duties or others' expectations

Standpoints:

- own: my own standard
- other: a significant other's perceived standard

## Key Mechanisms

Actual-ideal discrepancies are associated with dejection-type emotions: disappointment, sadness, discouragement, dissatisfaction.

Actual-ought discrepancies are associated with agitation-type emotions: anxiety, guilt, threat, restlessness.

A discrepancy matters more when it is accessible and frequently cued.

## LifeGuide Implications

- Track not only goals, but whose standard the goal belongs to.
- Distinguish aspiration from obligation pressure.
- Map emotional signals to discrepancy type.
- Some standards should be renegotiated, not achieved.

## Suggested Objects

```ts
SelfStandard = {
  standardType: "ideal" | "ought",
  standpoint: "own" | "other",
  sourcePersonOrGroup?: string,
  domain: string,
  description: string,
  internalizationLevel: number,
  legitimacyRating: number,
  currentImportance: number,
  accessibility: number,
  emotionalSignature: "dejection" | "agitation" | "mixed",
}
```

```ts
SelfDiscrepancy = {
  actualState: string,
  standardId: string,
  gapDescription: string,
  gapSize: number,
  emotionCluster: "dejection" | "agitation" | "mixed",
  triggerContexts: string[],
  actionability: number,
  response: "revise_standard" | "pursue_action" | "hold",
}
```

## Caveats

Measuring gaps can intensify shame if handled badly. LifeGuide should frame gaps as navigation, not defects.

