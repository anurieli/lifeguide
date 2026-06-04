# The Guide

**Status:** merged into [Home (Today)](dashboard.md) · **Element of:** the Core (a read-only window onto it) · **Owns:** view-only

> **Merged 2026-06-03.** The Guide is no longer a standalone surface or rail tab. Its three parts — the editable north star (now framed as the **compass**), the Mirror, and the pillars — were folded into the lower half of the [Home (Today)](dashboard.md) surface under "Who you're becoming." The component `components/guide/Guide.tsx` was removed; the behavior lives in `components/today/Today.tsx`. This doc is kept as the canonical description of that *content* (the renders, the one north-star write, the draw-only contract), which is unchanged by the move. The only delta is the host: read "the Guide" below as "the lower half of Home." See [`../../design/screens.md`](../../design/screens.md).

> The Guide is the one calm place that renders the synthesized you back to you: your north star, the Mirror, and your pillars. It owns no data; it draws the Core. See [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md).

## 1. Purpose
A lost person cannot see themselves whole. Pieces of who they are live scattered across the board, the sessions, the goals. The Guide answers that by drawing the Core into one quiet page and showing it back: "this is who you're becoming, as far as we can tell." It is the surfaced form of the text layer behind the human (see [`../concept-and-soul.md`](../concept-and-soul.md)). It gives the person a single, readable self, not a dashboard of metrics. The one job: render the Core legibly, calmly, in one place.

## 2. User-facing behavior
The person opens the Guide and reads themselves back. Top: the **north star** in their own words (the life they're moving toward), with a quiet "edit" / "write it" affordance. Below: the **Mirror** card, the Coach's running synthesis ("what I've noticed"), shown as a short paragraph plus value/theme tags. Below that: the **pillars**, one block each, with a live count of how many board things touch that pillar, and a gentle empty note where a pillar is bare.

Nothing here is a form to fill or a chart to read. The page reads like a letter about yourself. The only thing the person can change directly is the north star: they tap edit, type the life they're moving toward, and save. Everything else is authored elsewhere (the board, the sessions, the Coach) and merely surfaced here. Coach-driven: the person can ask the Coach to help find the words for the north star, or to reshape the Mirror; the Coach acts on the Core, and the Guide re-renders because it draws the Core live.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Render north star | open Guide | Reads and shows `settings.northStar` in the person's words, or a calm "not named yet" prompt | both | draws `settings` |
| Edit north star | tap "edit" / "write it", Save | Writes the typed text back. This is a **Settings/Core write, not a Guide-owned write**: the Guide holds nothing, it issues `settings.update({ northStar })` | manual (Coach can also set it from far away) | writes `settings.northStar` |
| Render Mirror | open Guide | Shows `mirror.summary` plus `structured.values` + `structured.themes` as tags; falls back to a "still learning you" line when empty | both | draws `mirror` |
| Render pillars | open Guide | Lists `pillars`, each with name, color, and a live "things" count | both | draws `pillars` |
| Count things per pillar | render | Counts active board `nodes` whose `pillars[]` include the pillar's tag; shows an empty note at zero | both | draws `nodes` |

The Guide exposes exactly one write (the north star) and four renders. It never creates pillars, never edits the Mirror, never owns a node. Those acts belong to their owning elements.

## 4. Dynamics and interactions with other elements
The Guide **owns nothing and draws the Core**, per [`../../architecture/context-bus.md`](../../architecture/context-bus.md) (standing draw: Guide draws Core to render you). It **publishes nothing** to the streams; a read-only surface has no signal to emit. Its draws:

- **The Core (`mirror`)** for the Mirror card and tags, and (as the backbone fills) the synthesized self. The Coach curates this; the Guide only displays it.
- **Settings (`settings.northStar`)** for the north star. The north-star edit is the one write, and it lands on Settings/Core, not on the Guide.
- **Pillars & Goals (`pillars`)** for the pillar blocks.
- **Vision Board (`nodes`)** for the per-pillar counts.

Because every value is drawn live, the Guide re-renders the moment the Coach reshapes the Core, the board gains a node, or a pillar is added. The Guide is a window, not a copy.

## 5. States
- **Empty / early Core.** First days: no north star (shows the "not named yet" invitation), an empty Mirror (shows "still learning who you are"), a single default pillar with zero things. The page is mostly invitations, by design.
- **Filling in.** North star written; Mirror has a few tags and a short summary; some pillars carry counts, others still empty (each shows its own empty note).
- **Settled.** North star named, Mirror paragraph rich, pillars populated. The page reads as a coherent self.
- **Editing (north star).** The one transient interactive state: textarea open, Save / Cancel. Cancel discards; Save persists and closes.
- **Conflicted.** The Guide does not resolve conflicts. When new signal contradicts the Core, the Coach surfaces it for the person to decide (see [`coach.md`](coach.md) / [`core.md`](core.md)); the Guide simply shows whatever the Core currently holds after that resolution.

## 6. Edge cases
- **No north star yet:** shows the invitation copy, never a blank box; "write it" rather than "edit."
- **Empty Mirror:** the "still learning you" fallback, not an error or a void.
- **Empty pillar:** per-block "nothing tagged here yet" note instead of a bare heading.
- **Mirror mid-curation / loading:** queries return `undefined` until loaded; the Guide renders nothing-yet rather than stale data (no assembled blob is cached as truth, per the Bus).
- **Save with empty/whitespace north star:** trimmed before writing; an all-whitespace draft saves empty and the page returns to the invitation state.
- **Many pillars / many tags:** the page scrolls; tags wrap; no truncation logic beyond layout, since this is reading, not triage.
- **Color fallback:** a pillar whose name has no mapped color falls back to a rotating palette, so unknown custom pillars still render distinctly.
- **Offline / stale:** the Guide writes nothing but the north star; reads reflect last-synced Core. No local authority to drift.

## 7. AI involvement
The model is **indirect** here. The Guide runs no inference of its own; it has no prompt, no generation, no distillation. Everything it shows is the *output* of AI work done by the Core and the Coach: the Coach's core-curation pass synthesizes `mirror.summary`, `structured.values`, and `structured.themes` from the accumulated `interactions`, and the Guide simply renders that result. When the person asks the Coach to find words for the north star or to reshape the Mirror, the Coach does the generation and writes the Core/Settings; the Guide re-renders. Provider/model class and the curation loop live in [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md); the Guide is downstream of all of it. The Guide's job is faithful display, not interpretation.

## 8. Data touched
All **drawn**, none owned (see [`../../architecture/data-model.md`](../../architecture/data-model.md)).

- **Drawn:** `mirror` (`summary`, `structured.values`, `structured.themes`); `pillars` (`name`, color via name); `nodes` (`pillars[]`, `isActive` for counts); `settings.northStar` (read for display).
- **Written:** `settings.northStar` only, via `settings.update`; and this is a Settings/Core write, not Guide-owned storage. The Guide holds no table of its own.

## 9. Open questions
- As the Core backbone fills (`mirror.structured.backbone`, `gaps`), how much of it should the Guide surface, and how (collapsed by section, gaps shown as gentle invitations to a session)?
- Should the Guide render `goals` per pillar (counts or titles), or stay strictly identity-level and leave goals to the Pillars & Goals surface?
- Should north-star editing show prior versions (the Core is versioned) or stay single-value in `settings`?
- Should the Mirror card link into the Coach for "tell me more about why you noticed this," making the read-only page a jumping-off point without becoming interactive itself?
