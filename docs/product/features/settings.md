# Settings & Onboarding

**Status:** built (partial) · **Element of:** spine (system) · **Owns:** `settings`

> The one place the person tunes how LifeGuide treats them, and the first-run flow that gathers just enough to start. It sets the daily rhythm, the Coach's tone and reach, the north star, and the pillars, and seeds the very first capture.

## 1. Purpose

Lostness is made worse by tools that bombard. Settings & Onboarding exist to make the space feel like the person's own from the first minute and to keep it that way. Onboarding answers "where do I even start" by asking for one thing, not a form, and seeding a board from it. Settings is the dial behind the [interaction principles](../concept-and-soul.md#interaction-principles--the-creative-constraint): the person decides how often the [daily ritual](../concept-and-soul.md#the-daily-ritual) runs, how blunt the Coach is, and when it may reach out unprompted. Nothing else gives the person this much say over how present the system is.

## 2. User-facing behavior

**Onboarding (first run).** A 5-step, one-thing-per-screen flow (`components/onboarding/Onboarding.tsx`), shown until `settings.onboardedAt` is set:

1. Welcome ("you're not lost, you just haven't said where you're going out loud yet").
2. First capture: paste or type anything that pulls at the person (with example chips). Optional.
3. Rhythm: morning + evening, mornings only, or evenings only; plus a gentle-to-direct Coach tone slider.
4. Meet the Coach: a single message setting expectations (no spam, no streak guilt, two beats a day).
5. Ready: "enter your space."

On finish (or "skip" at any point), `completeOnboarding` writes the rhythm and tone and stamps `onboardedAt`; if a first thing was entered, a [capture](vision-board.md) is created (`source: "paste"`) and distilled async into the board. The page swaps to the app reactively the moment `onboardedAt` is set.

**Settings (any time).** A single calm surface (`components/settings/Settings.tsx`), titled "How I treat you," grouped into Daily rhythm, The Coach, Atmosphere, Your pillars, AI models & keys, and Yours alone. Every control writes immediately (no save button): toggles for morning/evening, segmented pickers for daily exercise, Coach tone, and reaching out; the [Atmosphere](atmosphere.md) controls (music on/off, autoplay, default mood); a pillar chip row with add (preset or custom); and sign-out. The north star is owned here but surfaced and edited inline on [Home (Today)](dashboard.md) (the compass card). Settings itself is reached from the **account menu at the bottom of the rail** (Settings / Account / Sign out), not a primary rail tab; the avatar no longer signs you out on click.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Seed defaults | first sign-in (`users.bootstrap`) | inserts a `settings` row: morning/evening on, exercise `intention`, tone `balanced`, reach `earned`, no `onboardedAt` | system | writes `settings` |
| Complete onboarding | finish/skip the flow (`settings.completeOnboarding`) | patches rhythm + tone, stamps `onboardedAt` | manual | writes `settings` |
| Seed first capture | step 2 text on finish | creates a `paste` capture that becomes a board node | manual | writes `captures` (drawn) |
| Toggle morning / evening | Settings rhythm toggles | turns each daily beat on/off | manual | writes `settings.morningCheckin/eveningCheckin` |
| Set daily exercise | Settings picker | `intention` \| `gratitude` \| `free`, shaping the check-in prompt | manual | writes `settings.dailyExercise` |
| Set Coach tone | Settings / onboarding | `gentle` \| `balanced` \| `direct` | manual (Coach may suggest) | writes `settings.coachTone` |
| Set reaching out | Settings picker | `leave` \| `earned` \| `often`, the earned-interruption budget | manual | writes `settings.reachingOut` |
| Set north star | Home compass card (`settings.update`) | the one-line direction Home renders as the compass | manual (Coach may propose) | writes `settings.northStar` |
| Add pillar | Settings "+ add pillar" | adds a preset or custom [pillar](pillars-and-goals.md) | manual | writes `pillars` (drawn) |
| Sign out | "Yours alone" | ends the session | manual | auth only |

## 4. Dynamics and interactions with other elements

Settings **owns** the `settings` table and nothing else. It does not publish distilled text to the streams; instead its fields are **drawn at act-time** as parameters that shape other elements (per [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md)):

- **[Journal / Sessions](journal.md)** draws `morningCheckin`, `eveningCheckin`, and `dailyExercise` to decide which beats exist and what each check-in asks.
- **[The Coach](coach.md)** draws `coachTone` to shape voice and `reachingOut` as the [earned-interruption](../concept-and-soul.md#interaction-principles--the-creative-constraint) budget (`leave` = never unprompted, `earned` = only when it has something specific and true, `often` = a wider allowance).
- **[Home (Today)](dashboard.md)** draws `northStar` to render the compass (and hosts its one editable write).
- Onboarding **draws** [`captures`](vision-board.md) (writes one on the person's behalf) and Settings **draws** [`pillars`](pillars-and-goals.md) (adds rows) but owns neither.

## 5. States

- **Seeded, not onboarded:** `settings` row exists from bootstrap, `onboardedAt` unset. The app shows Onboarding.
- **Onboarded:** `onboardedAt` stamped. The app proper renders; Settings is reachable.
- **Tuned:** any field edited; `updatedAt` advances on every write.
- **North star empty vs set:** absent until the person (or Coach) names a direction; the Home compass card handles the empty case ("write it").
- There is no archived or conflicted state: `settings` is a single live row per user, last-write-wins.

## 6. Edge cases

- **Skip in onboarding:** runs the same `completeOnboarding`; defaults stand, no first capture unless text was entered. The person is never blocked.
- **Empty first capture:** step 2 is optional; finishing with blank text seeds no capture and the ready screen adjusts its copy.
- **All beats off:** both `morningCheckin` and `eveningCheckin` false is allowed; the Journal then offers no scheduled beats (only triggered sessions). Not prevented by design.
- **Tone slider mapping:** the onboarding slider (0-100) maps to the enum (`<33` gentle, `>66` direct, else balanced); Settings sets the enum directly, so a round-trip can shift the slider's exact position.
- **Missing row at read time:** `settings.get` returns `null` if absent; UIs fall back to the same defaults bootstrap would write, so nothing breaks before the first write. `update`/`completeOnboarding` self-heal via `getOrCreate`.
- **Unauthenticated:** `get` returns `null`; mutations throw "Not authenticated."

## 7. AI involvement

Settings is configuration, not a model surface, so the model is not in its write loop. Its outputs are model inputs: `coachTone` and `reachingOut` are read by the [Coach](coach.md) and [ai-layer](../../architecture/ai-layer.md) to adapt voice and gate unprompted outreach; `dailyExercise` shapes the [Journal](journal.md) prompt generation. The one AI touch in this flow is downstream: the first onboarding capture is distilled async by the capture pipeline into a board node. The Coach may *propose* setting changes (a tone shift, naming a north star) through the app, but the person confirms, consistent with the [no-silent-overwrite](../concept-and-soul.md#the-coach-as-core-curator) rule.

## 8. Data touched

Owns **`settings`** (see [`../../architecture/data-model.md`](../../architecture/data-model.md)): `{ userId, onboardedAt?, morningCheckin, eveningCheckin, dailyExercise: intention|gratitude|free, coachTone: gentle|balanced|direct, reachingOut: leave|earned|often, northStar?, musicEnabled?, musicAutoplay?, musicDefaultMood?, updatedAt }`, indexed `by_user` (one row per user). The three `music*` fields are owned by [Atmosphere](atmosphere.md), not the Settings flow itself. Mutations in `convex/settings.ts` (`get`, `update`, `completeOnboarding`); seeded in `convex/users.ts` (`bootstrap`).

Draws (writes into, does not own): **`captures`** (onboarding's first thing) and **`pillars`** (Settings add).

## 9. Open questions

- Should `northStar` live on `settings` long-term, or move onto the Core's `mirror` once the backbone lands, given the Coach curates it?
- Does `reachingOut` need finer control (quiet hours, channel) when the off-platform tether ships?
- Should "all beats off" be allowed, or nudged against, since it removes the daily ritual entirely?
- Pillar management currently only adds; where do rename, reweight, and remove live (Settings vs the [Pillars & Goals](pillars-and-goals.md) surface)?
