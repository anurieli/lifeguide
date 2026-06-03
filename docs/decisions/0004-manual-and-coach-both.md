# 0004 — Manual and Coach interaction are both first-class

**Status:** Accepted · 2026-05-20

## Context
The Coach is powerful (it can operate the whole app). A tempting simplification is to make the Coach the *only* way to do things. The user explicitly rejected that: people also want to do things by hand.

## Decision
Every surface supports **both** direct manual manipulation and Coach-driven action. The Coach is a power tool, never a gate. Every "function & action" table in a feature doc marks both columns.

## Consequences
- UI must expose manual controls for everything the Coach can do.
- The tool registry mirrors manual capabilities (parity).
- Onboarding can lean on either; progressive disclosure keeps manual simple.

Reflected in [`../design/interaction-principles.md`](../design/interaction-principles.md) (principle 3).
