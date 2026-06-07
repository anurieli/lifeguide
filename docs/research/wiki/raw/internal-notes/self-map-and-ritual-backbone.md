# Research · Self-map, rituals, and the LifeGuide backbone

**Status:** open · **Opened:** 2026-06-06

> This is a thinking document, not spec. It captures the current product philosophy around LifeGuide as a home base for self-orientation: a place someone returns to, dumps what is on their mind, and slowly builds a usable map of themselves.

---

## 1. The product sentence

LifeGuide is a place to build a map of yourself, then use that map to guide your life.

The person returns to the app as part of a ritual: morning, evening, or any moment they need to think. They write, speak, paste, save inspiration, or answer a prompt. The system files that signal into a living model of who they are, what they want, where they are now, what shapes them, and what keeps repeating.

Once the map exists, AI stops being generic advice. It can reason over the person's actual material:

- what they say they want
- what they repeatedly do
- what gives them energy
- what drains them
- who and what influences them
- what they avoid
- what they admire
- what kind of future they are trying to build

The app becomes a guide because it has a map.

## 2. The loop

```txt
Return -> Dump -> Reflect -> File -> Synthesize -> Guide -> Act -> Return
```

**Return.** The app is a home base. The ritual is the product's foundation: not streaks, not guilt, but a reliable place to come back to yourself.

**Dump.** The person can say what is happening: worries, ideas, wins, shame, inspiration, confusion, ambition, bad habits, dreams, random notes.

**Reflect.** The system asks a relevant prompt or interview question. The prompt is chosen from the person-model, not from a generic journal list.

**File.** The Center/Coach places the signal into the right parts of the self-map: pillars, strengths, passions, fears, habits, relationships, inspirations, goals, contradictions, open questions.

**Synthesize.** The AI connects patterns across time: "This has shown up in three different forms," "this goal keeps conflicting with this belief," "your vision says freedom but your week is built around approval."

**Guide.** Advice comes from the self-map. Different coaching lenses can interpret the same map differently.

**Act.** The output should usually become one concrete next move, not a giant life plan.

## 3. Stable vs dynamic parts of the human

The current question is whether the model should be fixed, dynamic, or both. The likely answer is both.

### Stable skeleton

Some categories are stable enough to seed by default. They give the app a backbone and prevent the first-run state from feeling empty.

- Identity & Values
- Body & Health
- Work & Money
- Relationships
- Mind & Growth
- Meaning & Spirit
- Fears & Shadows
- Dreams & Aspirations

These match the current "file system on the human" direction: pillars as folders, core files as durable textual units.

### Dynamic self-map entries

The human is not only pillars. The system should be able to add new entries as the person reveals themselves.

- strengths
- passions
- curiosities
- fears
- wounds
- values
- beliefs
- standards
- goals
- habits
- bad habits
- relationships
- social environment
- influences
- social media patterns
- inspirations
- contradictions
- recurring patterns
- open questions
- possible selves
- feared selves

This argues for a dynamic `SelfMapEntry` concept layered over the stable pillar skeleton.

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

## 4. The backbone question

There are two backbone elements today:

1. **Vision Board / Inspiration Board.** Text, photos, links, quotes, and generated images. Its job is to capture what pulls the person forward and extract the semantic meaning underneath the media.
2. **Journal / Sessions.** The ritual stream. Its job is to capture the living day-to-day signal through prompts, snippets, voice, check-ins, and interviews.

The risk is building too many surfaces before the backbone is clear. The backbone should answer:

- What is the shared text currency every surface publishes?
- What is the smallest common shape for "signal from the human"?
- What does the self-map store directly vs synthesize later?
- Which parts are stable enough to seed?
- Which parts should grow dynamically from evidence?
- How does the app detect a gap, contradiction, or repeated theme?

Until that is settled, new intake routes should reuse the same signal shape instead of creating separate product logic.

## 5. Intake routes

Possible intakes:

- morning ritual
- evening ritual
- free brain dump
- guided journal prompt
- voice interview
- board paste/upload
- AI-generated vision artifact
- emailed inspiration
- saved link/article
- Instagram/social post saved into the app
- Coach conversation

These should not become separate data worlds. They are different ways of producing self-map signal.

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

## 6. Vision board on crack

The stronger idea may be an **Inspiration + Vision Map**, not only a static board.

The board captures:

- what I want
- what I admire
- where I want to go
- what kind of world/life/aesthetic pulls me
- who I want to become
- what I fear becoming
- what keeps reappearing in my mind

The board's media is the visible layer. The extracted semantic text is the product layer. Every card should eventually answer:

- What does this represent?
- Which part of me does it speak to?
- Which possible self does it point toward?
- Which pillar does it strengthen?
- Is this stable aspiration or passing mood?
- Has this theme appeared before?

## 7. Ritual design

Consistency is a root function of the app. The ritual is not a feature beside the self-map; it is how the self-map becomes trustworthy.

The ritual should be flexible but recognizable:

- morning: orient to who I am becoming and what matters today
- midday/as-needed: reset, dump, decide, or stabilize
- evening: reflect, file the day, notice drift and evidence

The app should not punish missed rituals. It should lower the friction to returning.

## 8. Coach lenses

The app can support different schools of thought as **lenses** over the same self-map.

Examples:

- Socratic: clarify thinking through questions
- ACT / values-based: values, discomfort, committed action
- Behavioral: habits, cues, environment, reinforcement
- Strategic / executive: priorities, tradeoffs, decisions
- Hard truth: contradictions, standards, direct advice
- Spiritual / meaning: purpose, mortality, service, gratitude
- Creative: taste, curiosity, expression, energy
- Athlete / discipline: standards, training, consistency

The rule: many lenses, one self-map. The lens changes the angle of interpretation, not the underlying truth.

## 9. Next decisions

- Decide whether `SelfMapEntry` is a new table or an evolution of `coreFiles`.
- Decide whether the board is called Vision Board, Inspiration Board, or Vision Map.
- Define the universal `Signal` shape that every intake publishes.
- Decide whether journal sessions are one long timeline, snippets grouped by ritual, or both.
- Define freshness/lifecycle metadata for self-map entries: stable, seasonal, live, stale, missing.
- Keep new intake routes parked until they write into the same backbone.

