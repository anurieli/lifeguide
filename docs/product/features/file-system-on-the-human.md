# The File System on the Human

**Status:** partial (store + seed built; surfacing UI proposed) · **Element of:** the Core (the identity stream) · **Owns:** `pillars` (folders), `coreFiles` (files)

> A structured, growing picture of who a person is. Pillars are folders; files are the textual units that make them up. The skeleton everything else hangs off.

## 1. Purpose

A lost person cannot hold the whole picture of himself in his head. LifeGuide "builds and steers one thing — a person's true self." For the Coach to be wise, the *representation* has to be rich. This is that representation made concrete: not a fixed 18-question form (`coreResponses`), but a **file system** — regions of a life (pillars) each holding an open-ended, growing set of files. It is the textual skeleton of a man, and it is never finished, because he is never finished.

This is a first concrete step toward the parked **living person-model** research ([`../../research/raw/internal-notes/living-person-model.md`](../../research/raw/internal-notes/living-person-model.md), [`../../research/raw/internal-notes/pillars-data-model.md`](../../research/raw/internal-notes/pillars-data-model.md)): pillars *evolve in place* into folders; `coreFiles` are the files within them. Lifecycle metadata (`freshness`, `timeConstant`, `ownerAgentId`) is not yet built — see open questions.

## 2. User-facing behavior

A new person starts with the **canonical skeleton** already laid out: eight pillars (Identity & Values, Body & Health, Work & Money, Relationships, Mind & Growth, Meaning & Spirit, Fears & Shadows, Dreams & Aspirations), each empty. As they talk (the [Listener](listener.md)) or answer prompts, files fill those folders. Today the files are written and surfaced through the **[filing report](the-center.md)** at the end of a Listener call; a full browsable person-map view is proposed (it would render on Home / the Guide).

The person never files anything by hand in v1. They talk; the [Center](the-center.md) files. They can **resolve contradictions** when the Center surfaces one (use the new wording, or keep what they had).

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| seed the skeleton | first bootstrap (and idempotent top-up) | inserts the canonical `DEFAULT_PILLARS` with `about`/`composition` | system | writes `pillars` · **BUILT** |
| add a pillar | preset or custom (Pillars & Goals surface) | inserts a new folder | Manual | writes `pillars` · **BUILT** (metadata-less custom for now) |
| create a file | Center fan-out finds something new for a pillar | inserts a `coreFiles` row (`status: active`) | Coach (Center) | writes `coreFiles` · **BUILT** |
| update a file | Center fan-out deepens an existing file | patches content/kind | Coach (Center) | writes `coreFiles` · **BUILT** |
| hold a pending change | Center finds a contradiction | inserts a `pending` file pointing at the held one | Coach (Center) | writes `coreFiles` · **BUILT** |
| resolve a pending change | person decides in the filing report | applies the new content to the held file, or drops it | Manual | patches/deletes `coreFiles` · **BUILT** |
| browse the person-map | person opens their Core/Guide | renders all pillars + files, freshness | Manual | reads `pillars`, `coreFiles` · **PROPOSED** |

## 4. Dynamics and interactions with other elements

- **Owns** `pillars` and `coreFiles`. It is the structured heart of **the Core**; the [Mirror](core.md) (`mirror.structured`) becomes synthesized prose *over* this filesystem (re-grounding proposed, not built).
- **Filled by** the [Center](the-center.md), which is the only writer of `coreFiles` in v1 (through `convex/coreFiles.ts` internal mutations). The Center *draws* every pillar's `about`/`composition` + current files to decide what belongs where.
- **Fed from** the [Listener](listener.md) (voice) today; the [Journal](journal.md) (guided sessions) and [Vision Board](vision-board.md) are the proposed future inputs — same filesystem, different source.
- **Distinct from** the fixed Blueprint (`coreResponses`): the Blueprint is a fixed form; the filesystem is open-ended. They coexist; both are "the Core."

## 5. States

- **Empty skeleton.** Pillars seeded, no files. The normal day-one state.
- **Filling.** Files accumulate across sessions; some pillars rich, some still empty.
- **Active file.** Held truth.
- **Pending file.** A contradicting change parked for the person; the held file is untouched until they decide.
- **Resolved.** The pending change was applied (held file patched) or dropped (pending deleted).

## 6. Edge cases

- **Contradiction.** New talk conflicts with a held file. Never overwritten — held as `pending` with a reason; the person decides (the hard core-curator rule from [`coach.md`](coach.md)).
- **Empty pillar after a session.** Common and correct: a conversation rarely touches all eight regions. An untouched pillar simply gets no files that session.
- **Custom pillar with no metadata.** A user-added pillar has no `about`/`composition`; the Center falls back to judgment for it. (Prompting custom-pillar metadata is an open question.)
- **Older account (pre-skeleton).** Had only the lone "Lifestyle" pillar; `seedDefaultPillars` tops it up to the full set on next bootstrap without duplicating.
- **Cross-tenant.** Every read/write gates on `getAuthUserId`; files are only ever one user's.

## 7. AI involvement

The store itself is inert data. The intelligence is the [Center](the-center.md): one isolated model pass per pillar reads that pillar's `about`/`composition` + files + the transcript and decides the file ops. See [`the-center.md`](the-center.md) §7 and [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md).

## 8. Data touched

**Owns:** `pillars { userId, name, description?, about?, composition?, weight, source, createdAt }`; `coreFiles { userId, pillarId, name, content, kind, status, note?, supersedes?, sourceSessionId?, createdAt, updatedAt }`. Exact shapes + indexes in [`../../architecture/data-model.md`](../../architecture/data-model.md).

**Draws:** nothing — it is the thing others draw.

## 9. Open questions

- **Lifecycle metadata.** When do `freshness` / `timeConstant` / `refreshCadence` / `ownerAgentId` land (the living-person-model fields)? Not in this slice.
- **Custom-pillar metadata.** Should adding a pillar prompt for `about`/`composition` so the Center can file into it well?
- **File identity.** Files are matched by name within a pillar. Is a stable slug/id needed once the person can rename files?
- **Mirror re-grounding.** When does the Mirror's `structured` get re-synthesized from the filesystem rather than from raw Blueprint answers?
- **Person-map UI.** Read-only overview first, or editable from the map (per the living-person-model note)?
