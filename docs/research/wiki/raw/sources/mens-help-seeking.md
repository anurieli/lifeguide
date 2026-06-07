# Source · Men's Help-Seeking and Mental Health Messaging

**Sources:**

- Seidler et al., "The role of masculinity in men's help-seeking for depression: A systematic review": https://www.sciencedirect.com/science/article/pii/S0272735816300046
- Duthie et al., "The impact of media-based mental health campaigns on male help-seeking: a systematic review": https://minerva-access.unimelb.edu.au/server/api/core/bitstreams/e4cbb7bd-1c7f-4581-afc8-802becf5878f/content

## Thesis / Core Constructs

Men's help-seeking is shaped by masculine norms such as self-reliance, stoicism, emotional control, strength, and autonomy. Mental-health messaging for men works better when framed around action, control, courage, responsibility, and practical support.

## Key Mechanisms

Traditional masculine norms can make distress harder to recognize and disclose. Men may prefer collaborative, action-oriented, problem-solving support. Campaigns using testimonials, brief explainers, humor, strength, courage, logic, and non-stigmatizing wording show promise.

## LifeGuide Implications

- Do not lead with "talk about your feelings" for every user.
- Reframe help-seeking as skillful action: get leverage, reduce risk, build a plan, get backup.
- Recognize male-coded distress patterns: irritability, anger, alcohol use, risk-taking, withdrawal, sleep disruption, overwork.
- Offer practical first-step workflows: who to contact, what to say, what to expect.

## Suggested Objects

```ts
HelpSeekingProfile = {
  selfReliancePreference: "low" | "medium" | "high",
  stigmaConcernLevel: "low" | "medium" | "high",
  emotionalDisclosureComfort: "low" | "medium" | "high",
  preferredSupportStyle: "action_oriented" | "reflective" | "educational" | "peer" | "clinical",
  symptomExpressionPattern: "internalizing" | "externalizing" | "mixed",
  likelyFirstContact?: "friend" | "partner" | "gp" | "therapist" | "helpline" | "online" | "none",
}
```

## Caveats

Men are not homogeneous. Masculinity-sensitive framing can help, but can also reinforce narrow norms if handled clumsily.

