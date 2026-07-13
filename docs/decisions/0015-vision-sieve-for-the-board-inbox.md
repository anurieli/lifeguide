# 0015 · The vision sieve: intent + verdict gate the board Inbox

**Date:** 2026-07-13 · **Status:** accepted

## Context

The board Inbox query was simply "every unplaced, active capture" — `placedAt` unset was used as a stand-in for "an idea waiting to go on the board." But captures are created all over the app (canvas paste, session entries, Thought-stream dumps, voice brain dumps, the onboarding seed), so everything unfiled leaked into the tray, distilled into polished vision-card language. Two real incidents forced the decision: a journaled day and a **prompt Ariel wrote to a coding agent** both surfaced as "ideas to place" — the latter doubly wrong because the board's window-wide paste listener stayed alive while the board was hidden (it's kept mounted across nav), vacuuming up a paste never aimed at LifeGuide at all. Ariel's direction: the inbox should hold what's *worthy of a man's vision* — aspirations, wants, the life he's building — and "no, not everything that is discussed should go in there."

## Decision

Two gates, one inbox rule:

1. **Explicit intent wins.** A new `captures.target: "board"` field records deliberate board intake at capture time — the canvas paste path and the onboarding seed ("show me something that pulls at you") set it. These captures enter the Inbox unconditionally and immediately; a person's explicit act is never second-guessed by AI.
2. **Ambient captures pass the vision sieve.** Everything else (sessions, Thought stream, brain dumps) is judged during distillation: the distill call's JSON gains `board_worthy` + `board_reason`, asking whether this is a piece of the life the person wants (aspiration, want, dream, way of living, who they're becoming) versus ambient noise (logistics, to-dos, work notes, prompts to a computer, technical talk, venting, diary accounts). The verdict lands on `captures.boardWorthy {verdict, reason, at}`; only `verdict: true` admits the capture to the Inbox. The parser (`parseBoardWorthy`) **defaults to not worthy**, so a missing field or garbage output keeps things off the board rather than leaking them on. The prompt's tie-breaker is explicit: "when unsure, say false — the board is sacred, not a catch-all."

The inbox query becomes: unplaced + active + (`target == "board"` OR `boardWorthy.verdict == true`).

Alongside: the board's paste catcher now attaches **only while the board is the on-screen surface** (`active`), killing the background clipboard vacuum.

## Alternatives considered

- **A second, dedicated classifier call per capture.** Cleaner separation, but doubles model cost and latency on every capture for no accuracy we need today; the sieve rides the distill call instead (one call, two jobs). If the sieve later needs its own model or its own per-user example pools, it can be split out then.
- **Filtering by `sessionId` / `source` alone.** Insufficient — a Thoughts-stream dump has no `sessionId` and the same `source: "paste"` as a real board paste. Intent was simply never recorded; a heuristic over origin can't reconstruct it.
- **Keep the universal tray, relabel it.** Rejected by the product call: the board tray means "vision to place," not "unfiled anything."

## Consequences

- Pre-existing unplaced captures have neither `target` nor a verdict, so they **disappear from the board Inbox** (they remain on the Thought stream, untouched). This is the desired cleanup of the current junk tray; any of them can earn a verdict via `captures.reprocess`, which re-runs distillation.
- Bare images with no extractable text and no explicit target never distill, so they no longer wait in the tray; board-pasted images are unaffected (`target: "board"`).
- The sieve is a static prompt for now and will be wrong in person-specific ways. The self-learning loop — 👍/👎 marks on inbox cards feeding per-user good/bad example pools into the sieve prompt at runtime — is designed and parked as **ARI-28** (gate decision 2026-07-13: slice 2).
- MobileBoard's inbox section uses the same query, so both surfaces obey the same gate for free.
