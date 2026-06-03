# Security & Privacy

**Status:** 🟡 outline

This is the most intimate data a person owns. Trust is a designed, felt feature — not fine print. It's also the precondition for honest capture.

## Multi-tenancy (day one)
- Every row carries `userId`; every Convex function gates on the authenticated user (`getAuthUserId`). No cross-tenant reads.
- Fixes the flaws found in the source apps: braindump had **no** multi-tenancy (RLS off, service-role keys in routes); PillarOS **leaked** its model key to the browser.

## Server-side AI
All model calls run in Convex actions; API keys live server-side only.

## Data ownership
- Private by default. No sharing in v1.
- **Full export** anytime (clean JSON of board + Guide + Mirror). No lock-in.
- The Mirror is **editable** by the user — they can correct what the app believes about them.

## Trust model (to design)
Consent-forward, Limitless-style: visible control over what's captured and how the Coach reaches out (Settings). Quiet hours respected absolutely. Hand-off rules (crisis → refer to a human) are non-overridable.

> To expand: retention, deletion, encryption-at-rest posture, audit of agent/API access (when the MCP/cloud surface arrives), and the consent UX.
