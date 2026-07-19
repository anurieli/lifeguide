# LifeGuide — Agent Operating Guide

LifeGuide is an AI-first, context-aware personal life platform: **"the space for the individual."** It helps (primarily) young men who feel lost reflect, hold themselves accountable, set goals that matter to them, and stay aligned with who they're becoming. It builds and steers one thing: a person's true self and the plan for their life, through a **Core** (who you are) and daily **Sessions** (your days), curated by the **Coach**.

> **Docs reset 2026-06-03.** The old spec set was cleared to remove stale, conflicting direction (all recoverable from git). We rebuild from two seeds: this repo's [`docs/product/concept-and-soul.md`](docs/product/concept-and-soul.md) (see its "evolved system" section, the current source of truth) and the original **Life Blueprint** app at `~/lifeguide` (the working model for the Journal and the Core). Treat nothing as spec unless it lives in those two places or was rebuilt from them.

**Start here:** [`docs/README.md`](docs/README.md) · soul and current vision: [`docs/product/concept-and-soul.md`](docs/product/concept-and-soul.md)

---

## ⚠️ The two non-negotiable rules

### 1. Docs are the source of truth — keep them current in the SAME change
Any change to product behavior, features, scope, architecture, data model, or design **must** be reflected in the relevant file under `docs/` as part of the same piece of work. Code and docs move together. If you build it or decide it, you document it — immediately, not "later."

| You changed… | You MUST update… |
|---|---|
| A feature's behavior (or added one) | `docs/product/features/<feature>.md` (create from `_TEMPLATE.md` if missing) |
| Schema / data shape | `docs/architecture/data-model.md` |
| System/architecture/context flow | the relevant `docs/architecture/*.md` |
| A notable decision or tradeoff | new ADR in `docs/decisions/` |
| UI / interaction / screens | `docs/design/*.md` |
| Scope, phasing, or sequence | `docs/product/prd.md` + `docs/roadmap.md` |
| A research/spike item parked or completed | `docs/research/<slug>.md` (own file per item; index in `docs/research/README.md`) |

### 2. Keep the CHANGELOG — every meaningful change, with the docs you touched
After any meaningful work (feature, fix, refactor, doc expansion, decision), append an entry to [`CHANGELOG.md`](CHANGELOG.md) at the repo root. **Use the `changelog` skill.** Every entry must record:
- **What was done** (and the commit hash, once we're building)
- **Docs touched:** the exact documentation files created or updated

The changelog is how any agent or session picks up cold. No silent changes.

> These reinforce and specialize the global rule in `~/.claude/CLAUDE.md` ("every technical project maintains a changelog"). Here we additionally require that every change names the documentation it updated.

### 3. New work goes through the commitment gate — don't open a loop silently
Any **net-new** feature, task, or research/spike item proposed in this repo (anything beyond the task already greenlit this session) must pass through the **commitment gate** before any code is written. Invoke the **`lifeguide-gate`** skill: it measures how much dev work is already in flight, sizes the new item (effort + the tests it takes to finish), and forces a deliberate choice — **commit now**, or **park it as an issue in the private LifeGuide Linear project** (`linear.app/cuttheedge/project/lifeguide-67aceaa648cf`). Never start a new loop, and never park one, silently.

### 4. Issue readiness for autonomous pickup
A Linear issue meant to be picked up cold — by a subagent, a headless run, or a different session — must carry enough that the picker never has to come back and ask. Learned from a 2026-07-18 backlog sweep (ARI-11/19/20 worked as write-and-forget; ARI-103 and ARI-23 did not, in different ways). Write every LifeGuide issue meant for autonomous work to this bar, using **ARI-11 as the template**:

- **What** — the concrete thing, not just the theme.
- **Why** — the reasoning, so the picker can make in-scope judgment calls without drifting from intent.
- **Effort estimate**, with an explicit **data-model impact: yes/no** call-out — this alone determines whether `convex/schema.ts` is in play.
- **Definition of done** as a checklist of testable/verifiable statements, not vague goals.
- **Source / related issues** — name what's explicitly *out of scope* (sibling issues touching the same subsystem), so the picker doesn't scope-creep into them.
- Where relevant: a pointer to existing research docs or prior Linear comments (`docs/research/*`, prior "Slice N shipped" comments) — the picker should never redo groundwork that already exists.

**Two signals an issue is NOT ready for blind pickup — route around them instead of assigning as-is:**
- The issue's own text defers a decision to the human ("pressure-test, not commit," open forks with no lean, "for Ariel to decide"). That's a **decision-memo task** (research output, no code), not an implementation task — say so explicitly when assigning it.
- "Needs finalization before any code" with open questions and *no* documented lean on any of them. If most questions already carry a lean/default and only one is genuinely load-bearing, it's still pickable — the picker resolves the load-bearing one, records the decision (an ADR, per most Definition-of-done sections), and proceeds. Only route to a decision-memo when the load-bearing call is one only Ariel can make.

---

## Documentation map (rebuilding)

The docs were reset on 2026-06-03 to a clean slate. Current state:

```
docs/
├── README.md                 # the rebuild plan + the two seeds
├── product/
│   └── concept-and-soul.md   # the soul + the evolved vision (current source of truth)
└── research/
    ├── README.md             # index of all parked/active research items
    └── wiki/                 # research wiki entries
mockup/
└── index.html                # the clickable prototype (visual reference)
```

Everything else (prd, architecture, feature docs, design, decisions, research, plans, roadmap) was removed and is being rebuilt to the evolved vision; it all remains in git history. The working model for rebuilding the Journal and the Core is the original Life Blueprint app at `~/lifeguide`. See [`docs/README.md`](docs/README.md).

## Coach Knowledge Base (pulled from the developer's Brain Vault)

The canonical coaching content the Coach draws from — the **mantra pool**, the **Life Blueprint** backbone, and the **daily-conduct doctrine** — is the **Coach Knowledge Base**, kept in [`docs/product/coach-knowledge-base/`](docs/product/coach-knowledge-base/). Its **canonical source is the developer's Brain Vault** (LifeGuide notes at `~/brain-vault/01-Projects/lifeguide/lifeguide-notes/`); the copies in this repo are **pulled from there** to seed the app. When directed to sync, treat the vault as the source of truth and this repo as the copy.

It is distinct from each user's **Personal Knowledge Base** (per-user, client-side, editable) — that is seeded from the Coach KB but diverges per person and never writes back to the canon. The Coach KB is owner-authored and belongs behind owner-gated admin (ADR 0006).

## Feature docs must be COMPLETE (when we rebuild them)
Every feature doc (one per component, the units) must describe **all** of: purpose, user-facing behavior, every function/action, dynamics and interactions with other components, states, edge cases, AI involvement, data touched, and open questions. "All possible uses, functions, and dynamics" is the bar. If a behavior exists, it is written down.

## Working principles (from the concept — honor these in every build)
- **AI-first.** The app reflects the user's full context at all times via the Context Bus.
- **Calm, never bombarding.** See `docs/design/interaction-principles.md`.
- **Manual AND Coach** interaction are both first-class — the Coach is a power tool, not a gate.
- **Foundation-first.** Build the shared spine before surfaces; surfaces are thin plugins.
- **DRY docs.** Link, don't duplicate. One canonical home per concept; the glossary anchors terms.

## Git & PR conventions
- **No "Generated with/by Claude Code" lines** — not in commit messages, not in PR titles or bodies, not the 🤖 badge. The ONLY agent attribution allowed is the Claude session link line (`https://claude.ai/code/session_…`). (Ariel, 2026-07-12.)
- **User-facing changes ship with a What's New entry** (`docs/product/features/whats-new.md` explains the authoring flow) — add one in the same PR.

## Stack
Next.js (App Router) + Convex (real-time backend: reactive DB, file storage, server-side AI actions) + OpenRouter (preferred) with OpenAI as automatic fallback. The live schema is `convex/schema.ts`; the AI client is `convex/ai/openai.ts`.

## Status
Built and live in local dev: Convex backend, anonymous multi-tenant auth, the vision board (Whiteboard), capture and distillation on OpenRouter, the app shell (rail nav), the Today ritual, Guide, Settings, a context-aware Coach (basic), and the Goals board (Orbit: Big Things with a why, Today/Inbox/Waiting triage, optional Todoist sync; see `docs/product/features/goals.md`). Docs were reset on 2026-06-03; next is rebuilding the spec and the component docs to the evolved vision, seeded by the original Life Blueprint. The clickable prototype lives in `mockup/`.
