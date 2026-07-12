# Identity and Vision

## Summary

LifeGuide should treat being lost as an orientation problem, not a character flaw. The user is exploring identity, moving from borrowed scripts toward authored commitments, building possible futures, and comparing current life against ideal and ought standards.

## Core Ideas

- Emerging adulthood reframes instability as possible identity exploration rather than automatic failure.
- Self-authorship says the user must move from external formulas to internally authored beliefs, values, and decisions.
- Possible selves give Future Self and Vision Map a research-backed structure: hoped-for, expected, feared, and avoided selves.
- Self-discrepancy theory gives the gap engine emotional texture: actual-ideal gaps often feel like discouragement; actual-ought gaps often feel like pressure, guilt, or agitation.

## Evidence

- [`arnett-emerging-adulthood.md`](../raw/sources/arnett-emerging-adulthood.md)
- [`baxter-magolda-self-authorship.md`](../raw/sources/baxter-magolda-self-authorship.md)
- [`markus-nurius-possible-selves.md`](../raw/sources/markus-nurius-possible-selves.md)
- [`higgins-self-discrepancy.md`](../raw/sources/higgins-self-discrepancy.md)
- Internal gap-engine note: [`current-state-gap-engine.md`](../raw/internal-notes/current-state-gap-engine.md)

## Product Translation

The Vision Board should become more than media. It should become an Inspiration + Vision Map: a visual surface whose real product layer is semantic meaning.

Every card should eventually answer:

- What does this represent?
- Which part of me does it speak to?
- Which possible self does it point toward?
- Is this my own standard, an inherited standard, or an external pressure?
- Has this theme appeared before?

The Future Self should include both aspiration and anti-drift:

```ts
PossibleSelf = {
  type: "hoped_for" | "feared" | "expected" | "avoided",
  name: string,
  narrative: string,
  vividness: number,
  perceivedLikelihood: number,
  perceivedControl: number,
  sourceModels: string[],
  nextBehavior?: string,
}
```

Self-standards should carry provenance:

```ts
SelfStandard = {
  standardType: "ideal" | "ought",
  standpoint: "own" | "other",
  sourcePersonOrGroup?: string,
  description: string,
  internalizationLevel: number,
  legitimacyRating: number,
}
```

## Open Questions

- Should Vision Board and Future Self remain separate surfaces or become two views of one Vision Map?
- How much feared-self work is useful before it becomes shame-inducing?
- Should LifeGuide explicitly ask whose standard a goal belongs to?

## Related

- [Self-Map Backbone](self-map-backbone.md)
- [Relationships, Meaning, and Support](relationships-meaning-and-support.md)

