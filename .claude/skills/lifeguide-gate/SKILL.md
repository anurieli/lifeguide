---
name: lifeguide-gate
description: Commitment gate for net-new dev work in the LifeGuide app. Use whenever a new feature, task, or research/spike item is proposed while working in the LifeGuide repo — e.g. "let's add X", "we should build Y", "idea:", "what if the app…", "we need to research Z", or any net-new TODO that is NOT part of the task currently being executed. Checks how much dev work is already actively in flight, sizes the new item, and forces a deliberate choice — commit now (with an effort estimate + the tests it takes to finish) or park it as an issue in the private LifeGuide Linear project instead of opening another open loop.
---

# LifeGuide Commitment Gate

Stops new dev ideas from silently becoming a second (or third) open loop. Every net-new feature/task/research item either gets a deliberate commitment, or gets parked in the LifeGuide Linear project for later.

**Trigger:** a net-new piece of dev work surfaces in the LifeGuide repo that is *not* the task currently being executed. Run the gate **before** writing any code for it.

## Workflow

### 1. Detect — is this actually net-new work?
Skip the gate if the item is part of the task the user already greenlit this session. Run the gate when the item is a new feature, a new task, or a research/spike — anything that would open its own loop.

### 2. Measure active load — how much is already in flight?
Count current open dev loops, cheaply:
- **In-progress Linear issues** in the LifeGuide project. Use `mcp__claude_ai_Linear__list_issues` with `project: "LifeGuide"`, `state: "In Progress"`.
- **Uncommitted / WIP in the repo**: `git status --short` and `git branch --show-current` (a non-`main` branch with diffs = a loop in flight).
- Active TODOs in this session (TodoWrite) and pending items in `TO-CHECK.md`.

Report the count in one line, e.g. *"2 loops already in flight (branch `app-shell` WIP + 1 in-progress Linear issue)."* This is the "scare": it makes the cost of context-switching visible.

### 3. Size the new item — let the AI analyze the work
Produce a quick estimate:
- **Effort:** XS / S / M / L / XL with a rough time (e.g. "M — ~half a day").
- **Surface area:** files/components likely touched, schema or data-model impact, docs that CLAUDE.md requires updating.
- **Definition of done:** the specific tests/verifications it'll take to finish (e.g. "unit test for the distiller, a Convex action test, and a manual Today-ritual smoke test"). Be concrete — this is the part that makes commitment feel real.

### 4. Present the gate
Ask the user, plainly:

> **Commit to this now?** It's ~**\<estimate\>** and there are already **\<N\>** loops in flight. To see it through you'll need to: **\<test A\>, \<test B\>, \<test C\>**.
> Commit and start now, or **park it in Linear** (LifeGuide project) to protect your current loop?

Use the `AskUserQuestion` tool with two options: **Commit now** / **Park in Linear** (offer a third only if a genuine "tiny spike first" middle path exists).

### 5. Act on the choice
- **Commit now →** proceed with the work as normal. Optionally also create a tracking issue in Linear set to *In Progress* so the loop is visible. Follow the repo's two non-negotiable rules (docs-in-the-same-change + CHANGELOG).
- **Park in Linear →** create an issue in the **LifeGuide** project. See [references/linear-upload.md](references/linear-upload.md) for the exact call and field conventions. Then reply with the issue URL and stop — do not start the work.

## Notes
- The Linear project is **private to Ariel**. Project: `LifeGuide` (id `e0af6c94-da8e-4ac3-8fd7-415f9c9cd2f8`), currently under the `Agents & Skills` team. If it has moved to a dedicated `LifeGuide` team, resolve the team from the project rather than hardcoding.
- Default load threshold for "you already have a lot going on": **2+ active loops**. Below that, still run the gate but lead lighter — the choice is always the user's.
- Never park silently and never start silently. The whole point is a deliberate, visible decision.
