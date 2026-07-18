# Research

Open questions and design spikes that aren't yet decided enough to be spec. A research note lives here while a question is being chewed on; when it resolves, the answer moves into the canonical home (a feature doc, `data-model.md`, or an ADR) and the note links to where it landed.

A note is **not** the source of truth. It is the place to think before committing. The rule from `CLAUDE.md` still holds: nothing here is spec until it lives in `docs/architecture/*`, `docs/product/features/*`, or `docs/decisions/*`.

## Structure

| Path | Purpose |
|---|---|
| [`raw/`](raw/) | Source material and internal notes. These are raw inputs, not synthesized product direction. |
| [`raw/sources/`](raw/sources/) | External papers/articles and extracted source notes. |
| [`raw/internal-notes/`](raw/internal-notes/) | Former loose research notes from this repo, preserved as raw internal source material. |
| [`wiki/`](wiki/) | Synthesized research wiki pages built from raw material. |

## Wiki Entry Point

Start at [`wiki/index.md`](wiki/index.md). The wiki blends the old research-note index with source-grounded synthesis.

## Seed doctrines

Synthesized doctrine documents that seed product features. Unlike raw notes, these are already synthesized; they stay here (not in a feature doc) because they are content/doctrine, not spec.

| Note | What it is | Seeds |
|---|---|---|
| [`blueprint-for-living.md`](blueprint-for-living.md) | The 8-pillar daily-conduct doctrine (pillar → practice → payoff), synthesized 2026-07-12 from Ariel's "Blueprint" reel folder. Canonical copy in Brain Vault. | The [Daily Ritual](../product/features/daily-ritual.md) default items; Coach doctrine layer (future) |

## Resolved notes

Top-level notes (not raw/internal, already resolved) are kept here for their reasoning trail once decided; the canonical answer lives where the table below points.

| Note | Question | Resolved | Landed in |
|---|---|---|---|
| [`listener-memory-backbone.md`](listener-memory-backbone.md) | What is the Listener's conversational-continuity backbone, and what is "a session per speaker"? | 2026-07-18 (ARI-23) | [ADR 0022](../decisions/0022-listener-memory-backbone.md), [`../product/features/listener.md`](../product/features/listener.md) |

## Raw Internal Notes

| Note | Question | Status | Tracks |
|---|---|---|---|
| [`raw/internal-notes/pillars-data-model.md`](raw/internal-notes/pillars-data-model.md) | How do we model + visualize the pillars as a master data object? | raw | [ARI-11](https://linear.app/cuttheedge/issue/ARI-11) |
| [`raw/internal-notes/current-state-gap-engine.md`](raw/internal-notes/current-state-gap-engine.md) | How do we hold "where you are now," compute the gap to "where you want to be," and track it over time? | raw | [ARI-16](https://linear.app/cuttheedge/issue/ARI-16) |
| [`raw/internal-notes/living-person-model.md`](raw/internal-notes/living-person-model.md) | Should the parts that make up a person be editable data with lifecycle metadata? | raw | [ARI-17](https://linear.app/cuttheedge/issue/ARI-17) |
| [`raw/internal-notes/brain-dump-valve.md`](raw/internal-notes/brain-dump-valve.md) | Is the micro-interview the universal write into the person-model? | raw | [ARI-18](https://linear.app/cuttheedge/issue/ARI-18) |
| [`raw/internal-notes/core-backbone-ai-treatment.md`](raw/internal-notes/core-backbone-ai-treatment.md) | Where do Core backbone items and AI-treatment metadata live? | raw | — |
| [`raw/internal-notes/self-map-and-ritual-backbone.md`](raw/internal-notes/self-map-and-ritual-backbone.md) | Is LifeGuide's backbone a stable ritual plus a dynamic self-map fed by every intake route? | raw | — |
| [`raw/internal-notes/horizons-vision-goals-blend.md`](raw/internal-notes/horizons-vision-goals-blend.md) | Should the vision board, the horizons ladder, and goals be one blended alignment spine (measurable goals + deadlines, felt far future on the board, a calm daily glimpse)? Plus the Profile "all of you" surface. | raw | [ARI-103](https://linear.app/cuttheedge/issue/ARI-103) |
