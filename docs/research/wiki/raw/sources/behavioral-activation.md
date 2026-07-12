# Source · Behavioral Activation

**Sources:**

- Cochrane Review, "Behavioural activation therapy for depression in adults": https://www.cochrane.org/evidence/CD013305_behavioural-activation-therapy-depression-adults
- Alber et al., "Internet-Based Behavioral Activation for Depression: Systematic Review and Meta-Analysis," JMIR, 2023: https://www.jmir.org/2023//e41643/

## Thesis / Core Constructs

Behavioral Activation helps people re-engage with meaningful, reinforcing activities. Core elements include activity scheduling, behavior monitoring, graded tasks, and examining situations where changing activity patterns may help.

## Key Mechanisms

The Cochrane review included 53 studies / 5,495 participants. BA had greater short-term efficacy than treatment as usual, with moderate-certainty evidence, and no clear short-term difference from CBT.

The digital BA review included 12 RCTs / 3,274 participants. Internet-based BA reduced depressive symptoms post-treatment versus inactive controls, but 6-month follow-up effects were not significant.

## LifeGuide Implications

- Use small meaningful actions to stabilize low mood, drift, avoidance, or numbness.
- Ask users to predict and record mood, energy, pleasure, mastery, and connection.
- Detect withdrawal loops: low mood -> less activity -> fewer rewards -> lower mood.
- Separate activation outcome from mood outcome.
- Build maintenance and booster rituals after the initial program.

## Suggested Objects

```ts
Activity = {
  title: string,
  category: "pleasure" | "mastery" | "connection" | "values" | "maintenance",
  valueDomain?: string,
  pleasureExpected: number,
  masteryExpected: number,
  socialComponent: boolean,
  effortLevel: number,
}
```

```ts
ActivityLog = {
  activityId: string,
  completed: boolean,
  moodBefore?: number,
  moodAfter?: number,
  energyBefore?: number,
  energyAfter?: number,
  masteryAfter?: number,
  avoidanceLevel?: number,
}
```

## Caveats

LifeGuide should borrow mechanics without claiming to treat depression unless clinically validated and safety-reviewed.

