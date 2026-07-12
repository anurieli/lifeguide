# Self-Map Backbone

## Summary

LifeGuide's backbone is not a dashboard or a pile of surfaces. It is a stable ritual that feeds a dynamic self-map. Every intake route should produce the same kind of signal, and the system should file that signal into the map of the person.

## Core Ideas

- The loop is: `Return -> Dump -> Reflect -> File -> Synthesize -> Guide -> Act -> Return`.
- Ritual is not separate from the self-map. Repetition is how the map becomes trustworthy.
- The stable skeleton gives the app structure: Identity & Values, Body & Health, Work & Money, Relationships, Mind & Growth, Meaning & Spirit, Fears & Shadows, Dreams & Aspirations.
- The dynamic layer captures what the person reveals over time: strengths, passions, fears, values, beliefs, goals, habits, relationships, influences, contradictions, recurring patterns, possible selves, and open questions.
- Vision Board and Journal/Sessions are the two current backbone elements. New routes like email, saved links, voice interviews, and social inspiration should reuse the same signal shape instead of becoming separate data worlds.

## Evidence

- Internal note: [`self-map-and-ritual-backbone.md`](../raw/internal-notes/self-map-and-ritual-backbone.md).
- Internal note: [`living-person-model.md`](../raw/internal-notes/living-person-model.md).
- Internal note: [`brain-dump-valve.md`](../raw/internal-notes/brain-dump-valve.md).
- Internal note: [`current-state-gap-engine.md`](../raw/internal-notes/current-state-gap-engine.md).
- Habit formation supports stable context repetition without brittle streak mechanics: [`lally-habit-formation.md`](../raw/sources/lally-habit-formation.md).

## Product Translation

The shared primitive should be a `Signal`: something the user said, wrote, pasted, saved, uploaded, or did. The signal is raw at first, then distilled into self-map entries, current readings, desired readings, goals, or contradictions.

```ts
Signal = {
  source:
    | "ritual"
    | "journal"
    | "voice_interview"
    | "vision_board"
    | "email"
    | "saved_link"
    | "coach"
    | "manual",
  rawText?: string,
  rawUrl?: string,
  rawFileId?: string,
  extractedMeaning?: string,
  suggestedEntries: SelfMapEntry[],
  createdAt: number,
}
```

The self-map entry is the dynamic layer:

```ts
SelfMapEntry = {
  type:
    | "strength"
    | "passion"
    | "curiosity"
    | "fear"
    | "wound"
    | "value"
    | "belief"
    | "goal"
    | "habit"
    | "relationship"
    | "influence"
    | "inspiration"
    | "contradiction"
    | "pattern"
    | "question"
    | "possible_self"
    | "feared_self",
  content: string,
  pillarIds: string[],
  sourceIds: string[],
  confidence: number,
  firstSeenAt: number,
  lastSeenAt: number,
  status: "emerging" | "confirmed" | "conflicted" | "archived",
}
```

## Open Questions

- Is `SelfMapEntry` a new table or an evolution of `coreFiles`?
- Does the app need a separate `Signal` table, or can existing `captures`, `sessions`, and `interactions` act as the raw signal stream?
- Should journal sessions be one long timeline, snippets grouped by ritual, or both?
- What minimum self-map fill/freshness makes onboarding "complete"?

## Related

- [Identity and Vision](identity-and-vision.md)
- [Habits, Stabilization, and Consistency](habits-stabilization-and-consistency.md)
- [Source Map](source-map.md)

