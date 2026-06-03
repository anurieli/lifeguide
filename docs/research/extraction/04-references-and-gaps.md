# LifeGuide — References & Missing Parts

*Extraction doc 04. Scouting the external landscape and finding the parts the concept is still missing.*

**Concept under review:** LifeGuide — an AI-first, context-aware personal life platform. Surfaces: brain-dump board, vision board, journaling, a living "life-roadmap" document, and an intake agent ingesting from email/calendar/social/voice into an inbox. A shared "Mirror" intelligence layer learns who you are and reflects through every AI interaction. Cross-cutting life pillars (work, health, relationships, money, growth).

**Founder's instinct:** *"I feel like it's still missing some parts."* This doc names them.

---

## Part A — The Landscape

LifeGuide sits at the intersection of four product categories that have mostly evolved separately. No single product today owns all four; that gap is the opportunity, and also the integration risk.

1. **Second-brain / PKM** (capture + knowledge graph): Tana, Mem, Reflect, Saga, Notion, Heptabase, Twos
2. **Always-on memory / life-logging** (passive capture + recall): Limitless, Rewind
3. **Journaling-to-insight** (reflection loop): Day One, Stoic, Reflectly
4. **Life-design / planning** (aspiration → time): Sunsama, Full Focus, "Life OS" templates, vision-board apps

### Landscape table

| Product | Category | Core mechanic | Does well | What LifeGuide learns / differentiates |
|---|---|---|---|---|
| **Tana** | PKM / knowledge graph | **Supertags** turn any note into a structured DB object with fields; everything lives on one queryable graph. AI agents are shaped by supertags. | Best-in-class structure-from-chaos. Object model ("Person", "Goal" w/ fields) without DB setup. Voice + 61-lang transcription into the graph. | The **data model** lesson: LifeGuide's pillars/goals/people should be typed objects with fields, not free text. But Tana is power-user, work-oriented, cold. LifeGuide differentiates on warmth, life-domain framing, and zero manual structuring. |
| **Mem** | AI-first notes | AI permeates capture → retrieval. Ask "what did I learn about X last week?" in natural language; auto-surfaces related notes; no tagging. | Effortless capture, semantic recall, automatic connection-finding. The "no taxonomy" promise. | Closest to LifeGuide's "Mirror" recall ambition. Lesson: **NL query over your own life** is table stakes. Differentiate: Mem has no vision/roadmap/time layer — it's recall, not direction. |
| **Reflect** | Networked notes | Daily notes + backlinks + AI assistant (tagging, summarizing, action-item extraction). End-to-end encrypted. | Privacy-first networked thought; clean daily-note ritual; calendar-aware. | Lesson: **daily note as the default surface** + **E2E encryption as a sellable trust feature**. Differentiate: Reflect is a blank canvas; LifeGuide is opinionated about life structure. |
| **Saga** | AI workspace | Unified notes + docs + tasks with GPT-4o assistant inline; aggregates tasks across all notes. | Clean, fast, multiplayer; AI included free; unified task view. | Lesson: a single fast surface beats app-sprawl. Limitation to avoid: Saga has no project views/automations/depth — "thin." LifeGuide must go deeper on the life layer. |
| **Notion (AI / 3.0)** | Workspace + agents | Flexible DBs + autonomous **AI Agents** that work 20 min across hundreds of pages (build plans, compile feedback). Multi-model (GPT-5, Claude, o3). | Infinite flexibility; agents that *execute*, not just suggest. The "Life OS" template ecosystem lives here. | This is the **incumbent threat**. Lesson: agentic execution across the workspace is the new bar. Differentiate: Notion requires *you* to build the system (template tax, blank-page problem). LifeGuide ships the life-structure pre-built and personal. |
| **Limitless** (was Rewind) | Always-on memory | Wearable pendant captures conversations → cloud transcribe → summaries, action items, searchable. Consent Mode (LED, "off the record" scrub). 30-day auto-delete. | Passive, zero-effort capture of real life. Strongest **trust UX**: visible consent, retroactive scrub, confidential cloud. (Acquired by Meta Dec 2025; closed to new customers.) | Lesson: **voice/passive capture** + a **consent model worth copying**. The acquisition leaves a market gap. Differentiate: LifeGuide can offer voice capture without a hardware dependency, and inherit the consent-UX playbook. |
| **Twos** | Quick capture | Everything is a small movable "thing" — one-tap capture, organize later (or never). Auto-to-do creation; clean Today view. | Friction-zero brain dump. Beloved by ADHD users. Capture speed is the whole product. | Lesson for the **brain-dump board**: capture must be *sub-second* and structure can be deferred. Differentiate: Twos has no intelligence/reflection — it's a bucket. LifeGuide adds the Mirror on top. |
| **Heptabase** | Visual canvas | Infinite whiteboard; notes are cards you place/link spatially across multiple boards; same card reused in many contexts. Local-first. | Spatial/visual thinking; PDF highlight → cards; "neurons" web of thought. | Lesson for **vision board + brain-dump**: spatial canvas mirrors how people actually think. A card living on multiple boards = your "goal" appears in vision board *and* roadmap. Differentiate: Heptabase is a cold research tool, no life framing, no time. |
| **Day One** | Journaling | Rich daily entries; **"On This Day"** resurfacing; AI "Go Deeper" prompts, Daily Chat (journal via conversation), Entry Highlights. | Pioneered date-based resurfacing ("writing → memoir"). AI follow-up prompts deepen reflection. Trusted, mature, private. | Lesson: **"On This Day" is the single feature that creates emotional pull-back**, and **journaling-by-chat** lowers the blank-page barrier. Directly portable to LifeGuide's journaling surface + resurfacing engine. |
| **Stoic** | Journaling ritual | Morning reflection / evening review / mood tracking, rooted in Stoic philosophy + AI follow-ups. 4M+ users. | **Ritual structure drives retention** (AM/PM bookends). Bite-sized (2-3 min). Purpose-built habit loop. | Lesson: a **time-of-day ritual** is the retention engine. LifeGuide's daily loop (AM intention / PM reflection) can borrow this directly. |
| **Reflectly** | Journaling | CBT/positive-psych prompts, mood logging, streaks, quotes. | Low commitment, habit-forming onboarding. | Cautionary lesson: users **outgrow it in 2-3 months**; "AI insights feel generic." Shallow reflection = churn. LifeGuide's depth (knowing the whole person) is the antidote. |
| **Sunsama** | Intentional planning | Guided **daily/weekly planning ritual**; pulls tasks from Gmail/Slack/Asana/etc. into one calendar view; time-estimate + time-box each task; review yesterday → choose today. | The **ritual as the product**: deliberate planning beats reactive inboxes. Deep calendar integration (Google/Outlook). | Lesson: **the planning ritual binds intention to the calendar** — exactly LifeGuide's missing time layer. Differentiate: Sunsama is week-scoped and work-flavored; LifeGuide spans 20yr → today and all pillars. |
| **Full Focus / MäksēLife** | Goal cascade (analog + app) | Annual/quarterly goals → 3 weekly bigs → 3 daily tasks. "8 Areas of Life" framework. | The **vision→quarter→week→day cascade** made concrete; daily tasks always trace to long-term goals. | This is the literal blueprint for LifeGuide's **roadmap-to-today binding**. Differentiate: paper/static; LifeGuide makes the cascade living and AI-maintained. |
| **"Life OS" Notion templates** | Life-design system | Vision/values → yearly → quarterly → monthly → weekly → daily habits, all interlinked; now "agentic." 8-space diagnosis+creation model. | Proves demand for an integrated life system spanning goals/habits/journal/knowledge. | This is LifeGuide's concept *as a template* — validating the thesis. Differentiate: templates require heavy manual setup + maintenance and don't *know you*. LifeGuide is the native, intelligent, zero-setup version. |
| **Vision-board apps** (Visuapp, Perfectly Happy, Dream/Dreamer, Mind Movies) | Manifestation | Image collages + affirmations + daily visualization sessions; some AI-generate boards; video boards. | Emotional/aspirational pull; daily visualization habit; affirmations loop. | Lesson for the **vision board surface**: imagery + affirmation + a *daily visualization session* are the engagement mechanic. Differentiate: these are dead-end collages with no link to action — LifeGuide connects vision → roadmap → daily acts. |

### Cross-cutting reads

- **ChatGPT memory** (the "knowing the user" benchmark): two layers — explicit *saved memories* (user-editable list) + implicit *reference chat history*. Notifies you when it learns something; full view/edit/delete control. This is the **Mirror's UX standard**: a transparent, editable memory the user can inspect. LifeGuide must match this or trust collapses.
- **Readwise** (the resurfacing benchmark): spaced-repetition resurfacing via a **decaying recall-probability half-life** (7/14/28-day buckets), surfaced in a Daily Review. The proven model for LifeGuide's resurfacing engine — but applied to *your own inspirations/captures/old goals*, not book highlights.
- **Todoist email-to-task** (the intake-router benchmark): every project gets a **unique private forwarding address** (e.g. `inbox.1a2b3c@todoist.net`); subject→task name, body→comment; AI Assist extracts deadlines/links. The simplest proven auto-routing pattern LifeGuide's intake agent should ship on day one.

---

## Part B — The Missing Parts (ranked)

Ranked by how load-bearing each is to the concept actually working — i.e., remove it and the product is just another notes app or another dead vision board.

### 1. The closed reflection loop (why → how → did-it-work → revise the why) — **most missing**

The concept has all the *nouns* (vision, roadmap, journal, captures) but no **verb that connects them over time**. A vision board that never updates from what actually happened is the same dead collage as Visuapp. The roadmap is only alive if acting on it feeds back.

The loop LifeGuide is missing:
> **Vision** sets direction → **Roadmap** breaks it into time-bound moves → user **acts** (and journals/captures evidence) → **reflection** scores it (did this move me toward the vision? did the vision still feel true?) → **Mirror updates** both the roadmap *and* the vision.

No competitor closes this. Day One/Stoic reflect but don't act; Sunsama/Full Focus act but don't revise the vision; vision-board apps aspire but never measure. **This loop is LifeGuide's actual product**, and it's currently implied, not designed.

**Recommendation:** Make reflection a *structured, periodic* surface, not just freeform journaling. Weekly + quarterly "review" rituals (steal Sunsama's cadence) where the AI presents: *here's what your roadmap said, here's what you did/journaled, here's the gap, does the vision still hold?* The user's answers are the input that mutates the roadmap and vision. The journal entry becomes a **typed reflection object** that links to the goal it's about (Tana-style), so reflections roll up.

### 2. Time/calendar binding — the roadmap must live on a timeline (20yr → today)

A "life roadmap" that isn't bound to dates is a wish list. The hard, unsolved UX problem: **how does a 20-year aspiration cascade into something on this Tuesday**, and how does today's reality roll back up?

The proven blueprint exists in pieces: Full Focus's *annual → quarterly → 3 weekly → 3 daily* cascade, and Sunsama's *time-box every task onto the actual calendar*. Nobody has fused the long-horizon cascade with live calendar binding **and** the reflection loop above.

**Recommendation:**
- Model the roadmap as nested time-horizons: **Vision (10-20yr) → Themes (1-3yr) → Quarterly rocks → Weekly bigs → Daily acts.** Each level is a typed object linking up and down.
- **OAuth into Google/Outlook calendar** (Sunsama's integration is the reference). The roadmap *writes to* the calendar (time-blocks for goal-work) and *reads from* it (did the block happen? what got scheduled over it?).
- Two-way: completing/skipping calendar items is the raw signal that feeds the reflection loop (#1). This is what makes "did-it-work" measurable instead of self-reported.

### 3. People / relationships as a first-class facet

"Relationships" is listed as a pillar but pillars are framed as *topics*, not *entities*. People are the highest-emotion, highest-retention data in anyone's life, and the concept currently has no **person object**. Tana models "Person" with `Last Contacted`; CRMs prove relationship-maintenance is a daily-return behavior.

**Recommendation:** Make **Person a first-class typed object** in the Mirror (name, how you know them, last interaction, what matters to them, open threads). The intake agent populates it (emails, calendar attendees, mentions in journals/brain-dumps). Then the agent can do **relationship resurfacing**: "you haven't talked to your brother in 6 weeks and you wrote that he matters to you," "X has a birthday Friday," "your goal was to be a better partner — here's what you logged this month." This is also a powerful proactive-nudge source (#5).

### 4. Resurfacing / recall engine (bring the right old thing back at the right moment)

The concept captures a lot (brain-dumps, inspiration, old goals, journals) but has no stated mechanism to **bring it back**. Capture without resurfacing is a graveyard — this is *the* failure mode of every second-brain. Readwise (decaying half-life), Day One ("On This Day"), and Mem (semantic auto-surface) each solve a slice.

**Recommendation:** Build a dedicated resurfacing engine combining three triggers:
- **Temporal** ("On This Day" — a year ago you wanted X; a quarter ago you captured this idea). Highest emotional pull, lowest cost.
- **Spaced** (Readwise's decaying-recall model applied to inspirations and stalled goals so they don't rot).
- **Contextual / semantic** (you're journaling about burnout → surface the boundary you set 3 months ago; you're planning the week → surface the relevant captured idea). This is where the Mirror earns its name.
Surface these in the daily ritual and as gentle nudges, never as an undifferentiated feed.

### 5. Proactive agent — reaching out, not waiting

The intake agent *ingests* but the concept never says the agent *initiates*. The retention data is stark: proactive AI coaching hits **~75% regular usage vs ~51% for on-demand**. A passive Mirror is a tool you forget; a proactive one is a presence. But proactivity is also the fastest route to feeling spammy/creepy.

**Recommendation:** Give the agent an outbound channel (push, and ideally SMS/email à la Askama). Nudges must be **earned by context**, on a strict budget (Stoic's AM/PM bookends; Habits app's "one soft daily reminder"). Good nudges draw from #1/#3/#4: a weekly-review invite, a relationship that's gone quiet, a resurfaced goal, an "on this day." Hard rules: consent-first, one-tap snooze/opt-out, and *never* a fake-urgency streak-guilt pattern (the user explicitly wants no dark patterns).

### 6. Universal search & recall across everything

If everything about who you are is in one place, the user *will* expect to ask one question and get one answer across journals, captures, roadmap, people, and ingested email/calendar. Mem and ChatGPT memory set this expectation. The concept has surfaces but no stated **cross-surface query layer**.

**Recommendation:** A single natural-language ask-your-life query ("what did I say I wanted from this year?", "what have I journaled about my health?", "when did I last see Dana?"). This is the everyday utility that makes LifeGuide a daily-open even on days the user doesn't journal — and it's the most direct expression of the Mirror.

### 7. Privacy / trust model — explicit, because the data is maximally intimate

This is the most intimate dataset a consumer app can hold (vision, fears, relationships, money, voice). The cautionary tales are loud: Replika fined €5M (GDPR), can't E2E-encrypt because it trains on plaintext server-side; companion apps leaking intimate chats. **Trust is the precondition for capture** — people won't brain-dump their real selves into something they don't trust. The concept currently says nothing about it.

**Recommendation:** Make trust a designed, *sellable* feature, not fine print:
- State a clear stance: data is the user's, **not** training fodder; encrypted; user can export/delete everything.
- Copy **Limitless's consent UX** for any voice/passive capture (visible recording state, "off the record," retention windows).
- Match **ChatGPT's memory transparency**: the Mirror's model of the user is **viewable and editable** — a "here's what I believe about you" page the user can correct/forget. This doubles as a trust feature *and* a personalization-accuracy feature.
- Decide and disclose local-first vs cloud (Reflect/Heptabase use local-first + E2E as a differentiator).

### 8. The intake-agent / router pattern — concretely specified

The intake agent is central but mechanically undefined. "Ingests from email/calendar/social/voice" is a wish; the *how* determines whether it ships. Proven patterns exist and should be named.

**Recommendation:** Ship a layered intake stack, simplest-first:
- **Forwarding address** (Todoist's `inbox.x@…` model): a private LifeGuide email; forward anything → it lands in the inbox, AI parses subject/body, routes to the right pillar/goal/person. Zero-integration, day-one.
- **OAuth calendar** (Google/Outlook, Sunsama's reference): read events for context + write time-blocks (ties to #2).
- **Share sheet / quick-capture** (Twos' sub-second capture) on mobile: text, photo, link, voice memo → inbox.
- **Voice** (Tana/Limitless reference): record → transcribe → route.
- **The router itself** is the un-sexy core: an AI triage that takes any inbound item and decides — is this a task, a journal seed, a vision input, a person update, an idea to resurface later? — and files it, with a human-review inbox for low-confidence calls.

### 9. Onboarding / cold-start — useful before it knows you

The Mirror is the moat but on day one it knows nothing, and the failure modes are well-documented: **ask too much → ~80% drop in onboarding; ask too little → no personalization → never return.** "Life OS" Notion templates die here (heavy setup, blank page). This is make-or-break for activation.

**Recommendation:** A **conversational onboarding** (steal Day One's "Daily Chat" and goal-quiz patterns) that *feels* like the product, not a form: the agent interviews the user across the pillars and produces a **draft vision + draft roadmap in the first session** — immediate "wow, it already gets me." Then progressively profile: every capture/journal/ingested item enriches the Mirror so it compounds. Seed value before data: useful generic prompts/structure on day one, increasingly personal by week one.

### 10. Motivation / retention without dark patterns

Reflectly proves the churn risk (outgrown in 2-3 months, generic insight). Stoic proves the fix (ritual + genuine depth). The concept needs a stated reason someone opens it tomorrow that isn't streak-guilt.

**Recommendation:** Three honest hooks, all flowing from the parts above:
- **Ritual bookends** (Stoic): a light AM intention + PM reflection tied to the roadmap.
- **Earned resurfacing** (#4): the "on this day" / old-inspiration pull-back is intrinsically rewarding.
- **Visible progress up the cascade** (Full Focus): seeing daily acts roll up toward the vision is the dopamine that vision boards never deliver.
Depth is the real retention engine — the longer you use it, the better it knows you, the harder it is to leave. Make that compounding *visible* to the user.

### Also worth flagging (lower priority)

- **The brain-dump → structure bridge.** Twos nails capture, Tana nails structure; the magic is the AI step *between* them that turns a 3am dump into a typed object (task/idea/person/goal) without the user lifting a finger. This is implied but is genuinely hard and central.
- **Multiple surfaces, one object (Heptabase's reuse).** A "goal" should be the *same object* whether seen on the vision board, the roadmap, or in a journal reflection — not three copies. Decide the unified data model early or the surfaces will drift.
- **Voice as a first-class input,** not an afterthought — it's the lowest-friction way to capture real, emotional, unfiltered self-data (Tana and Limitless both lean here), and the Meta/Limitless exit leaves that capture behavior homeless.
- **Emotional safety / scope of the AI.** Deeply personal reflection can surface mental-health territory. Decide where the agent coaches vs. where it must back off and point to a human (the proactive-coaching research flags this explicitly).
- **Export / portability / no lock-in** as a trust signal (reinforces #7).

---

## Sources

Tana: [TechCrunch $25M / 160K waitlist](https://techcrunch.com/2025/02/03/tana-snaps-up-25m-with-its-ai-powered-knowledge-graph-for-work-racking-up-a-160k-waitlist/), [What's new in Tana 2025](https://tana.inc/articles/whats-new-in-tana-2025-product-updates), [Tana for PKM](https://tana.inc/outliner/pkm). Mem vs Reflect: [Aloa comparison](https://aloa.co/ai/comparisons/ai-note-taker-comparison/mem-vs-reflect), [pointofai](https://pointofai.com/compare-ai-tools/mem-vs-reflect-notes). Limitless/Rewind: [Limitless](https://www.limitless.ai/), [asktodo.ai guide](https://asktodo.ai/blog/ai-memory-assistants-limitless-rewind-trends-2025), [skywork guide](https://skywork.ai/skypage/en/Rewind-AI-&-Limitless:-The-Ultimate-Guide-to-Your-Digital-Memory/1976181260991655936). Day One: [AI features](https://dayoneapp.com/guides/labs/ai-features/), [Apple Intelligence](https://dayoneapp.com/blog/go-deeper-with-apple-intelligence/). Sunsama: [Daily Planning](https://www.sunsama.com/daily-planning), [Calmevo review](https://calmevo.com/sunsama-review/). Heptabase: [Wiki](https://wiki.heptabase.com/organize-knowledge-and-projects), [eryinote review](https://eryinote.com/post/1083). Stoic/Reflectly: [Stoic](https://www.getstoic.com/), [Reflectly review](https://ikanabusinessreview.com/2025/10/reflectly-app-review-2025-guided-journaling-for-wellbeing/). Life OS: [Notion Life OS](https://www.notion.com/templates/notion-life-os), [maray.ai](https://www.maray.ai/posts/life-os). Twos: [twosapp.com](https://www.twosapp.com/). Vision boards: [Mindful Suite](https://www.mindfulsuite.com/reviews/best-vision-board-apps), [Perfectly Happy](https://perfectlyhappy.com/digital-vision-board-app/). Saga/Notion AI: [Saga vs Notion](https://saga.so/compare/saga-vs-notion), [Notion AI 2026](https://max-productive.ai/ai-tools/notion-ai/). ChatGPT memory: [OpenAI](https://openai.com/index/memory-and-new-controls-for-chatgpt/), [Embrace The Red deep dive](https://embracethered.com/blog/posts/2025/chatgpt-how-does-chat-history-memory-preferences-work/). Proactive coaching: [Pinnacle](https://www.heypinnacle.com/blog/what-is-the-impact-of-proactive-ai-coaching-on-manager-adoption-and-behavior), [Askama](https://chatgate.ai/post/askama/). Privacy: [Mozilla on Replika](https://www.mozillafoundation.org/en/privacynotincluded/replika-my-ai-friend/), [AI Companion Privacy Guide 2026](https://aicompanionguides.com/blog/ai-companion-privacy-guide-2026/). Resurfacing: [Readwise reviewing highlights](https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights), [Readwise mastery](https://docs.readwise.io/readwise/guides/mastery). Intake routing: [Forward emails to Todoist](https://www.todoist.com/help/articles/forward-emails-to-todoist-JPJ1V339). Goal cascade: [Full Focus Planner](https://fullfocusstore.com/products/full-focus-planner-linen), [Reclaim goal trackers](https://reclaim.ai/blog/goal-tracker-apps). Onboarding/cold-start: [ShadeCoder cold-start guide](https://www.shadecoder.com/topics/cold-start-problem-a-comprehensive-guide-for-2025), [uWaterloo onboarding](https://medium.com/uwaterloo-voice/nail-the-onboarding-experience-2c28ce0b9fb8).
