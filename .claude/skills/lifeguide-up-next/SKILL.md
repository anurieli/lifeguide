---
name: lifeguide-up-next
description: The read-side mirror of lifeguide-gate — tells you what's up next in the LifeGuide app and whether a thing is already parked. Use whenever the user asks "what's next", "what should I work on", "where are we", "what's in flight", "what's left", "is X already parked / is there an issue for X", or before starting a piece of work to check it isn't already a parked Linear issue. Surveys in-flight loops (current branch + WIP, in-progress Linear issues in the LifeGuide project, TodoWrite, TO-CHECK.md) and parked work (Backlog in the LifeGuide Linear project), then recommends the single next thing to do and flags duplicates so you don't re-open an existing loop.
---

# LifeGuide — What's Up Next

The read companion to `lifeguide-gate`. The gate *parks* new work; this *reads* the whole field and tells you what to pick up next — and warns you when something you're about to start is **already** a Linear issue (in flight or parked) so you don't open a duplicate loop.

**Trigger:** the user asks what's next / what's left / where we are, or is about to start a piece of work and you want to confirm it isn't already tracked.

## Workflow

### 1. Survey what's in flight
Cheaply gather the open loops:
- **Branch + WIP:** `git branch --show-current` and `git status --short`. A non-`main` branch with diffs is a loop in flight; name it.
- **In-progress Linear issues** in the LifeGuide project: `mcp__claude_ai_Linear__list_issues` with `project: "LifeGuide"`, `state: "In Progress"`.
- **Session TODOs** (TodoWrite) and pending items in `TO-CHECK.md` (repo root) — manual QA owed.

### 2. Survey what's parked
- **Backlog** in the LifeGuide Linear project: `mcp__claude_ai_Linear__list_issues` with `project: "LifeGuide"`, `state: "Backlog"`. These are deliberately-deferred loops, not next-actions — but they're the menu.

### 3. If checking a specific item — is it already tracked?
When the user is about to start work on something specific, **before** sizing or building it, scan the in-flight + parked lists (titles and descriptions) for a match. If it's already there:
- Say so plainly with the issue id + URL and its state (In Progress / Backlog).
- Don't re-open it. Offer to **resume** that issue (move to In Progress, check out its `gitBranchName`) instead of creating a new one.
This is the guard that keeps the gate honest: the gate parks; this stops you re-parking or re-building the same thing.

### 4. Recommend the single next thing
Don't dump the whole board as equals. Give a short, ranked read:
- **You're mid-loop on:** `<branch>` — the WIP that should land or be committed first (finishing an open loop usually beats starting a parked one).
- **Recommended next:** one item, with a one-line why. Prefer (a) finishing in-flight WIP, then (b) the highest-priority In Progress issue, then (c) promoting a high-priority Backlog item.
- **Also waiting:** a tight list of the rest (in-progress + notable parked), each one line with id + priority.
- **QA owed:** anything in `TO-CHECK.md` not yet verified.

Keep it terminal-short. The user wants a decision, not a report.

### 5. Acting on the choice
- **Promote a parked item to next:** move the Linear issue to *In Progress* (`mcp__claude_ai_Linear__save_issue` with its `id` and `state: "In Progress"`). Net-new work that is NOT already tracked must still go through `lifeguide-gate` first — this skill never bypasses the gate, it feeds it.
- **Resume an in-flight item:** check out its `gitBranchName`; continue.
- Never silently start. Surface the choice, let the user pick.

## Conventions
- LifeGuide Linear project: `LifeGuide` (id `e0af6c94-da8e-4ac3-8fd7-415f9c9cd2f8`), under the **Personal** team (key `ARI`) as of 2026-06-04. If it moved, resolve with `mcp__claude_ai_Linear__get_project({ query: "LifeGuide" })`.
- Linear MCP tools are deferred — load them with `ToolSearch` (`select:mcp__claude_ai_Linear__list_issues`, etc.) before calling.
- "In flight" beats "parked": closing an open loop is almost always higher-leverage than opening a parked one. Bias the recommendation toward landing WIP.
- This skill is read-and-route only. To park something new, hand off to `lifeguide-gate`.
