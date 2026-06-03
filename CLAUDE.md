# LifeGuide — Agent Operating Guide

LifeGuide is an AI-first, context-aware personal life platform — **"the space for the individual."** It helps (primarily) young men who feel lost reflect, hold themselves accountable, set goals that matter to them, and stay aligned with who they're becoming. Two surfaces share one brain: a spatial **Whiteboard** and a conversational **Coach / Guide**, both reading and writing a shared **Mirror** — the evolving "text layer behind the human."

**Start here:** [`docs/README.md`](docs/README.md) (documentation map) · soul: [`docs/product/concept-and-soul.md`](docs/product/concept-and-soul.md) · spec: [`docs/product/prd.md`](docs/product/prd.md)

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

### 2. Keep the CHANGELOG — every meaningful change, with the docs you touched
After any meaningful work (feature, fix, refactor, doc expansion, decision), append an entry to [`CHANGELOG.md`](CHANGELOG.md) at the repo root. **Use the `changelog` skill.** Every entry must record:
- **What was done** (and the commit hash, once we're building)
- **Docs touched:** the exact documentation files created or updated

The changelog is how any agent or session picks up cold. No silent changes.

> These reinforce and specialize the global rule in `~/.claude/CLAUDE.md` ("every technical project maintains a changelog"). Here we additionally require that every change names the documentation it updated.

---

## Documentation map (what lives where)

```
docs/
├── README.md              # the map (read first)
├── product/
│   ├── concept-and-soul.md   # the why, the mission, the soul
│   ├── prd.md                # the product requirements (the spec)
│   ├── personas.md           # who this is for
│   ├── glossary.md           # shared vocabulary — define terms here, link don't redefine
│   └── features/             # ONE fully-expanded doc per feature (see _TEMPLATE.md)
├── architecture/          # overview, context-bus, data-model, ai-layer, stack, security-privacy
├── design/                # design-system, interaction-principles, screens
├── decisions/             # ADRs — one per notable decision
├── research/              # codebase extraction + competitive/landscape research
├── plans/                 # implementation plans (foundation-first, bite-sized)
└── roadmap.md             # phases: v1 plans → v1.5 → v2
mockup/                    # the clickable HTML prototype (the visual target)
```

## Feature docs must be COMPLETE
Per `docs/product/features/_TEMPLATE.md`, every feature doc describes **all** of: purpose · user-facing behavior · every function/action · dynamics & interactions with other features · states · edge cases · AI involvement · data touched · reuse source · open questions. "All possible uses, functions, and dynamics" is the bar. If a behavior exists, it is written down.

## Working principles (from the concept — honor these in every build)
- **AI-first.** The app reflects the user's full context at all times via the Context Bus.
- **Calm, never bombarding.** See `docs/design/interaction-principles.md`.
- **Manual AND Coach** interaction are both first-class — the Coach is a power tool, not a gate.
- **Foundation-first.** Build the shared spine before surfaces; surfaces are thin plugins.
- **DRY docs.** Link, don't duplicate. One canonical home per concept; the glossary anchors terms.

## Stack
Next.js (App Router) + Convex (real-time backend: reactive DB, file storage, vector index, server-side OpenAI actions) + OpenAI. Rationale: `docs/architecture/stack.md`.

## Status
Pre-build. The clickable prototype lives in `mockup/`. Implementation begins with `docs/plans/2026-05-20-lifeguide-v1-plan1-foundation-whiteboard.md`.
