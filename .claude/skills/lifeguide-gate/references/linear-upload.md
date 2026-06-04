# Parking an item in the LifeGuide Linear project

When the user chooses **Park in Linear**, create one issue per item with the Linear MCP.

## The call

Use `mcp__claude_ai_Linear__save_issue` (do NOT pass `id` — that's only for updates):

```
mcp__claude_ai_Linear__save_issue({
  title:   "<short imperative title>",
  team:    "Personal",             // the team the LifeGuide project lives under (key ARI)
  project: "LifeGuide",            // or id e0af6c94-da8e-4ac3-8fd7-415f9c9cd2f8
  assignee:"me",
  state:   "Backlog",
  priority: 3,                      // 0 None,1 Urgent,2 High,3 Medium,4 Low — pick from context
  labels:  ["<feature|task|research>"],   // skip if the label doesn't exist yet
  description: "<see template below>"
})
```

The LifeGuide project lives under the **Personal** team (key `ARI`) as of 2026-06-03. If it moves again, resolve the current team with `mcp__claude_ai_Linear__get_project({ query: "LifeGuide" })` and read `teams[0].name`.

## Description template

Write the description as Markdown with **literal newlines** (no `\n` escapes):

```
## What
<one-paragraph description of the feature/task/research item>

## Why
<the motivation / the problem it solves — captured so future-you remembers>

## Effort estimate
<XS/S/M/L/XL> — ~<rough time>. Touches: <files/components>. Data-model impact: <yes/no + what>.

## Definition of done
- [ ] <test / verification A>
- [ ] <test / verification B>
- [ ] <test / verification C>
- [ ] Docs updated per CLAUDE.md (feature doc / data-model / ADR as applicable)
- [ ] CHANGELOG entry

## Source
Parked from the commitment gate on <date>. Active loops at the time: <N>.
```

## After creating
- Return the issue URL from the tool response to the user.
- Do **not** start the work. Parking means deferring.
- If parking several items at once, create them in one batch (parallel tool calls) and list all URLs back.
