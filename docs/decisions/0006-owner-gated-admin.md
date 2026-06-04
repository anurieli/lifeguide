# 0006 — Owner-gated admin + feedback support inbox

**Status:** accepted · **Date:** 2026-06-04

## Context

`/admin` began as a self-scoped dev panel (dev-gated by `NODE_ENV`, every action touching only the caller's own data). The feedback widget turned it into a ticket queue. We now want the builder to triage **all** users' feedback and reply to submitters, while making the panel inaccessible to anyone else in production. LifeGuide has exactly one owner and uses anonymous + Google auth on one shared-per-environment Convex backend (dev and prod are separate deployments).

## Decision

Introduce a single **owner** identity, keyed by email (`convex/owner.ts`, `OWNER_EMAIL = "anurieli365@gmail.com"`). Google sign-in puts `email` on the user doc; anonymous users have none and can never match.

- **Authorization is server-side.** `feedback.listAll` returns **every** user's feedback (with submitter identity joined) only when the caller is the owner; everyone else gets only their own rows. `resolve`/`reopen` allow the owner to act on any ticket; others only their own. This holds regardless of which surface calls it, because the backend cannot trust a client's claim of "I'm dev."
- **Page access:** `/admin` is **open in local dev** (any localhost session) and **owner-only in production** (`isDev || isOwner`). The client gate (`owner.amOwner` query) is UX on top of the server enforcement, not the security boundary.
- **Replies need no email infrastructure.** Each ticket with a known submitter email gets a **Reply** button that opens a `mailto:` in the owner's own mail client. Mail goes out from the owner's real address and threads in their inbox. No provider, no domain, no auto-acknowledgment (explicitly deferred).
- **Anonymous submitters are not repliable.** We chose not to collect an email field in the widget; only signed-in (Google) submitters can be replied to.

## Why not the alternatives

- **A real role/RBAC table:** overkill for a one-owner app; an email constant is sufficient and trivially auditable.
- **An email provider (Resend) / Gmail API for in-app sending + auto-ack:** real infrastructure (domain verification or OAuth, keys, inbound webhooks) for a "simple" need. `mailto` ships today and still sends "from my email." Programmatic send + threaded two-way remains a clean follow-up if needed.
- **Dev parity (owner-only everywhere):** would break the anonymous local-dev workflow. Dev-open is safe because it is localhost.

## Consequences

- The owner must be **signed in with Google** (not anonymous) to get the cross-user inbox; anonymous sessions see only their own feedback even in dev.
- `OWNER_EMAIL` is a code constant. Changing the owner is a code change (acceptable for now).
- Cross-user reads (`feedback.listAll` for the owner) are a full-table scan ordered by creation time — fine at current volume; revisit with an index if feedback grows large.
- **Prod backend must be deployed** for the gate to exist in production (prod Convex deployment differs from dev's).
