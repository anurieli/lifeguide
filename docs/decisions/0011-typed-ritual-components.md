# 0011. Typed ritual components: one table, a widening kind union

**Status:** accepted (live) · **Date:** 2026-07-12

## Context

The Daily Ritual v1 modeled a ritual as a checklist of two step kinds (`do`, `read`). The evolved design ([feature doc](../product/features/daily-ritual.md)) reframes a ritual as an **ordered primer sequence of typed components**: the morning is walked top to bottom (read → roadmap → question), the evening builds tomorrow's roadmap, and plain to-dos move to a side rail. That needs two new kinds now (`question`, `roadmap`) and a shape that accepts future kinds (timer, breathwork, weather, whatever earns its place) without a migration each time. Ariel's production account already holds live v1 rows: no data loss, no rewrite.

## Decision

1. **One table, a widening union.** `ritualItems.kind` grows to `do | read | question | roadmap`. Per-kind data rides in optional fields (`content` = inline read text or a fixed question; `source` = where a read resolves its words). New kinds are added by widening the union and, if needed, adding optional fields — **never** by rewriting rows or adding per-kind tables.
2. **Existing rows are already valid.** v1 `do`/`read` rows fit the v2 shape untouched; there is no data migration, only additive schema.
3. **New components are offered once, via a seed version.** `settings.ritualsSeedVersion` (2) marks the one-shot `rituals.upgradeToSeedVersion`: it appends the missing `question`/`roadmap` components to each **non-empty** ritual, touches nothing that exists, skips emptied rituals (delete-all is honored), and never runs again — so deleting the offered components also sticks.
4. **Check state is kind-blind.** `ritualDays.checkedIds` and the completion rule ("every current item checked") are unchanged; a question is "checked" when answered, a read when read to the end, a roadmap when walked. The seal logic did not move.
5. **Component behavior lives in the surface**, not the store: the sequence card renders each kind (`components/today/RitualSequence.tsx`); question answers publish to `interactions` (`ritual_question`); roadmap entries live in their own `roadmapEntries` table (ADR 0012).

## Consequences

- Kind-specific queries stay trivial (filter in memory on a per-user list that is always small).
- The union is a validator, so an unknown kind cannot enter the table; adding one is a one-line schema change plus a renderer.
- Optional per-kind fields accumulate on one table. Accepted: the row count is tiny (a handful per user) and the alternative (kind tables + joins) buys nothing at this scale.
- A `question` item with no `content` means "rotate through the bank" (`lib/questions.ts`) — behavior encoded in absence. Documented in the feature doc; the edit UI labels it explicitly.
