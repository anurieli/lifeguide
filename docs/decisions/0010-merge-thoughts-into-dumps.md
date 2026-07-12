# 0010 · Merge the Thoughts surface into Dumps (one capture surface)

**Status:** accepted (live) · **Date:** 2026-07-12

## Context

After ADR 0008, Thoughts (the flat stream of every capture) and Sessions (the living entry) were two sibling nav tabs over the exact same `captures` rows. Ariel's verdict, same day, looking at the desktop build: "they're the same thing… why do we have both of them?" — a brain dump *is* a session; a single loose thought is just a session with one member. The split also left a real gap: the phone could brain-dump (➕ → session) but desktop's ➕-equivalent was the stream composer, which produced loose captures, not entries. The sessions doc already carried the open question "whether the flat Thought Stream stays a top-level view once sessions dominate, or demotes to a filter."

## Decision

**One capture surface: Dumps.** The Sessions tab is renamed **Dumps** (brain icon) and the Thoughts tab is removed from the desktop rail (it was never on the phone). The ➕ main action exists on both devices: phone auto-records into the fresh entry; desktop opens it ready to type with the mic one click away (no unprompted permission dialog). The Thought Stream *pipeline* (ingest, extraction, distillation over `captures`) is untouched and still processes every member and every loose capture; only the stream *view* is retired — its components stay in the codebase unrouted, like the Brain Dump Lab before it. The document view absorbs the stream composer's bare-URL handling (a pasted URL commits as a link capture).

With the merge, the entry grows first-class identity for reading and traversal:

- **Person-entered name wins.** `sessions.setTitle` stamps `titleEditedAt`; the digest never overwrites a person's name (and merge preserves it). Left blank, the AI titles the entry.
- **The living description.** `summary` is re-synthesized as content lands (debounced digest, unchanged) and additionally refreshed on every open/leave of the document (`sessions.refreshDigest`, skipping when the digest already covers the latest content). The description is the canonical line an agent traversing entries pulls.

## Consequences

- One mental model: everything is a dump; the archive is the Dumps list. No duplicate capture surfaces to explain.
- Desktop finally creates entries; capture parity across devices.
- Loose captures still exist (board intake, `voice.brainDump`) and still flow through the pipeline, but desktop lost the stream as their viewer — the board Inbox is their only surface. A receipts/inspector filter view over all captures may return later; that and a quick loose-capture affordance on the Dumps list are open questions in [`../product/features/sessions.md`](../product/features/sessions.md).
- Schema: additive only (`sessions.titleEditedAt`). No migration; existing AI titles behave as before until a person names an entry.
- Nav storage: a persisted `dump` view key maps to `sessions` on load.
