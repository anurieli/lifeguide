# Research

Open questions and design spikes that aren't yet decided enough to be spec. A research note lives here while a question is being chewed on; when it resolves, the answer moves into the canonical home (a feature doc, `data-model.md`, or an ADR) and the note links to where it landed.

A note is **not** the source of truth. It is the place to think before committing. The rule from `CLAUDE.md` still holds: nothing here is spec until it lives in `docs/architecture/*`, `docs/product/features/*`, or `docs/decisions/*`.

## Index

| Note | Question | Status | Tracks |
|---|---|---|---|
| [`pillars-data-model.md`](pillars-data-model.md) | How do we model + visualize the pillars as a master data object? | open | [ARI-11](https://linear.app/cuttheedge/issue/ARI-11) |
| [`current-state-gap-engine.md`](current-state-gap-engine.md) | How do we hold "where you are now," compute the gap to "where you want to be," and track it over time? | open | [ARI-16](https://linear.app/cuttheedge/issue/ARI-16) |
| [`living-person-model.md`](living-person-model.md) | Should the parts that make up a person be editable data (with lifecycle metadata + an Admin map) instead of fixed in code? | open | [ARI-17](https://linear.app/cuttheedge/issue/ARI-17) |
| [`brain-dump-valve.md`](brain-dump-valve.md) | Is the micro-interview the one universal write into the person-model — and do onboarding + journaling collapse into it? | open | [ARI-18](https://linear.app/cuttheedge/issue/ARI-18) |
