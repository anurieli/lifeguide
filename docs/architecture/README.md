# Architecture

How LifeGuide is built. The defining requirement — "reflect context at all times" — makes this a real-time, shared-context system.

| Doc | Purpose | Status |
|---|---|---|
| [`overview.md`](overview.md) | The layered system, end to end | 🟡 |
| [`context-bus.md`](context-bus.md) | The four context scopes + the Assembler — the core | ✅ |
| [`data-model.md`](data-model.md) | Full Convex schema reference | ✅ |
| [`ai-layer.md`](ai-layer.md) | AI config hub, models, prompts, cost | 🟡 |
| [`stack.md`](stack.md) | Next.js + Convex + OpenAI rationale | ✅ |
| [`security-privacy.md`](security-privacy.md) | Multi-tenancy, trust, data ownership | 🟡 |

Deep research behind these decisions: [`../research/extraction/`](../research/extraction/). Decisions: [`../decisions/`](../decisions/README.md).
