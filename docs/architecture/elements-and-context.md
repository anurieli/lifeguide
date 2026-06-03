# The Elements and the Context Model

**Status:** the rebuilt foundation (2026-06-03). This is the first doc of the rebuild; the per-element feature docs and the rest of `docs/architecture/` hang off it. It is the source of truth for what the large elements are, what each one owns, and how their context blends.

> Built from two seeds: the soul and evolved vision in [`../product/concept-and-soul.md`](../product/concept-and-soul.md), and the recovered Life Blueprint in [`../product/blueprint/the-life-blueprint.md`](../product/blueprint/the-life-blueprint.md).

---

## The principle: stark context management

LifeGuide is several large elements that each do ONE job. The point is that a person can edit any one element on its own, while the system always knows where each piece of context lives and how to blend it. Four rules make that true:

1. **Ownership is stark.** Each element owns only its own data. No element holds a copy of another's. Future Self owns images of you; the Vision Board owns the life and world; neither duplicates the other.
2. **Consumption is open.** When an element acts, it may draw on any other element's context through the shared bus. Drawing is reading at act-time, never holding. This is the blend.
3. **Text is the shared currency.** Images and video live inside their element. What flows into the shared context is always the distilled TEXT behind them. The image is never the context; the meaning is. We blend text, always, whatever the medium.
4. **Gaps are first-class.** The system knows what it does not yet know. Unanswered backbone questions, and themes that fit no current pillar, are holes; holes are the signal to grow (a new pillar, sometimes a whole new element).

## The two streams

Shared context is held in two streams, different in kind:

- **The Core, who you are.** Enduring identity. Slow-changing. The backbone (the Blueprint), the values, the north star, the synthesized you.
- **The Sessions, your days.** Temporal. The daily self-sessions, recent state, momentum, and drift.

"Who they are" and "where they have been lately." Assembling context for any moment draws from both, weighted by what the moment needs.

## The Core is the backbone (the Blueprint)

The Core is not free-form. Its skeleton is the **Life Blueprint**, recovered from the original app: 3 sections and 18 malleability-tagged questions, Crafting Your Persona (7), Setting Your Goals (6), Forging Your Mindset (5). See [`../product/blueprint/the-life-blueprint.md`](../product/blueprint/the-life-blueprint.md).

The Blueprint defines the SHAPE of a human. Its answers accrue ambiently, in many ways: a capture, a Coach exchange, a morning session, something placed on the Vision Board. The Coach curates those signals into the Core through a hard filter that strengthens or reshapes it and surfaces conflicts instead of overwriting. The backbone is the frame; the rest of the app fills it in over time.

## The elements

| Element | What it owns (data) | Feeds | Publishes to / draws from shared context |
|---|---|---|---|
| **Vision Board** | the life and world you want: `nodes, edges, captures` (today's board, refocused) | Core | publishes the themes and images of the life you want; draws nothing required |
| **Future Self** | the visual you: `futureSelf` (new) | Core | publishes the aspiration text behind the visuals; **draws** the Vision Board + Core to generate you living that life |
| **Journal / Sessions** | daily self-sessions: `sessions, prompts` (new) | Sessions | publishes recent state and drift; **draws** Core + Goals to shape each day's prompts |
| **Pillars & Goals** | domains + commitments: `pillars, goals` | Core, Sessions | publishes the domains you are strengthening and the goals in each, plus progress |
| **The Core** | the synthesized identity: `mirror` | is the Core | publishes "who you are" to everything; the Coach curates it |
| **The Coach** | the conversation + memory: `threads, messages` | reads all | **draws** everything; blends on demand; curates the Core (hard filter, surfaces conflicts) |
| **Mirror / Context Bus** | the spine: `interactions` + the assembler | holds both | every element publishes here; it assembles the right slice for each call |

The **Guide** is not a data owner: it is a read-only surface that renders the Core back to you (north star, the Mirror, the pillars).

## Two kinds of connection: owns vs draws-from

Every edge in the system is one of two kinds, and keeping them separate is what makes the context management stark:

- **Ownership (stark, async):** a producer owns its tables and publishes distilled text into a stream. This builds the shared context over time.
- **Draw / consume (open, at act-time):** a consumer reads other elements through the Bus when it acts. Rebuilt from source each time, budgeted, never a hard link.

Recurring draws:
- **Future Self** draws the Vision Board (the world, the aesthetic) + the Core (who you are) to generate you placed inside that life.
- **Journal** draws the Core + your Goals to shape today's prompts.
- **Guide** draws the Core to render you.
- **Coach** draws everything.

## Element notes (to expand into full feature docs)

- **Vision Board.** The life and world you want. A classic board: write text, import things, drop images. The signature move is co-building with the Coach: a chat on the board where you talk and it crafts the board with you, laying down nodes and filling image blocks asynchronously (pre-generated prompts populate the blocks the AI places). You talk the vision into existence.
- **Future Self.** How you envision yourself: how you dress, how you want to be perceived, the crowds you want to attract, who you are becoming. Generative and personal: upload your own photos, try outfits and hairstyles, generate stills and (later) video of you living it. Mostly visual, but it still emits the text behind the visuals into the Core.
- **Journal / Sessions.** A morning beat and a night beat, adaptive prompts (typed or spoken), timestamped and scrollable. Each session feeds the Sessions stream and, through the Coach, the Core.
- **Pillars & Goals.** The domains that make a human solid (health and body, profession, social presence, and more per person) and the commitments inside each. Goals live inside pillars.
- **The Coach.** The one presence. Reads everything, blends only what a moment needs, and is the curator that keeps the Core honest.
- **Mirror / Context Bus.** The spine every element plugs into; it holds the two streams and assembles context per call.

## Worked example: "I want to run a triathlon"

One life-thing, several elements, each owning a different facet. This is the model working.

| Facet | Lives in | Why there |
|---|---|---|
| the commitment + deadline | Pillars & Goals (Health) | a goal in a life domain; the what |
| the image of you at the finish line | Future Self | you, visualized; the pull |
| "did I train today, how did it feel" | Journal / Sessions | the daily pulse over time; the movement |
| "this is the disciplined person I am" | the Core | the identity the goal expresses; the why |
| "you said this mattered, but you skipped six mornings" | the Coach | blends goal + sessions + core, only when it has something true to say |

## Open questions (settle as we build)

- Is the Vision Board's build-chat the docked Coach scoped to the board, or a board-local chat surface? (Leaning: the same Coach, scoped to the board.)
- Future Self personalization: one-off image edits vs a trained personal likeness for consistent generation of you. (Decide when we build it.)
- The exact `sessions`, `prompts`, and `futureSelf` schemas, written alongside `convex/schema.ts` when each element is built.

## What changed from the old docs

- The Whiteboard-vs-Vision-Board ambiguity is resolved: the board IS the Vision Board.
- Future Self is its own element with its own data model and image generation, separate from the Vision Board.
- Journaling and Future Self are core, not out of scope. The old PRD listed them as non-goals; that framing is retired.
