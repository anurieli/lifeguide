# Source · Self-Authorship

**Source:** Marcia Baxter Magolda / self-authorship model; accessible summary: Alkathiri, *International Journal of Doctoral Studies*.

**URL:** https://ijds.org/Volume14/IJDSv14p597-611Alkathiri5140.pdf

## Thesis / Core Constructs

Self-authorship is the capacity to internally generate one's beliefs, identity, and relationships rather than living mainly through external formulas.

Three dimensions:

- epistemological: how I know and evaluate knowledge
- intrapersonal: who I am; values, interests, identity, goals
- interpersonal: how I relate while preserving autonomy

Developmental phases:

- following external formulas
- crossroads
- becoming the author of one's life
- internal foundations

## Key Mechanisms

The central mechanism is a shift in authority: from "what do others say I should believe/do/be?" toward "what do I believe, based on evidence, values, and lived consequences?"

The crossroads phase is product-relevant because users often feel tension between external scripts and internal values before they can articulate their own position.

## LifeGuide Implications

- Separate borrowed beliefs from chosen beliefs.
- Track where the user relies on external authority versus internal judgment.
- Add "external formula audit" prompts: whose script is this, and does it still fit?
- Coach should scaffold authorship, not outsource decision-making to AI.

## Suggested Objects

```ts
SelfAuthorshipProfile = {
  epistemologicalStage?: string,
  intrapersonalStage?: string,
  interpersonalStage?: string,
  dominantExternalFormulas: string[],
  internalValues: string[],
  currentCrossroads: string[],
  authoredCommitments: string[],
}
```

```ts
Belief = {
  claim: string,
  sourceType: "borrowed" | "chosen" | "tested" | "unknown",
  borrowedFrom?: string,
  evidence: string[],
  confidence: number,
  valueAlignment: number,
  lastReexaminedAt?: number,
}
```

## Caveats

Self-authorship is not pure individualism. Mature authorship includes relationships and responsibility.

