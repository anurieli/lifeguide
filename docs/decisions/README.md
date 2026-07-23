# Decisions (ADRs)

Architecture Decision Records for LifeGuide. One file per notable decision, numbered, in the standard shape: Title, Status, Context, Decision, Consequences. New decisions get the next number and are added to the table below.

| # | Title | Status | Date |
|---|---|---|---|
| [0001](0001-evolved-vision-and-docs-reset.md) | Evolved vision and docs reset | accepted | 2026-06-03 |
| [0002](0002-future-self-as-its-own-element.md) | Future Self as its own element | accepted | 2026-06-03 |
| [0003](0003-openrouter-for-generative-ai.md) | OpenRouter for generative AI | accepted (live) | 2026-06-03 |
| [0004](0004-voice-stack-and-levels.md) | Voice stack (provider-abstracted, OpenAI Realtime mini first) and Level model | accepted | 2026-06-03 |
| [0005](0005-voicefield-chunked-whisper.md) | VoiceField chunked Whisper transcription | accepted | 2026-06-04 |
| [0006](0006-owner-gated-admin.md) | Owner-gated admin | accepted | 2026-06-04 |
| [0007](0007-file-system-on-the-human-and-the-center.md) | File system on the human and the Center | accepted | 2026-06-04 |
| [0008](0008-sessions-as-container-over-captures.md) | Sessions as a container over captures | accepted (live) | 2026-07-12 |
| [0009](0009-ritual-day-boundary.md) | The ritual day: client-local key with a 4am rollover | accepted (live) | 2026-07-12 |
| [0010](0010-merge-thoughts-into-dumps.md) | Merge the Thoughts surface into Dumps (one capture surface) | accepted (live) | 2026-07-12 |
| [0011](0011-typed-ritual-components.md) | Typed ritual components: one table, a widening kind union | accepted (live) | 2026-07-12 |
| [0012](0012-roadmap-targets-next-ritual-day.md) | The roadmap targets the next ritual day | accepted (live) | 2026-07-12 |
| [0013](0013-immersive-reader-overlay.md) | The immersive reader is a full-screen overlay, not scroll-pinning | accepted (live) | 2026-07-12 |
| [0014](0014-per-node-model-tiering.md) | Per-node model tiering: match the model to the job | accepted (live) | 2026-07-13 |
| [0015](0015-vision-sieve-for-the-board-inbox.md) | The vision sieve: intent + verdict gate the board Inbox | accepted (live) | 2026-07-13 |
| [0016](0016-toss-the-brain-dump-lab.md) | Toss the brain-dump idea-graph lab | accepted (done) | 2026-07-13 |
| [0017](0017-ai-hub-logging-and-overrides.md) | The AI hub: every call logged, every model a Settings dial | accepted (live) | 2026-07-13 |
| [0018](0018-gentle-keeping-up-run.md) | A gentle keeping-up run (the one carve-out from "no streaks") | accepted (live) | 2026-07-15 |
| [0019](0019-feedback-to-linear.md) | Feedback → Linear: manual export + a three-state triage inbox | accepted (live) | 2026-07-15 |
| [0020](0020-a-take-is-never-lost-to-a-cold-start.md) | A voice take is never lost to a cold start | accepted (live) | 2026-07-17 |
| [0021](0021-dynamic-sessions-and-post-hoc-thought-maps.md) | Dynamic sessions and post-hoc thought maps | accepted (live) | 2026-07-18 |
| [0022](0022-identity-is-not-a-pillar.md) | Identity is not a pillar: extend `pillars` (not a second table), keep the 8-domain skeleton, manual strength for v1 | accepted (live) | 2026-07-18 |
| [0023](0023-listener-memory-backbone.md) | The Listener's memory backbone: session-per-speaker, post-call summaries, tossed calls included | accepted (live) | 2026-07-18 |
| [0024](0024-core-conversational-mode-engine.md) | The Core's Conversational mode: the mode machine, and mapping free speech to Blueprint keys | accepted (live) | 2026-07-18 |
| [0025](0025-custom-guided-tour-engine.md) | A custom guided-tour engine, not driver.js or react-joyride | accepted (live) | 2026-07-18 |
| [0026](0026-whats-new-manual-authorship.md) | What's New: manually authored entries, not auto-generated from CHANGELOG.md | accepted | 2026-07-18 |
| [0027](0027-one-coach-voice-and-text-as-io.md) | One Coach: voice and text as I/O modes on a single agent and a single memory (two interchangeable postures: intake / direction) | accepted | 2026-07-20 |
| [0028](0028-core-is-the-fixed-life-blueprint-plus-living-containers.md) | Core is the fixed Life Blueprint plus Living Core containers | accepted (product direction, not implemented) | 2026-07-20 |
| [0029](0029-aspirations-goals-and-roadmap-steps.md) | Aspirations, Goals, and roadmap steps (written 2026-07-18 as "0022" on a diverged branch; renumbered on landing) | accepted (live) | 2026-07-20 |
| [0030](0030-the-journal-is-the-cores-incremental-intake.md) | The journal is the Core's incremental intake: one unanswered Blueprint slot a day, answered by journaling | accepted (product direction, not implemented) | 2026-07-21 |
| [0031](0031-feedback-autoforward-to-linear.md) | App feedback auto-forwards to Linear as `agent:cody` tasks, flag-gated | accepted (built, flag off by default) | 2026-07-22 |


See [`../README.md`](../README.md) for the documentation map and the two seeds, and [`../product/concept-and-soul.md`](../product/concept-and-soul.md) for the current source of truth.
