# Source · Motivational Interviewing

**Sources:**

- Rubak et al., "Motivational interviewing: a systematic review and meta-analysis": https://pmc.ncbi.nlm.nih.gov/articles/PMC1463134/
- Miller and Rose, "Toward a Theory of Motivational Interviewing": https://pmc.ncbi.nlm.nih.gov/articles/PMC2759607/
- MINT overview: https://motivationalinterviewing.org/node/11216

## Thesis / Core Constructs

Motivational Interviewing is a directive, client-centered counseling style for resolving ambivalence and eliciting behavior change.

It has:

- relational component: partnership, acceptance, compassion, evocation
- technical component: attend to change talk and sustain talk
- OARS skills: open questions, affirmations, reflections, summaries
- flow: engaging, focusing, evoking, planning

## Key Mechanisms

MI works partly by increasing user speech in favor of change and strengthening commitment language. The meta-analysis found MI outperformed traditional advice in many behavior-change contexts.

## LifeGuide Implications

- Do not lead with advice when the user is ambivalent.
- Map change talk and sustain talk.
- If readiness is low, do not jump to plans.
- If confidence is low, evoke past success and ability.
- If change talk strengthens, then convert it into a plan.

## Suggested Objects

```ts
AmbivalenceMap = {
  targetBehavior: string,
  changeTalk: string[],
  sustainTalk: string[],
  importanceScore: number,
  confidenceScore: number,
  readinessScore: number,
  discrepancy: {
    currentBehavior: string,
    desiredIdentityOrValue: string,
  },
}
```

```ts
MIConversationState = {
  phase: "engaging" | "focusing" | "evoking" | "planning",
  allianceSignals: string[],
  focusTopic?: string,
  changeTalkScore: number,
  sustainTalkScore: number,
  commitmentLanguageScore: number,
  nextBestMove: string,
}
```

## Caveats

MI is not generic positivity. Poor implementation can feel manipulative if the system selectively reflects only what it wants the user to say.

