# 0005 — Pillars are cross-cutting tags; default "Lifestyle"

**Status:** Accepted · 2026-05-20

## Context
PillarOS made "pillars" rigid containers (Pillar → Zone → Item) — everything lived *inside* one pillar. Real life isn't partitioned that cleanly; one idea touches several facets.

## Decision
Pillars are **cross-cutting typed tags**, not containers. A node/capture/goal can carry several. New users start with a **single default "Lifestyle" pillar** (no setup screen); more are added on tap from a preset library or created custom.

## Consequences
- Data model: `pillars` is a tag table with `source: default|preset|custom`; `nodes.pillars[]`.
- Onboarding stays frictionless (one pillar, progressive disclosure).
- The Mirror tracks per-pillar weight to notice imbalance/scatter.

Detail: [`../product/features/pillars.md`](../product/features/pillars.md).
